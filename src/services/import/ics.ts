import ICAL from 'ical.js';

import type { Course } from '@/models/course';
import { DEFAULT_COURSE_COLOR } from '@/theme/colors';
import { newId } from '@/utils/id';

/**
 * 解析 ICS 文件内容为 Course[]。
 *
 * TODO：当前仅做最小字段提取（SUMMARY→课程名、LOCATION→地点），
 * 周几/节次/周次的换算需结合 DTSTART/DTEND/RRULE 与学期开学日期实现。
 */
export function parseIcs(content: string): Course[] {
  const component = new ICAL.Component(ICAL.parse(content));
  const events = component.getAllSubcomponents('vevent');

  return events.map((event) => {
    const summary = event.getFirstPropertyValue('summary');
    const location = event.getFirstPropertyValue('location');
    return {
      id: newId(),
      name: String(summary ?? '未命名课程'),
      teacher: '',
      location: String(location ?? ''),
      dayOfWeek: 1,
      startPeriod: 1,
      endPeriod: 1,
      weeks: [],
      color: DEFAULT_COURSE_COLOR,
    };
  });
}
