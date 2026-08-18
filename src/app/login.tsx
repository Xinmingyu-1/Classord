import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
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
  const [showPassword, setShowPassword] = useState(false);

  // 单个 EduClient 实例贯穿「登录 → 可能需要验证码 → 抓取」，以复用同一会话 Cookie。
  const [client] = useState(() => new EduClient());
  const theme = useTheme();

  useEffect(() => {
    void loadCredentials().then((c) => {
      if (c) {
        setUsername(c.username);
        setPassword(c.password);
      }
    });
  }, []);

  // 预探测登录页：若当前账号需要验证码，提前拉取并展示，让用户只点一次「登录」。
  useEffect(() => {
    void client
      .prepare()
      .then(async ({ needCaptcha }) => {
        if (needCaptcha) {
          const img = await client.getCaptchaImage().catch(() => null);
          setCaptchaImage(img);
        }
      })
      .catch(() => {
        // 预探测失败不影响后续登录（login() 会重新建立会话并走两段式验证码流程）。
      });
  }, [client]);

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
        if (img) {
          Alert.alert('需要验证码', '请按图片输入验证码后重试');
        } else {
          Alert.alert('需要验证码', '验证码图片加载失败，请检查教务系统验证码接口或稍后重试');
        }
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
          style={[styles.input, { color: theme.text, borderColor: theme.border, borderWidth: theme.borderWidth }]}
          value={username}
          onChangeText={setUsername}
          placeholder="学号 / 账号"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          editable={!loading}
        />
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.passwordInput, { color: theme.text, borderColor: theme.border, borderWidth: theme.borderWidth }]}
            value={password}
            onChangeText={setPassword}
            placeholder="密码"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry={!showPassword}
            editable={!loading}
          />
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            style={styles.eyeButton}
            hitSlop={8}
          >
            <ThemedText type="small" themeColor="textSecondary">
              {showPassword ? '隐藏' : '显示'}
            </ThemedText>
          </Pressable>
        </View>

        {captchaImage ? (
          <>
            <Image source={{ uri: captchaImage }} style={styles.captcha} resizeMode="contain" />
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, borderWidth: theme.borderWidth }]}
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
          style={[styles.submit, { backgroundColor: theme.accent, borderRadius: theme.radius.md }, loading && styles.submitDisabled]}
        >
          {loading ? (
            <ActivityIndicator color={theme.accentText} />
          ) : (
            <ThemedText style={[styles.submitText, { color: theme.accentText }]}>登录并抓取课表</ThemedText>
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
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
  },
  eyeButton: {
    marginLeft: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  captcha: {
    width: 140,
    height: 56,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  submit: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontWeight: '700',
  },
  clear: {
    alignItems: 'center',
  },
});
