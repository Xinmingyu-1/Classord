import type { Course } from '@/models/course';
import { DEFAULT_COURSE_COLOR } from '@/theme/colors';
import { newId } from '@/utils/id';

/**
 * 正方教务系统「个人课表」接口（kbcx/xskbcx_cxXsgrkb.html?gnmkdm=N2151）返回的 JSON。
 *
 * 返回结构通常为 { kbList: [ ... ] }（部分版本外层再包一层 data）。
 * kbList 元素字段名在不同学校/版本略有差异，取值时做了多候选兼容；
 * 若目标学校字段仍对不上，只需在下方取字段处补充候选名。
 */
export interface EduScheduleEntry {
  [key: string]: unknown;
  kcmc?: string; // 课程名称
  xm?: string; // 教师姓名
  jsxm?: string; // 教师姓名（备选）
  xqjmc?: string; // 校区名称
  jasmc?: string; // 教室名称
  cdmc?: string; // 场地名称（备选）
  xqj?: number | string; // 星期几（1=周一 … 7=周日）
  skxq?: number | string; // 星期几（备选）
  jcs?: string; // 节次，如 "1-2"
  skjc?: string | number; // 节次（备选）
  jc?: string | number; // 节次（备选）
  zcd?: string; // 周次，如 "1-16" / "1-16周"
  zcs?: string; // 周次（备选）
  skzc?: string; // 周次（备选）
}

/** 取第一个非空字符串。 */
function firstString(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

/** 取第一个可解析为数字的值。 */
function firstNumber(...values: unknown[]): number {
  for (const v of values) {
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

/** 解析节次 "1-2" / "第1-2节" / "1,2" → [起始, 结束]（1-based）。 */
function parsePeriods(raw: string): [number, number] {
  const nums = raw
    .replace(/[第节\s]/g, '')
    .split(/[-—,，、]/)
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n > 0);
  if (nums.length === 0) return [1, 1];
  return [Math.min(...nums), Math.max(...nums)];
}

/** 解析周次 "1-16" / "1-16周" / "1-16周(单)" / "1,3,5周" / "单周" / "双周" → 周次数组。 */
function parseWeeks(raw: string, totalWeeks: number): number[] {
  const fallback = Array.from({ length: totalWeeks }, (_, i) => i + 1);
  if (!raw || !raw.trim()) return fallback;

  const odd = raw.includes('单');
  const even = raw.includes('双');
  const cleaned = raw.replace(/[第周次单双()（）\s]/g, '');

  let result: number[] = [];
  for (const part of cleaned.split(/[,，、;；]/)) {
    const p = part.trim();
    if (!p) continue;
    const range = p.split('-');
    if (range.length === 2) {
      const a = Number(range[0]);
      const b = Number(range[1]);
      if (Number.isInteger(a) && Number.isInteger(b) && a > 0 && b >= a) {
        for (let i = a; i <= b; i += 1) result.push(i);
      }
    } else {
      const n = Number(p);
      if (Number.isInteger(n) && n > 0) result.push(n);
    }
  }

  if (result.length === 0 && (odd || even)) result = fallback.slice();
  result = Array.from(new Set(result)).sort((a, b) => a - b);

  if (odd && !even) result = result.filter((n) => n % 2 === 1);
  else if (even && !odd) result = result.filter((n) => n % 2 === 0);

  return result.length > 0 ? result : fallback;
}

/** 从任意 JSON 结构中取出课表条目数组（兼容数组 / { kbList } / { data: { kbList } }）。 */
function extractKbList(json: unknown): EduScheduleEntry[] {
  if (Array.isArray(json)) return json as EduScheduleEntry[];
  if (json && typeof json === 'object') {
    const obj = json as Record<string, unknown>;
    if (Array.isArray(obj.kbList)) return obj.kbList as EduScheduleEntry[];
    if (obj.data && typeof obj.data === 'object') {
      const data = obj.data as Record<string, unknown>;
      if (Array.isArray(data.kbList)) return data.kbList as EduScheduleEntry[];
    }
  }
  return [];
}

/**
 * 将教务系统课表 JSON 解析为 Course[]。
 *
 * 同「课程名 + 教师 + 地点 + 周几 + 节次」的条目会合并为一门课（周次并集）。
 * 缺课程名或周几越界的条目会被跳过，避免生成无法定位的脏数据。
 */
export function parseScheduleJson(json: unknown, totalWeeks: number): Course[] {
  const groups = new Map<string, Course & { weekSet: Set<number> }>();

  for (const entry of extractKbList(json)) {
    const name = firstString(entry.kcmc);
    if (!name) continue;

    const teacher = firstString(entry.xm, entry.jsxm);
    const location = [firstString(entry.xqjmc), firstString(entry.jasmc, entry.cdmc)]
      .filter(Boolean)
      .join(' ');

    const dayOfWeek = firstNumber(entry.xqj, entry.skxq);
    if (dayOfWeek < 1 || dayOfWeek > 7) continue;

    const jcs = firstString(entry.jcs, entry.skjc, entry.jc) || String(firstNumber(entry.skjc, entry.jc));
    const [startPeriod, endPeriod] = parsePeriods(jcs);
    const weeks = parseWeeks(firstString(entry.zcd, entry.zcs, entry.skzc), totalWeeks);

    const key = [name, teacher, location, dayOfWeek, startPeriod, endPeriod].join('::');
    let group = groups.get(key);
    if (!group) {
      group = {
        id: newId(),
        name,
        teacher,
        location,
        dayOfWeek,
        startPeriod,
        endPeriod,
        weeks: [],
        color: DEFAULT_COURSE_COLOR,
        weekSet: new Set<number>(),
      };
      groups.set(key, group);
    }
    for (const w of weeks) group.weekSet.add(w);
  }

  return Array.from(groups.values()).map(({ weekSet, ...course }) => ({
    ...course,
    weeks: Array.from(weekSet).sort((a, b) => a - b),
  }));
}
