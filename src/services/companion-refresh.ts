import {
  calendarDateAtInstant,
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
