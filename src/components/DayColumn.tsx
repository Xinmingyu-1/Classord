import { Pressable, StyleSheet, View } from 'react-native';

import { CourseCard } from '@/components/CourseCard';
import { ThemedText } from '@/components/themed-text';
import { COURSE_GAP, DAY_HEADER_HEIGHT, PERIOD_HEIGHT } from '@/constants/timetable';
import type { Course } from '@/models/course';
import { dayLabel } from '@/utils/date';

/** 单日课程列：课程按节次绝对定位（README「7 列网格」的一列），点击进入日视图。 */
export function DayColumn({
  dayOfWeek,
  courses,
  periodCount,
  onPress,
}: {
  dayOfWeek: number;
  courses: Course[];
  periodCount: number;
  onPress?: (dayOfWeek: number) => void;
}) {
  const sorted = [...courses].sort((a, b) => a.startPeriod - b.startPeriod);
  const gridHeight = periodCount * PERIOD_HEIGHT;
  return (
    <Pressable style={styles.column} onPress={() => onPress?.(dayOfWeek)}>
      <View style={styles.header}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.headerText}>
          {dayLabel(dayOfWeek)}
        </ThemedText>
      </View>
      <View style={{ height: gridHeight }}>
        {sorted.map((course) => {
          const top = (course.startPeriod - 1) * PERIOD_HEIGHT;
          const height = (course.endPeriod - course.startPeriod + 1) * PERIOD_HEIGHT - COURSE_GAP;
          return (
            <CourseCard
              key={course.id}
              course={course}
              compact
              style={{ position: 'absolute', top, left: 0, right: 0, height }}
            />
          );
        })}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  column: {
    flex: 1,
  },
  header: {
    height: DAY_HEADER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    textAlign: 'center',
  },
});
