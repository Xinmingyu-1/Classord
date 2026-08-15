import { createEvents, type EventAttributes } from 'ics';

import type { AppSettings, Course } from '@/models/course';
import { courseDate } from '@/utils/date';

/** 解析 "HH:MM" 为时、分。 */
function toTime(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(':').map(Number);
  return { hour, minute };
}

/**
 * 将课程导出为 ICS 字符串（.ics 文件内容）。
 *
 * 每个「课程 × 周次」生成一个独立事件，日期时间由「开学日期 + 周次 + 节次时间表」换算：
 * 第 1 周以开学日所在周计，dayOfWeek 决定周几，节次时间取自 settings.periods。
 */
export function coursesToIcs(courses: Course[], settings: AppSettings): string {
  const events: EventAttributes[] = [];

  for (const course of courses) {
    const startPeriod = settings.periods[course.startPeriod - 1];
    const endPeriod = settings.periods[course.endPeriod - 1];
    if (!startPeriod || !endPeriod) continue; // 节次越界（如自定义节次表被缩短），跳过该课程

    const startTime = toTime(startPeriod.start);
    const endTime = toTime(endPeriod.end);

    for (const week of course.weeks) {
      const date = courseDate(settings.semesterStart, week, course.dayOfWeek);
      events.push({
        start: [date.getFullYear(), date.getMonth() + 1, date.getDate(), startTime.hour, startTime.minute],
        end: [date.getFullYear(), date.getMonth() + 1, date.getDate(), endTime.hour, endTime.minute],
        title: course.name,
        location: course.location || undefined,
        description: `${course.teacher ? `教师：${course.teacher}\n` : ''}第 ${week} 周`,
      });
    }
  }

  const { error, value } = createEvents(events);
  if (error) throw new Error(String(error));
  return value ?? '';
}
