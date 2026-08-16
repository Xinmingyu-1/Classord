import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { Course } from '@/models/course';

/**
 * 课程卡片。周视图网格用 compact（只显示名称 + 颜色条，高度由父级绝对定位控制）；
 * 日视图列表用完整信息（名称/地点/教师/节次）。
 */
export function CourseCard({
  course,
  compact = false,
  style,
}: {
  course: Course;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <ThemedView type="backgroundElement" style={[styles.card, style]}>
      <View style={[styles.colorBar, { backgroundColor: course.color }]} />
      <View style={[styles.body, compact && styles.bodyCompact]}>
        <ThemedText type="smallBold" numberOfLines={2}>
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 8,
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
