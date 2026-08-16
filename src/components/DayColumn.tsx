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
          const span = course.endPeriod - course.startPeriod + 1;
          const top = (course.startPeriod - 1) * PERIOD_HEIGHT;
          const height = span * PERIOD_HEIGHT - COURSE_GAP;
          // 课程名最多行数与块高度关联：扣除上下内边距 4px，按行高 20px（smallBold）折算。
          const maxLines = Math.max(1, Math.floor((height - 4) / 20));
          return (
            <CourseCard
              key={course.id}
              course={course}
              compact
              maxLines={maxLines}
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
