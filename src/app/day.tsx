import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CourseCard } from '@/components/CourseCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCoursesStore } from '@/store/courses';
import { useSettingsStore } from '@/store/settings';
import { currentWeekClamped, courseDate, atTime, dayLabel, isCourseInWeek } from '@/utils/date';

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

  const date = courseDate(settings.semesterStart, week, day);
  const now = new Date();

  /** 整门课的起止时间：起始节次的开始 ~ 结束节次的结束（而非只显示第一节课的时间）。 */
  const timeRangeOf = (course: { startPeriod: number; endPeriod: number }) => {
    const start = settings.periods[course.startPeriod - 1];
    const end = settings.periods[course.endPeriod - 1];
    return start && end ? `${start.start}~${end.end}` : '';
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
          list.map((course) => {
            const endTime = settings.periods[course.endPeriod - 1]?.end;
            const dimmed = endTime ? atTime(date, endTime).getTime() < now.getTime() : false;
            return (
              <View key={course.id} style={styles.item}>
                <ThemedText type="small" themeColor="textSecondary">
                  {course.startPeriod}-{course.endPeriod} 节 · {timeRangeOf(course)}
                </ThemedText>
                <CourseCard course={course} dimmed={dimmed} />
              </View>
            );
          })
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
