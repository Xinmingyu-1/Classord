import { create } from 'zustand';

import * as db from '@/db/database';
import type { Course } from '@/models/course';

interface CoursesState {
  courses: Course[];
  loaded: boolean;
  load: () => void;
  add: (course: Course) => void;
  update: (course: Course) => void;
  remove: (id: string) => void;
}

export const useCoursesStore = create<CoursesState>((set) => ({
  courses: [],
  loaded: false,

  load: () => set({ courses: db.listCourses(), loaded: true }),

  add: (course) => {
    db.insertCourse(course);
    set({ courses: db.listCourses() });
  },

  update: (course) => {
    db.updateCourse(course);
    set({ courses: db.listCourses() });
  },

  remove: (id) => {
    db.deleteCourse(id);
    set({ courses: db.listCourses() });
  },
}));
