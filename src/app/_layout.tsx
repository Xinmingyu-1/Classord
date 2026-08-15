import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { useCoursesStore } from '@/store/courses';
import { useSettingsStore } from '@/store/settings';
import { configureNotificationHandler, scheduleClassReminders } from '@/notifications/schedule';
import { useResolvedTheme } from '@/hooks/use-theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const theme = useResolvedTheme();

  useEffect(() => {
    (async () => {
      await useCoursesStore.getState().load();
      await useSettingsStore.getState().load();
      configureNotificationHandler();
      await scheduleClassReminders(
        useCoursesStore.getState().courses,
        useSettingsStore.getState().settings,
      );
      await SplashScreen.hideAsync();
    })();
  }, []);

  return (
    <ThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="day" options={{ title: '日视图' }} />
        <Stack.Screen name="course/new" options={{ title: '添加课程' }} />
        <Stack.Screen name="course/[id]" options={{ title: '课程详情' }} />
        <Stack.Screen name="import" options={{ title: '导入导出' }} />
        <Stack.Screen name="login" options={{ title: '教务系统登录' }} />
      </Stack>
    </ThemeProvider>
  );
}
