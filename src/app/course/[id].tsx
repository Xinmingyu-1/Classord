import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import { CourseForm } from '@/components/CourseForm';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCoursesStore } from '@/store/courses';

/** 编辑/查看课程（README「课程管理模块」）。 */
export default function EditCourseScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ?? '';
  const course = useCoursesStore((s) => s.courses.find((c) => c.id === id));
  const update = useCoursesStore((s) => s.update);

  if (!course) {
    return (
      <ThemedView style={styles.empty}>
        <ThemedText>课程不存在</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <CourseForm
        initial={course}
        onSubmit={(draft) => {
          void update({ ...draft, id });
          router.back();
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
