import * as SecureStore from 'expo-secure-store';

import type { Course } from '@/models/course';

const CREDENTIALS_KEY = 'edu_credentials';

export interface EduCredentials {
  username: string;
  password: string;
}

/** 凭据仅保存在本地 Keychain/Keystore（README：不上传、仅临时使用）。 */
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

/**
 * 模拟登录教务系统并抓取当前学期课表。
 *
 * TODO（依赖具体教务系统，暂无法实现）：
 * - 登录请求与 Cookie/会话管理
 * - 验证码展示与回填
 * - 目标学校页面结构
 *
 * README 建议：若存在反爬或 HTML 结构复杂，改用云函数代理抓取，App 只消费标准化 JSON。
 */
export async function fetchScheduleFromEdu(
  _username: string,
  _password: string,
): Promise<Course[]> {
  throw new Error('教务系统抓取尚未实现：需要目标教务系统的登录与页面结构信息。');
}
