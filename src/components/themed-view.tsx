import { BlurTargetView } from 'expo-blur';
import { useRef } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { BlurTargetContext } from '@/components/blur-target-context';
import { ThemedCard } from '@/components/ThemedCard';
import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
  /** 渲染为主题卡片（玻璃风格为毛玻璃卡片，其余风格为纯色卡片）。 */
  card?: boolean;
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
  // 屏幕背景的 BlurTargetView 引用：供子树里的玻璃卡片在 Android 上做真模糊。
  const blurTargetRef = useRef<View | null>(null);
  // 仅玻璃风格有背景光斑；极简/无障碍为纯色背景。
  const blobs = type === 'background' ? theme.blobs : null;

  if (card) {
    return (
      <ThemedCard style={style} {...otherProps}>
        {children}
      </ThemedCard>
    );
  }

  return (
    <BlurTargetContext.Provider value={blurTargetRef}>
      <View style={[{ backgroundColor: theme[type] }, style]} {...otherProps}>
        {blobs ? (
          <BlurTargetView ref={blurTargetRef} pointerEvents="none" style={StyleSheet.absoluteFill}>
            {blobs.map((blob, index) => (
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
        ) : null}
        {children}
      </View>
    </BlurTargetContext.Provider>
  );
}
