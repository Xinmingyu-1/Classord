import { create } from 'zustand';

import * as db from '@/db/database';
import type { Course } from '@/models/course';

interface CoursesState {
  courses: Course[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (course: Course) => Promise<void>;
  update: (course: Course) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useCoursesStore = create<CoursesState>((set) => ({
  courses: [],
  loaded: false,

  load: async () => set({ courses: await db.listCourses(), loaded: true }),

  add: async (course) => {
    await db.insertCourse(course);
    set({ courses: await db.listCourses() });
  },

  update: async (course) => {
    await db.updateCourse(course);
    set({ courses: await db.listCourses() });
  },

  remove: async (id) => {
    await db.deleteCourse(id);
    set({ courses: await db.listCourses() });
  },
}));
