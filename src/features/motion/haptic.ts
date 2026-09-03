import { AccessibilityInfo } from 'react-native';
import * as Haptics from 'expo-haptics';

function playWhenMotionAllowed(
  play: () => Promise<unknown>,
): void {
  void AccessibilityInfo.isReduceMotionEnabled()
    .then((enabled) => {
      if (enabled) {
        return;
      }

      return play();
    })
    .catch(() => undefined);
}

/**
 * Light confirmation haptic. Fail closed if the native module is missing.
 * Reduce Motion skips haptics entirely.
 */
export function playSelectionHaptic(): void {
  playWhenMotionAllowed(() => Haptics.selectionAsync());
}

export function playLightImpact(): void {
  playWhenMotionAllowed(() =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  );
}
