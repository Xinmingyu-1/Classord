import { BlurView } from 'expo-blur';
import { useContext, type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

import { BlurTargetContext } from '@/components/blur-target-context';
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
 * 毛玻璃卡片：用原生 BlurView 对背景做真实模糊。iOS 用系统 backdrop 模糊；
 * Android 通过 blurTarget 指向屏幕背景的 BlurTargetView 做真模糊（无 target 时退化为半透明底）。
 * 外层 View 负责圆角投影，内层 BlurView 裁切圆角 + 细描边。
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
  const targetRef = useContext(BlurTargetContext);

  return (
    <View style={{ borderRadius: radius, boxShadow: CardShadow[scheme] }}>
      <BlurView
        intensity={intensity}
        tint={scheme === 'dark' ? 'dark' : 'light'}
        blurTarget={targetRef ?? undefined}
        blurMethod={targetRef ? 'dimezisBlurViewSdk31Plus' : undefined}
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
