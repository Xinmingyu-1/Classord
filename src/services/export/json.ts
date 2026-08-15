import type { Course } from '@/models/course';

/** 将课程导出为 JSON 字符串（备份/分享用）。 */
export function coursesToJson(courses: Course[]): string {
  return JSON.stringify(courses, null, 2);
}
