import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DEFAULT_PERIODS } from '@/constants/periods';
import { Spacing } from '@/constants/theme';
import { useResolvedTheme, useTheme } from '@/hooks/use-theme';
import type { Period } from '@/models/course';
import { scheduleClassReminders } from '@/notifications/schedule';
import { useCoursesStore } from '@/store/courses';
import { useSettingsStore } from '@/store/settings';

/** "HH:MM" → 今天某时刻的 Date（仅取小时/分钟）。 */
function timeToDate(t: string): Date {
  const [h, m] = t.split(':').map((n) => Number(n));
  const d = new Date();
  d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

/** Date → "HH:MM"。 */
function dateToTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 自定义编辑节次时间表（README「设置与个性化模块」）。 */
export default function PeriodsScreen() {
  const router = useRouter();
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);

  const [periods, setPeriods] = useState<Period[]>(() => settings.periods.map((p) => ({ ...p })));

  const updatePeriod = (index: number, field: 'start' | 'end', value: string) => {
    setPeriods((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };
  const addPeriod = () => setPeriods((prev) => [...prev, { start: '', end: '' }]);
  const removePeriod = (index: number) => setPeriods((prev) => prev.filter((_, i) => i !== index));
  // 把编辑列表重置为 DEFAULT_PERIODS（恢复默认节次时间）。
  const resetToDefault = () => setPeriods(DEFAULT_PERIODS.map((p) => ({ ...p })));

  const save = async () => {
    if (periods.length === 0) {
      Alert.alert('请至少保留一节', '节次时间表不能为空。');
      return;
    }
    if (periods.some((p) => !p.start || !p.end)) {
      Alert.alert('请完善节次时间', '有节次还未设置起止时间。');
      return;
    }
    // start/end 均为零填充的 "HH:MM"，字符串比较即时间先后比较。
    if (periods.some((p) => p.start >= p.end)) {
      Alert.alert('节次时间无效', '每节的结束时间应晚于开始时间。');
      return;
    }
    await update({ periods });
    await scheduleClassReminders(
      useCoursesStore.getState().courses,
      useSettingsStore.getState().settings,
    );
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="small" themeColor="textSecondary">
          修改后，课表左侧节次时间与上课提醒会自动按新时间更新。
        </ThemedText>

        {periods.map((p, i) => (
          <View key={i} style={styles.periodRow}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.periodIndex}>
              第 {i + 1} 节
            </ThemedText>
            <TimeField value={p.start} onChange={(v) => updatePeriod(i, 'start', v)} />
            <ThemedText type="small" themeColor="textSecondary">
              ~
            </ThemedText>
            <TimeField value={p.end} onChange={(v) => updatePeriod(i, 'end', v)} />
            <Pressable onPress={() => removePeriod(i)} hitSlop={8}>
              <ThemedText type="small" style={styles.removeText}>
                删除
              </ThemedText>
            </Pressable>
          </View>
        ))}

        <View style={styles.actionsRow}>
          <Pressable onPress={addPeriod} style={styles.addPeriod}>
            <ThemedText type="small" themeColor="textSecondary">
              + 添加一节
            </ThemedText>
          </Pressable>
          <Pressable onPress={resetToDefault} style={styles.addPeriod}>
            <ThemedText type="small" themeColor="textSecondary">
              重置为默认
            </ThemedText>
          </Pressable>
        </View>

        <Pressable onPress={save} style={styles.save}>
          <ThemedText style={styles.saveText}>保存</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

/** 时间选择字段：点按弹出系统时间选择器（iOS 用 spinner 弹层，Android 用原生对话框）。 */
function TimeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const theme = useTheme();
  const resolved = useResolvedTheme();
  const [visible, setVisible] = useState(false);

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setVisible(false);
      if (event.type === 'set' && selected) onChange(dateToTime(selected));
      return;
    }
    // iOS spinner：实时更新，点「完成」关闭。
    if (selected) onChange(dateToTime(selected));
  };

  const picker = (
    <DateTimePicker
      value={timeToDate(value)}
      mode="time"
      is24Hour
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      themeVariant={resolved}
      onChange={onPickerChange}
    />
  );

  return (
    <>
      <Pressable onPress={() => setVisible(true)} style={[styles.timeField, { borderColor: theme.border }]}>
        <ThemedText type="small" style={[styles.timeValue, { color: theme.text }]}>
          {value || '--:--'}
        </ThemedText>
      </Pressable>

      {Platform.OS === 'ios' ? (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setVisible(false)}>
            <Pressable style={[styles.modalCard, { backgroundColor: theme.background }]} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <ThemedText type="small" themeColor="textSecondary">
                  选择时间
                </ThemedText>
                <Pressable onPress={() => setVisible(false)} hitSlop={8}>
                  <ThemedText type="smallBold">完成</ThemedText>
                </Pressable>
              </View>
              {picker}
            </Pressable>
          </Pressable>
        </Modal>
      ) : (
        visible && picker
      )}
    </>
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
  timeField: {
    minWidth: 64,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  timeValue: {
    fontSize: 14,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
  removeText: {
    color: '#e5484d',
  },
  addPeriod: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalCard: {
    borderRadius: 12,
    padding: Spacing.four,
    minWidth: 280,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: Spacing.two,
  },
  save: {
    marginTop: Spacing.three,
    backgroundColor: '#3c87f7',
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  saveText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
