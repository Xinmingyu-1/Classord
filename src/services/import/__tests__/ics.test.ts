import type { AppSettings, Period } from '@/models/course';
import { matchPeriod, parseIcs } from '@/services/import/ics';

/** 构造本地时间 Date（时、分）。 */
const at = (h: number, m: number) => new Date(2026, 8, 1, h, m);

// 两个节次，中间留 15 分钟课间（08:45 ~ 09:00）
const periods: Period[] = [
  { start: '08:00', end: '08:45' }, // 第 1 节
  { start: '09:00', end: '09:45' }, // 第 2 节
];

describe('matchPeriod 三级匹配（精确 → 包含 → 最近）', () => {
  test('精确匹配节次起止时间', () => {
    expect(matchPeriod(periods, at(8, 0), 'start')).toBe(1);
    expect(matchPeriod(periods, at(9, 0), 'start')).toBe(2);
    expect(matchPeriod(periods, at(8, 45), 'end')).toBe(1);
    expect(matchPeriod(periods, at(9, 45), 'end')).toBe(2);
  });

  test('落在节次区间内（包含匹配）', () => {
    expect(matchPeriod(periods, at(8, 30), 'start')).toBe(1);
    expect(matchPeriod(periods, at(9, 30), 'start')).toBe(2);
  });

  test('课间无精确/包含时取最近，且 start/end 结果不同', () => {
    // 08:52 处于 08:45~09:00 课间：按 start 最近是 09:00（第 2 节），按 end 最近是 08:45（第 1 节）
    expect(matchPeriod(periods, at(8, 52), 'start')).toBe(2);
    expect(matchPeriod(periods, at(8, 52), 'end')).toBe(1);
  });

  test('早于第一节 / 晚于最后一节', () => {
    expect(matchPeriod(periods, at(7, 30), 'start')).toBe(1);
    expect(matchPeriod(periods, at(10, 30), 'start')).toBe(2);
    expect(matchPeriod(periods, at(10, 30), 'end')).toBe(2);
  });
});

describe('parseIcs RRULE 展开上限', () => {
  const settings: AppSettings = {
    semesterStart: '2026-09-01',
    totalWeeks: 20,
    periods: [
      { start: '08:00', end: '08:45' }, // 第 1 节
      { start: '09:00', end: '09:45' }, // 第 2 节
    ],
    theme: 'system',
    remindBeforeMinutes: 10,
    notificationsEnabled: false,
  };

  test('DTSTART 远早于开学 + FREQ=DAILY 不被迭代上限截断', () => {
    // 2025-01-01 距 2026-09-01 超过 500 天：旧的写死上限 500 会在走到学期内之前就截断，返回空。
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:far-dtstart-daily',
      'DTSTART:20250101T080000',
      'DTEND:20250101T090000',
      'RRULE:FREQ=DAILY',
      'SUMMARY:测试课',
      'LOCATION:教室A',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const courses = parseIcs(ics, settings);
    // 每天一节课 → 按周几分组为 7 门课，每门覆盖整个 20 周。
    expect(courses).toHaveLength(7);
    const weeks = Array.from({ length: 20 }, (_, i) => i + 1);
    for (const course of courses) {
      expect(course.weeks).toEqual(weeks);
    }
  });
});
