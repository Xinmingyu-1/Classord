import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useCoursesStore } from '@/store/courses';
import { useSettingsStore } from '@/store/settings';
import { configureNotificationHandler, scheduleClassReminders } from '@/notifications/schedule';
import { Colors } from '@/constants/theme';
import { useResolvedTheme } from '@/hooks/use-theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const theme = useResolvedTheme();

  useEffect(() => {
    (async () => {
      try {
        await useCoursesStore.getState().load();
        await useSettingsStore.getState().load();
        configureNotificationHandler();
        await scheduleClassReminders(
          useCoursesStore.getState().courses,
          useSettingsStore.getState().settings,
        );
      } catch (e) {
        // 初始化失败（如本地库损坏）也不阻塞启动：至少关掉启动屏，让用户进入界面而非永远卡住。
        console.warn('[init] 初始化失败，已跳过：', e);
      } finally {
        await SplashScreen.hideAsync();
      }
    })();
  }, []);

  // 切页（pop）动画期间会露出原生根视图背景，默认是白底；深色主题下会闪白，
  // 这里把根视图背景同步为当前主题色（iOS 的 UIWindow 与 Android 的 window 背景）。
  useEffect(() => {
    if (Platform.OS === 'web') return;
    void SystemUI.setBackgroundColorAsync(Colors[theme].background);
  }, [theme]);

  return (
    <ThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* contentStyle 背景跟随主题：native-stack 场景容器默认白底，深色下 pop 动画会闪白。 */}
      <Stack screenOptions={{ contentStyle: { backgroundColor: Colors[theme].background } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="day" options={{ title: '日视图' }} />
        <Stack.Screen name="course/new" options={{ title: '添加课程' }} />
        <Stack.Screen name="course/[id]" options={{ title: '课程详情' }} />
        <Stack.Screen name="import" options={{ title: '导入导出' }} />
        <Stack.Screen name="login" options={{ title: '教务系统登录' }} />
        <Stack.Screen name="periods" options={{ title: '节次时间表' }} />
      </Stack>
    </ThemeProvider>
  );
}
