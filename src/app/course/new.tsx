import { router } from 'expo-router';

import { CourseForm } from '@/components/CourseForm';
import { ThemedView } from '@/components/themed-view';
import { useCoursesStore } from '@/store/courses';
import { newId } from '@/utils/id';

/** 手动添加课程（README「课程管理模块」）。 */
export default function NewCourseScreen() {
  const add = useCoursesStore((s) => s.add);

  return (
    <ThemedView style={{ flex: 1 }}>
      <CourseForm
        onSubmit={(draft) => {
          add({ ...draft, id: newId() });
          router.back();
        }}
      />
    </ThemedView>
  );
}
