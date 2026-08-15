import * as Notifications from 'expo-notifications';

import type { AppSettings, Course } from '@/models/course';

/** 请求通知权限，返回是否已授权。 */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * 按设置调度上课前提醒。
 *
 * TODO：需结合「开学日期 + 周次 + 节次时间 + remindBeforeMinutes」计算每个课程事件的
 * 具体触发时间，先取消旧通知，再调用 Notifications.scheduleNotificationAsync 逐个调度。
 */
export async function scheduleClassReminders(
  _courses: Course[],
  _settings: AppSettings,
): Promise<void> {
  // 占位：真实调度待实现
}
