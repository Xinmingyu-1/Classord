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
 * TODO：列名需与目标学校的导出格式对齐；weeks 的解析规则（如 "1-16周" / "单周"）也需约定。
 * 当前实现按约定列名做最小映射，缺列时用默认值兜底。
 */
export function parseExcel(data: ArrayBuffer | Uint8Array): Course[] {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet);

  return rows.map((row) => {
    const startPeriod = Number(row.startPeriod) || 1;
    return {
      id: newId(),
      name: String(row.name ?? '未命名课程'),
      teacher: String(row.teacher ?? ''),
      location: String(row.location ?? ''),
      dayOfWeek: Number(row.dayOfWeek) || 1,
      startPeriod,
      endPeriod: Number(row.endPeriod) || startPeriod,
      weeks: parseWeeks(row.weeks),
      color: DEFAULT_COURSE_COLOR,
    };
  });
}

/** 解析周次：逗号分隔 "1,2,3"、范围 "1-16"，兜底为全周。 */
function parseWeeks(value?: string | number[]): number[] {
  if (Array.isArray(value)) return value.map(Number).filter((n) => n > 0);
  if (typeof value === 'string') {
    const result: number[] = [];
    for (const part of value.split(/[,，]/)) {
      const range = part.trim().split('-');
      if (range.length === 2) {
        const a = Number(range[0]);
        const b = Number(range[1]);
        for (let i = a; i <= b; i += 1) result.push(i);
      } else {
        const n = Number(part);
        if (n > 0) result.push(n);
      }
    }
    if (result.length > 0) return result;
  }
  return Array.from({ length: 20 }, (_, i) => i + 1);
}
