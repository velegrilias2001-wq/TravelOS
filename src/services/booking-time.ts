import type { Booking } from '@/domain/entities';

import {
  combineLocalDateTime,
  formatCalendarDateForDisplay,
  parseCompatibleLocalDateTime,
} from './time-truth';

export type BookingTemporalKind =
  | 'local-wall-time'
  | 'absolute-instant'
  | 'invalid';

export interface BookingTemporalValue {
  kind: BookingTemporalKind;
  raw: string;
  date?: string;
  time?: string;
  instant?: Date;
}

export function parseBookingTemporalValue(
  value: string,
): BookingTemporalValue {
  const raw = value.trim();
  const compatible =
    parseCompatibleLocalDateTime(raw);

  if (!compatible) {
    return { kind: 'invalid', raw };
  }

  if (!compatible.zoneSuffix) {
    return {
      kind: 'local-wall-time',
      raw,
      date: compatible.date,
      time: compatible.time,
    };
  }

  const instant = new Date(raw);

  if (Number.isNaN(instant.getTime())) {
    return { kind: 'invalid', raw };
  }

  return {
    kind: 'absolute-instant',
    raw,
    instant,
  };
}

export function combineBookingLocalDateTime(
  date: string,
  time: string,
): string {
  return combineLocalDateTime(date, time);
}

function compareBookingTemporalValues(
  start: BookingTemporalValue,
  end: BookingTemporalValue,
): number | null {
  if (
    start.kind === 'local-wall-time' &&
    end.kind === 'local-wall-time'
  ) {
    return start.raw.localeCompare(end.raw);
  }

  if (
    start.kind === 'absolute-instant' &&
    end.kind === 'absolute-instant'
  ) {
    return (
      (start.instant?.getTime() ?? 0) -
      (end.instant?.getTime() ?? 0)
    );
  }

  return null;
}

function requireValidTemporalValue(
  value: string | undefined,
  label: string,
): BookingTemporalValue | null {
  if (!value) {
    return null;
  }

  const parsed = parseBookingTemporalValue(value);

  if (parsed.kind === 'invalid') {
    throw new Error(
      `${label} must be a valid date and time`,
    );
  }

  return parsed;
}

function validateComparableRange(
  start: BookingTemporalValue | null,
  end: BookingTemporalValue | null,
): void {
  if (!start || !end) {
    return;
  }

  const comparison = compareBookingTemporalValues(
    start,
    end,
  );

  if (comparison === null) {
    throw new Error(
      'Booking start and end use different time semantics. Replace or clear both before saving.',
    );
  }

  if (comparison > 0) {
    throw new Error(
      'Booking start cannot be after booking end',
    );
  }
}

export function validateNewBookingTimes(
  booking: Pick<Booking, 'startAt' | 'endAt'>,
): void {
  const start = requireValidTemporalValue(
    booking.startAt,
    'Booking start',
  );
  const end = requireValidTemporalValue(
    booking.endAt,
    'Booking end',
  );

  validateComparableRange(start, end);
}

export function validateBookingTimeUpdate(
  existing: Pick<Booking, 'startAt' | 'endAt'>,
  updated: Pick<Booking, 'startAt' | 'endAt'>,
): void {
  const startChanged =
    existing.startAt !== updated.startAt;
  const endChanged = existing.endAt !== updated.endAt;

  if (!startChanged && !endChanged) {
    return;
  }

  const start = updated.startAt
    ? parseBookingTemporalValue(updated.startAt)
    : null;
  const end = updated.endAt
    ? parseBookingTemporalValue(updated.endAt)
    : null;

  if (
    startChanged &&
    start?.kind === 'invalid'
  ) {
    throw new Error(
      'Booking start must be a valid date and time',
    );
  }

  if (endChanged && end?.kind === 'invalid') {
    throw new Error(
      'Booking end must be a valid date and time',
    );
  }

  if (
    (start?.kind === 'invalid' ||
      end?.kind === 'invalid') &&
    start &&
    end
  ) {
    throw new Error(
      'A saved booking time needs review before the range can change',
    );
  }

  validateComparableRange(start, end);
}

export function formatBookingTemporalValue(
  value: string | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const parsed = parseBookingTemporalValue(value);

  if (
    parsed.kind === 'local-wall-time' &&
    parsed.date &&
    parsed.time
  ) {
    const date = formatCalendarDateForDisplay(
      parsed.date,
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      },
    );

    return `${date} · ${parsed.time} local`;
  }

  if (
    parsed.kind === 'absolute-instant' &&
    parsed.instant
  ) {
    return parsed.instant.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  }

  return value;
}
