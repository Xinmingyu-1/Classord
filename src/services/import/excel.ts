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
/** 是否为教师行：形如「蒋朝辉(教授)」，含非空括号。 */
function isTeacherLine(line: string): boolean {
  return /\([^)]*\)/.test(line);
}

/** 是否为周次行：以数字开头且含「周」，形如「11-18[周]」/「1-16周」。 */
function isWeeksLine(line: string): boolean {
  return /^\d/.test(line) && line.includes('周');
}

/** 清洗教师名：去掉「(职称)」括号并按逗号规整。 */
function cleanTeacher(text: string): string {
  return text
    .replace(/\([^)]*\)/g, '')
    .split(/[,，、]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(', ');
}

/** 网格课表单元格里的一块课程（名 / 教师 / 周次 / 地点）。 */
interface GridBlock {
  name: string;
  teacher: string;
  weeksText: string;
  location: string;
}

/** 归一化后的单门课（已定位到周几/节次，周次尚未解析为数字数组）。 */
interface RawCourse {
  name: string;
  teacher: string;
  weeksText: string;
  location: string;
  dayOfWeek: number;
  startPeriod: number;
  endPeriod: number;
  /** 连堂延续：本课程是上一节次同课程的自然延续（v2 格式用，用于合并节次）。 */
  continuation?: boolean;
}

/**
 * 解析网格课表单元格的多行文本为若干课程块。
 * 块结构固定为「课程名 / 教师(职称) / 周次[周] / 地点?」；一个单元格可能含多个块
 * （同一节次、同一星期排了多门课，如单双周不同课程）。教师行依赖「(职称)」括号识别。
 */
function parseGridCell(text: string): GridBlock[] {
  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const blocks: GridBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const name = lines[i];
    i += 1;

    let teacher = '';
    if (i < lines.length && isTeacherLine(lines[i])) {
      teacher = cleanTeacher(lines[i]);
      i += 1;
    }

    let weeksText = '';
    if (i < lines.length && isWeeksLine(lines[i])) {
      weeksText = lines[i];
      i += 1;
    } else {
      // 缺周次行，无法定位到具体周次，跳过该块剩余内容。
      continue;
    }

    // 周次行之后若还有行，可能是「地点」，也可能是下一块的开头（课程名）。
    // 下一行若是教师/周次行，说明当前行是下一块的开头（本块无地点）；否则当前行是地点。
    let location = '';
    if (i < lines.length) {
      const next = lines[i];
      const after = i + 1 < lines.length ? lines[i + 1] : undefined;
      const nextIsName = after !== undefined && (isTeacherLine(after) || isWeeksLine(after));
      if (!nextIsName) {
        location = next;
        i += 1;
      }
    }

    blocks.push({ name, teacher, weeksText, location });
  }
  return blocks;
}

/** 判断一行是否为网格课表的表头行（首列为「节次」，且至少两列为星期几）。 */
function isGridHeader(row: unknown[]): boolean {
  if (!Array.isArray(row) || row.length < 3) return false;
  if (!/节次/.test(String(row[0] ?? '').trim())) return false;
  const dayCols = row.slice(1).filter((c) => DAY_NAME_TO_NUM[String(c ?? '').trim()] !== undefined);
  return dayCols.length >= 2;
}

/** 网格课表 v1（一格多行拼块：名/教师(职称)/周次[周]/地点）→ 归一化课程。 */
function normalizeGridV1(rawRows: unknown[][], headerRow: number): RawCourse[] {
  const header = rawRows[headerRow];
  const colDays: { col: number; day: number }[] = [];
  for (let c = 1; c < header.length; c += 1) {
    const day = toDayOfWeek(header[c]);
    if (day >= 1 && day <= 7) colDays.push({ col: c, day });
  }

  const raws: RawCourse[] = [];
  for (let r = headerRow + 1; r < rawRows.length; r += 1) {
    const row = rawRows[r];
    const [startPeriod, endPeriod] = parsePeriodRange(row[0]);
    if (startPeriod < 1 || endPeriod < startPeriod) continue;

    for (const { col, day } of colDays) {
      const cellText = String(row[col] ?? '').trim();
      if (!cellText) continue;
      for (const block of parseGridCell(cellText)) {
        raws.push({
          name: block.name,
          teacher: block.teacher,
          weeksText: block.weeksText,
          location: block.location,
          dayOfWeek: day,
          startPeriod,
          endPeriod,
        });
      }
    }
  }
  return raws;
}

/** 解析 v2 节次标签「第 1-2 小节」/「第 5 小节」→ [起始, 结束]；非节次行返回 [0,0]。 */
function parseV2PeriodLabel(line: string): [number, number] {
  const nums = String(line ?? '')
    .replace(/[第小节\s]/g, '')
    .split(/[-－—~～]/)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  if (nums.length === 0) return [0, 0];
  return [Math.min(...nums), Math.max(...nums)];
}

/** v2 属性行：授课 / 周次 / 教室 前缀。 */
function parseV2AttrLine(line: string): { type: 'teacher' | 'weeks' | 'location'; value: string } | null {
  const m = line.trim().match(/^(授课|周次|教室)[：:]\s*(.*)$/);
  if (!m) return null;
  const kind = m[1];
  let value = m[2].trim();
  if (kind === '授课') value = value.replace(/\s*\*+\s*$/, '').trim();
  return { type: kind === '授课' ? 'teacher' : kind === '周次' ? 'weeks' : 'location', value };
}

/** 解析 v2 课程名行：支持【X-Y 周】前缀、（连堂延续）后缀、「无」空课。 */
function parseV2NameLine(
  line: string,
): { name: string; weeksText: string; continuation: boolean; empty: boolean } {
  let s = line.trim();
  let weeksText = '';
  const m = s.match(/^【([^】]*)】\s*/);
  if (m) {
    weeksText = m[1];
    s = s.slice(m[0].length);
  }
  let continuation = false;
  if (/（连堂延续）$/.test(s)) {
    continuation = true;
    s = s.replace(/（连堂延续）$/, '');
  }
  s = s.trim();
  if (!s || s === '无') return { name: '', weeksText, continuation, empty: true };
  return { name: s, weeksText, continuation, empty: false };
}

/** v2 单元格：一列内按行堆叠的多门课（课程名行 + 后续前缀属性行）→ 课程块。 */
function parseColumnV2(
  lines: string[],
): Array<{ name: string; teacher: string; weeksText: string; location: string; continuation: boolean }> {
  const blocks: Array<{ name: string; teacher: string; weeksText: string; location: string; continuation: boolean }> = [];
  let i = 0;
  while (i < lines.length) {
    const nameInfo = parseV2NameLine(lines[i]);
    i += 1;
    if (nameInfo.empty) continue;

    const block = {
      name: nameInfo.name,
      teacher: '',
      weeksText: nameInfo.weeksText,
      location: '',
      continuation: nameInfo.continuation,
    };
    while (i < lines.length) {
      const attr = parseV2AttrLine(lines[i]);
      if (!attr) break; // 下一个课程名行
      if (attr.type === 'teacher' && !block.teacher) block.teacher = attr.value;
      else if (attr.type === 'weeks' && !block.weeksText) block.weeksText = attr.value;
      else if (attr.type === 'location' && !block.location) block.location = attr.value;
      i += 1;
    }
    blocks.push(block);
  }
  return blocks;
}

/** 网格课表 v2（按行拆分 + 前缀「授课/周次/教室」，含连堂延续）→ 归一化课程。 */
function normalizeGridV2(rawRows: unknown[][], headerRow: number): RawCourse[] {
  const header = rawRows[headerRow];
  const colDays: { col: number; day: number }[] = [];
  for (let c = 1; c < header.length; c += 1) {
    const day = toDayOfWeek(header[c]);
    if (day >= 1 && day <= 7) colDays.push({ col: c, day });
  }

  // 按节次标签分组：每个「第 X 小节」行开启一组，其后到下一个标签前的行属于该组。
  const groups: { period: [number, number]; rows: unknown[][] }[] = [];
  let current: { period: [number, number]; rows: unknown[][] } | null = null;
  for (let r = headerRow + 1; r < rawRows.length; r += 1) {
    const p = parseV2PeriodLabel(String(rawRows[r][0] ?? ''));
    if (p[0] > 0) {
      // 节次标签行同时承载课程名（col 0 是标签，col 1+ 是各天课程名），故整行纳入分组。
      current = { period: p, rows: [rawRows[r]] };
      groups.push(current);
    } else if (current) {
      current.rows.push(rawRows[r]);
    }
  }

  const raws: RawCourse[] = [];
  for (const group of groups) {
    for (const { col, day } of colDays) {
      const lines = group.rows.map((r) => String(r[col] ?? '').trim()).filter(Boolean);
      if (lines.length === 0) continue;
      for (const b of parseColumnV2(lines)) {
        raws.push({
          name: b.name,
          teacher: b.teacher,
          weeksText: b.weeksText,
          location: b.location,
          dayOfWeek: day,
          startPeriod: group.period[0],
          endPeriod: group.period[1],
          continuation: b.continuation,
        });
      }
    }
  }
  return mergeContinuations(raws);
}

/** 把「连堂延续」课程合并进同一星期、同一课程名的上一门课（扩展结束节次）。 */
function mergeContinuations(raws: RawCourse[]): RawCourse[] {
  const result: RawCourse[] = [];
  const lastByName = new Map<number, Map<string, RawCourse>>();
  for (const c of raws) {
    if (c.continuation) {
      const base = lastByName.get(c.dayOfWeek)?.get(c.name);
      if (base) {
        base.endPeriod = Math.max(base.endPeriod, c.endPeriod);
        if (!base.teacher && c.teacher) base.teacher = c.teacher;
        if (!base.location && c.location) base.location = c.location;
        if (!base.weeksText && c.weeksText) base.weeksText = c.weeksText;
        continue;
      }
      // 找不到基准课程（孤立连堂）：当作普通课程处理
    }
    const { continuation: _continuation, ...clean } = c;
    result.push(clean);
    let byName = lastByName.get(c.dayOfWeek);
    if (!byName) {
      byName = new Map();
      lastByName.set(c.dayOfWeek, byName);
    }
    byName.set(c.name, clean);
  }
  return result;
}

/** 归一化课程 → Course[]（解析周次、跳过无效行）。 */
function rawsToCourses(raws: RawCourse[], totalWeeks: number): Course[] {
  const courses: Course[] = [];
  for (const r of raws) {
    if (!r.name) continue;
    if (r.dayOfWeek < 1 || r.dayOfWeek > 7) continue;
    if (r.startPeriod < 1 || r.endPeriod < r.startPeriod) continue;
    if (r.endPeriod > MAX_PERIODS) continue;

    const weeks = parseWeeks(r.weeksText || undefined, totalWeeks);
    if (weeks.length === 0) continue;

    courses.push({
      id: newId(),
      name: r.name,
      teacher: r.teacher,
      location: r.location,
      dayOfWeek: r.dayOfWeek,
      startPeriod: r.startPeriod,
      endPeriod: r.endPeriod,
      weeks,
      color: DEFAULT_COURSE_COLOR,
    });
  }
  return courses;
}

export function parseExcel(data: ArrayBuffer | Uint8Array, totalWeeks: number): Course[] {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // 网格课表（行=节次、列=星期几）与扁平清单（每行一门课）自动识别。
  // 网格又分 v1（一格多行拼块）与 v2（按行拆分 + 前缀「授课/周次/教室」）两种。
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  const gridHeaderRow = rawRows.findIndex((row) => isGridHeader(row));
  if (gridHeaderRow >= 0) {
    const isV2 = rawRows.slice(gridHeaderRow + 1).some((r) => /小节/.test(String(r[0] ?? '')));
    const raws = isV2
      ? normalizeGridV2(rawRows, gridHeaderRow)
      : normalizeGridV1(rawRows, gridHeaderRow);
    return rawsToCourses(raws, totalWeeks);
  }

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
    const cleaned = value.replace(/[第周次单双()（）\[\]\s]/g, '');

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
