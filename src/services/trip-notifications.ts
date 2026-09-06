import type {
  Trip,
  TripDay,
  TripDestination,
  TripStop,
  TripStopLivedState,
} from '../domain/entities';
import {
  calendarDateAtInstant,
  isCanonicalDateKey,
  isCanonicalLocalTime,
  isValidIanaTimeZone,
  localTimeAtInstant,
  resolveAssignedDayTimeZone,
  resolveTripTimeZone,
  type TripTimeZoneResolution,
} from './time-truth';

export const STOP_REMINDER_IDENTIFIER_PREFIX =
  'travelos.stop.';

export const DEFAULT_STOP_REMINDER_LEAD_MINUTES = 15;

export const MAX_SCHEDULED_STOP_REMINDERS = 40;

export interface PlannedStopReminder {
  identifier: string;
  stopId: string;
  tripId: string;
  title: string;
  body: string;
  fireAt: Date;
  stopStartAt: Date;
}

export function stopReminderIdentifier(
  stopId: string,
): string {
  return `${STOP_REMINDER_IDENTIFIER_PREFIX}${stopId}`;
}

function canonicalResolution(
  timeZone: string,
): TripTimeZoneResolution {
  return {
    source: 'destination',
    certainty: 'canonical',
    timeZone,
    reason: 'single-destination',
  };
}

/**
 * Resolve wall-clock authority for a day without inventing a zone.
 * Assigned city TZ wins when valid; else shared trip destination TZ.
 */
export function resolveDayNotificationTimeZone(
  day: TripDay,
  destinations: readonly TripDestination[],
): string | null {
  const assigned = resolveAssignedDayTimeZone(
    day,
    destinations,
  );

  if (
    assigned?.certainty === 'canonical' &&
    assigned.timeZone
  ) {
    return assigned.timeZone;
  }

  const tripLevel = resolveTripTimeZone(
    [...destinations],
  );

  if (
    tripLevel.certainty === 'canonical' &&
    tripLevel.timeZone
  ) {
    return tripLevel.timeZone;
  }

  return null;
}

/**
 * Convert a destination-local calendar date + HH:mm into a UTC instant.
 * Fail closed when the zone or wall time cannot be proven.
 */
export function instantAtLocalDateTime(
  calendarDate: string,
  localTime: string,
  timeZone: string,
): Date | null {
  if (
    !isCanonicalDateKey(calendarDate) ||
    !isCanonicalLocalTime(localTime) ||
    !isValidIanaTimeZone(timeZone)
  ) {
    return null;
  }

  const resolution = canonicalResolution(timeZone);
  const approx = Date.parse(
    `${calendarDate}T${localTime}:00.000Z`,
  );

  if (Number.isNaN(approx)) {
    return null;
  }

  let lower = approx - 14 * 60 * 60 * 1000;
  let upper = approx + 14 * 60 * 60 * 1000;

  while (upper - lower > 1) {
    const midpoint = Math.floor((lower + upper) / 2);
    const candidate = new Date(midpoint);
    const date = calendarDateAtInstant(
      candidate,
      resolution,
    );
    const time = localTimeAtInstant(
      candidate,
      resolution,
    );

    if (
      date > calendarDate ||
      (date === calendarDate && time >= localTime)
    ) {
      upper = midpoint;
    } else {
      lower = midpoint;
    }
  }

  const reached = new Date(upper);

  if (
    calendarDateAtInstant(reached, resolution) !==
      calendarDate ||
    localTimeAtInstant(reached, resolution) !==
      localTime
  ) {
    return null;
  }

  return reached;
}

function isSettledLived(
  lived: TripStopLivedState | undefined,
): boolean {
  return (
    lived?.phase === 'done' ||
    lived?.phase === 'skipped'
  );
}

export function planStopStartReminders(input: {
  trip: Trip;
  days: readonly TripDay[];
  destinations: readonly TripDestination[];
  stops: readonly TripStop[];
  livedStates?: readonly TripStopLivedState[];
  now?: Date;
  leadMinutes?: number;
  maxReminders?: number;
}): PlannedStopReminder[] {
  if (
    input.trip.status === 'completed' ||
    input.trip.status === 'archived'
  ) {
    return [];
  }

  const now = input.now ?? new Date();
  const leadMinutes =
    input.leadMinutes ??
    DEFAULT_STOP_REMINDER_LEAD_MINUTES;
  const maxReminders =
    input.maxReminders ??
    MAX_SCHEDULED_STOP_REMINDERS;

  if (
    !Number.isFinite(leadMinutes) ||
    leadMinutes < 5 ||
    leadMinutes > 180
  ) {
    return [];
  }

  const livedByStop = new Map(
    (input.livedStates ?? []).map((state) => [
      state.stopId,
      state,
    ]),
  );

  const daysById = new Map(
    input.days.map((day) => [day.id, day]),
  );

  const planned: PlannedStopReminder[] = [];

  for (const stop of input.stops) {
    if (stop.tripId !== input.trip.id) {
      continue;
    }

    if (isSettledLived(livedByStop.get(stop.id))) {
      continue;
    }

    if (
      !stop.startTime ||
      !isCanonicalLocalTime(stop.startTime)
    ) {
      continue;
    }

    const day = daysById.get(stop.dayId);

    if (!day || day.tripId !== input.trip.id) {
      continue;
    }

    const timeZone = resolveDayNotificationTimeZone(
      day,
      input.destinations,
    );

    if (!timeZone) {
      continue;
    }

    const stopStartAt = instantAtLocalDateTime(
      day.date,
      stop.startTime,
      timeZone,
    );

    if (!stopStartAt) {
      continue;
    }

    const fireAt = new Date(
      stopStartAt.getTime() -
        leadMinutes * 60 * 1000,
    );

    if (fireAt.getTime() <= now.getTime()) {
      continue;
    }

    planned.push({
      identifier: stopReminderIdentifier(stop.id),
      stopId: stop.id,
      tripId: input.trip.id,
      title: stop.title.trim() || 'Upcoming moment',
      body: `Starts at ${stop.startTime} · ${leadMinutes} min reminder`,
      fireAt,
      stopStartAt,
    });
  }

  planned.sort(
    (left, right) =>
      left.fireAt.getTime() - right.fireAt.getTime(),
  );

  return planned.slice(0, maxReminders);
}
