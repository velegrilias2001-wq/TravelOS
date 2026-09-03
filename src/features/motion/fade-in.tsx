import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/features/motion/reduce-motion';

type FadeInProps = PropsWithChildren<{
  /** Remount key when the fact that appeared changes. */
  factKey: string;
  durationMs?: number;
}>;

/**
 * Opacity-only enter for lived badges and similar fact changes.
 */
export function FadeIn({
  children,
  factKey,
  durationMs = 200,
}: FadeInProps) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(
    reduceMotion ? 1 : 0,
  );

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      return;
    }

    opacity.value = 0;
    opacity.value = withTiming(1, {
      duration: durationMs,
    });
  }, [durationMs, factKey, opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
}
