/** 计算当前处于学期第几周（从 1 开始；开学日之前按第 1 周处理）。 */
export function currentWeek(semesterStartISO: string): number {
  const start = new Date(semesterStartISO).getTime();
  const now = Date.now();
  if (now < start) return 1;
  const diffDays = Math.floor((now - start) / (24 * 60 * 60 * 1000));
  return Math.floor(diffDays / 7) + 1;
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
