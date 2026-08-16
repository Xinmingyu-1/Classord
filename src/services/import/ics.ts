import ICAL from 'ical.js';

import type { AppSettings, Course } from '@/models/course';
import { DEFAULT_COURSE_COLOR } from '@/theme/colors';
import { courseDate, dayOfWeekOf, weekOfDate } from '@/utils/date';
import { newId } from '@/utils/id';

/** 将 Date 转为 "HH:MM"（本地时区）。 */
function toHHMM(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** 解析 "HH:MM" 为分钟数。 */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * 把事件时间匹配到节次（返回 1-based 节次号）。
 *
 * 优先精确匹配节次的 start/end 时间；对不上时按「事件时间落在某节次区间内」判定；
 * 仍无匹配（如落在课间、或超出全天节次）则取时间最接近的节次。避免旧实现「一律兜底到第 1 节」的静默错配。
 */
function matchPeriod(periods: AppSettings['periods'], time: Date, key: 'start' | 'end'): number {
  const hhmm = toHHMM(time);
  const t = toMinutes(hhmm);

  const exactIdx = periods.findIndex((p) => p[key] === hhmm);
  if (exactIdx >= 0) return exactIdx + 1;

  for (let i = 0; i < periods.length; i += 1) {
    const s = toMinutes(periods[i].start);
    const e = toMinutes(periods[i].end);
    if (t >= s && t <= e) return i + 1;
  }

  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < periods.length; i += 1) {
    const dist = Math.abs(t - toMinutes(periods[i][key]));
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best + 1;
}

/** 把 ical.js 的取值转成 JS Date（仅 Time 类型；字符串/Duration/空返回 null）。 */
function toJSDate(value: unknown): Date | null {
  if (value && typeof value === 'object' && 'toJSDate' in value) {
    return (value as { toJSDate(): Date }).toJSDate();
  }
  return null;
}

/** 判断日期是否落在学期范围内（第 1 周周一 ~ 第 totalWeeks 周周日，含端点）。 */
function isInSemester(date: Date, settings: AppSettings): boolean {
  const first = courseDate(settings.semesterStart, 1, 1);
  const last = courseDate(settings.semesterStart, settings.totalWeeks, 7);
  const dayAfterLast = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
  return date >= first && date < dayAfterLast;
}

/**
 * 展开单个 VEVENT 的所有开始时间（Date[]），只保留落在学期范围内的 occurrence。
 *
 * 无 RRULE 时校验 DTSTART 是否在学期内（weekOfDate 会把早于开学日的日期钳到第 1 周，
 * 需用 isInSemester 排除历史事件）；有 RRULE 时用 RecurExpansion 展开（含 RDATE/EXDATE），
 * 早于开学的 occurrence 跳过、超出学期末尾则停止（RRULE 按时间递增）。迭代设上限防无限规则。
 */
function expandStarts(event: ICAL.Component, settings: AppSettings): Date[] {
  const dtstart = event.getFirstPropertyValue('dtstart');
  if (!(dtstart instanceof ICAL.Time)) return [];

  const rrule = event.getFirstPropertyValue('rrule');
  if (!(rrule instanceof ICAL.Recur)) {
    const date = dtstart.toJSDate();
    return isInSemester(date, settings) ? [date] : [];
  }

  const expand = new ICAL.RecurExpansion({ component: event, dtstart });
  const result: Date[] = [];
  let guard = 0;
  let next: ICAL.Time | null = expand.next();
  while (next && guard < 500) {
    const date = next.toJSDate();
    if (isInSemester(date, settings)) {
      result.push(date);
    } else if (weekOfDate(settings.semesterStart, date) > settings.totalWeeks) {
      break; // 已过学期末尾
    }
    next = expand.next();
    guard += 1;
  }
  return result;
}

/**
 * 解析 ICS 文件内容为 Course[]。
 *
 * 按每个 VEVENT（含 RRULE 展开）的 DTSTART/DTEND 结合「开学日期 + 节次时间表」
 * 反推周几/节次/周次，再将同「课程名 + 地点 + 周几 + 节次」的事件合并为一门课
 * （weeks 聚合去重排序）。
 */
export function parseIcs(content: string, settings: AppSettings): Course[] {
  const component = new ICAL.Component(ICAL.parse(content));
  const events = component.getAllSubcomponents('vevent');

  const groups = new Map<string, Course & { weekSet: Set<number> }>();

  for (const event of events) {
    const startDate = toJSDate(event.getFirstPropertyValue('dtstart'));
    if (!startDate) continue; // 无开始时间的事件无法定位，跳过

    const endDate = toJSDate(event.getFirstPropertyValue('dtend'));
    const durationMs = endDate ? endDate.getTime() - startDate.getTime() : 0;

    const summary = event.getFirstPropertyValue('summary');
    const location = event.getFirstPropertyValue('location');
    const name = typeof summary === 'string' && summary ? summary : '未命名课程';
    const locationText = typeof location === 'string' ? location : '';

    const starts = expandStarts(event, settings);
    for (const occStart of starts) {
      const occEnd = durationMs > 0 ? new Date(occStart.getTime() + durationMs) : null;
      const dayOfWeek = dayOfWeekOf(occStart);
      const week = weekOfDate(settings.semesterStart, occStart);
      const startPeriod = matchPeriod(settings.periods, occStart, 'start');
      const endPeriod = occEnd
        ? Math.max(matchPeriod(settings.periods, occEnd, 'end'), startPeriod)
        : startPeriod;

      const key = [name, locationText, dayOfWeek, startPeriod, endPeriod].join('::');
      let group = groups.get(key);
      if (!group) {
        group = {
          id: newId(),
          name,
          teacher: '',
          location: locationText,
          dayOfWeek,
          startPeriod,
          endPeriod,
          weeks: [],
          color: DEFAULT_COURSE_COLOR,
          weekSet: new Set(),
        };
        groups.set(key, group);
      }
      group.weekSet.add(week);
    }
  }

  return Array.from(groups.values()).map(({ weekSet, ...course }) => ({
    ...course,
    weeks: Array.from(weekSet).sort((a, b) => a - b),
  }));
}
