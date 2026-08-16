import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Period } from '@/models/course';
import { scheduleClassReminders } from '@/notifications/schedule';
import { useCoursesStore } from '@/store/courses';
import { useSettingsStore } from '@/store/settings';

/** 自定义编辑节次时间表（README「设置与个性化模块」）。 */
export default function PeriodsScreen() {
  const router = useRouter();
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const theme = useTheme();

  const [periods, setPeriods] = useState<Period[]>(() => settings.periods.map((p) => ({ ...p })));

  const isTime = (t: string) => /^\d{1,2}:\d{2}$/.test(t);
  const updatePeriod = (index: number, field: 'start' | 'end', value: string) => {
    setPeriods((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };
  const addPeriod = () => setPeriods((prev) => [...prev, { start: '', end: '' }]);
  const removePeriod = (index: number) => setPeriods((prev) => prev.filter((_, i) => i !== index));

  const save = async () => {
    if (periods.some((p) => !isTime(p.start) || !isTime(p.end))) {
      Alert.alert('节次时间格式不正确', '请按 HH:MM 格式填写每个节次的起止时间（如 08:00）。');
      return;
    }
    await update({ periods });
    await scheduleClassReminders(
      useCoursesStore.getState().courses,
      useSettingsStore.getState().settings,
    );
    Alert.alert('已保存');
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="small" themeColor="textSecondary">
          修改后，课表左侧节次时间与上课提醒会自动按新时间更新。
        </ThemedText>

        {periods.map((p, i) => (
          <View key={i} style={styles.periodRow}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.periodIndex}>
              第 {i + 1} 节
            </ThemedText>
            <TextInput
              style={[styles.input, styles.timeInput, { color: theme.text }]}
              value={p.start}
              onChangeText={(v) => updatePeriod(i, 'start', v)}
              placeholder="08:00"
              placeholderTextColor={theme.textSecondary}
            />
            <ThemedText type="small" themeColor="textSecondary">
              ~
            </ThemedText>
            <TextInput
              style={[styles.input, styles.timeInput, { color: theme.text }]}
              value={p.end}
              onChangeText={(v) => updatePeriod(i, 'end', v)}
              placeholder="08:45"
              placeholderTextColor={theme.textSecondary}
            />
            <Pressable onPress={() => removePeriod(i)} hitSlop={8}>
              <ThemedText type="small" style={styles.removeText}>
                删除
              </ThemedText>
            </Pressable>
          </View>
        ))}

        <Pressable onPress={addPeriod} style={styles.addPeriod}>
          <ThemedText type="small" themeColor="textSecondary">
            + 添加一节
          </ThemedText>
        </Pressable>

        <Pressable onPress={save} style={styles.save}>
          <ThemedText style={styles.saveText}>保存</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  periodIndex: {
    width: 56,
  },
  timeInput: {
    width: 64,
    textAlign: 'center',
    paddingHorizontal: Spacing.one,
  },
  removeText: {
    color: '#e5484d',
  },
  addPeriod: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderColor: '#c7c7cc',
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  save: {
    marginTop: Spacing.three,
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
