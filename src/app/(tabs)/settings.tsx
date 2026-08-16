import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { requestNotificationPermission, scheduleClassReminders } from '@/notifications/schedule';
import { useCoursesStore } from '@/store/courses';
import { useSettingsStore } from '@/store/settings';
import type { ThemeMode } from '@/models/course';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
];

/** 设置与个性化（README「设置与个性化模块」）。 */
export default function SettingsScreen() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const theme = useTheme();
  const router = useRouter();

  const [semesterStart, setSemesterStart] = useState(settings.semesterStart);
  const [totalWeeks, setTotalWeeks] = useState(String(settings.totalWeeks));
  const [remind, setRemind] = useState(String(settings.remindBeforeMinutes));
  const save = async () => {
    await update({
      semesterStart,
      totalWeeks: Number(totalWeeks) || 20,
      remindBeforeMinutes: Number(remind) || 0,
    });
    await scheduleClassReminders(
      useCoursesStore.getState().courses,
      useSettingsStore.getState().settings,
    );
    Alert.alert('已保存');
  };

  const requestPermission = async () => {
    const granted = await requestNotificationPermission();
    Alert.alert(granted ? '通知权限已授权' : '通知权限被拒绝');
  };

  const toggleNotifications = async (enabled: boolean) => {
    await update({ notificationsEnabled: enabled });
    await scheduleClassReminders(
      useCoursesStore.getState().courses,
      useSettingsStore.getState().settings,
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <Section title="学期设置">
            <Field label="开学日期（YYYY-MM-DD）">
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={semesterStart}
                onChangeText={setSemesterStart}
                placeholder="2026-09-01"
                placeholderTextColor={theme.textSecondary}
              />
            </Field>
            <Field label="总周数">
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={totalWeeks}
                onChangeText={setTotalWeeks}
                keyboardType="number-pad"
              />
            </Field>
          </Section>

          <Section title="上课时间表">
            <Pressable onPress={() => router.push('/periods')} style={styles.periodsRow}>
              <ThemedText type="small" themeColor="textSecondary">
                共 {settings.periods.length} 节，点击编辑
              </ThemedText>
              <ThemedText themeColor="textSecondary">›</ThemedText>
            </Pressable>
          </Section>

          <Section title="提醒通知">
            <Field label="上课前提醒（分钟）">
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={remind}
                onChangeText={setRemind}
                keyboardType="number-pad"
              />
            </Field>
            <View style={styles.notifRow}>
              <View style={styles.notifToggle}>
                <ThemedText type="small">开启通知</ThemedText>
                <Switch
                  value={settings.notificationsEnabled}
                  onValueChange={(v) => void toggleNotifications(v)}
                  trackColor={{ false: '#c7c7cc', true: '#3c87f7' }}
                  thumbColor="#ffffff"
                />
              </View>
              <Pressable onPress={requestPermission} style={styles.button}>
                <ThemedText type="small">授权通知</ThemedText>
              </Pressable>
            </View>
          </Section>

          <Section title="外观">
            <View style={styles.themeRow}>
              {THEME_OPTIONS.map((opt) => {
                const selected = settings.theme === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => void update({ theme: opt.value })}
                    style={[styles.themeBtn, selected && styles.themeBtnSelected]}
                  >
                    <ThemedText type="small">{opt.label}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Pressable onPress={save} style={styles.save}>
            <ThemedText style={styles.saveText}>保存设置</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="subtitle">{title}</ThemedText>
      {children}
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.five,
  },
  section: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.two,
  },
  periodsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    borderWidth: 1,
    borderColor: '#c7c7cc',
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  button: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c7c7cc',
    alignSelf: 'flex-start',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  themeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  themeBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c7c7cc',
  },
  themeBtnSelected: {
    borderColor: '#3c87f7',
    backgroundColor: '#3c87f7',
  },
  save: {
    backgroundColor: '#3c87f7',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  saveText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
