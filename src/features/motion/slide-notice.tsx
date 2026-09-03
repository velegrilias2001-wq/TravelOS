import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/features/motion/reduce-motion';

type SlideNoticeProps = PropsWithChildren<{
  /** Changes when the notice appears or its message changes. */
  noticeKey: string;
}>;

/**
 * Slide+fade for offline / truth notices when reachability becomes known.
 * Unknown stay quiet — only mount this when there is a real notice.
 */
export function SlideNotice({
  children,
  noticeKey,
}: SlideNoticeProps) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(
    reduceMotion ? 1 : 0,
  );
  const translateY = useSharedValue(
    reduceMotion ? 0 : -8,
  );

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }

    opacity.value = 0;
    translateY.value = -8;
    opacity.value = withTiming(1, {
      duration: 200,
    });
    translateY.value = withTiming(0, {
      duration: 200,
    });
  }, [noticeKey, opacity, reduceMotion, translateY]);

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
