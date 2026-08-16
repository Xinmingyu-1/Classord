import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCoursesStore } from '@/store/courses';
import { useSettingsStore } from '@/store/settings';
import { clearCredentials, EduClient, EduLoginError, loadCredentials, saveCredentials } from '@/services/edu/client';
import { parseScheduleJson } from '@/services/edu/parser';

/** 教务系统登录 + 抓取课表（README「教务系统对接模块」）。 */
export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaImage, setCaptchaImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 单个 EduClient 实例贯穿「登录 → 可能需要验证码 → 抓取」，以复用同一会话 Cookie。
  const client = useRef(new EduClient()).current;
  const theme = useTheme();

  useEffect(() => {
    void loadCredentials().then((c) => {
      if (c) {
        setUsername(c.username);
        setPassword(c.password);
      }
    });
  }, []);

  const submit = async () => {
    if (!username || !password) {
      Alert.alert('请输入账号和密码');
      return;
    }
    setLoading(true);
    try {
      await client.login(username, password, captcha);

      const settings = useSettingsStore.getState().settings;
      const json = await client.fetchSchedule();
      const courses = parseScheduleJson(json, settings.totalWeeks);

      await saveCredentials({ username, password });

      await useCoursesStore.getState().addMany(courses);

      setCaptchaImage(null);
      setCaptcha('');
      Alert.alert('导入成功', `已抓取并导入 ${courses.length} 门课程`);
    } catch (e) {
      if (e instanceof EduLoginError && e.code === 'captcha') {
        const img = await client.getCaptchaImage().catch(() => null);
        setCaptchaImage(img);
        setCaptcha('');
        Alert.alert('需要验证码', '请按图片输入验证码后重试');
      } else {
        Alert.alert('抓取失败', e instanceof Error ? e.message : String(e));
      }
    } finally {
      setLoading(false);
    }
  };

  const clear = async () => {
    await clearCredentials();
    setUsername('');
    setPassword('');
    setCaptcha('');
    setCaptchaImage(null);
    Alert.alert('已清除本地凭据');
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="small" themeColor="textSecondary">
          账号密码仅保存在本地 Keychain/Keystore，不上传任何服务器（README：仅本地临时使用）。
        </ThemedText>

        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={username}
          onChangeText={setUsername}
          placeholder="学号 / 账号"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          editable={!loading}
        />
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={password}
          onChangeText={setPassword}
          placeholder="密码"
          placeholderTextColor={theme.textSecondary}
          secureTextEntry
          editable={!loading}
        />

        {captchaImage ? (
          <>
            <Image source={{ uri: captchaImage }} style={styles.captcha} resizeMode="contain" />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={captcha}
              onChangeText={setCaptcha}
              placeholder="验证码"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
            />
          </>
        ) : null}

        <Pressable
          onPress={submit}
          disabled={loading}
          style={[styles.submit, loading && styles.submitDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <ThemedText style={styles.submitText}>登录并抓取课表</ThemedText>
          )}
        </Pressable>

        <Pressable onPress={clear} style={styles.clear}>
          <ThemedText type="small" themeColor="textSecondary">
            清除本地凭据
          </ThemedText>
        </Pressable>
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
  input: {
    borderWidth: 1,
    borderColor: '#c7c7cc',
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  captcha: {
    height: 64,
    alignSelf: 'flex-start',
  },
  submit: {
    backgroundColor: '#3c87f7',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  clear: {
    alignItems: 'center',
  },
});
