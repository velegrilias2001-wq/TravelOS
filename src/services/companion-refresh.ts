import {
  calendarDateAtInstant,
  isCanonicalLocalTime,
  localTimeAtInstant,
  type TripTimeZoneResolution,
} from './time-truth';

const MAX_BOUNDARY_SEARCH_MS = 48 * 60 * 60 * 1000;
const BOUNDARY_GRACE_MS = 75;

/**
 * Finds the next calendar-date change for the resolved trip calendar.
 * Binary search keeps the timer light and handles timezone/DST boundaries
 * without assuming that every local day is exactly 24 hours.
 */
export function millisecondsUntilNextCalendarDateChange(
  instant: Date,
  resolution: TripTimeZoneResolution,
): number {
  const instantMs = instant.getTime();

  if (Number.isNaN(instantMs)) {
    throw new Error('Runtime clock returned an invalid instant');
  }

  const currentDate = calendarDateAtInstant(
    instant,
    resolution,
  );
  let lower = instantMs;
  let upper = instantMs + MAX_BOUNDARY_SEARCH_MS;

  if (
    calendarDateAtInstant(new Date(upper), resolution) ===
    currentDate
  ) {
    throw new Error(
      'The next calendar boundary could not be resolved',
    );
  }

  while (upper - lower > 1) {
    const midpoint = Math.floor((lower + upper) / 2);

    if (
      calendarDateAtInstant(
        new Date(midpoint),
        resolution,
      ) === currentDate
    ) {
      lower = midpoint;
    } else {
      upper = midpoint;
    }
  }

  return Math.max(
    BOUNDARY_GRACE_MS,
    upper - instantMs + BOUNDARY_GRACE_MS,
  );
}

export function companionStopBoundaryTimes(
  stops: readonly {
    startTime?: string;
    endTime?: string;
  }[],
): string[] {
  const times = new Set<string>();

  for (const stop of stops) {
    if (
      stop.startTime &&
      isCanonicalLocalTime(stop.startTime)
    ) {
      times.add(stop.startTime);
    }

    if (
      stop.endTime &&
      isCanonicalLocalTime(stop.endTime)
    ) {
      times.add(stop.endTime);
    }
  }

  return [...times].sort();
}

function millisecondsUntilLocalTimeOnCurrentDate(
  instant: Date,
  resolution: TripTimeZoneResolution,
  targetTime: string,
  calendarDelay: number,
): number | null {
  if (!isCanonicalLocalTime(targetTime)) {
    return null;
  }

  const currentDate = calendarDateAtInstant(
    instant,
    resolution,
  );
  const currentTime = localTimeAtInstant(
    instant,
    resolution,
  );

  if (currentTime >= targetTime) {
    return null;
  }

  const instantMs = instant.getTime();
  let lower = instantMs;
  let upper = instantMs + calendarDelay;

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
      date > currentDate ||
      (date === currentDate && time >= targetTime)
    ) {
      upper = midpoint;
    } else {
      lower = midpoint;
    }
  }

  const reached = new Date(upper);

  if (
    calendarDateAtInstant(reached, resolution) !==
      currentDate ||
    localTimeAtInstant(reached, resolution) !==
      targetTime
  ) {
    return null;
  }

  return Math.max(
    BOUNDARY_GRACE_MS,
    upper - instantMs + BOUNDARY_GRACE_MS,
  );
}

/**
 * Next Companion refresh: the sooner of local midnight or the
 * next saved stop start/end on the current local date.
 * Untimed and non-canonical times are ignored. No polling.
 */
export function millisecondsUntilNextCompanionRefresh(
  instant: Date,
  resolution: TripTimeZoneResolution,
  stopBoundaryTimes: readonly string[] = [],
): number {
  const calendarDelay =
    millisecondsUntilNextCalendarDateChange(
      instant,
      resolution,
    );
  let soonest = calendarDelay;

  for (const time of stopBoundaryTimes) {
    const delay = millisecondsUntilLocalTimeOnCurrentDate(
      instant,
      resolution,
      time,
      calendarDelay,
    );

    if (delay !== null && delay < soonest) {
      soonest = delay;
    }
  }

  return soonest;
}
