import { useRouter } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { notificationsSupported, requestNotificationPermission, scheduleClassReminders } from '@/notifications/schedule';
import { clearBackgroundImage, pickBackgroundImage } from '@/services/background';
import { useCoursesStore } from '@/store/courses';
import { useSettingsStore } from '@/store/settings';
import { currentWeekClamped, isValidIsoDate, semesterStartFromWeek } from '@/utils/date';
import type { AppearanceStyle, BackgroundScrim, ThemeMode } from '@/models/course';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
];

const STYLE_OPTIONS: { value: AppearanceStyle; label: string }[] = [
  { value: 'glass', label: '玻璃' },
  { value: 'minimal', label: '极简' },
  { value: 'cartoon', label: '卡通' },
];

const SCRIM_OPTIONS: { value: BackgroundScrim; label: string }[] = [
  { value: 'light', label: '弱' },
  { value: 'medium', label: '中' },
  { value: 'strong', label: '强' },
];

/** 设置与个性化（README「设置与个性化模块」）。 */
export default function SettingsScreen() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const theme = useTheme();
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();

  const [semesterStart, setSemesterStart] = useState(settings.semesterStart);
  const [totalWeeks, setTotalWeeks] = useState(String(settings.totalWeeks));
  const [currentWeekText, setCurrentWeekText] = useState('');
  const [remind, setRemind] = useState(String(settings.remindBeforeMinutes));
  const reschedule = async () => {
    await scheduleClassReminders(
      useCoursesStore.getState().courses,
      useSettingsStore.getState().settings,
    );
  };

  const saveSemester = async () => {
    if (!isValidIsoDate(semesterStart)) {
      Alert.alert('开学日期无效', '请按 YYYY-MM-DD 格式填写，如 2026-09-01。');
      return;
    }
    const weeks = Number(totalWeeks);
    if (!Number.isInteger(weeks) || weeks < 1) {
      Alert.alert('总周数无效', '总周数应为正整数，如 20。');
      return;
    }
    await update({
      semesterStart,
      totalWeeks: weeks,
    });
    await reschedule();
    Alert.alert('已保存', `学期设置已保存（开学 ${semesterStart}，共 ${weeks} 周）。`);
  };

  const applyCurrentWeek = () => {
    const week = Number(currentWeekText);
    if (!Number.isInteger(week) || week < 1) {
      Alert.alert('当前周无效', '请输入正整数周次，如 3。');
      return;
    }
    const start = semesterStartFromWeek(week);
    setSemesterStart(start);
    Alert.alert('已计算开学日期', `按「第 ${week} 周」反推开学日期为 ${start}，请核对后保存。`);
  };

  const saveRemind = async () => {
    const next = Number(remind);
    if (!Number.isInteger(next) || next < 0) {
      Alert.alert('提醒时间无效', '提醒分钟数应为非负整数，如 10；0 表示关闭提醒。');
      return;
    }
    if (next === settings.remindBeforeMinutes) return;
    await update({ remindBeforeMinutes: next });
    await reschedule();
  };

  const requestPermission = async () => {
    if (!notificationsSupported()) {
      Alert.alert('当前环境不支持通知', 'Android 的 Expo Go 已移除通知功能，请用 development build（或 iOS Expo Go）测试。');
      return;
    }
    const granted = await requestNotificationPermission();
    Alert.alert(granted ? '通知权限已授权' : '通知权限被拒绝');
  };

  const toggleNotifications = async (enabled: boolean) => {
    await update({ notificationsEnabled: enabled });
    await reschedule();
  };

  const pickBackground = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('暂不支持', '网页版暂不支持自定义背景图，请在手机端设置。');
      return;
    }
    try {
      const uri = await pickBackgroundImage();
      if (uri) await update({ backgroundImage: uri });
    } catch {
      Alert.alert('设置失败', '无法读取所选图片，请重试。');
    }
  };

  const clearBackground = async () => {
    clearBackgroundImage();
    await update({ backgroundImage: null });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={[styles.safe, { paddingBottom: tabBarHeight }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Section title="学期设置">
            <Field label="开学日期（YYYY-MM-DD）">
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, borderWidth: theme.borderWidth }]}
                value={semesterStart}
                onChangeText={setSemesterStart}
                placeholder="2026-09-01"
                placeholderTextColor={theme.textSecondary}
              />
            </Field>
            <Field label="总周数">
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, borderWidth: theme.borderWidth }]}
                value={totalWeeks}
                onChangeText={setTotalWeeks}
                keyboardType="number-pad"
              />
            </Field>
            <Field label="当前周（第几周，反推开学日期）">
              <View style={styles.weekRow}>
                <TextInput
                  style={[styles.input, styles.weekInput, { color: theme.text, borderColor: theme.border, borderWidth: theme.borderWidth }]}
                  value={currentWeekText}
                  onChangeText={setCurrentWeekText}
                  placeholder={`当前第 ${currentWeekClamped(settings.semesterStart, settings.totalWeeks)} 周`}
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="number-pad"
                />
                <Pressable
                  onPress={applyCurrentWeek}
                  style={[styles.button, { borderColor: theme.border, borderWidth: theme.borderWidth, borderRadius: theme.radius.md }]}
                >
                  <ThemedText type="small">计算开学日期</ThemedText>
                </Pressable>
              </View>
            </Field>
            <Pressable
              onPress={saveSemester}
              style={[styles.sectionSave, { backgroundColor: theme.accent, borderRadius: theme.radius.md }]}
            >
              <ThemedText type="small" style={[styles.sectionSaveText, { color: theme.accentText }]}>
                保存学期设置
              </ThemedText>
            </Pressable>
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
                style={[styles.input, { color: theme.text, borderColor: theme.border, borderWidth: theme.borderWidth }]}
                value={remind}
                onChangeText={setRemind}
                onEndEditing={saveRemind}
                keyboardType="number-pad"
                returnKeyType="done"
              />
            </Field>
            <View style={styles.notifRow}>
              <View style={styles.notifToggle}>
                <ThemedText type="small">开启通知</ThemedText>
                <Switch
                  value={settings.notificationsEnabled}
                  onValueChange={(v) => void toggleNotifications(v)}
                  trackColor={{ false: theme.border, true: theme.accent }}
                  thumbColor="#ffffff"
                />
              </View>
              <Pressable
                onPress={requestPermission}
                style={[styles.button, { borderColor: theme.border, borderWidth: theme.borderWidth, borderRadius: theme.radius.md }]}
              >
                <ThemedText type="small">授权通知</ThemedText>
              </Pressable>
            </View>
          </Section>

          <Section title="外观">
            <Field label="深浅模式">
              <View style={styles.themeRow}>
                {THEME_OPTIONS.map((opt) => {
                  const selected = settings.theme === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => void update({ theme: opt.value })}
                      style={[
                        styles.themeBtn,
                        {
                          borderColor: selected ? theme.accent : theme.border,
                          borderWidth: theme.borderWidth,
                          backgroundColor: selected ? theme.accent : 'transparent',
                          minHeight: theme.minTouch || undefined,
                        },
                      ]}
                    >
                      <ThemedText type="small" style={selected ? { color: theme.accentText } : undefined}>
                        {opt.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </Field>
            <Field label="界面风格">
              <View style={styles.themeRow}>
                {STYLE_OPTIONS.map((opt) => {
                  const selected = settings.style === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => void update({ style: opt.value })}
                      style={[
                        styles.themeBtn,
                        {
                          borderColor: selected ? theme.accent : theme.border,
                          borderWidth: theme.borderWidth,
                          backgroundColor: selected ? theme.accent : 'transparent',
                          minHeight: theme.minTouch || undefined,
                        },
                      ]}
                    >
                      <ThemedText type="small" style={selected ? { color: theme.accentText } : undefined}>
                        {opt.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </Field>
            <Field label="自定义背景图">
              <View style={styles.bgRow}>
                <Pressable
                  onPress={() => void pickBackground()}
                  style={[styles.button, { borderColor: theme.border, borderWidth: theme.borderWidth, borderRadius: theme.radius.md }]}
                >
                  <ThemedText type="small">{settings.backgroundImage ? '更换背景图' : '选择背景图'}</ThemedText>
                </Pressable>
                {settings.backgroundImage ? (
                  <Pressable
                    onPress={() => void clearBackground()}
                    style={[styles.button, { borderColor: theme.border, borderWidth: theme.borderWidth, borderRadius: theme.radius.md }]}
                  >
                    <ThemedText type="small" themeColor="danger">
                      移除背景图
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            </Field>
            {settings.backgroundImage ? (
              <Field label="背景遮罩">
                <View style={styles.themeRow}>
                  {SCRIM_OPTIONS.map((opt) => {
                    const selected = settings.backgroundScrim === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => void update({ backgroundScrim: opt.value })}
                        style={[
                          styles.themeBtn,
                          {
                            borderColor: selected ? theme.accent : theme.border,
                            borderWidth: theme.borderWidth,
                            backgroundColor: selected ? theme.accent : 'transparent',
                            minHeight: theme.minTouch || undefined,
                          },
                        ]}
                      >
                        <ThemedText type="small" style={selected ? { color: theme.accentText } : undefined}>
                          {opt.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </Field>
            ) : null}
          </Section>

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="subtitle">{title}</ThemedText>
      <ThemedView card style={styles.sectionCard}>
        {children}
      </ThemedView>
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
  sectionCard: {
    padding: Spacing.three,
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
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  weekInput: {
    flex: 1,
  },
  button: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 14,
    borderWidth: 1,
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
    borderRadius: 14,
    borderWidth: 1,
  },
  bgRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  sectionSave: {
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    alignSelf: 'flex-start',
  },
  sectionSaveText: {
    fontWeight: '700',
  },
});
