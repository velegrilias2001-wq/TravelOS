import type {
  TripDay,
  TripStop,
  TripStopId,
} from '@/domain/entities';

import {
  parseLocalTime,
} from './time-truth';

export interface FreeTimeGap {
  dayId: TripDay['id'];

  /**
   * The two itinerary moments that make this gap knowable.
   * Free time is never inferred across an untimed moment.
   */
  afterStopId: TripStopId;
  beforeStopId: TripStopId;

  /**
   * Local wall-clock times in HH:mm.
   */
  startTime: string;
  endTime: string;

  durationMinutes: number;
}

export interface ItineraryTimeConflict {
  dayId: TripDay['id'];

  /**
   * The two saved moments whose known time ranges overlap.
   */
  firstStopId: TripStopId;
  secondStopId: TripStopId;

  /**
   * The known overlapping local wall-clock range.
   */
  startTime: string;
  endTime: string;

  durationMinutes: number;
}

interface CanonicalStopRange {
  stop: TripStop;
  startMinutes: number;
  endMinutes: number;
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

function canonicalStopRange(
  stop: TripStop,
): CanonicalStopRange | null {
  if (
    !stop.startTime ||
    !stop.endTime
  ) {
    return null;
  }

  const startMinutes =
    localTimeMinutes(stop.startTime);

  const endMinutes =
    localTimeMinutes(stop.endTime);

  if (
    startMinutes === null ||
    endMinutes === null ||
    endMinutes <= startMinutes
  ) {
    return null;
  }

  return {
    stop,
    startMinutes,
    endMinutes,
  };
}

/**
 * Derive only free-time gaps that are explicitly knowable from
 * consecutive itinerary moments.
 *
 * We deliberately do not infer:
 * - free time before the first moment,
 * - free time after the last moment,
 * - gaps across untimed or partially timed moments,
 * - gaps when itinerary order conflicts with the saved times.
 */
export function deriveDayFreeTimeGaps(
  day: Pick<TripDay, 'id'>,
  stops: TripStop[],
): FreeTimeGap[] {
  const orderedStops = stops
    .filter(
      (stop) =>
        stop.dayId === day.id,
    )
    .sort(
      (a, b) =>
        a.order - b.order,
    );

  const gaps: FreeTimeGap[] = [];

  for (
    let index = 0;
    index < orderedStops.length - 1;
    index += 1
  ) {
    const current =
      orderedStops[index];

    const next =
      orderedStops[index + 1];

    if (
      !current.endTime ||
      !next.startTime
    ) {
      continue;
    }

    const startMinutes =
      localTimeMinutes(
        current.endTime,
      );

    const endMinutes =
      localTimeMinutes(
        next.startTime,
      );

    if (
      startMinutes === null ||
      endMinutes === null ||
      endMinutes <= startMinutes
    ) {
      continue;
    }

    gaps.push({
      dayId: day.id,
      afterStopId: current.id,
      beforeStopId: next.id,
      startTime: current.endTime,
      endTime: next.startTime,
      durationMinutes:
        endMinutes - startMinutes,
    });
  }

  return gaps;
}

/**
 * Detect known overlaps between fully timed moments on the same day.
 *
 * Conflicts are informational rather than destructive:
 * TravelOS may warn about overlapping plans, but it does not assume
 * that the user cannot intentionally schedule two things together.
 *
 * Untimed, partially timed and legacy-invalid ranges are ignored
 * because there is not enough canonical truth to compare them.
 */
export function deriveDayTimeConflicts(
  day: Pick<TripDay, 'id'>,
  stops: TripStop[],
): ItineraryTimeConflict[] {
  const ranges = stops
    .filter(
      (stop) =>
        stop.dayId === day.id,
    )
    .map(canonicalStopRange)
    .filter(
      (
        range,
      ): range is CanonicalStopRange =>
        range !== null,
    );

  const conflicts: ItineraryTimeConflict[] =
    [];

  for (
    let firstIndex = 0;
    firstIndex < ranges.length - 1;
    firstIndex += 1
  ) {
    const first =
      ranges[firstIndex];

    for (
      let secondIndex = firstIndex + 1;
      secondIndex < ranges.length;
      secondIndex += 1
    ) {
      const second =
        ranges[secondIndex];

      const overlapStart =
        Math.max(
          first.startMinutes,
          second.startMinutes,
        );

      const overlapEnd =
        Math.min(
          first.endMinutes,
          second.endMinutes,
        );

      if (overlapEnd <= overlapStart) {
        continue;
      }

      const firstStartsEarlier =
        first.startMinutes <
          second.startMinutes ||
        (
          first.startMinutes ===
            second.startMinutes &&
          first.stop.order <=
            second.stop.order
        );

      const earlier =
        firstStartsEarlier
          ? first
          : second;

      const later =
        firstStartsEarlier
          ? second
          : first;

      conflicts.push({
        dayId: day.id,
        firstStopId:
          earlier.stop.id,
        secondStopId:
          later.stop.id,
        startTime:
          minutesToLocalTime(
            overlapStart,
          ),
        endTime:
          minutesToLocalTime(
            overlapEnd,
          ),
        durationMinutes:
          overlapEnd -
          overlapStart,
      });
    }
  }

  return conflicts.sort(
    (a, b) =>
      a.startTime.localeCompare(
        b.startTime,
      ) ||
      a.endTime.localeCompare(
        b.endTime,
      ) ||
      a.firstStopId.localeCompare(
        b.firstStopId,
      ) ||
      a.secondStopId.localeCompare(
        b.secondStopId,
      ),
  );
}

function minutesToLocalTime(
  totalMinutes: number,
): string {
  const hour =
    Math.floor(totalMinutes / 60);

  const minute =
    totalMinutes % 60;

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function totalKnownFreeMinutes(
  gaps: FreeTimeGap[],
): number {
  return gaps.reduce(
    (total, gap) =>
      total + gap.durationMinutes,
    0,
  );
}
