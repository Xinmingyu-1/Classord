import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Animated,
  AppState,
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
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
  const { width } = useWindowDimensions();
  // 视口实际宽度（去掉左右 padding），作为每一页的宽度；未测得前先用窗口宽度。
  const [contentWidth, setContentWidth] = useState(width);

  const [week, setWeek] = useState(() => currentWeek(settings.semesterStart));
  // Animated.Value 用 useState 惰性初始化（避免渲染期访问 ref.current）。
  // 世界坐标：第 w 周页面左缘在 w * contentWidth，故 rest 时位移为 -week * contentWidth。
  const [translateX] = useState(() => new Animated.Value(-currentWeek(settings.semesterStart) * width));

  // 开学日期变化（含设置异步加载完成）后，把周次重置为当前周。
  const [lastSemesterStart, setLastSemesterStart] = useState(settings.semesterStart);
  if (lastSemesterStart !== settings.semesterStart) {
    setLastSemesterStart(settings.semesterStart);
    setWeek(currentWeek(settings.semesterStart));
  }

  // App 回到前台时，把周次同步到现实日期对应的周（每次打开 App 自动对齐当前周）。
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setWeek(currentWeek(settings.semesterStart));
    });
    return () => sub.remove();
  }, [settings.semesterStart]);

  // 程序化切周（自动同步 / 设置加载 / 屏幕尺寸变化）时，把位移对齐到新周。
  // 滑动落点切周时此 effect 会重设到相同值，是无操作，不会闪。
  useEffect(() => {
    translateX.setValue(-week * contentWidth);
  }, [week, contentWidth, translateX]);

  // 吸附到目标周（dir：-1 上一周、+1 下一周、0 回弹）。先动画位移，再更新周次。
  const snapTo = (dir: number) => {
    const targetWeek = Math.min(settings.totalWeeks, Math.max(1, week + dir));
    Animated.timing(translateX, {
      toValue: -targetWeek * contentWidth,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setWeek(targetWeek);
    });
  };

  // 左右滑动跟手：拖动时实时跟随手指，松手按位移/速度吸附到相邻周或回弹。
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderMove: (_, g) => {
      translateX.setValue(-week * contentWidth + g.dx);
    },
    onPanResponderRelease: (_, g) => {
      const threshold = contentWidth * 0.25;
      const shouldNext = g.vx < -0.5 || g.dx < -threshold;
      const shouldPrev = g.vx > 0.5 || g.dx > threshold;
      if (shouldNext) snapTo(1);
      else if (shouldPrev) snapTo(-1);
      else snapTo(0);
    },
  });

  const openDay = (dayOfWeek: number, w: number) => {
    router.push({ pathname: '/day', params: { dayOfWeek: String(dayOfWeek), week: String(w) } });
  };

  const renderPage = (w: number) => {
    const weekCourses = courses.filter((c) => isCourseInWeek(c.weeks, w));
    const periodCount = Math.max(settings.periods.length, ...weekCourses.map((c) => c.endPeriod));
    return (
      <View key={w} style={[styles.page, { left: w * contentWidth, width: contentWidth }]}>
        {weekCourses.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText themeColor="textSecondary">暂无课程，去「课程」页添加或导入</ThemedText>
          </View>
        ) : (
          <WeekGrid
            courses={weekCourses}
            periodCount={periodCount}
            periods={settings.periods}
            onPressDay={(d) => openDay(d, w)}
          />
        )}
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.weekBar}>
          <Pressable onPress={() => snapTo(-1)} hitSlop={12}>
            <ThemedText style={styles.arrow}>‹</ThemedText>
          </Pressable>
          <ThemedText style={styles.weekLabel}>第 {week} 周</ThemedText>
          <Pressable onPress={() => snapTo(1)} hitSlop={12}>
            <ThemedText style={styles.arrow}>›</ThemedText>
          </Pressable>
        </View>

        <View
          style={styles.viewport}
          onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}
          {...panResponder.panHandlers}
        >
          <Animated.View style={[styles.strip, { transform: [{ translateX }] }]}>
            {renderPage(week - 1)}
            {renderPage(week)}
            {renderPage(week + 1)}
          </Animated.View>
        </View>
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
  viewport: {
    flex: 1,
    overflow: 'hidden',
  },
  strip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  page: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
