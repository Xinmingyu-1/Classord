/** 计算当前处于学期第几周（与 courseDate/weekOfDate 一致：第 1 周以开学日所在周计）。 */
export function currentWeek(semesterStartISO: string): number {
  return weekOfDate(semesterStartISO, new Date());
}

/** 判断课程在指定周是否上课。 */
export function isCourseInWeek(weeks: number[], week: number): boolean {
  return weeks.includes(week);
}

const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;

/** 周几（1-7）→ 中文标签。 */
export function dayLabel(dayOfWeek: number): string {
  return DAY_LABELS[dayOfWeek - 1] ?? '';
}

/** 解析周次输入："1-16"、"1,3,5"（支持逗号/顿号/空格分隔与范围）。 */
export function parseWeeksText(input: string): number[] {
  const result: number[] = [];
  for (const part of input.split(/[,，、\s]+/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const range = trimmed.split('-');
    if (range.length === 2) {
      const a = Number(range[0]);
      const b = Number(range[1]);
      if (a > 0 && b >= a) for (let i = a; i <= b; i += 1) result.push(i);
    } else {
      const n = Number(trimmed);
      if (n > 0) result.push(n);
    }
  }
  return result;
}

/** 周次数组 → 紧凑文本（如 [1,2,3,4,6] → "1-4,6"）。 */
export function formatWeeks(weeks: number[]): string {
  if (weeks.length === 0) return '';
  const sorted = [...weeks].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i += 1) {
    const cur = sorted[i];
    if (cur === prev + 1) {
      prev = cur;
    } else {
      parts.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = cur;
      prev = cur;
    }
  }
  return parts.join(',');
}

/** 校验 "YYYY-MM-DD" 格式且为真实存在的日期（拒绝 2026-13-01、2026-02-30、2026/09/01 等）。 */
export function isValidIsoDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [year, month, day] = iso.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

/** 学期第 week 周、星期 dayOfWeek（1=周一 … 7=周日）对应的本地日期（第 1 周以开学日所在周计）。 */
export function courseDate(semesterStartISO: string, week: number, dayOfWeek: number): Date {
  const [year, month, day] = semesterStartISO.split('-').map(Number);
  const start = new Date(year, month - 1, day);
  const daysSinceMonday = (start.getDay() + 6) % 7; // 周一=0 … 周日=6
  const firstMonday = new Date(year, month - 1, day - daysSinceMonday);
  return new Date(
    firstMonday.getFullYear(),
    firstMonday.getMonth(),
    firstMonday.getDate() + (week - 1) * 7 + (dayOfWeek - 1),
  );
}

/** JS 星期（0=周日 … 6=周六）→ 应用周几（1=周一 … 7=周日）。 */
export function dayOfWeekOf(date: Date): number {
  return ((date.getDay() + 6) % 7) + 1;
}

/** 课程在指定周、周几、节次开始时间（"HH:mm"）对应的本地上课开始 Date。 */
export function courseStartDate(
  semesterStartISO: string,
  week: number,
  dayOfWeek: number,
  periodStart: string,
): Date {
  const base = courseDate(semesterStartISO, week, dayOfWeek);
  const [hour, minute] = periodStart.split(':').map(Number);
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), hour, minute);
}

/** 某日期落在学期第几周（以开学日所在周为第 1 周；早于第 1 周返回 1）。与 courseDate 互逆。 */
export function weekOfDate(semesterStartISO: string, date: Date): number {
  const [year, month, day] = semesterStartISO.split('-').map(Number);
  const start = new Date(year, month - 1, day);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  const firstMonday = new Date(year, month - 1, day - daysSinceMonday);
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((dateDay.getTime() - firstMonday.getTime()) / 86400000);
  return diffDays < 0 ? 1 : Math.floor(diffDays / 7) + 1;
}
