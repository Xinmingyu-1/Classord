/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Themes } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSettingsStore } from '@/store/settings';
import type { AppearanceStyle } from '@/models/course';

/** 解析实际生效的深浅色：`system` 时跟随系统深浅色，否则用显式设置值。 */
export function useResolvedTheme(): 'light' | 'dark' {
  const preference = useSettingsStore((s) => s.settings.theme);
  const systemScheme = useColorScheme();
  return preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
}

/** 解析实际生效的外观风格。 */
export function useResolvedStyle(): AppearanceStyle {
  return useSettingsStore((s) => s.settings.style);
}

/** 返回当前风格 + 深浅色对应的展平主题 token。 */
export function useTheme() {
  const style = useResolvedStyle();
  const scheme = useResolvedTheme();
  return Themes[style][scheme];
}
