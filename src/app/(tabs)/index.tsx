import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
  // 开学日期变化（含设置异步加载完成）后，把周次重置为当前周。
  // 用「渲染期调整 state」而非 useEffect，避免 setState-in-effect 的级联渲染。
  const [lastSemesterStart, setLastSemesterStart] = useState(settings.semesterStart);
  if (lastSemesterStart !== settings.semesterStart) {
    setLastSemesterStart(settings.semesterStart);
    setWeek(currentWeek(settings.semesterStart));
  }

  const visibleCourses = useMemo(
    () => courses.filter((c) => isCourseInWeek(c.weeks, week)),
    [courses, week],
  );
  // 网格节次行数：至少覆盖设置的节次表；若有课程结束节次更高则一并纳入，避免被裁剪。
  const periodCount = Math.max(settings.periods.length, ...visibleCourses.map((c) => c.endPeriod));

  const openDay = (dayOfWeek: number) => {
    router.push({ pathname: '/day', params: { dayOfWeek: String(dayOfWeek), week: String(week) } });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.weekBar}>
          <Pressable onPress={() => setWeek((w) => Math.max(1, w - 1))} hitSlop={12}>
            <ThemedText style={styles.arrow}>‹</ThemedText>
          </Pressable>
          <ThemedText style={styles.weekLabel}>第 {week} 周</ThemedText>
          <Pressable onPress={() => setWeek((w) => Math.min(settings.totalWeeks, w + 1))} hitSlop={12}>
            <ThemedText style={styles.arrow}>›</ThemedText>
          </Pressable>
        </View>

        {visibleCourses.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText themeColor="textSecondary">暂无课程，去「课程」页添加或导入</ThemedText>
          </View>
        ) : (
          <WeekGrid
            courses={visibleCourses}
            periodCount={periodCount}
            periods={settings.periods}
            onPressDay={openDay}
          />
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
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  weekLabel: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '700',
  },
  arrow: {
    fontSize: 27,
    lineHeight: 24,
    fontWeight: '600',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
