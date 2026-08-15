import { StyleSheet, View } from 'react-native';

import { DayColumn } from '@/components/DayColumn';
import type { Course } from '@/models/course';

const DAYS = [1, 2, 3, 4, 5, 6, 7];

/** 周视图 7 列网格（README「周视图」）。 */
export function WeekGrid({
  courses,
  onPressDay,
}: {
  courses: Course[];
  onPressDay?: (dayOfWeek: number) => void;
}) {
  return (
    <View style={styles.row}>
      {DAYS.map((day) => (
        <DayColumn
          key={day}
          dayOfWeek={day}
          courses={courses.filter((c) => c.dayOfWeek === day)}
          onPress={onPressDay}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
});
