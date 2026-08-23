import { useFocusEffect } from 'expo-router';
import {
  useCallback,
  useState,
} from 'react';
import { AppState } from 'react-native';

import {
  millisecondsUntilNextCalendarDateChange,
} from '@/services/companion-refresh';
import type {
  TripTimeZoneResolution,
} from '@/services/time-truth';

export function useCompanionRuntimeRefresh(
  resolution: TripTimeZoneResolution,
): number {
  const [revision, setRevision] = useState(0);
  const resolutionKey = `${resolution.certainty}:${resolution.timeZone ?? 'device-local'}:${resolution.reason}`;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      let boundaryTimer: ReturnType<typeof setTimeout> | null =
        null;

      const scheduleBoundary = () => {
        if (boundaryTimer) {
          clearTimeout(boundaryTimer);
        }

        const delay = millisecondsUntilNextCalendarDateChange(
          new Date(),
          resolution,
        );

        boundaryTimer = setTimeout(() => {
          if (!active) {
            return;
          }

          setRevision((current) => current + 1);
          scheduleBoundary();
        }, delay);
      };

      setRevision((current) => current + 1);
      scheduleBoundary();

      const subscription = AppState.addEventListener(
        'change',
        (state) => {
          if (state === 'active' && active) {
            setRevision((current) => current + 1);
            scheduleBoundary();
          }
        },
      );

      return () => {
        active = false;
        subscription.remove();

        if (boundaryTimer) {
          clearTimeout(boundaryTimer);
        }
      };
    }, [resolutionKey]),
  );

  return revision;
}
