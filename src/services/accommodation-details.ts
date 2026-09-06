import type {
  Accommodation,
  AccommodationType,
  Booking,
  BookingId,
  TripStop,
  TripStopId,
} from '@/domain/entities';

import {
  combineLocalDateTime,
  isCanonicalLocalDateTime,
  parseCompatibleLocalDateTime,
} from './time-truth';

export const ACCOMMODATION_TYPES: AccommodationType[] = [
  'hotel',
  'apartment',
  'hostel',
  'villa',
  'resort',
  'camping',
  'other',
];

export interface AccommodationInput {
  name: string;
  type: AccommodationType;
  address?: string;
  latitude?: number;
  longitude?: number;
  checkInAt?: string;
  checkOutAt?: string;
  phone?: string;
  website?: string;
  notes?: string;
  bookingId?: BookingId;
  stopId?: TripStopId;
}

export interface AccommodationDayContext {
  accommodation: Accommodation;
  phase: 'check-in' | 'stay' | 'check-out';
}

function optionalText(
  value: string | undefined,
): string | undefined {
  return value?.trim() || undefined;
}

export function isCanonicalAccommodationDateTime(
  value: string,
): boolean {
  return isCanonicalLocalDateTime(value);
}

export function splitAccommodationDateTime(
  value: string | undefined,
): {
  date: string;
  time: string;
} | null {
  const parsed = value
    ? parseCompatibleLocalDateTime(value)
    : null;

  return parsed
    ? { date: parsed.date, time: parsed.time }
    : null;
}

export function combineAccommodationDateTime(
  date: string,
  time: string,
): string {
  try {
    return combineLocalDateTime(date, time);
  } catch {
    throw new Error('Stay date and time must be valid');
  }
}

export function cleanAccommodationInput(
  input: AccommodationInput,
): AccommodationInput {
  const name = input.name.trim();

  if (!name) {
    throw new Error(
      'Accommodation name is required',
    );
  }

  if (!ACCOMMODATION_TYPES.includes(input.type)) {
    throw new Error(
      'Accommodation type is not supported',
    );
  }

  const checkInAt = optionalText(input.checkInAt);
  const checkOutAt = optionalText(input.checkOutAt);

  if (
    checkInAt &&
    !parseCompatibleLocalDateTime(checkInAt)
  ) {
    throw new Error(
      'Check-in must use a valid local date and time',
    );
  }

  if (
    checkOutAt &&
    !parseCompatibleLocalDateTime(checkOutAt)
  ) {
    throw new Error(
      'Check-out must use a valid local date and time',
    );
  }

  if (
    checkInAt &&
    checkOutAt &&
    `${splitAccommodationDateTime(checkInAt)?.date}T${splitAccommodationDateTime(checkInAt)?.time}` >
      `${splitAccommodationDateTime(checkOutAt)?.date}T${splitAccommodationDateTime(checkOutAt)?.time}`
  ) {
    throw new Error(
      'Check-in cannot be after check-out',
    );
  }

  const latitude = optionalCoordinate(input.latitude);
  const longitude = optionalCoordinate(input.longitude);

  if (
    (latitude === undefined) !== (longitude === undefined)
  ) {
    throw new Error(
      'Map location needs both latitude and longitude from the place picker',
    );
  }

  return {
    ...input,
    name,
    address: optionalText(input.address),
    latitude,
    longitude,
    checkInAt,
    checkOutAt,
    phone: optionalText(input.phone),
    website: optionalText(input.website),
    notes: optionalText(input.notes),
  };
}

function optionalCoordinate(
  value: number | undefined,
): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

export function validateAccommodationRelationships(
  tripId: Accommodation['tripId'],
  input: Pick<
    AccommodationInput,
    'bookingId' | 'stopId'
  >,
  booking: Booking | null,
  stop: TripStop | null,
): void {
  if (
    input.bookingId &&
    (
      !booking ||
      booking.id !== input.bookingId ||
      booking.tripId !== tripId
    )
  ) {
    throw new Error(
      'Linked booking does not belong to this trip',
    );
  }

  if (
    input.stopId &&
    (
      !stop ||
      stop.id !== input.stopId ||
      stop.tripId !== tripId
    )
  ) {
    throw new Error(
      'Linked itinerary stop does not belong to this trip',
    );
  }
}

export function accommodationsLinkedToBooking(
  accommodations: Accommodation[],
  bookingId: BookingId,
): Accommodation[] {
  return accommodations.filter(
    (accommodation) =>
      accommodation.bookingId === bookingId,
  );
}

export function accommodationsLinkedToStop(
  accommodations: Accommodation[],
  stopId: TripStopId,
): Accommodation[] {
  return accommodations.filter(
    (accommodation) =>
      accommodation.stopId === stopId,
  );
}

export function accommodationContextsForDay(
  accommodations: Accommodation[],
  date: string,
): AccommodationDayContext[] {
  return accommodations.flatMap<AccommodationDayContext>(
    (accommodation) => {
      const checkIn = splitAccommodationDateTime(
        accommodation.checkInAt,
      );
      const checkOut = splitAccommodationDateTime(
        accommodation.checkOutAt,
      );

      const contexts: AccommodationDayContext[] = [];

      if (checkIn?.date === date) {
        contexts.push({ accommodation, phase: 'check-in' });
      }

      if (checkOut?.date === date) {
        contexts.push({ accommodation, phase: 'check-out' });
      }

      if (contexts.length > 0) {
        return contexts;
      }

      if (
        checkIn &&
        checkOut &&
        checkIn.date < date &&
        date < checkOut.date
      ) {
        return [{ accommodation, phase: 'stay' }];
      }

      return [];
    },
  );
}
