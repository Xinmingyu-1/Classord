import { Tabs } from 'expo-router/js-tabs';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: '课表' }} />
      <Tabs.Screen name="courses" options={{ title: '课程' }} />
      <Tabs.Screen name="settings" options={{ title: '设置' }} />
    </Tabs>
  );
}
