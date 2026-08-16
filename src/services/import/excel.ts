import * as XLSX from 'xlsx';

import { MAX_PERIODS } from '@/constants/periods';
import type { Course } from '@/models/course';
import { DEFAULT_COURSE_COLOR } from '@/theme/colors';
import { newId } from '@/utils/id';

/** 归一化后的字段（列名已从中文/英文表头映射到统一字段名）。 */
type HeaderField =
  | 'name'
  | 'teacher'
  | 'location'
  | 'dayOfWeek'
  | 'startPeriod'
  | 'endPeriod'
  | 'period'
  | 'weeks';

/**
 * 列名别名表：把目标学校导出的表头（中英文）映射到统一字段。
 *
 * 实际表头与这里不一致时，只需在此补充别名即可（比较时忽略大小写、去除首尾空白）。
 * `period` 是「合并节次」列（如 "1-2" / "第1-2节"），当导出没有独立的 startPeriod/endPeriod 列时使用。
 */
const HEADER_ALIASES: Record<HeaderField, string[]> = {
  name: ['课程名称', '课程名', '课程', '名称', '科目', 'name', 'course'],
  teacher: ['教师', '教师姓名', '老师', '任课教师', '授课教师', 'teacher'],
  location: ['上课地点', '地点', '教室', '上课教室', '校区', '教学楼', 'location'],
  dayOfWeek: ['星期', '周几', '星期几', '星期数', 'dayofweek', 'day'],
  startPeriod: ['起始节次', '开始节次', '起始节', '开始节', 'startperiod', 'start'],
  endPeriod: ['结束节次', '结束节', '终止节次', 'endperiod', 'end'],
  period: ['节次', '上课节次', 'period'],
  weeks: ['周次', '上课周次', '教学周', 'weeks', 'week'],
};

/** 由首行（表头）解析「字段 → 实际列名」的映射。 */
function resolveColumns(sample: Record<string, unknown>): Partial<Record<HeaderField, string>> {
  const mapping: Partial<Record<HeaderField, string>> = {};
  for (const key of Object.keys(sample)) {
    const normalized = key.trim().toLowerCase();
    for (const field of Object.keys(HEADER_ALIASES) as HeaderField[]) {
      if (mapping[field]) continue; // 已命中，取最先匹配的列
      if (HEADER_ALIASES[field].some((alias) => alias.toLowerCase() === normalized)) {
        mapping[field] = key;
      }
    }
  }
  return mapping;
}

/** 转正整数，失败返回 0。 */
function toInt(value: unknown): number {
  if (typeof value === 'number') return Number.isInteger(value) && value > 0 ? value : 0;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/** 中文周几 → 数字（1=周一 … 7=周日）。 */
const DAY_NAME_TO_NUM: Record<string, number> = {
  星期一: 1,
  周一: 1,
  星期二: 2,
  周二: 2,
  星期三: 3,
  周三: 3,
  星期四: 4,
  周四: 4,
  星期五: 5,
  周五: 5,
  星期六: 6,
  周六: 6,
  星期日: 7,
  星期天: 7,
  周日: 7,
};

/** 解析周几列（支持数字 "1" 或中文 "星期一"），越界返回 0。 */
function toDayOfWeek(value: unknown): number {
  const n = toInt(value);
  if (n > 0) return n;
  return DAY_NAME_TO_NUM[String(value ?? '').trim()] ?? 0;
}

/** 解析合并节次列 "1-2" / "第1-2节" / "1,2" → [起始, 结束]。 */
function parsePeriodRange(value: unknown): [number, number] {
  const nums = String(value ?? '')
    .replace(/[第节\s]/g, '')
    .split(/[-—,，、]/)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  if (nums.length === 0) return [0, 0];
  return [Math.min(...nums), Math.max(...nums)];
}

/** 周次列取值归一化（可能为字符串 "1-16"、数字 16、数组 [1,2,3]）。 */
function toWeeksValue(value: unknown): string | number[] | undefined {
  if (Array.isArray(value)) return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  return undefined;
}

/**
 * 解析 Excel 课表为 Course[]。
 *
 * 首行为表头，按 HEADER_ALIASES 把中文/英文列名映射到字段（未命中别名的列会被忽略）；
 * 缺课程名、周几越界、节次越界（结束早于起始）的行会跳过，避免生成无法定位的脏数据。
 * 周次解析见 parseWeeks：支持 "1-16"、"1,3,5"、"1-16周"、"1-16周(单)"、"双周" 等；
 * 有周次信息但解析失败的行会跳过，不静默当作整学期。
 */
export function parseExcel(data: ArrayBuffer | Uint8Array, totalWeeks: number): Course[] {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  if (rows.length === 0) return [];

  const cols = resolveColumns(rows[0]);

  return rows.flatMap((row) => {
    const get = (field: HeaderField): unknown => (cols[field] ? row[cols[field]] : undefined);

    const name = String(get('name') ?? '').trim();
    if (!name) return []; // 缺课程名，跳过

    const weeks = parseWeeks(toWeeksValue(get('weeks')), totalWeeks);
    if (weeks.length === 0) return []; // 有周次信息但解析不出，跳过该行

    const dayOfWeek = toDayOfWeek(get('dayOfWeek'));
    if (dayOfWeek < 1 || dayOfWeek > 7) return []; // 周几越界，跳过

    let startPeriod = toInt(get('startPeriod'));
    let endPeriod = toInt(get('endPeriod'));
    // 无独立起止列时，从合并的 "1-2" 节次列解析
    if (!startPeriod || !endPeriod) {
      const [s, e] = parsePeriodRange(get('period'));
      startPeriod = startPeriod || s;
      endPeriod = endPeriod || e;
    }
    if (startPeriod < 1) return [];
    if (endPeriod < startPeriod) return []; // 结束节次早于起始，跳过
    if (endPeriod > MAX_PERIODS) return []; // 节次超出合理上限，跳过

    return [
      {
        id: newId(),
        name,
        teacher: String(get('teacher') ?? '').trim(),
        location: String(get('location') ?? '').trim(),
        dayOfWeek,
        startPeriod,
        endPeriod,
        weeks,
        color: DEFAULT_COURSE_COLOR,
      },
    ];
  });
}

/**
 * 解析周次列。
 *
 * - 数组：过滤出正整数；
 * - 字符串：逗号/顿号分隔、范围 "1-16"、"1-16周"、"1-16周(单)"、"单周"/"双周"（奇偶周）；
 * - 空值（缺列）：默认整学期 totalWeeks；
 * - 有值但解析不出任何周次：返回空数组，由调用方跳过该行。
 */
export function parseWeeks(value: string | number[] | undefined, totalWeeks: number): number[] {
  if (Array.isArray(value)) {
    const weeks = value.map(Number).filter((n) => Number.isInteger(n) && n > 0);
    return weeks.length > 0 ? weeks : Array.from({ length: totalWeeks }, (_, i) => i + 1);
  }

  if (typeof value === 'string' && value.trim()) {
    const odd = value.includes('单');
    const even = value.includes('双');
    const cleaned = value.replace(/[第周次单双()（）\s]/g, '');

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

    // 裸「单周/双周」（无范围）：默认整学期奇数/偶数周
    if (result.length === 0 && (odd || even)) {
      result = Array.from({ length: totalWeeks }, (_, i) => i + 1);
    }

    result = Array.from(new Set(result)).sort((a, b) => a - b);
    if (odd && !even) result = result.filter((n) => n % 2 === 1);
    else if (even && !odd) result = result.filter((n) => n % 2 === 0);

    return result; // 可能为空 → 调用方跳过该行
  }

  // 缺列 / 空字符串 → 默认整学期
  return Array.from({ length: totalWeeks }, (_, i) => i + 1);
}
