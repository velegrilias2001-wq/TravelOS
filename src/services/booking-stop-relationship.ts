import type {
  Booking,
  TripDay,
  TripStop,
} from '@/domain/entities';

export interface ItineraryStopContext {
  stop: TripStop;
  day: TripDay | null;
}

export function buildItineraryStopContexts(
  days: TripDay[],
  stops: TripStop[],
): ItineraryStopContext[] {
  const dayById = new Map(
    days.map((day) => [day.id, day]),
  );

  return stops
    .map((stop) => ({
      stop,
      day: dayById.get(stop.dayId) ?? null,
    }))
    .sort((left, right) => {
      const leftDay =
        left.day?.dayNumber ??
        Number.MAX_SAFE_INTEGER;
      const rightDay =
        right.day?.dayNumber ??
        Number.MAX_SAFE_INTEGER;

      return (
        leftDay - rightDay ||
        left.stop.order - right.stop.order ||
        left.stop.id.localeCompare(
          right.stop.id,
        )
      );
    });
}

export function bookingsLinkedToStop(
  bookings: Booking[],
  stopId: TripStop['id'],
): Booking[] {
  return bookings.filter(
    (booking) => booking.stopId === stopId,
  );
}

export function validateBookingStopRelationship(
  booking: Booking,
  stop: TripStop | null,
): void {
  if (!booking.stopId) {
    return;
  }

  if (!stop || stop.id !== booking.stopId) {
    throw new Error(
      'The selected itinerary stop no longer exists',
    );
  }

  if (stop.tripId !== booking.tripId) {
    throw new Error(
      'The selected itinerary stop belongs to another trip',
    );
  }
}
