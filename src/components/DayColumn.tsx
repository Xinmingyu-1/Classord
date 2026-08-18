import { Pressable, StyleSheet, View } from 'react-native';

import { CourseCard } from '@/components/CourseCard';
import { ThemedText } from '@/components/themed-text';
import { COURSE_GAP, DAY_HEADER_HEIGHT, PERIOD_HEIGHT } from '@/constants/timetable';
import type { Course, Period } from '@/models/course';
import { atTime, dayLabel } from '@/utils/date';

/** 单日课程列：课程按节次绝对定位（README「7 列网格」的一列），点击进入日视图。 */
export function DayColumn({
  dayOfWeek,
  date,
  courses,
  periodCount,
  periods,
  onPress,
}: {
  dayOfWeek: number;
  date: Date;
  courses: Course[];
  periodCount: number;
  periods: Period[];
  onPress?: (dayOfWeek: number) => void;
}) {
  const sorted = [...courses].sort((a, b) => a.startPeriod - b.startPeriod);
  const gridHeight = periodCount * PERIOD_HEIGHT;
  const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;
  const now = new Date();
  return (
    <Pressable style={styles.column} onPress={() => onPress?.(dayOfWeek)}>
      <View style={styles.header}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.headerText}>
          {dayLabel(dayOfWeek)}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.dateText}>
          {dateLabel}
        </ThemedText>
      </View>
      <View style={{ height: gridHeight }}>
        {sorted.map((course) => {
          const span = course.endPeriod - course.startPeriod + 1;
          const top = (course.startPeriod - 1) * PERIOD_HEIGHT;
          const height = span * PERIOD_HEIGHT - COURSE_GAP;
          // 课程名最多行数与块高度关联：扣除上下内边距 4px，按行高 20px（smallBold）折算。
          const maxLines = Math.max(1, Math.floor((height - 4) / 20));
          const endTime = periods[course.endPeriod - 1]?.end;
          const dimmed = endTime ? atTime(date, endTime).getTime() < now.getTime() : false;
          return (
            <CourseCard
              key={course.id}
              course={course}
              compact
              maxLines={maxLines}
              dimmed={dimmed}
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
    gap: 1,
  },
  headerText: {
    textAlign: 'center',
  },
  dateText: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
});
