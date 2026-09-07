import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { playLightImpact } from '@/features/motion/haptic';
import { useReduceMotion } from '@/features/motion/reduce-motion';

type PressableScaleProps = Omit<
  PressableProps,
  'style'
> & {
  children: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
};

/**
 * Primary CTA press: opacity plus a tiny scale (0.98).
 * Reduce Motion keeps opacity-only feedback.
 * Outer wrapper owns layout styles (flex/width) so row children do not collapse.
 */
export function PressableScale({
  children,
  containerStyle,
  style,
  pressedStyle,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  return (
    <Animated.View
      style={[styles.container, containerStyle, animatedStyle]}
    >
      <Pressable
        disabled={disabled}
        onPressIn={(event) => {
          if (!disabled && !reduceMotion) {
            playLightImpact();
            scale.set(withTiming(0.98, {
              duration: 90,
            }));
          }
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          if (!reduceMotion) {
            scale.set(withTiming(1, {
              duration: 120,
            }));
          }
          onPressOut?.(event);
        }}
        style={({ pressed }) => [
          style,
          pressed && pressedStyle,
        ]}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch' },
});
