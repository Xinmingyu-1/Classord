import { createContext, type RefObject } from 'react';
import type { View } from 'react-native';

/**
 * 提供屏幕背景（彩色光斑）的 BlurTargetView 引用。
 * expo-blur 在 Android 上的新 API 要求卡片 BlurView 通过 `blurTarget` 指向这个
 * BlurTargetView，才能对背景做真实模糊。iOS 上该引用被忽略（系统自带 backdrop 模糊）。
 */
export const BlurTargetContext = createContext<RefObject<View | null> | null>(null);
