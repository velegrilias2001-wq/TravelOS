import type {
  TripDay,
  TripStop,
} from '@/domain/entities';
import type { TripWorkspace } from './trip-service';
import {
  hasRealDestinationCoordinates,
  mappedDestinations,
  tripDestinationLabel,
} from './destination-authoring';
import { tripDayDestination } from './trip-day-destination';

export type TripMapCompanionMode =
  | 'upcoming'
  | 'active'
  | 'completed'
  | 'date-review';

export type TripMapFrameKind =
  | 'empty'
  | 'all-mapped'
  | 'display-day'
  | 'assigned-destination';

export interface TripMapCoordinate {
  latitude: number;
  longitude: number;
}

export interface TripMapFrame {
  kind: TripMapFrameKind;
  coordinates: TripMapCoordinate[];
  title: string;
  eyebrow: string;
}

function isFiniteCoordinate(
  latitude: number,
  longitude: number,
): boolean {
  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function mappedStopCoordinate(
  stop: TripStop,
): TripMapCoordinate | null {
  const latitude = stop.location?.latitude;
  const longitude = stop.location?.longitude;

  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !isFiniteCoordinate(latitude, longitude)
  ) {
    return null;
  }

  return { latitude, longitude };
}

function uniqueCoordinates(
  coordinates: readonly TripMapCoordinate[],
): TripMapCoordinate[] {
  const seen = new Set<string>();
  const unique: TripMapCoordinate[] = [];

  for (const coordinate of coordinates) {
    const key = `${coordinate.latitude},${coordinate.longitude}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(coordinate);
  }

  return unique;
}

function allMappedCoordinates(
  workspace: TripWorkspace,
): TripMapCoordinate[] {
  return uniqueCoordinates([
    ...mappedDestinations(workspace.trip.destinations).map(
      (item) => item.coordinate,
    ),
    ...workspace.stops.flatMap((stop) => {
      const coordinate = mappedStopCoordinate(stop);
      return coordinate ? [coordinate] : [];
    }),
  ]);
}

function displayDayCoordinates(
  workspace: TripWorkspace,
  day: TripDay,
): {
  coordinates: TripMapCoordinate[];
  assignedName: string | null;
  hasAssignedCoordinate: boolean;
} {
  const assigned = tripDayDestination(
    day,
    workspace.trip.destinations,
  );
  const assignedCoordinate =
    assigned && hasRealDestinationCoordinates(assigned)
      ? {
          latitude: assigned.latitude as number,
          longitude: assigned.longitude as number,
        }
      : null;
  const stopCoordinates = workspace.stops
    .filter((stop) => stop.dayId === day.id)
    .flatMap((stop) => {
      const coordinate = mappedStopCoordinate(stop);
      return coordinate ? [coordinate] : [];
    });

  return {
    coordinates: uniqueCoordinates([
      ...(assignedCoordinate ? [assignedCoordinate] : []),
      ...stopCoordinates,
    ]),
    assignedName: assigned?.name.trim() || null,
    hasAssignedCoordinate: Boolean(assignedCoordinate),
  };
}

function frameEyebrow(
  kind: TripMapFrameKind,
  mode: TripMapCompanionMode | null,
): string {
  if (kind === 'empty' || kind === 'all-mapped') {
    return 'TRIP MAP';
  }

  if (mode === 'active') {
    return "TODAY'S MAP";
  }

  if (mode === 'upcoming') {
    return 'FIRST DAY';
  }

  if (mode === 'completed') {
    return 'LAST DAY';
  }

  return 'TRIP MAP';
}

export function selectTripMapFrame(
  workspace: TripWorkspace,
  options: {
    displayDay?: TripDay | null;
    viewAll?: boolean;
    mode?: TripMapCompanionMode | null;
  } = {},
): TripMapFrame {
  const tripTitle = tripDestinationLabel(
    workspace.trip.destinations,
  );
  const allCoordinates = allMappedCoordinates(workspace);

  if (allCoordinates.length === 0) {
    return {
      kind: 'empty',
      coordinates: [],
      title: tripTitle,
      eyebrow: 'TRIP MAP',
    };
  }

  const displayDay = options.displayDay ?? null;

  if (!options.viewAll && displayDay) {
    const dayFrame = displayDayCoordinates(
      workspace,
      displayDay,
    );

    if (dayFrame.coordinates.length > 0) {
      const kind =
        dayFrame.hasAssignedCoordinate &&
        dayFrame.coordinates.length === 1
          ? 'assigned-destination'
          : 'display-day';

      return {
        kind,
        coordinates: dayFrame.coordinates,
        title: dayFrame.assignedName ?? "Today's places",
        eyebrow: frameEyebrow(kind, options.mode ?? null),
      };
    }
  }

  return {
    kind: 'all-mapped',
    coordinates: allCoordinates,
    title: tripTitle,
    eyebrow: 'TRIP MAP',
  };
}

export function systemDirectionsUrl(
  coordinate: TripMapCoordinate,
  label: string,
  platform: string,
): string | null {
  if (
    !isFiniteCoordinate(
      coordinate.latitude,
      coordinate.longitude,
    )
  ) {
    return null;
  }

  const query = `${coordinate.latitude},${coordinate.longitude}`;
  const pinLabel = label.trim() || query;

  if (platform === 'ios') {
    return (
      `https://maps.apple.com/?ll=${query}` +
      `&q=${encodeURIComponent(pinLabel)}`
    );
  }

  if (platform === 'android') {
    return (
      'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent(query)
    );
  }

  return null;
}
