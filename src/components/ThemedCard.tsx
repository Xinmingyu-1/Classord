import { BlurView } from 'expo-blur';
import { useContext, type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

import { BlurTargetContext } from '@/components/blur-target-context';
import { useResolvedTheme, useTheme } from '@/hooks/use-theme';

type ThemedCardProps = ViewProps & {
  /** 圆角半径。 */
  radius?: number;
  /** 模糊强度（1-100，仅玻璃风格生效）。 */
  intensity?: number;
  children?: ReactNode;
};

/**
 * 主题卡片：按当前风格分两种材质渲染。
 * - 玻璃：用原生 BlurView 对背景做真实模糊。iOS 用系统 backdrop 模糊；Android 通过
 *   blurTarget 指向屏幕背景的 BlurTargetView 做真模糊（无 target 时退化为半透明底）。
 * - 极简/无障碍：纯色 View（theme.backgroundElement）+ 描边 + 可选投影。
 * 外层 View 负责圆角投影，内层裁切圆角 + 描边。
 */
export function ThemedCard({
  style,
  radius,
  intensity = 70,
  children,
  ...rest
}: ThemedCardProps) {
  const theme = useTheme();
  const scheme = useResolvedTheme();
  const targetRef = useContext(BlurTargetContext);
  const r = radius ?? theme.radius.lg;

  if (theme.surface === 'blur') {
    return (
      <View style={{ borderRadius: r, boxShadow: theme.cardShadow ?? undefined }}>
        <BlurView
          intensity={intensity}
          tint={scheme === 'dark' ? 'dark' : 'light'}
          blurTarget={targetRef ?? undefined}
          blurMethod={targetRef ? 'dimezisBlurViewSdk31Plus' : undefined}
          style={[
            {
              borderRadius: r,
              borderWidth: theme.borderWidth,
              borderColor: theme.cardBorder,
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

  return (
    <View
      style={[
        {
          borderRadius: r,
          borderWidth: theme.borderWidth,
          borderColor: theme.cardBorder,
          backgroundColor: theme.backgroundElement,
          boxShadow: theme.cardShadow ?? undefined,
          overflow: 'hidden',
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
