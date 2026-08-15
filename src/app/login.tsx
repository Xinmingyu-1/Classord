import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { clearCredentials, fetchScheduleFromEdu, saveCredentials } from '@/services/edu/client';

/** 教务系统登录（README「教务系统对接模块」）。 */
export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState('');

  const submit = async () => {
    if (!username || !password) {
      Alert.alert('请输入账号和密码');
      return;
    }
    try {
      await saveCredentials({ username, password });
      // TODO：真实实现抓取并入库；当前 fetchScheduleFromEdu 尚未实现，会抛错。
      const courses = await fetchScheduleFromEdu(username, password);
      Alert.alert(`抓取到 ${courses.length} 门课程（占位）`);
    } catch (e) {
      Alert.alert('抓取失败', e instanceof Error ? e.message : String(e));
    }
  };

  const clear = async () => {
    await clearCredentials();
    Alert.alert('已清除本地凭据');
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="small" themeColor="textSecondary">
          账号密码仅保存在本地 Keychain/Keystore，不会上传（README：仅本地临时使用）。
        </ThemedText>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="学号 / 账号"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="密码"
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          value={captcha}
          onChangeText={setCaptcha}
          placeholder="验证码（如有）"
          autoCapitalize="none"
        />
        <Pressable onPress={submit} style={styles.submit}>
          <ThemedText style={styles.submitText}>登录并抓取课表</ThemedText>
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
  submit: {
    backgroundColor: '#3c87f7',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  submitText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  clear: {
    alignItems: 'center',
  },
});
