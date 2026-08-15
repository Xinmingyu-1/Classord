import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { coursesToIcs } from '@/services/export/ics';
import { coursesToJson } from '@/services/export/json';
import { parseExcel } from '@/services/import/excel';
import { parseIcs } from '@/services/import/ics';
import { useCoursesStore } from '@/store/courses';

/** 导入导出（README「导入导出模块」）。 */
export default function ImportExportScreen() {
  const courses = useCoursesStore((s) => s.courses);
  const add = useCoursesStore((s) => s.add);
  const [status, setStatus] = useState('');

  const importExcel = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const bytes = await new File(result.assets[0].uri).bytes();
    const parsed = parseExcel(bytes);
    parsed.forEach(add);
    setStatus(`已导入 ${parsed.length} 门课程`);
  };

  const importIcs = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'text/calendar',
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const text = await new File(result.assets[0].uri).text();
    const parsed = parseIcs(text);
    parsed.forEach(add);
    setStatus(`已导入 ${parsed.length} 门课程`);
  };

  const exportFile = async (name: string, content: string) => {
    const file = new File(Paths.cache, name);
    file.create({ overwrite: true, intermediates: true });
    file.write(content);
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">导入</ThemedText>
        <Pressable onPress={importExcel} style={styles.button}>
          <ThemedText>从 Excel 导入</ThemedText>
        </Pressable>
        <Pressable onPress={importIcs} style={styles.button}>
          <ThemedText>从 ICS 导入</ThemedText>
        </Pressable>

        <ThemedText type="subtitle" style={styles.section}>
          导出
        </ThemedText>
        <Pressable onPress={() => exportFile('classord-schedule.ics', coursesToIcs(courses))} style={styles.button}>
          <ThemedText>导出为 ICS</ThemedText>
        </Pressable>
        <Pressable onPress={() => exportFile('classord-schedule.json', coursesToJson(courses))} style={styles.button}>
          <ThemedText>导出为 JSON 备份</ThemedText>
        </Pressable>

        {status ? (
          <ThemedText type="small" themeColor="textSecondary">
            {status}
          </ThemedText>
        ) : null}
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
  button: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c7c7cc',
    alignSelf: 'flex-start',
  },
  section: {
    marginTop: Spacing.three,
  },
});
