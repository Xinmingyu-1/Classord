import type { AppSettings, Course, Period } from '@/models/course';
import { computeReminders } from '@/notifications/schedule';

// 固定当前时间：2026-02-25（周三）12:00。开学日 2026-02-23 为周一。
const NOW = new Date(2026, 1, 25, 12, 0);

const periods: Period[] = [
  { start: '08:00', end: '08:45' }, // 第 1 节
  { start: '09:00', end: '09:45' }, // 第 2 节
];

const baseSettings: AppSettings = {
  semesterStart: '2026-02-23',
  totalWeeks: 20,
  periods,
  theme: 'light',
  style: 'glass',
  backgroundImage: null,
  backgroundScrim: 'medium',
  remindBeforeMinutes: 10,
  notificationsEnabled: true,
};

const makeCourse = (overrides: Partial<Course> = {}): Course => ({
  id: 'c1',
  name: '高等数学',
  teacher: '张三',
  location: '教一101',
  dayOfWeek: 1, // 周一
  startPeriod: 1,
  endPeriod: 2,
  weeks: [1],
  color: '#000000',
  ...overrides,
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('computeReminders 通知触发时间计算', () => {
  test('通知总开关关闭时返回空', () => {
    const reminders = computeReminders([makeCourse()], {
      ...baseSettings,
      notificationsEnabled: false,
    });
    expect(reminders).toEqual([]);
  });

  test('提前分钟数为 0 或负数时返回空', () => {
    expect(
      computeReminders([makeCourse()], { ...baseSettings, remindBeforeMinutes: 0 }),
    ).toEqual([]);
    expect(
      computeReminders([makeCourse()], { ...baseSettings, remindBeforeMinutes: -5 }),
    ).toEqual([]);
  });

  test('节次越界（startPeriod 超出 periods 长度）的课程被跳过', () => {
    const reminders = computeReminders([makeCourse({ startPeriod: 3 })], baseSettings);
    expect(reminders).toEqual([]);
  });

  test('触发时间为上课开始时间减去提前分钟数', () => {
    // 第 2 周周一 08:00 = 2026-03-02，提前 10 分钟 = 07:50
    const reminders = computeReminders(
      [makeCourse({ id: 'math', weeks: [2], startPeriod: 1 })],
      baseSettings,
    );
    expect(reminders).toHaveLength(1);
    expect(reminders[0].date).toEqual(new Date(2026, 2, 2, 7, 50));
  });

  test('触发时间不晚于当前时间的课程被过滤', () => {
    // 第 1 周周一 08:00 = 2026-02-23 07:50，早于 NOW（02-25 12:00）
    const reminders = computeReminders([makeCourse({ weeks: [1] })], baseSettings);
    expect(reminders).toEqual([]);
  });

  test('identifier、title、body 文案格式', () => {
    const reminders = computeReminders(
      [
        makeCourse({
          id: 'math-101',
          name: '高等数学',
          dayOfWeek: 1,
          startPeriod: 1,
          endPeriod: 2,
          weeks: [2],
          location: '教一101',
        }),
      ],
      baseSettings,
    );
    expect(reminders).toHaveLength(1);
    expect(reminders[0].identifier).toBe('math-101:2');
    expect(reminders[0].title).toBe('高等数学 上课提醒');
    expect(reminders[0].body).toBe('周一 第 2 周 第 1-2 节 · 教一101');
  });

  test('无地点时 body 不追加地点后缀', () => {
    const reminders = computeReminders(
      [makeCourse({ location: '', dayOfWeek: 1, startPeriod: 1, endPeriod: 2, weeks: [2] })],
      baseSettings,
    );
    expect(reminders[0].body).toBe('周一 第 2 周 第 1-2 节');
  });

  test('同一课程多周展开为多条，并按触发时间从近到远排序', () => {
    const reminders = computeReminders([makeCourse({ id: 'm', weeks: [3, 2] })], baseSettings);
    expect(reminders.map((r) => r.identifier)).toEqual(['m:2', 'm:3']);
    expect(reminders.map((r) => r.date)).toEqual([
      new Date(2026, 2, 2, 7, 50),
      new Date(2026, 2, 9, 7, 50),
    ]);
  });

  test('触发时间相同时按 identifier 字典序稳定排序', () => {
    const reminders = computeReminders(
      [
        makeCourse({ id: 'b-course', weeks: [2] }),
        makeCourse({ id: 'a-course', weeks: [2] }),
      ],
      baseSettings,
    );
    expect(reminders.map((r) => r.identifier)).toEqual(['a-course:2', 'b-course:2']);
  });
});
