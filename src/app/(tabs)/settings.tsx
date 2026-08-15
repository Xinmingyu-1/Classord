import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { requestNotificationPermission } from '@/notifications/schedule';
import { useSettingsStore } from '@/store/settings';

/** 设置与个性化（README「设置与个性化模块」）。 */
export default function SettingsScreen() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);

  const [semesterStart, setSemesterStart] = useState(settings.semesterStart);
  const [totalWeeks, setTotalWeeks] = useState(String(settings.totalWeeks));
  const [remind, setRemind] = useState(String(settings.remindBeforeMinutes));

  const save = async () => {
    await update({
      semesterStart,
      totalWeeks: Number(totalWeeks) || 20,
      remindBeforeMinutes: Number(remind) || 0,
    });
    Alert.alert('已保存');
  };

  const toggleTheme = () => {
    void update({ theme: settings.theme === 'light' ? 'dark' : 'light' });
  };

  const requestPermission = async () => {
    const granted = await requestNotificationPermission();
    Alert.alert(granted ? '通知权限已授权' : '通知权限被拒绝');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <Section title="学期设置">
            <Field label="开学日期（YYYY-MM-DD）">
              <TextInput
                style={styles.input}
                value={semesterStart}
                onChangeText={setSemesterStart}
                placeholder="2026-09-01"
              />
            </Field>
            <Field label="总周数">
              <TextInput
                style={styles.input}
                value={totalWeeks}
                onChangeText={setTotalWeeks}
                keyboardType="number-pad"
              />
            </Field>
          </Section>

          <Section title="上课时间表">
            <ThemedText type="small" themeColor="textSecondary">
              当前共 {settings.periods.length} 节，默认节次时间已内置（自定义编辑待实现）。
            </ThemedText>
          </Section>

          <Section title="提醒通知">
            <Field label="上课前提醒（分钟）">
              <TextInput
                style={styles.input}
                value={remind}
                onChangeText={setRemind}
                keyboardType="number-pad"
              />
            </Field>
            <Pressable onPress={requestPermission} style={styles.button}>
              <ThemedText type="small">授权通知</ThemedText>
            </Pressable>
          </Section>

          <Section title="外观">
            <Pressable onPress={toggleTheme} style={styles.button}>
              <ThemedText type="small">
                切换主题（当前：{settings.theme === 'light' ? '浅色' : '深色'}）
              </ThemedText>
            </Pressable>
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
