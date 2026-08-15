/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSettingsStore } from '@/store/settings';

/** 解析实际生效的主题：`system` 时跟随系统深浅色，否则用显式设置值。 */
export function useResolvedTheme(): 'light' | 'dark' {
  const preference = useSettingsStore((s) => s.settings.theme);
  const systemScheme = useColorScheme();
  return preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
}

export function useTheme() {
  return Colors[useResolvedTheme()];
}
