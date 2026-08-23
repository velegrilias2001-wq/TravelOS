import type {
  Trip,
  TripDay,
} from '../domain/entities';

const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(
  value: string,
): Date {
  if (!ISO_DATE_PATTERN.test(value)) {
    throw new Error(
      'Invalid trip date: ' + value,
    );
  }

  const [year, month, day] = value
    .split('-')
    .map(Number);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  );

  if (
    date.toISOString().slice(0, 10) !==
    value
  ) {
    throw new Error(
      'Invalid trip date: ' + value,
    );
  }

  return date;
}

function formatIsoDate(
  date: Date,
): string {
  return date
    .toISOString()
    .slice(0, 10);
}

export function buildCanonicalTripDays(
  trip: Trip,
  createId: () => string,
  timestamp: string,
): TripDay[] {
  const start =
    parseIsoDate(trip.startDate);

  const end =
    parseIsoDate(trip.endDate);

  if (end.getTime() < start.getTime()) {
    throw new Error(
      'Trip end date cannot be before its start date',
    );
  }

  const dayCount =
    Math.floor(
      (
        end.getTime() -
        start.getTime()
      ) / 86_400_000,
    ) + 1;

  return Array.from(
    { length: dayCount },
    (_, index): TripDay => {
      const date = new Date(
        start.getTime(),
      );

      date.setUTCDate(
        date.getUTCDate() + index,
      );

      return {
        id: createId(),
        tripId: trip.id,
        date: formatIsoDate(date),
        dayNumber: index + 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    },
  );
}
