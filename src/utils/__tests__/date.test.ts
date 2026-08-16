import {
  courseDate,
  courseStartDate,
  dayLabel,
  dayOfWeekOf,
  formatWeeks,
  isCourseInWeek,
  isValidIsoDate,
  parseWeeksText,
  weekOfDate,
} from '@/utils/date';

describe('dayLabel', () => {
  test('周几 → 中文标签', () => {
    expect(dayLabel(1)).toBe('周一');
    expect(dayLabel(7)).toBe('周日');
    expect(dayLabel(0)).toBe('');
    expect(dayLabel(8)).toBe('');
  });
});

describe('dayOfWeekOf', () => {
  test('JS 星期（0=周日）→ 应用周几（1=周一）', () => {
    expect(dayOfWeekOf(new Date(1970, 0, 1))).toBe(4); // 1970-01-01 周四
    expect(dayOfWeekOf(new Date(1970, 0, 4))).toBe(7); // 周日
    expect(dayOfWeekOf(new Date(1970, 0, 5))).toBe(1); // 周一
  });
});

describe('isValidIsoDate', () => {
  test('合法日期通过', () => {
    expect(isValidIsoDate('2026-09-01')).toBe(true);
    expect(isValidIsoDate('2024-02-29')).toBe(true); // 闰年
    expect(isValidIsoDate('2026-12-31')).toBe(true);
  });

  test('格式/真实日期非法被拒绝', () => {
    expect(isValidIsoDate('2026/09/01')).toBe(false);
    expect(isValidIsoDate('abc')).toBe(false);
    expect(isValidIsoDate('')).toBe(false);
    expect(isValidIsoDate('2026-13-01')).toBe(false); // 月越界
    expect(isValidIsoDate('2026-02-30')).toBe(false); // 不存在的日期
    expect(isValidIsoDate('2026-00-10')).toBe(false);
    expect(isValidIsoDate('2026-9-1')).toBe(false); // 缺前导零
  });
});

describe('courseDate / weekOfDate 周次换算', () => {
  test('开学日是周一时，第 1 周周几正确', () => {
    // 2026-08-31 是周一
    expect(courseDate('2026-08-31', 1, 1).getDate()).toBe(31);
    expect(dayOfWeekOf(courseDate('2026-08-31', 1, 1))).toBe(1);
    expect(courseDate('2026-08-31', 1, 5).getDate()).toBe(4); // 09-04 周五
    expect(courseDate('2026-08-31', 2, 1).getDate()).toBe(7); // 09-07 周一
  });

  test('开学日不是周一时，第 1 周从开学日所在周的周一开始', () => {
    // 2026-09-01 是周二，所在周的周一是 08-31
    const week1Mon = courseDate('2026-09-01', 1, 1);
    expect(week1Mon.getFullYear()).toBe(2026);
    expect(week1Mon.getMonth()).toBe(7); // 8 月（0-based）
    expect(week1Mon.getDate()).toBe(31);
    // 第 1 周周二 = 开学日本身
    expect(courseDate('2026-09-01', 1, 2).getDate()).toBe(1);
    expect(courseDate('2026-09-01', 1, 2).getMonth()).toBe(8);
  });

  test('weekOfDate 与 courseDate 互逆（遍历周次/周几）', () => {
    const start = '2026-09-01';
    for (let week = 1; week <= 20; week += 1) {
      for (let day = 1; day <= 7; day += 1) {
        const date = courseDate(start, week, day);
        expect(weekOfDate(start, date)).toBe(week);
        expect(dayOfWeekOf(date)).toBe(day);
      }
    }
  });

  test('weekOfDate 对早于第 1 周的日期钳到第 1 周', () => {
    // 08-30（周日）早于第 1 周周一 08-31
    expect(weekOfDate('2026-08-31', new Date(2026, 7, 30))).toBe(1);
    expect(weekOfDate('2026-09-01', new Date(2026, 7, 30))).toBe(1);
  });
});

describe('parseWeeksText', () => {
  test('范围与单值混合', () => {
    expect(parseWeeksText('1-16')).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
    expect(parseWeeksText('1,3,5')).toEqual([1, 3, 5]);
    expect(parseWeeksText('1-3,5')).toEqual([1, 2, 3, 5]);
    expect(parseWeeksText('1-3,7-9')).toEqual([1, 2, 3, 7, 8, 9]);
  });

  test('分隔符支持逗号/顿号/空格', () => {
    expect(parseWeeksText('1 3 5')).toEqual([1, 3, 5]);
    expect(parseWeeksText('1、3、5')).toEqual([1, 3, 5]);
  });

  test('非法输入返回空数组', () => {
    expect(parseWeeksText('')).toEqual([]);
    expect(parseWeeksText('abc')).toEqual([]);
    expect(parseWeeksText('0')).toEqual([]);
  });
});

describe('formatWeeks', () => {
  test('紧凑化连续区间', () => {
    expect(formatWeeks([1, 2, 3, 4, 6])).toBe('1-4,6');
    expect(formatWeeks([1, 3, 5])).toBe('1,3,5');
    expect(formatWeeks([1])).toBe('1');
    expect(formatWeeks([2, 3])).toBe('2-3');
    expect(formatWeeks([])).toBe('');
  });

  test('与 parseWeeksText 互逆', () => {
    expect(formatWeeks(parseWeeksText('1-16'))).toBe('1-16');
    expect(formatWeeks(parseWeeksText('1,3,5'))).toBe('1,3,5');
  });
});

describe('isCourseInWeek / courseStartDate', () => {
  test('isCourseInWeek', () => {
    expect(isCourseInWeek([1, 2, 3], 2)).toBe(true);
    expect(isCourseInWeek([1, 2, 3], 4)).toBe(false);
  });

  test('courseStartDate 拼接日期与节次时间', () => {
    const d = courseStartDate('2026-08-31', 1, 1, '08:00');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(31);
    expect(d.getHours()).toBe(8);
    expect(d.getMinutes()).toBe(0);
  });
});
