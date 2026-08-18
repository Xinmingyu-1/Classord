import { ScrollView, StyleSheet, View } from 'react-native';

import { DayColumn } from '@/components/DayColumn';
import { ThemedText } from '@/components/themed-text';
import { DAY_HEADER_HEIGHT, PERIOD_HEIGHT, TIME_COL_WIDTH } from '@/constants/timetable';
import type { Course, Period } from '@/models/course';
import { courseDate } from '@/utils/date';

const DAYS = [1, 2, 3, 4, 5, 6, 7];

/** 周视图网格：左侧节次列（节次号 + 起始时间）+ 7 天课程列（README「周视图」）。 */
export function WeekGrid({
  courses,
  periodCount,
  periods,
  week,
  semesterStart,
  onPressDay,
}: {
  courses: Course[];
  periodCount: number;
  periods: Period[];
  week: number;
  semesterStart: string;
  onPressDay?: (dayOfWeek: number) => void;
}) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.row}>
        <View style={styles.timeColumn}>
          <View style={styles.corner} />
          {Array.from({ length: periodCount }, (_, i) => (
            <View key={i} style={styles.periodCell}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.periodText}>
                {i + 1}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.timeText}>
                {periods[i]?.start ?? ''}
              </ThemedText>
            </View>
          ))}
        </View>
        {DAYS.map((day) => (
          <DayColumn
            key={day}
            dayOfWeek={day}
            date={courseDate(semesterStart, week, day)}
            courses={courses.filter((c) => c.dayOfWeek === day)}
            periodCount={periodCount}
            periods={periods}
            onPress={onPressDay}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  timeColumn: {
    width: TIME_COL_WIDTH,
  },
  corner: {
    height: DAY_HEADER_HEIGHT,
  },
  periodCell: {
    height: PERIOD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  periodText: {
    fontSize: 12,
    lineHeight: 16,
  },
  timeText: {
    fontSize: 10,
    lineHeight: 14,
  },
});
