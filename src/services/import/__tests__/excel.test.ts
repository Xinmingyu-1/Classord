import * as XLSX from 'xlsx';

import { parseExcel, parseWeeks } from '@/services/import/excel';

const FULL = Array.from({ length: 20 }, (_, i) => i + 1); // [1..20]
const RANGE_1_16 = Array.from({ length: 16 }, (_, i) => i + 1);

describe('parseWeeks 周次解析', () => {
  test('范围与单值', () => {
    expect(parseWeeks('1-16', 20)).toEqual(RANGE_1_16);
    expect(parseWeeks('1,3,5', 20)).toEqual([1, 3, 5]);
    expect(parseWeeks('1-3,5', 20)).toEqual([1, 2, 3, 5]);
    expect(parseWeeks('3', 20)).toEqual([3]);
  });

  test('带「第/周」前缀后缀', () => {
    expect(parseWeeks('1-16周', 20)).toEqual(RANGE_1_16);
    expect(parseWeeks('第1-16周', 20)).toEqual(RANGE_1_16);
  });

  test('单双周（奇偶周）', () => {
    expect(parseWeeks('1-16周(单)', 20)).toEqual([1, 3, 5, 7, 9, 11, 13, 15]);
    expect(parseWeeks('1-16周(双)', 20)).toEqual([2, 4, 6, 8, 10, 12, 14, 16]);
    expect(parseWeeks('单周', 20)).toEqual([1, 3, 5, 7, 9, 11, 13, 15, 17, 19]);
    expect(parseWeeks('双周', 20)).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
  });

  test('分隔符与去重排序', () => {
    expect(parseWeeks('1、3、5', 20)).toEqual([1, 3, 5]);
    expect(parseWeeks('1;3;5', 20)).toEqual([1, 3, 5]);
    expect(parseWeeks('1,1,3', 20)).toEqual([1, 3]);
  });

  test('缺列 / 空串 → 默认整学期', () => {
    expect(parseWeeks(undefined, 20)).toEqual(FULL);
    expect(parseWeeks('', 20)).toEqual(FULL);
    expect(parseWeeks('  ', 20)).toEqual(FULL);
  });

  test('有值但解析不出 → 空数组', () => {
    expect(parseWeeks('abc', 20)).toEqual([]);
    expect(parseWeeks('0', 20)).toEqual([]);
  });

  test('数组输入', () => {
    expect(parseWeeks([1, 2, 3], 20)).toEqual([1, 2, 3]);
    expect(parseWeeks([1, 2, 0, -1, 3.5], 20)).toEqual([1, 2]);
    expect(parseWeeks([], 20)).toEqual(FULL);
    expect(parseWeeks([0, -1], 20)).toEqual(FULL);
  });

  test('带方括号周次 [周]', () => {
    expect(parseWeeks('11-18[周]', 20)).toEqual([11, 12, 13, 14, 15, 16, 17, 18]);
    expect(parseWeeks('1-8[周]', 20)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('parseExcel 网格课表解析', () => {
  function buildGridWorkbook(rows: (string | null)[][]): Uint8Array {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '学生课表');
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return out instanceof Uint8Array ? out : new Uint8Array(out as ArrayBuffer);
  }

  test('行=节次、列=星期几，含单门课/无地点/一格多课', () => {
    const data = buildGridWorkbook([
      ['中南大学 学生个人课表'],
      ['学年学期：2026-2027-1'],
      ['节次', '星期日', '星期一', '星期二'],
      // 星期一：单门课（4 行块）
      ['1-2', '', '信号处理与系统分析\n蒋朝辉(教授)\n11-18[周]\nB座513', ''],
      // 星期一：一格两门课（不同周次）；星期二：无地点（3 行块）
      [
        '3-4',
        '',
        '现代控制理论\n郭宇骞(教授)\n1-8[周]\nB座301\n创新创业与工程导论\n刘一顺(讲师)\n11-18[周]\nB座517',
        '制造工程训练C\n顾昊(实验师),杨诗晨(实验师)\n3-18[周]',
      ],
    ]);
    const courses = parseExcel(data, 20);
    expect(courses.length).toBe(4);

    const c1 = courses.find((c) => c.name === '信号处理与系统分析');
    expect(c1?.teacher).toBe('蒋朝辉');
    expect(c1?.location).toBe('B座513');
    expect(c1?.dayOfWeek).toBe(1);
    expect(c1?.startPeriod).toBe(1);
    expect(c1?.endPeriod).toBe(2);
    expect(c1?.weeks).toEqual([11, 12, 13, 14, 15, 16, 17, 18]);

    const c2 = courses.find((c) => c.name === '现代控制理论');
    expect(c2?.teacher).toBe('郭宇骞');
    expect(c2?.location).toBe('B座301');
    expect(c2?.dayOfWeek).toBe(1);
    expect(c2?.startPeriod).toBe(3);
    expect(c2?.endPeriod).toBe(4);
    expect(c2?.weeks).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

    const c3 = courses.find((c) => c.name === '创新创业与工程导论');
    expect(c3?.teacher).toBe('刘一顺');
    expect(c3?.dayOfWeek).toBe(1);
    expect(c3?.startPeriod).toBe(3);
    expect(c3?.endPeriod).toBe(4);
    expect(c3?.weeks).toEqual([11, 12, 13, 14, 15, 16, 17, 18]);

    const c4 = courses.find((c) => c.name === '制造工程训练C');
    expect(c4?.teacher).toBe('顾昊, 杨诗晨');
    expect(c4?.location).toBe('');
    expect(c4?.dayOfWeek).toBe(2);
    expect(c4?.startPeriod).toBe(3);
    expect(c4?.endPeriod).toBe(4);
    expect(c4?.weeks).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
  });

  test('v2 网格：前缀行（授课/周次/教室）+ 无 + 连堂延续合并', () => {
    const data = buildGridWorkbook([
      ['节次 / 时间', '星期一', '星期二'],
      ['第 1-2 小节', '岗位研究_01', '无'],
      ['08:00-09:35', '授课：杨春昭 *', ''],
      ['', '周次：1-8 周', ''],
      ['', '教室：教—315', ''],
      ['第 3-4 小节', '无', '组织行为学_01'],
      ['09:50-11:25', '', '授课：庞宇 *'],
      ['', '', '周次：9-18 周'],
      ['', '', '教室：教—302'],
      ['第 5 小节', '无', '组织行为学_01（连堂延续）'],
      ['11:30-12:15', '', ''],
    ]);
    const courses = parseExcel(data, 20);
    expect(courses.length).toBe(2);

    const c1 = courses.find((c) => c.name === '岗位研究_01');
    expect(c1?.teacher).toBe('杨春昭');
    expect(c1?.location).toBe('教—315');
    expect(c1?.dayOfWeek).toBe(1);
    expect(c1?.startPeriod).toBe(1);
    expect(c1?.endPeriod).toBe(2);
    expect(c1?.weeks).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

    const c2 = courses.find((c) => c.name === '组织行为学_01');
    expect(c2?.teacher).toBe('庞宇');
    expect(c2?.location).toBe('教—302');
    expect(c2?.dayOfWeek).toBe(2);
    expect(c2?.startPeriod).toBe(3);
    expect(c2?.endPeriod).toBe(5); // 第 3-4 小节 + 第 5 小节连堂，合并为第 3-5 节
    expect(c2?.weeks).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
  });
});
