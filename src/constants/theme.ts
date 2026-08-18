/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1B1B24',
    background: '#F4F2FB',
    backgroundElement: 'rgba(255,255,255,0.62)',
    backgroundSelected: 'rgba(255,255,255,0.92)',
    textSecondary: '#5E5C6B',
    border: 'rgba(140,130,175,0.28)',
  },
  dark: {
    text: '#FFFFFF',
    background: '#0C0C16',
    backgroundElement: 'rgba(255,255,255,0.06)',
    backgroundSelected: 'rgba(255,255,255,0.14)',
    textSecondary: '#A6A5B4',
    border: 'rgba(255,255,255,0.14)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** 圆角规格：sm 小元素、md 卡片/输入框、lg 大卡片/弹层、pill 胶囊。 */
export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

/** 单个背景光斑：低透明度大圆，模拟 Instagram 风格的彩色渐变底。 */
export type GlassBlob = {
  color: string;
  size: number;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
};

/** 毛玻璃拟态的彩色光斑背景（浅色/深色各一套）。 */
export const GlassBlobs: Record<'light' | 'dark', GlassBlob[]> = {
  light: [
    { color: 'rgba(139,92,246,0.22)', size: 340, top: -90, right: -70 },
    { color: 'rgba(236,72,153,0.18)', size: 300, top: 140, left: -90 },
    { color: 'rgba(245,158,11,0.16)', size: 280, bottom: -80, left: 20 },
    { color: 'rgba(59,130,246,0.16)', size: 320, bottom: 100, right: -90 },
  ],
  dark: [
    { color: 'rgba(139,92,246,0.18)', size: 340, top: -90, right: -70 },
    { color: 'rgba(236,72,153,0.13)', size: 300, top: 140, left: -90 },
    { color: 'rgba(245,158,11,0.11)', size: 280, bottom: -80, left: 20 },
    { color: 'rgba(59,130,246,0.13)', size: 320, bottom: 100, right: -90 },
  ],
};

/** 卡片柔和投影（RN 0.76+ 跨平台 boxShadow）。 */
export const CardShadow = {
  light: '0 8px 24px rgba(58,46,102,0.10)',
  dark: '0 8px 24px rgba(0,0,0,0.45)',
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
