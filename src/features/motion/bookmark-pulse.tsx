import type { PropsWithChildren } from 'react';
import { useEffect, useRef } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/features/motion/reduce-motion';

type BookmarkPulseProps = PropsWithChildren<{
  active: boolean;
}>;

/**
 * One short scale pulse when a wishlist bookmark becomes active.
 * Already-saved items stay still on first paint.
 */
export function BookmarkPulse({
  children,
  active,
}: BookmarkPulseProps) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  const wasActive = useRef(active);

  useEffect(() => {
    const becameActive = active && !wasActive.current;
    wasActive.current = active;

    if (!becameActive || reduceMotion) {
      scale.value = 1;
      return;
    }

    scale.value = withSequence(
      withTiming(1.18, { duration: 80 }),
      withTiming(1, { duration: 80 }),
    );
  }, [active, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
}
