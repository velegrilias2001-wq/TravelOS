import type {
  Memory,
  Trip,
  TripDay,
  TripDestination,
  TripStop,
  TripStopLivedState,
} from '@/domain/entities';
import { hasRealDestinationCoordinates } from './destination-authoring';

export type WorldPlaceKind = 'planned' | 'lived';

export type WorldPlaceFilter = 'all' | 'planned' | 'lived';

export interface WorldPlaceArchive {
  memoryCount: number;
  photoCount: number;
  noteCount: number;
  coverUri: string | null;
}

export interface WorldPlace {
  id: string;
  trip: Trip;
  destination: TripDestination;
  kind: WorldPlaceKind;
  mapped: boolean;
  archive: WorldPlaceArchive;
}

export interface WorldPlaceContext {
  days: readonly TripDay[];
  stops: readonly TripStop[];
  livedStates: readonly TripStopLivedState[];
  memories: readonly Memory[];
}

const EMPTY_ARCHIVE: WorldPlaceArchive = {
  memoryCount: 0,
  photoCount: 0,
  noteCount: 0,
  coverUri: null,
};

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

export function destinationIdForMemory(
  memory: Memory,
  days: readonly TripDay[],
  stops: readonly TripStop[],
): string | null {
  if (memory.stopId) {
    const stop = stops.find(
      (candidate) =>
        candidate.id === memory.stopId &&
        candidate.tripId === memory.tripId,
    );

    if (!stop) {
      return null;
    }

    const day = days.find(
      (candidate) =>
        candidate.id === stop.dayId &&
        candidate.tripId === stop.tripId,
    );

    return day?.destinationId ?? null;
  }

  if (memory.dayId) {
    const day = days.find(
      (candidate) =>
        candidate.id === memory.dayId &&
        candidate.tripId === memory.tripId,
    );

    return day?.destinationId ?? null;
  }

  return null;
}

function buildArchive(
  memories: readonly Memory[],
): WorldPlaceArchive {
  const photos = memories.filter(
    (memory) =>
      memory.type === 'photo' &&
      Boolean(memory.mediaUri),
  );
  const notes = memories.filter(
    (memory) => memory.type === 'note',
  );
  const cover = [...photos].sort((left, right) => {
    const byTime = left.capturedAt.localeCompare(
      right.capturedAt,
    );

    if (byTime !== 0) {
      return byTime;
    }

    return left.id.localeCompare(right.id);
  })[0];

  return {
    memoryCount: memories.length,
    photoCount: photos.length,
    noteCount: notes.length,
    coverUri: cover?.mediaUri ?? null,
  };
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
  const memoriesByPlace = new Map<string, Memory[]>();

  for (const memory of context.memories) {
    const destinationId = destinationIdForMemory(
      memory,
      context.days,
      context.stops,
    );

    if (!destinationId) {
      continue;
    }

    const key = placeKey(memory.tripId, destinationId);
    const current = memoriesByPlace.get(key) ?? [];
    current.push(memory);
    memoriesByPlace.set(key, current);
  }

  return trips.flatMap((trip) =>
    trip.destinations.map((destination) => {
      const id = placeKey(trip.id, destination.id);
      const kind: WorldPlaceKind = livedKeys.has(id)
        ? 'lived'
        : 'planned';

      return {
        id,
        trip,
        destination,
        kind,
        mapped: hasRealDestinationCoordinates(
          destination,
        ),
        archive:
          kind === 'lived'
            ? buildArchive(
                memoriesByPlace.get(id) ?? [],
              )
            : EMPTY_ARCHIVE,
      };
    }),
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
  archiveMemories: number;
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
    archiveMemories: places.reduce(
      (total, place) =>
        total + place.archive.memoryCount,
      0,
    ),
  };
}

/**
 * Footprint from lived evidence only.
 * Countries require an explicit destination countryCode —
 * missing codes stay unknown and are not invented.
 */
export function selectWorldFootprintStats(
  places: readonly WorldPlace[],
): {
  livedCountries: number;
  livedPlaces: number;
  plannedPlaces: number;
} {
  const lived = places.filter(
    (place) => place.kind === 'lived',
  );
  const countries = new Set<string>();

  for (const place of lived) {
    const code = place.destination.countryCode;

    if (
      typeof code === 'string' &&
      /^[A-Z]{2}$/.test(code)
    ) {
      countries.add(code);
    }
  }

  return {
    livedCountries: countries.size,
    livedPlaces: lived.length,
    plannedPlaces: places.filter(
      (place) => place.kind === 'planned',
    ).length,
  };
}
