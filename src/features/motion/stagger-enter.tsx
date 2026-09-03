import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/features/motion/reduce-motion';

const STAGGER_CAP = 6;
const STEP_MS = 30;
const ENTER_MS = 220;

type StaggerEnterProps = PropsWithChildren<{
  index: number;
}>;

/**
 * Opacity + 8px rise for the first six list items only.
 * Later items appear instantly so long Discover lists stay light.
 */
export function StaggerEnter({
  children,
  index,
}: StaggerEnterProps) {
  const reduceMotion = useReduceMotion();
  const shouldStagger =
    !reduceMotion && index < STAGGER_CAP;
  const opacity = useSharedValue(
    shouldStagger ? 0 : 1,
  );
  const translateY = useSharedValue(
    shouldStagger ? 8 : 0,
  );

  useEffect(() => {
    if (!shouldStagger) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }

    const delay = index * STEP_MS;
    opacity.value = 0;
    translateY.value = 8;
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: ENTER_MS }),
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: ENTER_MS }),
    );
  }, [index, opacity, shouldStagger, translateY]);

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
