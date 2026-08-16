import * as SecureStore from 'expo-secure-store';

import { parseScheduleJson } from '@/services/edu/parser';
import { bytesToBase64, encryptPassword } from '@/services/edu/rsa';

// ============================================================================
// 配置：目标教务系统（河北师范大学 正方教务系统）。
// 接口/字段以常见正方版本为准；若实际接口不同，改这里即可，逻辑无需改动。
// ============================================================================
const EDU_BASE = 'http://jwgl.hebtu.edu.cn';
const LOGIN_PAGE = `${EDU_BASE}/xtgl/login_slogin.html`;
const PUBLIC_KEY_URL = `${EDU_BASE}/xtgl/login_getPublicKey.html`;
const CAPTCHA_URL = `${EDU_BASE}/xtgl/verifycodeServlet`; // 验证码图片接口（部分版本不同）
const SCHEDULE_INDEX = `${EDU_BASE}/kbcx/xskbcx_cxXskbcxIndex.html?gnmkdm=N2151&layout=default`;
const SCHEDULE_DATA = `${EDU_BASE}/kbcx/xskbcx_cxXsgrkb.html?gnmkdm=N2151`;

// 正方学期代码：3=第一学期，12=第二学期，16=第三学期（短学期）。
const XQM_FALL = '3';
const XQM_SPRING = '12';

// ============================================================================
// 凭据（仅本地 Keychain/Keystore，不上传）
// ============================================================================
const CREDENTIALS_KEY = 'edu_credentials';

export interface EduCredentials {
  username: string;
  password: string;
}

export async function saveCredentials(credentials: EduCredentials): Promise<void> {
  await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify(credentials));
}

export async function loadCredentials(): Promise<EduCredentials | null> {
  const raw = await SecureStore.getItemAsync(CREDENTIALS_KEY);
  return raw ? (JSON.parse(raw) as EduCredentials) : null;
}

export async function clearCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
}

// ============================================================================
// 错误
// ============================================================================
export type EduLoginErrorCode = 'captcha' | 'credentials' | 'network';

export class EduLoginError extends Error {
  constructor(
    public readonly code: EduLoginErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'EduLoginError';
  }
}

// ============================================================================
// 工具
// ============================================================================
function encodeForm(data: Record<string, string>): string {
  return Object.entries(data)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

/** 按当前日期推断学年/学期（xnm/xqm）。8-12 月第一学期，2-7 月第二学期，1 月仍属第一学期末。 */
export function guessTerm(now = new Date()): { xnm: string; xqm: string } {
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1..12
  if (month >= 8) return { xnm: String(year), xqm: XQM_FALL };
  if (month === 1) return { xnm: String(year - 1), xqm: XQM_FALL };
  return { xnm: String(year - 1), xqm: XQM_SPRING };
}

/**
 * 会话 Cookie 管理。
 *
 * React Native 的 fetch 不自动维护跨请求的 Cookie（尤其 Android），
 * 需手动从 Set-Cookie 抽取会话并回带到后续请求头。iOS 的 NSURLSession 会自动存，
 * 这里手动管理可保证双端一致。若目标学校依赖的 Cookie 未正确抽取，登录/抓取会失败。
 */
class Session {
  private cookies = new Map<string, string>();

  header(): Record<string, string> {
    const value = Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    return value ? { Cookie: value } : {};
  }

  /** 从响应头吸收 Set-Cookie（RN fetch 可能把多个合并为逗号分隔，尽力解析）。 */
  absorb(res: Response): void {
    const raw = res.headers.get('set-cookie');
    if (!raw) return;
    // 逗号后跟「名字=」视为新一条 Cookie；Expires 里的逗号后面是日期，不会被误拆。
    for (const seg of raw.split(/,(?=\s*[A-Za-z][\w-]*=)/)) {
      const first = seg.split(';')[0].trim();
      const eq = first.indexOf('=');
      if (eq <= 0) continue;
      const name = first.slice(0, eq).trim();
      const value = first.slice(eq + 1).trim();
      if (name && value) this.cookies.set(name, value);
    }
  }
}

// ============================================================================
// 客户端
// ============================================================================
export class EduClient {
  private readonly session = new Session();
  private csrftoken = '';

  /**
   * 登录教务系统。无验证码时 captcha 可省略；需要验证码时抛 EduLoginError('captcha')，
   * 调用方用 getCaptchaImage 展示图片后带 captcha 重试（同一 EduClient 实例以复用会话）。
   */
  async login(username: string, password: string, captcha = ''): Promise<void> {
    // 1. 打开登录页：建立会话、取 csrftoken、判断是否需要验证码
    const loginHtml = await this.getText(LOGIN_PAGE);
    const csrf =
      loginHtml.match(/name="csrftoken"[^>]*value="([^"]*)"/)?.[1] ??
      loginHtml.match(/value="([^"]*)"[^>]*name="csrftoken"/)?.[1];
    if (!csrf) throw new EduLoginError('network', '未从登录页解析到 csrftoken（页面结构可能变化）');
    this.csrftoken = csrf;

    const needCaptcha = /name="yzm"|id="yzm"/.test(loginHtml);

    // 2. 取 RSA 公钥
    const key = await this.getJson<{ modulus: string; exponent: string }>(PUBLIC_KEY_URL);
    if (!key || !key.modulus) throw new EduLoginError('network', '获取登录公钥失败');

    // 3. 加密密码
    const mm = encryptPassword(password, key.modulus, key.exponent);

    // 4. 提交登录
    const body: Record<string, string> = { csrftoken: this.csrftoken, yhm: username, mm };
    if (needCaptcha) {
      if (!captcha) throw new EduLoginError('captcha', '登录需要验证码');
      body.yzm = captcha;
    }

    const result = await this.postText(LOGIN_PAGE, body);
    this.checkLoginResult(result);
  }

  /** 拉取登录验证码图片，返回 data URL（供 <Image> 展示）。需在触发验证码后再调用。 */
  async getCaptchaImage(): Promise<string> {
    const res = await this.request(`${CAPTCHA_URL}?t=${Date.now()}`);
    const buf = await res.arrayBuffer();
    const b64 = bytesToBase64(new Uint8Array(buf));
    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    return `data:${contentType};base64,${b64}`;
  }

  /** 抓取个人课表原始 JSON（登录后调用）。xnm/xqm 缺省按当前日期推断。 */
  async fetchSchedule(xnm?: string, xqm?: string): Promise<unknown> {
    const term = guessTerm();
    const xnmv = xnm ?? term.xnm;
    const xqmv = xqm ?? term.xqm;

    // 先访问课表查询页建立上下文（部分版本需先访问该页才能查数据）
    await this.getText(SCHEDULE_INDEX);

    const res = await this.request(SCHEDULE_DATA, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: SCHEDULE_INDEX,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: encodeForm({ xnm: xnmv, xqm: xqmv, kzlx: 'ck', xsdm: '' }),
    });

    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new EduLoginError('network', '课表接口返回非 JSON（会话可能已失效，请重新登录）');
    }
  }

  // ----------------------------------------------------------------------
  // 内部
  // ----------------------------------------------------------------------
  private async request(url: string, init?: RequestInit): Promise<Response> {
    const headers: Record<string, string> = {
      ...this.session.header(),
      ...((init?.headers as Record<string, string> | undefined) ?? {}),
    };
    const res = await fetch(url, { ...init, headers });
    this.session.absorb(res);
    return res;
  }

  private async getText(url: string): Promise<string> {
    const res = await this.request(url);
    return res.text();
  }

  private async getJson<T>(url: string): Promise<T> {
    const res = await this.request(url);
    return (await res.json()) as T;
  }

  private async postText(url: string, body: Record<string, string>): Promise<string> {
    const res = await this.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: LOGIN_PAGE,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: encodeForm(body),
    });
    return res.text();
  }

  private checkLoginResult(html: string): void {
    const trimmed = html.trim();

    // 部分版本登录返回 JSON（如 {"status":"200"}）
    if (trimmed.startsWith('{')) {
      try {
        const json = JSON.parse(trimmed) as { status?: string | number; msg?: string };
        if (json.status !== undefined) {
          if (String(json.status) === '200') return;
          throw new EduLoginError('credentials', json.msg || '登录失败');
        }
      } catch (err) {
        if (err instanceof EduLoginError) throw err;
        // 非 JSON，继续按 HTML 判断
      }
    }

    if (/用户名或密码不正确|用户名不存在|账号或密码错误|密码错误/.test(html)) {
      throw new EduLoginError('credentials', '账号或密码错误');
    }
    if (/验证码不正确|验证码错误|请输入验证码/.test(html)) {
      throw new EduLoginError('captcha', '验证码错误，请重新输入');
    }
    // 其余（含跳转后的首页 HTML / 空）视为成功
  }
}

// ============================================================================
// 一站式（不含验证码交互）：登录 + 抓取 + 解析。需要验证码时抛 EduLoginError('captcha')。
// 验证码场景请直接用 EduClient（见 login.tsx）。
// ============================================================================
export async function fetchCoursesFromEdu(
  username: string,
  password: string,
  options: { captcha?: string; totalWeeks?: number; xnm?: string; xqm?: string } = {},
): Promise<import('@/models/course').Course[]> {
  const client = new EduClient();
  await client.login(username, password, options.captcha);
  const json = await client.fetchSchedule(options.xnm, options.xqm);
  return parseScheduleJson(json, options.totalWeeks ?? 20);
}
