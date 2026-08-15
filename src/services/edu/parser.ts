import type { Course } from '@/models/course';

/**
 * 将教务系统返回的课表 HTML 解析为 Course[]。
 *
 * TODO（依赖目标页面结构）：React Native 内解析 HTML 较麻烦，
 * 建议由云函数返回标准化 JSON，此处仅消费 JSON（见 client.fetchScheduleFromEdu）。
 */
export function parseScheduleHtml(_html: string): Course[] {
  throw new Error('HTML 解析尚未实现：需要目标教务系统的页面结构。');
}
