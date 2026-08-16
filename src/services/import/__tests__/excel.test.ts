import { parseWeeks } from '@/services/import/excel';

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
});
