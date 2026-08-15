import { useRouter } from 'expo-router';
import { useMemo, useState, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WeekGrid } from '@/components/WeekGrid';
import { Spacing } from '@/constants/theme';
import { useCoursesStore } from '@/store/courses';
import { useSettingsStore } from '@/store/settings';
import { currentWeek, isCourseInWeek } from '@/utils/date';

/** 周视图课表（默认页，README「课表展示模块」）。 */
export default function WeekScheduleScreen() {
  const router = useRouter();
  const courses = useCoursesStore((s) => s.courses);
  const settings = useSettingsStore((s) => s.settings);
  const [week, setWeek] = useState(() => currentWeek(settings.semesterStart));

  // 设置异步加载完成（或开学日期变化）后，把周次重置为当前周
  useEffect(() => {
    setWeek(currentWeek(settings.semesterStart));
  }, [settings.semesterStart]);

  const visibleCourses = useMemo(
    () => courses.filter((c) => isCourseInWeek(c.weeks, week)),
    [courses, week],
  );

  const openDay = (dayOfWeek: number) => {
    router.push({ pathname: '/day', params: { dayOfWeek: String(dayOfWeek), week: String(week) } });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.weekBar}>
          <Pressable onPress={() => setWeek((w) => Math.max(1, w - 1))} hitSlop={12}>
            <ThemedText type="subtitle">‹</ThemedText>
          </Pressable>
          <ThemedText type="subtitle">第 {week} 周</ThemedText>
          <Pressable onPress={() => setWeek((w) => Math.min(settings.totalWeeks, w + 1))} hitSlop={12}>
            <ThemedText type="subtitle">›</ThemedText>
          </Pressable>
        </View>

        {visibleCourses.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText themeColor="textSecondary">暂无课程，去「课程」页添加或导入</ThemedText>
          </View>
        ) : (
          <WeekGrid courses={visibleCourses} onPressDay={openDay} />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
    paddingHorizontal: Spacing.two,
  },
  weekBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
