import { Link, type Href } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCoursesStore } from '@/store/courses';

/** 课程管理列表（README「课程管理模块」）。 */
export default function CoursesScreen() {
  const courses = useCoursesStore((s) => s.courses);
  const remove = useCoursesStore((s) => s.remove);

  const confirmRemove = (id: string, name: string) => {
    Alert.alert('删除课程', `确定删除「${name}」吗？`, [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => void remove(id) },
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.actions}>
          <ActionLink href="/course/new" label="添加" />
          <ActionLink href="/import" label="导入" />
          <ActionLink href="/login" label="教务登录" />
        </View>

        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<ThemedText themeColor="textSecondary">暂无课程</ThemedText>}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Link href={{ pathname: '/course/[id]', params: { id: item.id } }} asChild>
                <Pressable style={styles.itemMain}>
                  <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                  <View style={styles.itemText}>
                    <ThemedText type="smallBold">{item.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      第 {item.startPeriod}-{item.endPeriod} 节
                      {item.location ? ` · ${item.location}` : ''}
                    </ThemedText>
                  </View>
                </Pressable>
              </Link>
              <Pressable onPress={() => confirmRemove(item.id, item.name)} hitSlop={8}>
                <ThemedText type="small" style={styles.delete}>
                  删除
                </ThemedText>
              </Pressable>
            </View>
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

function ActionLink({ href, label }: { href: Href; label: string }) {
  return (
    <Link href={href} asChild>
      <Pressable style={styles.actionBtn}>
        <ThemedText type="small">{label}</ThemedText>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  actionBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c7c7cc',
  },
  list: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  itemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  itemText: {
    flex: 1,
    gap: 2,
  },
  delete: {
    color: '#ef4444',
  },
});
