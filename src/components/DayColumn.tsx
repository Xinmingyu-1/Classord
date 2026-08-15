import { Pressable, StyleSheet, View } from 'react-native';

import { CourseCard } from '@/components/CourseCard';
import { ThemedText } from '@/components/themed-text';
import type { Course } from '@/models/course';
import { dayLabel } from '@/utils/date';

/** 单日课程列：按节次升序排列（README「7 列网格」的一列），点击可进入日视图。 */
export function DayColumn({
  dayOfWeek,
  courses,
  onPress,
}: {
  dayOfWeek: number;
  courses: Course[];
  onPress?: (dayOfWeek: number) => void;
}) {
  const sorted = [...courses].sort((a, b) => a.startPeriod - b.startPeriod);
  return (
    <Pressable style={styles.column} onPress={() => onPress?.(dayOfWeek)}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.header}>
        {dayLabel(dayOfWeek)}
      </ThemedText>
      {sorted.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          —
        </ThemedText>
      ) : (
        sorted.map((course) => <CourseCard key={course.id} course={course} />)
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  column: {
    flex: 1,
    gap: 2,
  },
  header: {
    textAlign: 'center',
    marginBottom: 4,
  },
  empty: {
    textAlign: 'center',
    opacity: 0.4,
  },
});
