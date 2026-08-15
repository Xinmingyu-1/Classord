import { Platform } from 'react-native';

import type { AppSettings, Course } from '@/models/course';
import { courseStartDate, dayLabel } from '@/utils/date';

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
 * 配置前台收到通知时的展示行为（应在 App 启动时调用一次）。
 *
 * 不设置 handler 时，通知在前台默认不展示；这里让上课提醒即使 App 在前台也弹出。
 */
export function configureNotificationHandler(): void {
  void loadNotifications().then((Notifications) => {
    if (!Notifications) return;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  });
}

/** 单条待调度的上课提醒。 */
export interface ClassReminder {
  /** 稳定标识，同一课程同一周次重复调度时保持一致。 */
  identifier: string;
  /** 触发时间（上课开始时间 - 提前分钟数）。 */
  date: Date;
  title: string;
  body: string;
}

/**
 * 由课程与设置计算所有待调度的上课提醒（纯函数，便于单元测试）。
 *
 * 只保留触发时间在未来、且提前分钟数 > 0 的提醒；提前分钟数 ≤ 0 视为关闭提醒。
 * 返回结果按触发时间从近到远排序。
 */
export function computeReminders(courses: Course[], settings: AppSettings): ClassReminder[] {
  const { semesterStart, periods, remindBeforeMinutes } = settings;
  if (remindBeforeMinutes <= 0) return [];

  const now = Date.now();
  const reminders: ClassReminder[] = [];

  for (const course of courses) {
    const period = periods[course.startPeriod - 1];
    if (!period) continue; // 节次越界保护

    for (const week of course.weeks) {
      const classDate = courseStartDate(semesterStart, week, course.dayOfWeek, period.start);
      const trigger = new Date(classDate.getTime() - remindBeforeMinutes * 60 * 1000);
      if (trigger.getTime() <= now) continue; // 已过期的课不再提醒

      const location = course.location ? ` · ${course.location}` : '';
      reminders.push({
        identifier: `${course.id}:${week}`,
        date: trigger,
        title: `${course.name} 上课提醒`,
        body: `${dayLabel(course.dayOfWeek)} 第 ${week} 周 第 ${course.startPeriod}-${course.endPeriod} 节${location}`,
      });
    }
  }

  reminders.sort(
    (a, b) => a.date.getTime() - b.date.getTime() || a.identifier.localeCompare(b.identifier),
  );
  return reminders;
}

/**
 * 按设置调度上课前提醒。
 *
 * 先取消全部旧通知，再按触发时间从近到远调度。iOS 待处理通知上限为 64 条、Android 为 500 条，
 * 超出部分按最近时间截断；App 每次启动 / 改设置 / 改课程时都会重新调度，时间窗口随之前移。
 */
export async function scheduleClassReminders(
  courses: Course[],
  settings: AppSettings,
): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;

  const maxPending = Platform.OS === 'ios' ? 64 : 500;
  const reminders = computeReminders(courses, settings);

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (reminders.length > maxPending) {
      console.warn(
        `[notifications] 待调度提醒 ${reminders.length} 条，超过 ${Platform.OS} 上限 ${maxPending}，已按最近时间截断。`,
      );
    }

    for (const reminder of reminders.slice(0, maxPending)) {
      await Notifications.scheduleNotificationAsync({
        identifier: reminder.identifier,
        content: { title: reminder.title, body: reminder.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.date },
      });
    }
  } catch (e) {
    console.warn('[notifications] 调度提醒失败，已跳过：', e);
  }
}
