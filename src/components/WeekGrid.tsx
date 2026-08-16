import { ScrollView, StyleSheet, View } from 'react-native';

import { DayColumn } from '@/components/DayColumn';
import { ThemedText } from '@/components/themed-text';
import { DAY_HEADER_HEIGHT, PERIOD_HEIGHT, TIME_COL_WIDTH } from '@/constants/timetable';
import type { Course } from '@/models/course';

const DAYS = [1, 2, 3, 4, 5, 6, 7];

/** 周视图网格：左侧节次列 + 7 天课程列（README「周视图」）。 */
export function WeekGrid({
  courses,
  periodCount,
  onPressDay,
}: {
  courses: Course[];
  periodCount: number;
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
            </View>
          ))}
        </View>
        {DAYS.map((day) => (
          <DayColumn
            key={day}
            dayOfWeek={day}
            courses={courses.filter((c) => c.dayOfWeek === day)}
            periodCount={periodCount}
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
  },
  periodText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
