import { StyleSheet, View, type ViewProps } from 'react-native';

import { GlassCard } from '@/components/GlassCard';
import { GlassBlobs, type ThemeColor } from '@/constants/theme';
import { useResolvedTheme, useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
  /** 渲染为原生模糊的毛玻璃卡片（GlassCard）。 */
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
  const scheme = useResolvedTheme();

  if (card) {
    return (
      <GlassCard style={style} {...otherProps}>
        {children}
      </GlassCard>
    );
  }

  return (
    <View style={[{ backgroundColor: theme[type] }, style]} {...otherProps}>
      {type === 'background' ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {GlassBlobs[scheme].map((blob, index) => (
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
        </View>
      ) : null}
      {children}
    </View>
  );
}
