import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { useCoursesStore } from '@/store/courses';
import { useSettingsStore } from '@/store/settings';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    (async () => {
      await useCoursesStore.getState().load();
      await useSettingsStore.getState().load();
      await SplashScreen.hideAsync();
    })();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
