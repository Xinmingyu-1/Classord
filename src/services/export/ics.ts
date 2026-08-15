import { createEvents, type EventAttributes } from 'ics';

import type { Course } from '@/models/course';

/**
 * 将课程导出为 ICS 字符串（.ics 文件内容）。
 *
 * TODO：需结合学期开学日期，把「周次 + 节次」换算成具体日期时间
 * （当前占位：仅生成标题占位事件，未做真实时间换算）。
 */
export function coursesToIcs(courses: Course[]): string {
  const events: EventAttributes[] = courses.map((course) => ({
    // TODO：用「开学日期 + 周次 + 节次」换算真实日期，当前为占位时间。
    start: [2026, 9, 1, 8, 0],
    end: [2026, 9, 1, 9, 0],
    title: course.name,
    location: course.location || undefined,
    description: `${course.teacher ? `教师：${course.teacher}\n` : ''}周次：${course.weeks.join(', ')}`,
  }));

  const { error, value } = createEvents(events);
  if (error) throw new Error(String(error));
  return value ?? '';
}
