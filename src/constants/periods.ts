import type { Period } from '@/models/course';

/** 单日节次数的合理上限（防手动录入/文件导入填入荒谬的节次号，如 99）。 */
export const MAX_PERIODS = 30;

/** 默认节次时间表，可在「设置」中修改。 */
export const DEFAULT_PERIODS: Period[] = [
  { start: '08:00', end: '08:45' },
  { start: '08:50', end: '09:35' },
  { start: '09:50', end: '10:35' },
  { start: '10:40', end: '11:25' },
  { start: '11:30', end: '12:15' },
  { start: '14:00', end: '14:45' },
  { start: '14:50', end: '15:35' },
  { start: '15:50', end: '16:35' },
  { start: '16:40', end: '17:25' },
  { start: '17:30', end: '18:15' },
  { start: '19:00', end: '19:45' },
  { start: '19:50', end: '20:35' },
  { start: '20:40', end: '21:25' },
];
