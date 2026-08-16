import * as SQLite from 'expo-sqlite';

import { SCHEMA_SQL } from '@/db/schema';
import type { AppSettings, Course } from '@/models/course';

const DB_NAME = 'classord.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** 打开（必要时初始化）本地数据库，返回单例。 */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (database) => {
      await database.execAsync(SCHEMA_SQL);
      return database;
    });
  }
  return dbPromise;
}

interface CourseRow {
  id: string;
  name: string;
  teacher: string;
  location: string;
  day_of_week: number;
  start_period: number;
  end_period: number;
  weeks: string;
  color: string;
}

/** 行 → Course；周次列损坏（JSON 解析失败或非正整数数组）时返回 null，由调用方跳过该行。 */
function rowToCourse(row: CourseRow): Course | null {
  let weeks: unknown;
  try {
    weeks = JSON.parse(row.weeks);
  } catch {
    return null;
  }
  if (!Array.isArray(weeks)) return null;
  const safeWeeks = weeks.filter((n): n is number => Number.isInteger(n) && n > 0);
  return {
    id: row.id,
    name: row.name,
    teacher: row.teacher,
    location: row.location,
    dayOfWeek: row.day_of_week,
    startPeriod: row.start_period,
    endPeriod: row.end_period,
    weeks: safeWeeks,
    color: row.color,
  };
}

export async function listCourses(): Promise<Course[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<CourseRow>(
    'SELECT * FROM courses ORDER BY day_of_week, start_period',
  );
  return rows.flatMap((row) => {
    const course = rowToCourse(row);
    return course ? [course] : [];
  });
}

export async function getCourse(id: string): Promise<Course | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<CourseRow>('SELECT * FROM courses WHERE id = ?', id);
  return row ? rowToCourse(row) : null;
}

export async function insertCourse(course: Course): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO courses (id, name, teacher, location, day_of_week, start_period, end_period, weeks, color)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    course.id,
    course.name,
    course.teacher,
    course.location,
    course.dayOfWeek,
    course.startPeriod,
    course.endPeriod,
    JSON.stringify(course.weeks),
    course.color,
  );
}

export async function updateCourse(course: Course): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE courses
     SET name = ?, teacher = ?, location = ?, day_of_week = ?, start_period = ?, end_period = ?, weeks = ?, color = ?
     WHERE id = ?`,
    course.name,
    course.teacher,
    course.location,
    course.dayOfWeek,
    course.startPeriod,
    course.endPeriod,
    JSON.stringify(course.weeks),
    course.color,
    course.id,
  );
}

export async function deleteCourse(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM courses WHERE id = ?', id);
}

const SETTINGS_KEY = 'app_settings';

/** 读取整份设置（未保存过或行损坏时返回 null，由调用方回退默认值）。 */
export async function loadSettings(): Promise<AppSettings | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    SETTINGS_KEY,
  );
  if (!row) return null;
  try {
    const parsed: unknown = JSON.parse(row.value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as AppSettings) : null;
  } catch {
    return null;
  }
}

/** 保存整份设置（覆盖写）。 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    SETTINGS_KEY,
    JSON.stringify(settings),
  );
}
