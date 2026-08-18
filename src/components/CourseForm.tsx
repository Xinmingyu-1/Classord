import { type ReactNode, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { MAX_PERIODS } from '@/constants/periods';
import { useTheme } from '@/hooks/use-theme';
import type { Course } from '@/models/course';
import { COURSE_COLORS, DEFAULT_COURSE_COLOR } from '@/theme/colors';
import { formatWeeks, parseWeeksText } from '@/utils/date';

const DAYS = [1, 2, 3, 4, 5, 6, 7];
const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export type CourseDraft = Omit<Course, 'id'>;

/** 课程编辑表单（新增/编辑共用，README「课程管理模块」）。 */
export function CourseForm({
  initial,
  onSubmit,
}: {
  initial?: Course;
  onSubmit: (draft: CourseDraft) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [teacher, setTeacher] = useState(initial?.teacher ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [dayOfWeek, setDayOfWeek] = useState(initial?.dayOfWeek ?? 1);
  const [startPeriod, setStartPeriod] = useState(String(initial?.startPeriod ?? 1));
  const [endPeriod, setEndPeriod] = useState(String(initial?.endPeriod ?? 1));
  const [weeksText, setWeeksText] = useState(initial ? formatWeeks(initial.weeks) : '1-20');
  const [color, setColor] = useState(initial?.color ?? DEFAULT_COURSE_COLOR);
  const theme = useTheme();

  const submit = () => {
    const start = Number(startPeriod);
    const end = Number(endPeriod);
    if (!Number.isInteger(start) || start < 1 || !Number.isInteger(end) || end < 1) {
      Alert.alert('节次无效', '起始与结束节次都应为正整数，如 1、2。');
      return;
    }
    if (end < start) {
      Alert.alert('节次顺序错误', '结束节次不能早于起始节次。');
      return;
    }
    if (end > MAX_PERIODS) {
      Alert.alert('节次超出范围', `节次不能超过 ${MAX_PERIODS}。`);
      return;
    }
    const weeks = parseWeeksText(weeksText);
    if (weeks.length === 0) {
      Alert.alert('周次无效', '请按「1-16」或「1,3,5」的格式填写上课周次。');
      return;
    }
    onSubmit({
      name: name.trim() || '未命名课程',
      teacher: teacher.trim(),
      location: location.trim(),
      dayOfWeek,
      startPeriod: start,
      endPeriod: end,
      weeks,
      color,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Field label="课程名">
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border, borderWidth: theme.borderWidth }]}
          value={name}
          onChangeText={setName}
          placeholder="如：高等数学"
          placeholderTextColor={theme.textSecondary}
        />
      </Field>
      <Field label="教师">
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border, borderWidth: theme.borderWidth }]}
          value={teacher}
          onChangeText={setTeacher}
          placeholder="选填"
          placeholderTextColor={theme.textSecondary}
        />
      </Field>
      <Field label="地点">
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border, borderWidth: theme.borderWidth }]}
          value={location}
          onChangeText={setLocation}
          placeholder="选填"
          placeholderTextColor={theme.textSecondary}
        />
      </Field>

      <Field label="周几">
        <View style={styles.row}>
          {DAYS.map((d, i) => (
            <Chip key={d} selected={dayOfWeek === d} label={DAY_LABELS[i]} onPress={() => setDayOfWeek(d)} />
          ))}
        </View>
      </Field>

      <Field label="节次（起止）">
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.narrow, { color: theme.text, borderColor: theme.border, borderWidth: theme.borderWidth }]}
            value={startPeriod}
            onChangeText={setStartPeriod}
            keyboardType="number-pad"
            placeholder="1"
            placeholderTextColor={theme.textSecondary}
          />
          <ThemedText>—</ThemedText>
          <TextInput
            style={[styles.input, styles.narrow, { color: theme.text, borderColor: theme.border, borderWidth: theme.borderWidth }]}
            value={endPeriod}
            onChangeText={setEndPeriod}
            keyboardType="number-pad"
            placeholder="2"
            placeholderTextColor={theme.textSecondary}
          />
        </View>
      </Field>

      <Field label="周次（如 1-16 或 1,3,5）">
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border, borderWidth: theme.borderWidth }]}
          value={weeksText}
          onChangeText={setWeeksText}
          placeholder="1-20"
          placeholderTextColor={theme.textSecondary}
        />
      </Field>

      <Field label="颜色标签">
        <View style={styles.row}>
          {COURSE_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchSelected]}
            />
          ))}
        </View>
      </Field>

      <Pressable
        onPress={submit}
        style={[styles.submit, { backgroundColor: theme.accent, borderRadius: theme.radius.md }]}
      >
        <ThemedText style={[styles.submitText, { color: theme.accentText }]}>保存</ThemedText>
      </Pressable>
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

function Chip({ selected, label, onPress }: { selected: boolean; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: selected ? theme.accent : theme.border,
          borderWidth: theme.borderWidth,
          backgroundColor: selected ? theme.accent : 'transparent',
          minHeight: theme.minTouch || undefined,
        },
      ]}
    >
      <ThemedText type="small" style={selected ? { color: theme.accentText } : undefined}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderColor: '#c7c7cc',
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  narrow: {
    width: 64,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 16,
    borderWidth: 1,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: '#000000',
  },
  submit: {
    marginTop: Spacing.three,
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  submitText: {
    fontWeight: '700',
  },
});
