import type {
  Trip,
  TripDay,
} from '../domain/entities';
import {
  addCalendarDays,
  calendarDayDistance,
  isCanonicalDateKey,
} from './time-truth';

export function buildCanonicalTripDays(
  trip: Trip,
  createId: () => string,
  timestamp: string,
): TripDay[] {
  if (!isCanonicalDateKey(trip.startDate)) {
    throw new Error(
      'Invalid trip date: ' + trip.startDate,
    );
  }

  if (!isCanonicalDateKey(trip.endDate)) {
    throw new Error(
      'Invalid trip date: ' + trip.endDate,
    );
  }

  if (trip.endDate < trip.startDate) {
    throw new Error(
      'Trip end date cannot be before its start date',
    );
  }

  const dayCount =
    calendarDayDistance(
      trip.startDate,
      trip.endDate,
    ) + 1;

  return Array.from(
    { length: dayCount },
    (_, index): TripDay => {
      return {
        id: createId(),
        tripId: trip.id,
        date: addCalendarDays(
          trip.startDate,
          index,
        ),
        dayNumber: index + 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    },
  );
}
