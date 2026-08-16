import type { Period } from '@/models/course';
import { matchPeriod } from '@/services/import/ics';

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
