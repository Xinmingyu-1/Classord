import { parseBrowserPayload } from '@/services/edu/browser';

describe('parseBrowserPayload（WebView 回传 JSON → Course[]）', () => {
  test('合法 kbList JSON → 解析为课程', () => {
    const text = JSON.stringify({
      kbList: [
        { kcmc: '高等数学', xm: '张老师', xqjmc: '主校区', jasmc: '教二101', xqj: '1', jcs: '1-2', zcd: '1-16' },
      ],
    });
    const courses = parseBrowserPayload(text, 20);
    expect(courses).not.toBeNull();
    expect(courses).toHaveLength(1);
    expect(courses![0].name).toBe('高等数学');
    expect(courses![0].teacher).toBe('张老师');
    expect(courses![0].location).toBe('主校区 教二101');
    expect(courses![0].dayOfWeek).toBe(1);
    expect(courses![0].startPeriod).toBe(1);
    expect(courses![0].endPeriod).toBe(2);
    expect(courses![0].weeks).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
  });

  test('非 JSON 文本（如登录失效返回 HTML）→ null', () => {
    expect(parseBrowserPayload('<!DOCTYPE html><html>登录页</html>', 20)).toBeNull();
  });

  test('空 kbList → 空数组', () => {
    expect(parseBrowserPayload('{"kbList":[]}', 20)).toEqual([]);
  });
});
