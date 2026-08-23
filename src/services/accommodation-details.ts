import type {
  Accommodation,
  AccommodationType,
  Booking,
  BookingId,
  TripStop,
  TripStopId,
} from '@/domain/entities';

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

function parseLocalDateTime(
  value: string,
): {
  date: string;
  time: string;
} | null {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})?$/.exec(
      value,
    );

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const date = new Date(
    Date.UTC(year, month - 1, day),
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return {
    date: `${match[1]}-${match[2]}-${match[3]}`,
    time: `${match[4]}:${match[5]}`,
  };
}

export function isCanonicalAccommodationDateTime(
  value: string,
): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/.test(
      value,
    ) && parseLocalDateTime(value) !== null
  );
}

export function splitAccommodationDateTime(
  value: string | undefined,
): {
  date: string;
  time: string;
} | null {
  return value ? parseLocalDateTime(value) : null;
}

export function combineAccommodationDateTime(
  date: string,
  time: string,
): string {
  const value = `${date}T${time}:00`;

  if (!isCanonicalAccommodationDateTime(value)) {
    throw new Error(
      'Stay date and time must be valid',
    );
  }

  return value;
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
    !parseLocalDateTime(checkInAt)
  ) {
    throw new Error(
      'Check-in must use a valid local date and time',
    );
  }

  if (
    checkOutAt &&
    !parseLocalDateTime(checkOutAt)
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

  return {
    ...input,
    name,
    address: optionalText(input.address),
    checkInAt,
    checkOutAt,
    phone: optionalText(input.phone),
    website: optionalText(input.website),
    notes: optionalText(input.notes),
  };
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
