import type {
  Trip,
  TripDay,
  TripDestination,
  TripStop,
  TripStopLivedState,
} from '@/domain/entities';
import { hasRealDestinationCoordinates } from './destination-authoring';

export type WorldPlaceKind = 'planned' | 'lived';

export type WorldPlaceFilter = 'all' | 'planned' | 'lived';

export interface WorldPlace {
  id: string;
  trip: Trip;
  destination: TripDestination;
  kind: WorldPlaceKind;
  mapped: boolean;
}

export interface WorldPlaceContext {
  days: readonly TripDay[];
  stops: readonly TripStop[];
  livedStates: readonly TripStopLivedState[];
}

function placeKey(
  tripId: string,
  destinationId: string,
): string {
  return `${tripId}:${destinationId}`;
}

export function selectLivedDestinationKeys(
  days: readonly TripDay[],
  stops: readonly TripStop[],
  livedStates: readonly TripStopLivedState[],
): Set<string> {
  const dayById = new Map(
    days.map((day) => [day.id, day]),
  );
  const doneStopIds = new Set(
    livedStates
      .filter((state) => state.phase === 'done')
      .map((state) => state.stopId),
  );
  const livedKeys = new Set<string>();

  for (const stop of stops) {
    if (!doneStopIds.has(stop.id)) {
      continue;
    }

    const day = dayById.get(stop.dayId);

    if (
      !day ||
      day.tripId !== stop.tripId ||
      !day.destinationId
    ) {
      continue;
    }

    livedKeys.add(
      placeKey(stop.tripId, day.destinationId),
    );
  }

  return livedKeys;
}

export function selectWorldPlaces(
  trips: readonly Trip[],
  context: WorldPlaceContext,
): WorldPlace[] {
  const livedKeys = selectLivedDestinationKeys(
    context.days,
    context.stops,
    context.livedStates,
  );

  return trips.flatMap((trip) =>
    trip.destinations.map((destination) => ({
      id: placeKey(trip.id, destination.id),
      trip,
      destination,
      kind: livedKeys.has(
        placeKey(trip.id, destination.id),
      )
        ? 'lived'
        : 'planned',
      mapped: hasRealDestinationCoordinates(
        destination,
      ),
    })),
  );
}

export function filterWorldPlaces(
  places: readonly WorldPlace[],
  filter: WorldPlaceFilter,
): WorldPlace[] {
  if (filter === 'all') {
    return [...places];
  }

  return places.filter(
    (place) => place.kind === filter,
  );
}

export function worldPlaceCounts(
  places: readonly WorldPlace[],
): {
  lived: number;
  planned: number;
  mapped: number;
} {
  return {
    lived: places.filter(
      (place) => place.kind === 'lived',
    ).length,
    planned: places.filter(
      (place) => place.kind === 'planned',
    ).length,
    mapped: places.filter(
      (place) => place.mapped,
    ).length,
  };
}
