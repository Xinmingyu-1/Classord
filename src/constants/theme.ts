/**
 * 主题 token 系统。区别于早期只有「深浅色」两套颜色，现在把「外观风格」拆出来，
 * 形成 `风格(glass/minimal/accessible) × 深浅(light/dark)` 的矩阵。
 * 每个主题展平为一份 `Theme`，供 `useTheme()` 直接返回。
 */

import '@/global.css';

import { Platform } from 'react-native';

import type { AppearanceStyle } from '@/models/course';

/** 单个背景光斑：低透明度大圆，模拟彩色渐变底（仅玻璃风格使用）。 */
export type GlassBlob = {
  color: string;
  size: number;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
};

/** 玻璃风格的彩色光斑背景（浅色/深色各一套，颜色参照 Glassmorphism #3 的紫粉蓝氛围）。 */
export const GlassBlobs: Record<'light' | 'dark', GlassBlob[]> = {
  light: [
    { color: 'rgba(139,92,246,0.26)', size: 360, top: -100, right: -70 },
    { color: 'rgba(236,72,153,0.22)', size: 320, top: 150, left: -90 },
    { color: 'rgba(59,130,246,0.20)', size: 300, bottom: -80, right: -80 },
    { color: 'rgba(245,158,11,0.14)', size: 280, bottom: 120, left: 20 },
  ],
  dark: [
    { color: 'rgba(139,92,246,0.24)', size: 360, top: -100, right: -70 },
    { color: 'rgba(236,72,153,0.18)', size: 320, top: 150, left: -90 },
    { color: 'rgba(59,130,246,0.17)', size: 300, bottom: -80, right: -80 },
    { color: 'rgba(245,158,11,0.11)', size: 280, bottom: 120, left: 20 },
  ],
};

/** 展平后的主题 token，`useTheme()` 直接返回这份对象。 */
export interface Theme {
  // 颜色
  text: string;
  background: string;
  /** 卡片/表面填充（玻璃下为半透明白，紧凑卡片复用它做轻量底）。 */
  backgroundElement: string;
  /** 选中态表面填充。 */
  backgroundSelected: string;
  textSecondary: string;
  /** 功能边框（输入框/chip/tab 顶边等），需在背景上可见。 */
  border: string;
  /** 卡片表面描边（玻璃风格为半透明白，其余风格等于 border）。 */
  cardBorder: string;
  accent: string; // 主操作色
  accentText: string; // 主操作色上的文字
  danger: string; // 删除/危险色
  focus: string; // 聚焦/选中边框色
  // 结构
  radius: { sm: number; md: number; lg: number; pill: number };
  borderWidth: number; // 1（玻璃/极简）/ 2（无障碍）
  cardShadow: string | null; // null = 无投影
  surface: 'blur' | 'solid'; // 卡片材质：毛玻璃 vs 纯色
  blobs: GlassBlob[] | null; // 背景光斑（仅玻璃）
  minTouch: number; // 无障碍 = 44，其余 0（不强制）
}

/** 颜色类 token 的键名，供 ThemedText/ThemedView 的 themeColor/type 用。 */
export type ThemeColor =
  | 'text'
  | 'background'
  | 'backgroundElement'
  | 'backgroundSelected'
  | 'textSecondary'
  | 'border'
  | 'accent'
  | 'accentText'
  | 'danger'
  | 'focus';

const radius = {
  glass: { sm: 10, md: 14, lg: 20, pill: 999 },
  minimal: { sm: 2, md: 4, lg: 8, pill: 999 },
  accessible: { sm: 4, md: 8, lg: 12, pill: 999 },
} as const;

export const Themes: Record<AppearanceStyle, Record<'light' | 'dark', Theme>> = {
  glass: {
    light: {
      text: '#1B1B24',
      background: '#F0ECFB',
      backgroundElement: 'rgba(255,255,255,0.55)',
      backgroundSelected: 'rgba(255,255,255,0.9)',
      textSecondary: '#5E5C6B',
      border: 'rgba(140,130,175,0.30)',
      cardBorder: 'rgba(255,255,255,0.65)',
      accent: '#3c87f7',
      accentText: '#FFFFFF',
      danger: '#e5484d',
      focus: '#3c87f7',
      radius: radius.glass,
      borderWidth: 1,
      cardShadow: '0 8px 24px rgba(58,46,102,0.10)',
      surface: 'blur',
      blobs: GlassBlobs.light,
      minTouch: 0,
    },
    dark: {
      text: '#FFFFFF',
      background: '#0C0C16',
      backgroundElement: 'rgba(255,255,255,0.08)',
      backgroundSelected: 'rgba(255,255,255,0.16)',
      textSecondary: '#A6A5B4',
      border: 'rgba(255,255,255,0.14)',
      cardBorder: 'rgba(255,255,255,0.16)',
      accent: '#5b9dff',
      accentText: '#FFFFFF',
      danger: '#ff6b6b',
      focus: '#5b9dff',
      radius: radius.glass,
      borderWidth: 1,
      cardShadow: '0 8px 24px rgba(0,0,0,0.45)',
      surface: 'blur',
      blobs: GlassBlobs.dark,
      minTouch: 0,
    },
  },
  minimal: {
    light: {
      text: '#111111',
      background: '#FFFFFF',
      backgroundElement: '#FFFFFF',
      backgroundSelected: '#F3F4F6',
      textSecondary: '#6B7280',
      border: '#E5E7EB',
      cardBorder: '#E5E7EB',
      accent: '#111111',
      accentText: '#FFFFFF',
      danger: '#DC2626',
      focus: '#111111',
      radius: radius.minimal,
      borderWidth: 1,
      cardShadow: null,
      surface: 'solid',
      blobs: null,
      minTouch: 0,
    },
    dark: {
      text: '#F5F5F5',
      background: '#0A0A0A',
      backgroundElement: '#111111',
      backgroundSelected: '#1F1F1F',
      textSecondary: '#9CA3AF',
      border: '#27272A',
      cardBorder: '#27272A',
      accent: '#F5F5F5',
      accentText: '#0A0A0A',
      danger: '#F87171',
      focus: '#F5F5F5',
      radius: radius.minimal,
      borderWidth: 1,
      cardShadow: null,
      surface: 'solid',
      blobs: null,
      minTouch: 0,
    },
  },
  accessible: {
    light: {
      text: '#000000',
      background: '#FFFFFF',
      backgroundElement: '#FFFFFF',
      backgroundSelected: '#E5E7EB',
      textSecondary: '#374151',
      border: '#000000',
      cardBorder: '#000000',
      accent: '#0066CC',
      accentText: '#FFFFFF',
      danger: '#D32F2F',
      focus: '#0066CC',
      radius: radius.accessible,
      borderWidth: 2,
      cardShadow: null,
      surface: 'solid',
      blobs: null,
      minTouch: 44,
    },
    dark: {
      text: '#FFFFFF',
      background: '#000000',
      backgroundElement: '#0F0F0F',
      backgroundSelected: '#1F1F1F',
      textSecondary: '#E5E7EB',
      border: '#FFFFFF',
      cardBorder: '#FFFFFF',
      accent: '#4C9FFF',
      accentText: '#000000',
      danger: '#FF8A80',
      focus: '#4C9FFF',
      radius: radius.accessible,
      borderWidth: 2,
      cardShadow: null,
      surface: 'solid',
      blobs: null,
      minTouch: 44,
    },
  },
};

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
