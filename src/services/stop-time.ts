import type { TripStop } from '@/domain/entities';

import {
  isCanonicalLocalTime,
  parseLocalTime,
} from './time-truth';

function validateOptionalStopTime(
  value: string | undefined,
  label: string,
): void {
  if (value && !isCanonicalLocalTime(value)) {
    throw new Error(`${label} must use HH:mm local time`);
  }
}

function localTimeMinutes(
  value: string,
): number | null {
  const parts = parseLocalTime(value);

  if (!parts) {
    return null;
  }

  return parts.hour * 60 + parts.minute;
}

function validateCanonicalStopRange(
  startTime: string | undefined,
  endTime: string | undefined,
): void {
  if (!startTime || !endTime) {
    return;
  }

  const startMinutes =
    localTimeMinutes(startTime);

  const endMinutes =
    localTimeMinutes(endTime);

  if (
    startMinutes === null ||
    endMinutes === null
  ) {
    return;
  }

  if (endMinutes <= startMinutes) {
    throw new Error(
      'Stop end time must be after stop start time',
    );
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

  validateCanonicalStopRange(
    stop.startTime,
    stop.endTime,
  );
}

export function validateStopTimeUpdate(
  existing: Pick<TripStop, 'startTime' | 'endTime'>,
  updated: Pick<TripStop, 'startTime' | 'endTime'>,
): void {
  const startChanged =
    existing.startTime !== updated.startTime;

  const endChanged =
    existing.endTime !== updated.endTime;

  if (!startChanged && !endChanged) {
    return;
  }

  if (startChanged) {
    validateOptionalStopTime(
      updated.startTime,
      'Stop start time',
    );
  }

  if (endChanged) {
    validateOptionalStopTime(
      updated.endTime,
      'Stop end time',
    );
  }

  const startIsInvalid =
    Boolean(updated.startTime) &&
    !isCanonicalLocalTime(
      updated.startTime as string,
    );

  const endIsInvalid =
    Boolean(updated.endTime) &&
    !isCanonicalLocalTime(
      updated.endTime as string,
    );

  if (
    updated.startTime &&
    updated.endTime &&
    (startIsInvalid || endIsInvalid)
  ) {
    throw new Error(
      'A saved stop time needs review before the range can change',
    );
  }

  validateCanonicalStopRange(
    updated.startTime,
    updated.endTime,
  );
}
