import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { GlassCard } from '@/components/GlassCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import type { Course } from '@/models/course';

/** 未上完课程的卡片不透明度；上完的课程降到更淡以区分。 */
const OPACITY_DEFAULT = 0.75;
const OPACITY_FINISHED = 0.4;

/**
 * 课程卡片。周视图网格用 compact（只显示名称 + 颜色条，高度由父级绝对定位控制）；
 * 日视图列表用完整信息（名称/地点/教师/节次）。compact 用半透明底（网格卡多，避免大量原生模糊拖慢滚动），
 * 完整卡片用 GlassCard 做真实背景模糊。
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
  const opacity = dimmed ? OPACITY_FINISHED : OPACITY_DEFAULT;

  const body = (
    <>
      <View style={[styles.colorBar, { backgroundColor: course.color }]} />
      <View style={[styles.body, compact && styles.bodyCompact]}>
        <ThemedText type="smallBold" numberOfLines={maxLines}>
          {course.name}
        </ThemedText>
        {!compact && (
          <>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {course.location ? `地点 ${course.location}` : '地点待定'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {course.teacher ? `教师 ${course.teacher}` : '教师待定'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              第 {course.startPeriod}-{course.endPeriod} 节
            </ThemedText>
          </>
        )}
      </View>
    </>
  );

  if (compact) {
    return (
      <ThemedView
        type="backgroundElement"
        style={[styles.card, { borderColor: theme.border, opacity }, style]}
      >
        {body}
      </ThemedView>
    );
  }

  return (
    <GlassCard radius={12} style={[styles.row, { opacity }, style]}>
      {body}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
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
