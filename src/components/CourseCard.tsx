import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedCard } from '@/components/ThemedCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useResolvedStyle, useTheme } from '@/hooks/use-theme';
import type { Course } from '@/models/course';

/** 未上完课程的卡片不透明度；上完的课程降到更淡以区分。 */
const OPACITY_DEFAULT = 0.75;
const OPACITY_FINISHED = 0.4;

/** 根据背景色亮度返回可读前景色（黑/白）。 */
function readableTextColor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#FFFFFF';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? '#1A1A1A' : '#FFFFFF';
}

/**
 * 课程卡片。周视图网格用 compact（只显示名称，高度由父级绝对定位控制）；
 * 日视图列表用完整信息（名称/地点/教师/节次）。compact 用半透明底（网格卡多，避免大量原生模糊拖慢滚动），
 * 完整卡片用 ThemedCard（玻璃风格做真实背景模糊，其余风格纯色卡片）。
 * 卡通风格例外：整块填课程色（蜡笔贴纸），文字按背景亮度取黑/白，不显示颜色条。
 */
export function CourseCard({
  course,
  compact = false,
  maxLines = 2,
  dimmed = false,
  style,
}: {
  course: Course;
  compact?: boolean;
  /** 课程名最多显示行数；周视图网格按课程块高度动态传入，节数越多显示越多。 */
  maxLines?: number;
  /** 该课程对应节次已上完（结束时间已过），降低不透明度。 */
  dimmed?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const appearance = useResolvedStyle();
  const solidFill = appearance === 'cartoon';
  const opacity = dimmed ? OPACITY_FINISHED : OPACITY_DEFAULT;
  const contrast = solidFill ? readableTextColor(course.color) : undefined;

  const body = (
    <>
      {!solidFill && <View style={[styles.colorBar, { backgroundColor: course.color }]} />}
      <View style={[styles.body, compact && styles.bodyCompact]}>
        <ThemedText
          type="smallBold"
          numberOfLines={maxLines}
          style={solidFill ? { color: contrast } : undefined}
        >
          {course.name}
        </ThemedText>
        {!compact && (
          <>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              numberOfLines={1}
              style={solidFill ? { color: contrast, opacity: 0.85 } : undefined}
            >
              {course.location ? `地点 ${course.location}` : '地点待定'}
            </ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              numberOfLines={1}
              style={solidFill ? { color: contrast, opacity: 0.85 } : undefined}
            >
              {course.teacher ? `教师 ${course.teacher}` : '教师待定'}
            </ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={solidFill ? { color: contrast, opacity: 0.85 } : undefined}
            >
              第 {course.startPeriod}-{course.endPeriod} 节
            </ThemedText>
          </>
        )}
      </View>
    </>
  );

  if (solidFill) {
    return (
      <View
        style={[
          styles.solidCard,
          {
            backgroundColor: course.color,
            borderColor: theme.cardBorder,
            borderWidth: theme.borderWidth,
            borderRadius: theme.radius.md,
            boxShadow: theme.cardShadow ?? undefined,
            opacity,
          },
          style,
        ]}
      >
        {body}
      </View>
    );
  }

  if (compact) {
    return (
      <ThemedView
        type="backgroundElement"
        style={[
          styles.card,
          {
            borderColor: theme.border,
            borderWidth: theme.borderWidth,
            borderRadius: theme.radius.md,
            opacity,
          },
          style,
        ]}
      >
        {body}
      </ThemedView>
    );
  }

  return (
    <ThemedCard radius={theme.radius.md} style={[styles.row, { opacity }, style]}>
      {body}
    </ThemedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  solidCard: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  colorBar: {
    width: 4,
  },
  body: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
  },
  bodyCompact: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    justifyContent: 'center',
    gap: 0,
  },
});
