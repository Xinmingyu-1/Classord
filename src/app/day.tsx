import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CourseCard } from '@/components/CourseCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCoursesStore } from '@/store/courses';
import { useSettingsStore } from '@/store/settings';
import { currentWeekClamped, dayLabel, isCourseInWeek } from '@/utils/date';

/** 日视图：某一天的课程列表（README「日视图」）。 */
export default function DayScheduleScreen() {
  const params = useLocalSearchParams<{ dayOfWeek?: string; week?: string }>();
  const courses = useCoursesStore((s) => s.courses);
  const settings = useSettingsStore((s) => s.settings);

  const day = Number(params.dayOfWeek) || 1;
  const week = Number(params.week) || currentWeekClamped(settings.semesterStart, settings.totalWeeks);

  const list = courses
    .filter((c) => c.dayOfWeek === day && isCourseInWeek(c.weeks, week))
    .sort((a, b) => a.startPeriod - b.startPeriod);

  const timeOf = (period: number) => {
    const p = settings.periods[period - 1];
    return p ? `${p.start}~${p.end}` : '';
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">
          {dayLabel(day)} · 第 {week} 周
        </ThemedText>
        {list.length === 0 ? (
          <ThemedText themeColor="textSecondary">本周该天暂无课程</ThemedText>
        ) : (
          list.map((course) => (
            <View key={course.id} style={styles.item}>
              <ThemedText type="small" themeColor="textSecondary">
                {course.startPeriod}-{course.endPeriod} 节 · {timeOf(course.startPeriod)}
              </ThemedText>
              <CourseCard course={course} />
            </View>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  item: {
    gap: Spacing.one,
  },
});
