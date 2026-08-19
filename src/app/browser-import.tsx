import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { parseBrowserPayload, SCRAPE_SCRIPT } from '@/services/edu/browser';
import { SCHEDULE_INDEX } from '@/services/edu/client';
import { useCoursesStore } from '@/store/courses';
import { useSettingsStore } from '@/store/settings';

/** 补全用户输入的可能缺协议头的网址（缺 http/https 时默认补 http）。 */
function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

/** 「从浏览器中获取」：内置浏览器登录教务 → 打开课表页 → 点「确认」抓取入库（README「教务系统对接模块」）。 */
export default function BrowserImportScreen() {
  const webviewRef = useRef<WebView>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scraping, setScraping] = useState(false);
  const [uri, setUri] = useState(SCHEDULE_INDEX);
  const [urlText, setUrlText] = useState(SCHEDULE_INDEX);
  const theme = useTheme();

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => clearTimer, []);

  const go = () => {
    const target = normalizeUrl(urlText);
    if (!target) return;
    setUrlText(target);
    setUri(target);
  };

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    let data: { type?: string; payload?: string; message?: string };
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    if (data.type === 'error') {
      clearTimer();
      setScraping(false);
      Alert.alert('未识别到课程表', data.message || '请确认已登录并打开课表页后重试');
      return;
    }
    if (data.type !== 'schedule' || typeof data.payload !== 'string') return;

    clearTimer();
    setScraping(false);

    const settings = useSettingsStore.getState().settings;
    const courses = parseBrowserPayload(data.payload, settings.totalWeeks);
    if (!courses || courses.length === 0) {
      Alert.alert('未识别到课程表', '请确认已登录并打开课表页后重试');
      return;
    }

    void (async () => {
      try {
        await useCoursesStore.getState().addMany(courses);
        Alert.alert('导入成功', `已导入 ${courses.length} 门课程`, [
          { text: '确定', onPress: () => router.back() },
        ]);
      } catch (e) {
        Alert.alert('保存失败', e instanceof Error ? e.message : String(e));
      }
    })();
  };

  const confirm = () => {
    if (scraping) return;
    setScraping(true);
    clearTimer();
    // 兜底：页面未就绪等情况下脚本可能不回传消息，10s 后复位，避免一直转圈。
    timeoutRef.current = setTimeout(() => setScraping(false), 10000);
    webviewRef.current?.injectJavaScript(SCRAPE_SCRIPT);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.addressBar, { borderBottomColor: theme.border, borderBottomWidth: theme.borderWidth }]}>
        <TextInput
          style={[
            styles.addressInput,
            {
              color: theme.text,
              borderColor: theme.border,
              borderWidth: theme.borderWidth,
              backgroundColor: theme.backgroundElement,
            },
          ]}
          value={urlText}
          onChangeText={setUrlText}
          onSubmitEditing={go}
          placeholder="输入网址，如 jwgl.hebtu.edu.cn"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
        />
        <Pressable
          onPress={go}
          style={[styles.goBtn, { backgroundColor: theme.accent, borderRadius: theme.radius.md }]}
        >
          <ThemedText style={[styles.goText, { color: theme.accentText }]}>前往</ThemedText>
        </Pressable>
      </View>

      <WebView
        ref={webviewRef}
        source={{ uri }}
        onMessage={handleMessage}
        onNavigationStateChange={(e) => setUrlText(e.url)}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        originWhitelist={['*']}
        style={styles.webview}
      />

      <View style={[styles.bar, { borderTopColor: theme.border, borderTopWidth: theme.borderWidth }]}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          登录教务并打开课表页后，点「确认」抓取
        </ThemedText>
        <Pressable
          onPress={confirm}
          disabled={scraping}
          style={[
            styles.confirm,
            { backgroundColor: theme.accent, borderRadius: theme.radius.md },
            scraping && styles.confirmDisabled,
          ]}
        >
          {scraping ? (
            <ActivityIndicator color={theme.accentText} />
          ) : (
            <ThemedText style={[styles.confirmText, { color: theme.accentText }]}>确认</ThemedText>
          )}
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  addressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  addressInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: 10,
    fontSize: 14,
  },
  goBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  goText: {
    fontWeight: '700',
  },
  webview: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  hint: {
    flex: 1,
  },
  confirm: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 96,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  confirmDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    fontWeight: '700',
  },
});
