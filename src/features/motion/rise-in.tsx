import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/features/motion/reduce-motion';
import { motion } from '@/features/motion/timing';

type RiseInProps = PropsWithChildren<{
  factKey: string;
  delayMs?: number;
  distance?: number;
}>;

/**
 * Soft rise + fade for editorial sections.
 * Reduce Motion: opacity-only, no translate.
 */
export function RiseIn({
  children,
  factKey,
  delayMs = 0,
  distance = 14,
}: RiseInProps) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const translateY = useSharedValue(
    reduceMotion ? 0 : distance,
  );

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }

    opacity.value = 0;
    translateY.value = distance;

    const timer = setTimeout(() => {
      opacity.value = withTiming(1, {
        duration: motion.sectionMs,
      });
      translateY.value = withSpring(0, motion.softSpring);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [
    delayMs,
    distance,
    factKey,
    opacity,
    reduceMotion,
    translateY,
  ]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
}
