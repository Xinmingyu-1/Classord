import { create } from 'zustand';

import * as db from '@/db/database';
import type { Course } from '@/models/course';
import { scheduleClassReminders } from '@/notifications/schedule';
import { useSettingsStore } from '@/store/settings';

/** 课程变更后重新调度上课提醒（fire-and-forget；scheduleClassReminders 内部已容错）。 */
function rescheduleReminders(courses: Course[]): void {
  void scheduleClassReminders(courses, useSettingsStore.getState().settings);
}

interface CoursesState {
  courses: Course[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (course: Course) => Promise<void>;
  addMany: (courses: Course[]) => Promise<void>;
  update: (course: Course) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useCoursesStore = create<CoursesState>((set) => ({
  courses: [],
  loaded: false,

  load: async () => set({ courses: await db.listCourses(), loaded: true }),

  add: async (course) => {
    await db.insertCourse(course);
    const courses = await db.listCourses();
    set({ courses });
    rescheduleReminders(courses);
  },

  addMany: async (courses) => {
    for (const course of courses) {
      await db.insertCourse(course);
    }
    const all = await db.listCourses();
    set({ courses: all });
    rescheduleReminders(all);
  },

  update: async (course) => {
    await db.updateCourse(course);
    const courses = await db.listCourses();
    set({ courses });
    rescheduleReminders(courses);
  },

  remove: async (id) => {
    await db.deleteCourse(id);
    const courses = await db.listCourses();
    set({ courses });
    rescheduleReminders(courses);
  },
}));
