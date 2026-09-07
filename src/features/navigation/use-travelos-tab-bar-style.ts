import { useMemo } from 'react';
import { Platform, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontFamily, fontSize, shadows } from '@/theme';

/** Icon + label row above the system navigation inset. */
const TAB_BAR_CONTENT_HEIGHT = 52;
const TAB_BAR_TOP_PADDING = 4;
const TAB_BAR_MIN_BOTTOM_PADDING = Platform.OS === 'android' ? 12 : 8;
/** Extra space so scroll content clears the bar comfortably. */
const TAB_BAR_SCROLL_EXTRA = 16;

function resolveBottomPadding(insetBottom: number): number {
  return Math.max(insetBottom, TAB_BAR_MIN_BOTTOM_PADDING);
}

/**
 * Tab bar styles that clear Android gesture / 3-button navigation
 * and the iOS home indicator.
 */
export function useTravelOSTabBarStyle(): StyleProp<ViewStyle> {
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const bottomPadding = resolveBottomPadding(insets.bottom);

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

export function useTravelOSTabBarLabelStyle(): StyleProp<TextStyle> {
  return useMemo(
    () => ({
      fontFamily: fontFamily.sansMedium,
      fontSize: fontSize.micro,
      marginTop: 0,
      marginBottom: 0,
      // Android default font padding clips labels inside a tight tab bar.
      ...(Platform.OS === 'android'
        ? { includeFontPadding: false }
        : null),
    }),
    [],
  );
}

/** Distance from screen bottom to clear the TravelOS tab bar. */
export function useTravelOSTabBarClearance(): number {
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const bottomPadding = resolveBottomPadding(insets.bottom);
    return TAB_BAR_CONTENT_HEIGHT + bottomPadding + TAB_BAR_SCROLL_EXTRA;
  }, [insets.bottom]);
}
