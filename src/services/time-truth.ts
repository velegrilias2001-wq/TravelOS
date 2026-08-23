import type {
  Trip,
  TripDay,
  TripDestination,
  TripStatus,
} from '@/domain/entities';

const CALENDAR_DATE_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})$/;

const LOCAL_TIME_PATTERN =
  /^(\d{2}):(\d{2})$/;

const COMPATIBLE_LOCAL_DATE_TIME_PATTERN =
  /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})?$/;

export interface CalendarDateParts {
  year: number;
  month: number;
  day: number;
}

export interface LocalTimeParts {
  hour: number;
  minute: number;
}

export interface LocalDateTimeParts {
  date: string;
  time: string;
  zoneSuffix?: string;
}

export function parseCalendarDate(
  value: string,
): CalendarDateParts | null {
  const match = CALENDAR_DATE_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcDate = new Date(
    Date.UTC(year, month - 1, day),
  );

  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function isCanonicalDateKey(
  value: string,
): boolean {
  return parseCalendarDate(value) !== null;
}

export function formatCalendarDateParts(
  parts: CalendarDateParts,
): string {
  return [
    String(parts.year).padStart(4, '0'),
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-');
}

export function calendarDateFromPickerValue(
  value: Date,
): string {
  return formatCalendarDateParts({
    year: value.getFullYear(),
    month: value.getMonth() + 1,
    day: value.getDate(),
  });
}

export function pickerValueFromCalendarDate(
  value: string,
  fallback: Date = new Date(),
): Date {
  const parts = parseCalendarDate(value);

  if (!parts) {
    return new Date(
      fallback.getFullYear(),
      fallback.getMonth(),
      fallback.getDate(),
      12,
    );
  }

  return new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    12,
  );
}

export function formatCalendarDateForDisplay(
  value: string,
  options: Intl.DateTimeFormatOptions,
  fallback = 'Saved date needs review',
): string {
  if (!isCanonicalDateKey(value)) {
    return fallback;
  }

  return pickerValueFromCalendarDate(
    value,
  ).toLocaleDateString('en-GB', options);
}

export function validateCalendarDateRange(
  startDate: string,
  endDate: string,
): void {
  if (
    !isCanonicalDateKey(startDate) ||
    !isCanonicalDateKey(endDate)
  ) {
    throw new Error(
      'Travel dates must be valid calendar dates',
    );
  }

  if (startDate > endDate) {
    throw new Error(
      'The start date cannot be after the end date',
    );
  }
}

export function addCalendarDays(
  value: string,
  days: number,
): string {
  const parts = parseCalendarDate(value);

  if (!parts) {
    throw new Error(`Invalid calendar date: ${value}`);
  }

  const date = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day),
  );
  date.setUTCDate(date.getUTCDate() + days);

  return formatCalendarDateParts({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}

export function calendarDayDistance(
  startDate: string,
  endDate: string,
): number {
  const start = parseCalendarDate(startDate);
  const end = parseCalendarDate(endDate);

  if (!start || !end) {
    throw new Error('Calendar dates are invalid');
  }

  return Math.round(
    (
      Date.UTC(end.year, end.month - 1, end.day) -
      Date.UTC(start.year, start.month - 1, start.day)
    ) / 86_400_000,
  );
}

export function parseLocalTime(
  value: string,
): LocalTimeParts | null {
  const match = LOCAL_TIME_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour > 23 || minute > 59) {
    return null;
  }

  return { hour, minute };
}

export function isCanonicalLocalTime(
  value: string,
): boolean {
  return parseLocalTime(value) !== null;
}

export function localTimeFromPickerValue(
  value: Date,
): string {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

export function pickerValueFromLocalTime(
  value: string,
  fallback: Date = new Date(),
): Date {
  const parts = parseLocalTime(value);
  const result = new Date(fallback.getTime());
  result.setSeconds(0, 0);

  if (parts) {
    result.setHours(parts.hour, parts.minute);
  } else {
    result.setHours(12, 0);
  }

  return result;
}

export function parseCompatibleLocalDateTime(
  value: string,
): LocalDateTimeParts | null {
  const match =
    COMPATIBLE_LOCAL_DATE_TIME_PATTERN.exec(value);

  if (!match || !isCanonicalDateKey(match[1])) {
    return null;
  }

  if (!isCanonicalLocalTime(match[2])) {
    return null;
  }

  const seconds = match[3]
    ? Number(match[3])
    : 0;

  if (seconds > 59) {
    return null;
  }

  if (
    match[4] &&
    match[4] !== 'Z'
  ) {
    const [offsetHour, offsetMinute] = match[4]
      .slice(1)
      .split(':')
      .map(Number);

    if (offsetHour > 23 || offsetMinute > 59) {
      return null;
    }
  }

  return {
    date: match[1],
    time: match[2],
    zoneSuffix: match[4] || undefined,
  };
}

export function isCanonicalLocalDateTime(
  value: string,
): boolean {
  const parts = parseCompatibleLocalDateTime(value);

  return Boolean(
    parts &&
      !parts.zoneSuffix &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/.test(
        value,
      ),
  );
}

export function combineLocalDateTime(
  date: string,
  time: string,
): string {
  if (
    !isCanonicalDateKey(date) ||
    !isCanonicalLocalTime(time)
  ) {
    throw new Error(
      'Date and local time must be valid',
    );
  }

  return `${date}T${time}:00`;
}

export function pickerValueFromLocalDateTime(
  date: string,
  time: string,
  fallbackDate: string,
): Date {
  const dateParts =
    parseCalendarDate(date) ??
    parseCalendarDate(fallbackDate);
  const timeParts = parseLocalTime(time);

  if (!dateParts) {
    return pickerValueFromLocalTime(time);
  }

  return new Date(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    timeParts?.hour ?? 12,
    timeParts?.minute ?? 0,
  );
}

export function isValidIanaTimeZone(
  value: string,
): boolean {
  try {
    new Intl.DateTimeFormat('en', {
      timeZone: value,
    }).format();
    return true;
  } catch {
    return false;
  }
}

export type TripTimeZoneReason =
  | 'single-destination'
  | 'shared-destination-timezone'
  | 'no-destination'
  | 'missing-destination-timezone'
  | 'invalid-destination-timezone'
  | 'ambiguous-destination-timezones';

export interface TripTimeZoneResolution {
  source: 'destination' | 'device';
  certainty: 'canonical' | 'fallback';
  timeZone?: string;
  reason: TripTimeZoneReason;
}

function deviceTimeZone(): string | undefined {
  try {
    const value =
      Intl.DateTimeFormat().resolvedOptions().timeZone;

    return value && isValidIanaTimeZone(value)
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

export interface RuntimeClock {
  now(): Date;
  deviceTimeZone(): string | undefined;
}

export const systemRuntimeClock: RuntimeClock = {
  now: () => new Date(),
  deviceTimeZone,
};

export function resolveTripTimeZone(
  destinations: TripDestination[],
  fallbackDeviceTimeZone = deviceTimeZone(),
): TripTimeZoneResolution {
  const fallback = (
    reason: TripTimeZoneReason,
  ): TripTimeZoneResolution => ({
    source: 'device',
    certainty: 'fallback',
    timeZone:
      fallbackDeviceTimeZone &&
      isValidIanaTimeZone(fallbackDeviceTimeZone)
        ? fallbackDeviceTimeZone
        : undefined,
    reason,
  });

  if (destinations.length === 0) {
    return fallback('no-destination');
  }

  const timeZones = destinations.map(
    (destination) => destination.timezone?.trim(),
  );

  if (timeZones.some((value) => !value)) {
    return fallback('missing-destination-timezone');
  }

  const validTimeZones = timeZones.filter(
    (value): value is string => Boolean(value),
  );

  if (
    validTimeZones.some(
      (value) => !isValidIanaTimeZone(value),
    )
  ) {
    return fallback('invalid-destination-timezone');
  }

  const uniqueTimeZones = [
    ...new Set(validTimeZones),
  ];

  if (uniqueTimeZones.length !== 1) {
    return fallback(
      'ambiguous-destination-timezones',
    );
  }

  return {
    source: 'destination',
    certainty: 'canonical',
    timeZone: uniqueTimeZones[0],
    reason:
      destinations.length === 1
        ? 'single-destination'
        : 'shared-destination-timezone',
  };
}

function dateAtInstantInTimeZone(
  instant: Date,
  timeZone: string,
): string {
  const parts = new Intl.DateTimeFormat(
    'en-CA-u-nu-latn',
    {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
  ).formatToParts(instant);

  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${value.year}-${value.month}-${value.day}`;
}

export function calendarDateAtInstant(
  instant: Date,
  resolution: TripTimeZoneResolution,
): string {
  if (Number.isNaN(instant.getTime())) {
    throw new Error('Runtime clock returned an invalid instant');
  }

  if (resolution.timeZone) {
    return dateAtInstantInTimeZone(
      instant,
      resolution.timeZone,
    );
  }

  return calendarDateFromPickerValue(instant);
}

export type DerivedTripRuntimePhase =
  | 'upcoming'
  | 'active'
  | 'completed'
  | 'unknown';

export interface TripRuntimeResolution {
  phase: DerivedTripRuntimePhase;
  currentDate: string;
  currentDay: TripDay | null;
  timeZone: TripTimeZoneResolution;
  persistedStatus: TripStatus;
  statusConflict: boolean;
}

function hasRuntimeStatusConflict(
  status: TripStatus,
  phase: DerivedTripRuntimePhase,
): boolean {
  return (
    (status === 'active' && phase !== 'active') ||
    (status === 'completed' && phase !== 'completed')
  );
}

export function resolveTripRuntime(
  trip: Trip,
  days: TripDay[],
  clock: RuntimeClock = systemRuntimeClock,
): TripRuntimeResolution {
  const timeZone = resolveTripTimeZone(
    trip.destinations,
    clock.deviceTimeZone(),
  );
  const currentDate = calendarDateAtInstant(
    clock.now(),
    timeZone,
  );

  let phase: DerivedTripRuntimePhase = 'unknown';

  if (
    isCanonicalDateKey(trip.startDate) &&
    isCanonicalDateKey(trip.endDate) &&
    trip.startDate <= trip.endDate
  ) {
    phase =
      currentDate < trip.startDate
        ? 'upcoming'
        : currentDate > trip.endDate
          ? 'completed'
          : 'active';
  }

  const currentDay =
    phase === 'active'
      ? days.find(
          (day) =>
            day.tripId === trip.id &&
            day.date === currentDate,
        ) ?? null
      : null;

  return {
    phase,
    currentDate,
    currentDay,
    timeZone,
    persistedStatus: trip.status,
    statusConflict: hasRuntimeStatusConflict(
      trip.status,
      phase,
    ),
  };
}

export type TodayContextKind =
  | 'upcoming-preview'
  | 'active-day'
  | 'active-missing-day'
  | 'completed-history'
  | 'invalid-trip-dates';

export interface TodayRuntimeContext {
  runtime: TripRuntimeResolution;
  kind: TodayContextKind;
  displayDay: TripDay | null;
}

export function resolveTodayRuntimeContext(
  trip: Trip,
  days: TripDay[],
  clock: RuntimeClock = systemRuntimeClock,
): TodayRuntimeContext {
  const runtime = resolveTripRuntime(trip, days, clock);
  const canonicalDays = days
    .filter(
      (day) =>
        day.tripId === trip.id &&
        isCanonicalDateKey(day.date) &&
        day.date >= trip.startDate &&
        day.date <= trip.endDate,
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.dayNumber - b.dayNumber,
    );

  if (runtime.phase === 'upcoming') {
    return {
      runtime,
      kind: 'upcoming-preview',
      displayDay: canonicalDays[0] ?? null,
    };
  }

  if (runtime.phase === 'completed') {
    return {
      runtime,
      kind: 'completed-history',
      displayDay:
        canonicalDays[canonicalDays.length - 1] ?? null,
    };
  }

  if (runtime.phase === 'active') {
    return {
      runtime,
      kind: runtime.currentDay
        ? 'active-day'
        : 'active-missing-day',
      displayDay: runtime.currentDay,
    };
  }

  return {
    runtime,
    kind: 'invalid-trip-dates',
    displayDay: null,
  };
}
