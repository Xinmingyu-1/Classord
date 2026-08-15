import * as SQLite from 'expo-sqlite';

import { SCHEMA_SQL } from '@/db/schema';
import type { AppSettings, Course } from '@/models/course';

const DB_NAME = 'classord.db';

let db: SQLite.SQLiteDatabase | null = null;

/** 打开（必要时初始化）本地数据库，返回单例。 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync(DB_NAME);
    db.execSync(SCHEMA_SQL);
  }
  return db;
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

function rowToCourse(row: CourseRow): Course {
  return {
    id: row.id,
    name: row.name,
    teacher: row.teacher,
    location: row.location,
    dayOfWeek: row.day_of_week,
    startPeriod: row.start_period,
    endPeriod: row.end_period,
    weeks: JSON.parse(row.weeks) as number[],
    color: row.color,
  };
}

export function listCourses(): Course[] {
  const rows = getDatabase().getAllSync<CourseRow>(
    'SELECT * FROM courses ORDER BY day_of_week, start_period',
  );
  return rows.map(rowToCourse);
}

export function getCourse(id: string): Course | null {
  const row = getDatabase().getFirstSync<CourseRow>('SELECT * FROM courses WHERE id = ?', id);
  return row ? rowToCourse(row) : null;
}

export function insertCourse(course: Course): void {
  getDatabase().runSync(
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

export function updateCourse(course: Course): void {
  getDatabase().runSync(
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

export function deleteCourse(id: string): void {
  getDatabase().runSync('DELETE FROM courses WHERE id = ?', id);
}

const SETTINGS_KEY = 'app_settings';

/** 读取整份设置（未保存过时返回 null）。 */
export function loadSettings(): AppSettings | null {
  const row = getDatabase().getFirstSync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    SETTINGS_KEY,
  );
  return row ? (JSON.parse(row.value) as AppSettings) : null;
}

/** 保存整份设置（覆盖写）。 */
export function saveSettings(settings: AppSettings): void {
  getDatabase().runSync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    SETTINGS_KEY,
    JSON.stringify(settings),
  );
}
