import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { Course } from '@/models/course';

/** 课程卡片：显示名称、地点、教师、节次与颜色标签（README「课程卡片」）。 */
export function CourseCard({ course }: { course: Course }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={[styles.colorBar, { backgroundColor: course.color }]} />
      <View style={styles.body}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {course.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {course.location ? `地点 ${course.location}` : '地点待定'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {course.teacher ? `教师 ${course.teacher}` : '教师待定'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          第 {course.startPeriod}-{course.endPeriod} 节
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 4,
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
});
