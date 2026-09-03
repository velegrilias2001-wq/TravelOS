import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Prefer a single Reduce Motion read for UI-thread motion helpers.
 * When unknown or enabled, callers must snap to the end state.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then(
      (enabled) => {
        if (mounted) {
          setReduceMotion(enabled);
        }
      },
    );

    const subscription =
      AccessibilityInfo.addEventListener(
        'reduceMotionChanged',
        setReduceMotion,
      );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
