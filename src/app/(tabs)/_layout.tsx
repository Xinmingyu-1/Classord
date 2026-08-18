import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet } from 'react-native';

import { useResolvedTheme, useTheme } from '@/hooks/use-theme';

export default function TabLayout() {
  const theme = useTheme();
  const scheme = useResolvedTheme();
  const blur = theme.surface === 'blur';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: blur ? 'transparent' : theme.backgroundSelected,
          borderTopColor: theme.border,
          borderTopWidth: theme.borderWidth,
          borderTopLeftRadius: theme.radius.lg,
          borderTopRightRadius: theme.radius.lg,
          overflow: 'hidden',
        },
        tabBarBackground: blur
          ? () => (
              <BlurView
                intensity={70}
                tint={scheme === 'dark' ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
              />
            )
          : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '课表',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: '课程',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'book' : 'book-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '设置',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
