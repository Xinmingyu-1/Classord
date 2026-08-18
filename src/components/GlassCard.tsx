import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

import { CardShadow, Radius } from '@/constants/theme';
import { useResolvedTheme, useTheme } from '@/hooks/use-theme';

type GlassCardProps = ViewProps & {
  /** 圆角半径。 */
  radius?: number;
  /** 模糊强度（1-100）。 */
  intensity?: number;
  children?: ReactNode;
};

/**
 * 毛玻璃卡片：用原生 BlurView 对背景做真实模糊（iOS 系统模糊，Android API 31+ 原生模糊，
 * 更低版本退化为半透明底）。外层 View 负责圆角投影，内层 BlurView 裁切圆角 + 细描边。
 */
export function GlassCard({
  style,
  radius = Radius.lg,
  intensity = 70,
  children,
  ...rest
}: GlassCardProps) {
  const theme = useTheme();
  const scheme = useResolvedTheme();

  return (
    <View style={{ borderRadius: radius, boxShadow: CardShadow[scheme] }}>
      <BlurView
        intensity={intensity}
        tint={scheme === 'dark' ? 'dark' : 'light'}
        blurMethod="dimezisBlurViewSdk31Plus"
        style={[
          {
            borderRadius: radius,
            borderWidth: 1,
            borderColor: theme.border,
            overflow: 'hidden',
          },
          style,
        ]}
        {...rest}
      >
        {children}
      </BlurView>
    </View>
  );
}
