import * as XLSX from 'xlsx';

import type { Course } from '@/models/course';
import { DEFAULT_COURSE_COLOR } from '@/theme/colors';
import { newId } from '@/utils/id';

interface ExcelRow {
  name?: string;
  teacher?: string;
  location?: string;
  dayOfWeek?: number;
  startPeriod?: number;
  endPeriod?: number;
  weeks?: string | number[];
  [key: string]: unknown;
}

/**
 * 解析 Excel 课表为 Course[]。
 *
 * TODO：列名需与目标学校的导出格式对齐（字段映射仍是占位）。
 * 周次解析见 parseWeeks：支持 "1-16"、"1,3,5"、"1-16周"、"1-16周(单)"、"双周" 等；
 * 有周次信息但解析失败的行会跳过，不静默当作整学期。
 */
export function parseExcel(data: ArrayBuffer | Uint8Array, totalWeeks: number): Course[] {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet);

  return rows.flatMap((row) => {
    const weeks = parseWeeks(row.weeks, totalWeeks);
    if (weeks.length === 0) return []; // 有周次信息但解析不出，跳过该行
    const startPeriod = Number(row.startPeriod) || 1;
    return [
      {
        id: newId(),
        name: String(row.name ?? '未命名课程'),
        teacher: String(row.teacher ?? ''),
        location: String(row.location ?? ''),
        dayOfWeek: Number(row.dayOfWeek) || 1,
        startPeriod,
        endPeriod: Number(row.endPeriod) || startPeriod,
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
function parseWeeks(value: string | number[] | undefined, totalWeeks: number): number[] {
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
