import * as SecureStore from 'expo-secure-store';

import { parseScheduleJson } from '@/services/edu/parser';
import { bytesToBase64, encryptPassword } from '@/services/edu/rsa';

// ============================================================================
// 配置：目标教务系统（河北师范大学 正方教务系统）。
// 接口/字段以常见正方版本为准；若实际接口不同，改这里即可，逻辑无需改动。
// ============================================================================
export const EDU_BASE = 'http://jwgl.hebtu.edu.cn';
const LOGIN_PAGE = `${EDU_BASE}/xtgl/login_slogin.html`;
const PUBLIC_KEY_URL = `${EDU_BASE}/xtgl/login_getPublicKey.html`;
// 验证码图片接口。本校 login.js 的 refreshCode() 用 `_path + '/kaptcha'`，故为 /kaptcha（非 /xtgl/verifycodeServlet）。
// 仅在连续登录失败触发验证码后才会在页面出现 #yzmDiv/#yzmPic。
const CAPTCHA_URL = `${EDU_BASE}/kaptcha`;
export const SCHEDULE_INDEX = `${EDU_BASE}/kbcx/xskbcx_cxXskbcxIndex.html?gnmkdm=N2151&layout=default`;
export const SCHEDULE_DATA = `${EDU_BASE}/kbcx/xskbcx_cxXsgrkb.html?gnmkdm=N2151`;

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
 * 会话 Cookie 说明：不再手动解析 Set-Cookie（RN 的 fetch 不暴露该响应头、也不默认持久化 Cookie），
 * 改为在 request() 里用 credentials: 'include' 让原生 Cookie 存储自动保存并回带 JSESSIONID。
 */

/** 从登录页 HTML 提取所有隐藏表单字段（name → value）。name/value 兼容带引号与不带引号两种写法。 */
function extractHiddenFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const re = /<input\b[^>]*\btype\s*=\s*["']?hidden["']?[^>]*>/gi;
  for (const tag of html.match(re) ?? []) {
    const name = tag.match(/\bname\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const value = tag.match(/\bvalue\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/i);
    if (!name) continue;
    const n = name[1] ?? name[2] ?? name[3] ?? '';
    const v = value ? (value[1] ?? value[2] ?? value[3] ?? '') : '';
    fields[n] = v;
  }
  return fields;
}

/** 从登录页 HTML 提取验证码图片地址（相对路径补全为绝对；找不到返回空串）。 */
function extractCaptchaUrl(html: string): string {
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    if (!/yzm|captcha|verify|checkcode|kaptcha/i.test(tag)) continue;
    const src = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!src) continue;
    if (/^https?:\/\//i.test(src)) return src;
    return src.startsWith('/') ? `${EDU_BASE}${src}` : `${EDU_BASE}/xtgl/${src}`;
  }
  return '';
}

// ============================================================================
// 客户端
// ============================================================================
export class EduClient {
  private csrftoken = '';
  /** 从登录页提取的验证码图片地址（登录后可用；为空时回退 CAPTCHA_URL）。 */
  private captchaUrl = '';

  /**
   * 预探测登录页：建立会话、缓存 csrftoken 与验证码地址，并返回是否需要验证码。
   * 供登录页在提交前提前拉取验证码，把「点两次登录」压成「点一次」。
   */
  async prepare(): Promise<{ needCaptcha: boolean }> {
    const loginHtml = await this.getText(LOGIN_PAGE);
    const csrf =
      loginHtml.match(/name="csrftoken"[^>]*value="([^"]*)"/)?.[1] ??
      loginHtml.match(/value="([^"]*)"[^>]*name="csrftoken"/)?.[1];
    if (csrf) this.csrftoken = csrf;
    this.captchaUrl = extractCaptchaUrl(loginHtml) || CAPTCHA_URL;
    return { needCaptcha: /name="yzm"|id="yzm"/.test(loginHtml) };
  }

  /**
   * 登录教务系统。无验证码时 captcha 可省略；需要验证码时抛 EduLoginError('captcha')，
   * 调用方用 getCaptchaImage 展示图片后带 captcha 重试（同一 EduClient 实例以复用会话）。
   */
  async login(username: string, password: string, captcha = ''): Promise<void> {
    // 1. 打开登录页：建立会话、取 csrftoken、判断是否需要验证码
    const loginHtml = await this.getText(LOGIN_PAGE);
    // 已登录时访问登录页会被重定向到首页，页面里没有 yhm/csrftoken 输入框；
    // 此时会话仍有效，直接跳过登录提交（否则会误报「页面结构可能变化」）。
    if (!/name="yhm"|id="yhm"|name="csrftoken"/.test(loginHtml)) return;

    const csrf =
      loginHtml.match(/name="csrftoken"[^>]*value="([^"]*)"/)?.[1] ??
      loginHtml.match(/value="([^"]*)"[^>]*name="csrftoken"/)?.[1];
    if (!csrf) throw new EduLoginError('network', '未从登录页解析到 csrftoken（页面结构可能变化）');
    this.csrftoken = csrf;
    this.captchaUrl = extractCaptchaUrl(loginHtml) || CAPTCHA_URL;

    const needCaptcha = /name="yzm"|id="yzm"/.test(loginHtml);

    // 2. 取 RSA 公钥
    const key = await this.getJson<{ modulus: string; exponent: string }>(PUBLIC_KEY_URL);
    if (!key || !key.modulus) throw new EduLoginError('network', '获取登录公钥失败');

    // 3. 加密密码
    const mm = encryptPassword(password, key.modulus, key.exponent);

    // 4. 提交登录。字段对齐真实表单：除 yhm/mm 外，还要把登录页里的隐藏字段一并提交——
    //    其中 mmsfjm=1 告诉服务端「密码已 RSA 加密」，缺了它服务端会把密文当明文比对，
    //    从而报「用户名或密码不正确」。csrftoken 是逗号连接的 uuid,compactUUID。
    const body: Record<string, string> = {
      ...extractHiddenFields(loginHtml),
      csrftoken: this.csrftoken,
      language: 'zh_CN',
      yhm: username,
      mm,
    };
    if (needCaptcha) {
      if (!captcha) throw new EduLoginError('captcha', '登录需要验证码');
      body.yzm = captcha;
    }

    const result = await this.postText(LOGIN_PAGE, body);
    this.checkLoginResult(result);
  }

  /** 拉取登录验证码图片，返回 data URL（供 <Image> 展示）。需在触发验证码后再调用。 */
  async getCaptchaImage(): Promise<string> {
    const url = this.captchaUrl || CAPTCHA_URL;
    const res = await this.request(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`);
    const rawType = res.headers.get('content-type') ?? '';
    // 归一化 MIME：去掉 ;charset=... 等参数，避免 data URI 混入 charset 导致 <Image> 无法渲染
    const mime = (rawType.split(';')[0] || 'image/jpeg').trim();
    if (rawType && !mime.startsWith('image/')) {
      throw new EduLoginError('network', `验证码接口返回非图片（${rawType}），地址可能不对：${url}`);
    }
    const buf = await res.arrayBuffer();
    const b64 = bytesToBase64(new Uint8Array(buf));
    return `data:${mime};base64,${b64}`;
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
    // credentials: 'include' 让 RN 原生网络层用原生 Cookie 存储自动保存并回带会话 Cookie（JSESSIONID）。
    // RN 的 fetch 不暴露 set-cookie 响应头、默认也不持久化 Cookie；不设置的话登录页/公钥/登录提交
    // 会散落在不同会话，导致 csrftoken 校验失败、被服务端当成「账号或密码错误」。
    const res = await fetch(url, { ...init, credentials: 'include' });
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
    // 登录是普通表单提交（document.forms[0].submit()），不带 X-Requested-With（那是 AJAX 才有的头）。
    const res = await this.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: LOGIN_PAGE,
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
