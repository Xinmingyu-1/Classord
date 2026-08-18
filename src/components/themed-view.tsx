import { BlurTargetView } from 'expo-blur';
import { Image } from 'expo-image';
import { useRef } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { BlurTargetContext } from '@/components/blur-target-context';
import { ThemedCard } from '@/components/ThemedCard';
import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { BackgroundScrim } from '@/models/course';
import { useSettingsStore } from '@/store/settings';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
  /** 渲染为主题卡片（玻璃风格为毛玻璃卡片，其余风格为纯色卡片）。 */
  card?: boolean;
};

/** 遮罩强度 → 叠加在背景图上的主题色不透明度：弱（图更清晰）到强（文字更易读）。 */
const BACKGROUND_SCRIM_OPACITY: Record<BackgroundScrim, number> = {
  light: 0.35,
  medium: 0.6,
  strong: 0.82,
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  type = 'background',
  card = false,
  children,
  ...otherProps
}: ThemedViewProps) {
  const theme = useTheme();
  const backgroundImage = useSettingsStore((s) => s.settings.backgroundImage);
  const backgroundScrim = useSettingsStore((s) => s.settings.backgroundScrim);
  // 屏幕背景的 BlurTargetView 引用：供子树里的玻璃卡片在 Android 上做真模糊。
  const blurTargetRef = useRef<View | null>(null);
  // 仅玻璃风格有背景光斑；极简/无障碍为纯色背景。
  const blobs = type === 'background' ? theme.blobs : null;
  // 仅在作为屏幕背景的容器里铺自定义背景图。
  const showImage = type === 'background' && !!backgroundImage;

  if (card) {
    return (
      <ThemedCard style={style} {...otherProps}>
        {children}
      </ThemedCard>
    );
  }

  // 背景层（图片 + 遮罩 + 光斑）统一放进 BlurTargetView，Android 真模糊才能把图片也算进模糊源，
  // 否则玻璃卡片在 Android 上只模糊光斑、不模糊图片，效果会割裂。
  const backgroundLayer = showImage || blobs ? (
    <BlurTargetView ref={blurTargetRef} pointerEvents="none" style={StyleSheet.absoluteFill}>
      {showImage ? (
        <>
          <Image
            source={{ uri: backgroundImage! }}
            contentFit="cover"
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: theme.background, opacity: BACKGROUND_SCRIM_OPACITY[backgroundScrim] },
            ]}
          />
        </>
      ) : null}
      {blobs?.map((blob, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            width: blob.size,
            height: blob.size,
            borderRadius: blob.size / 2,
            backgroundColor: blob.color,
            top: blob.top,
            left: blob.left,
            right: blob.right,
            bottom: blob.bottom,
          }}
        />
      ))}
    </BlurTargetView>
  ) : null;

  return (
    <BlurTargetContext.Provider value={blurTargetRef}>
      <View style={[{ backgroundColor: theme[type] }, style]} {...otherProps}>
        {backgroundLayer}
        {children}
      </View>
    </BlurTargetContext.Provider>
  );
}
