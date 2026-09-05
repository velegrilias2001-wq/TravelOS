import { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, shadows } from '@/theme';

/** Icon + label row above the system navigation inset. */
const TAB_BAR_CONTENT_HEIGHT = 56;
const TAB_BAR_TOP_PADDING = 8;
const TAB_BAR_MIN_BOTTOM_PADDING = 8;

/**
 * Tab bar styles that clear Android gesture / 3-button navigation
 * and the iOS home indicator.
 */
export function useTravelOSTabBarStyle(): StyleProp<ViewStyle> {
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const bottomPadding = Math.max(
      insets.bottom,
      TAB_BAR_MIN_BOTTOM_PADDING,
    );

    return {
      height: TAB_BAR_CONTENT_HEIGHT + bottomPadding,
      paddingTop: TAB_BAR_TOP_PADDING,
      paddingBottom: bottomPadding,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      ...shadows.subtle,
    };
  }, [insets.bottom]);
}
