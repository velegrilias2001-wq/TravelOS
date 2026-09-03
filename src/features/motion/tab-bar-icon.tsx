import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import type { ColorValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/features/motion/reduce-motion';

type TabBarIconProps = {
  name: keyof typeof Ionicons.glyphMap;
  color: ColorValue;
  size: number;
  focused: boolean;
};

/**
 * One short scale pulse when a tab becomes selected.
 * AllTrails-style orientation only — never loops.
 */
export function TabBarIcon({
  name,
  color,
  size,
  focused,
}: TabBarIconProps) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!focused) {
      scale.value = 1;
      return;
    }

    if (reduceMotion) {
      scale.value = 1;
      return;
    }

    scale.value = withSequence(
      withTiming(1.08, { duration: 90 }),
      withTiming(1, { duration: 90 }),
    );
  }, [focused, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons
        name={name}
        size={size}
        color={
          typeof color === 'string'
            ? color
            : String(color)
        }
      />
    </Animated.View>
  );
}
