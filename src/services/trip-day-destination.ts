import type {
  Trip,
  TripDay,
  TripDestination,
} from '../domain/entities';

export function tripDayDestination(
  day: TripDay,
  destinations: readonly TripDestination[],
): TripDestination | null {
  if (!day.destinationId) {
    return null;
  }

  return (
    destinations.find(
      (destination) =>
        destination.id === day.destinationId,
    ) ?? null
  );
}

export function applyTripDayDestination(
  day: TripDay,
  trip: Trip,
  destinationId: string | null,
  updatedAt: string,
): TripDay {
  if (day.tripId !== trip.id) {
    throw new Error(
      'This day belongs to another trip',
    );
  }

  if (destinationId === null) {
    return {
      ...day,
      destinationId: undefined,
      updatedAt,
    };
  }

  const destination = trip.destinations.find(
    (item) => item.id === destinationId,
  );

  if (!destination) {
    throw new Error(
      'That destination is not on this trip',
    );
  }

  return {
    ...day,
    destinationId,
    updatedAt,
  };
}

export function companionActivePlaceLabel(
  day: TripDay | null | undefined,
  destinations: readonly TripDestination[],
): string {
  if (!day) {
    return 'City not set for today';
  }

  const destination = tripDayDestination(
    day,
    destinations,
  );

  if (!destination) {
    return 'City not set for today';
  }

  return destination.name;
}
