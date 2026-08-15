import type { AppSettings, Course } from '@/models/course';

/**
 * 按需加载 expo-notifications。
 *
 * 注意：SDK 53 起 Android 的 Expo Go 移除了远程推送支持，`expo-notifications`
 * 在 import 阶段就会因其自动注册副作用抛错（见 DevicePushTokenAutoRegistration.fx），
 * 故不顶层 import，改为动态加载，失败时返回 null 以优雅降级。
 */
async function loadNotifications() {
  try {
    return await import('expo-notifications');
  } catch {
    console.warn('[notifications] expo-notifications 不可用（Expo Go Android 无远程推送支持），已降级。');
    return null;
  }
}

/** 请求通知权限，返回是否已授权（Expo Go Android 下不可用，返回 false）。 */
export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;
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
