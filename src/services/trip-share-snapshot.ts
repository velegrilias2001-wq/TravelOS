import type { Trip } from '@/domain/entities/trip';
import type { TripDay } from '@/domain/entities/trip-day';
import type { TripStop } from '@/domain/entities/trip-stop';
import type { Booking } from '@/domain/entities/booking';
import type { Accommodation } from '@/domain/entities/accommodation';

/**
 * Non-secret trip snapshot for system share.
 * Omits traveler PII, confirmation codes, phone/email, and media.
 */
export type TripShareSnapshot = {
  title: string;
  text: string;
  fileName: string;
};

export function buildTripShareSnapshot(input: {
  trip: Trip;
  days: readonly TripDay[];
  stops: readonly TripStop[];
  bookings: readonly Booking[];
  accommodations: readonly Accommodation[];
  packingTotal?: number;
  packingPacked?: number;
}): TripShareSnapshot {
  const destinations =
    input.trip.destinations.length > 0
      ? input.trip.destinations
          .map((destination) => destination.name)
          .join(', ')
      : 'Destination not set';

  const dayCount = input.days.length;
  const stopCount = input.stops.length;
  const bookingCount = input.bookings.length;
  const stayCount = input.accommodations.length;
  const packing =
    input.packingTotal != null && input.packingTotal > 0
      ? `${input.packingPacked ?? 0}/${input.packingTotal} packed`
      : 'Packing empty';

  const lines = [
    `TravelOS · ${input.trip.title}`,
    destinations,
    `${input.trip.startDate} → ${input.trip.endDate}`,
    `${dayCount} day(s) · ${stopCount} moment(s)`,
    `${bookingCount} booking(s) · ${stayCount} stay(s)`,
    packing,
    '',
    'Shared as a non-secret summary. Confirmation codes and private contacts are omitted.',
  ];

  const text = lines.join('\n');
  const safeTitle = input.trip.title
    .replace(/[^\w\-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)
    .replace(/^-|-$/g, '') || 'trip';

  return {
    title: input.trip.title,
    text,
    fileName: `travelos-${safeTitle}-snapshot.txt`,
  };
}
