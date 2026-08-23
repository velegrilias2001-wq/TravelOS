import type { TripStop } from '@/domain/entities';

import { isCanonicalLocalTime } from './time-truth';

function validateOptionalStopTime(
  value: string | undefined,
  label: string,
): void {
  if (value && !isCanonicalLocalTime(value)) {
    throw new Error(`${label} must use HH:mm local time`);
  }
}

export function validateNewStopTimes(
  stop: Pick<TripStop, 'startTime' | 'endTime'>,
): void {
  validateOptionalStopTime(
    stop.startTime,
    'Stop start time',
  );
  validateOptionalStopTime(
    stop.endTime,
    'Stop end time',
  );
}

export function validateStopTimeUpdate(
  existing: Pick<TripStop, 'startTime' | 'endTime'>,
  updated: Pick<TripStop, 'startTime' | 'endTime'>,
): void {
  if (existing.startTime !== updated.startTime) {
    validateOptionalStopTime(
      updated.startTime,
      'Stop start time',
    );
  }

  if (existing.endTime !== updated.endTime) {
    validateOptionalStopTime(
      updated.endTime,
      'Stop end time',
    );
  }
}
