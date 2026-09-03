import type { TripWorkspace } from './trip-service';
import { mappedDestinations } from './destination-authoring';
import { mappedStopCoordinate } from './trip-map-context';

export type NetworkReachability =
  | 'online'
  | 'offline'
  | 'unknown';

export type OfflineTripNoticeKind =
  | 'offline'
  | 'offline-unmapped'
  | 'unmapped';

export interface NetworkStateFacts {
  type?: string | null;
  isConnected?: boolean | null;
  isInternetReachable?: boolean | null;
}

export interface OfflineTripFacts {
  bookingCount: number;
  stayCount: number;
  stopCount: number;
  mappedPinCount: number;
  unmappedStopCount: number;
}

export interface OfflineTripNotice {
  kind: OfflineTripNoticeKind;
  body: string;
}

export function resolveNetworkReachability(
  state: NetworkStateFacts | null,
): NetworkReachability {
  if (state == null) {
    return 'unknown';
  }

  if (state.type === 'NONE' || state.isConnected === false) {
    return 'offline';
  }

  if (state.isInternetReachable === false) {
    return 'offline';
  }

  if (state.isConnected === true) {
    return 'online';
  }

  return 'unknown';
}

export function collectOfflineTripFacts(
  workspace: TripWorkspace,
): OfflineTripFacts {
  const mappedPinCount =
    mappedDestinations(workspace.trip.destinations).length +
    workspace.stops.filter(
      (stop) => mappedStopCoordinate(stop) !== null,
    ).length;
  const unmappedStopCount = workspace.stops.filter(
    (stop) => mappedStopCoordinate(stop) === null,
  ).length;

  return {
    bookingCount: workspace.bookings.length,
    stayCount: workspace.accommodations.length,
    stopCount: workspace.stops.length,
    mappedPinCount,
    unmappedStopCount,
  };
}

export function selectOfflineTripNotice(input: {
  reachability: NetworkReachability;
  facts: OfflineTripFacts;
  surface: 'companion' | 'map';
}): OfflineTripNotice | null {
  const { reachability, facts, surface } = input;

  if (reachability === 'offline') {
    if (facts.mappedPinCount === 0) {
      return {
        kind: 'offline-unmapped',
        body:
          surface === 'map'
            ? 'Trip, bookings, and stays are saved on this device. There is no saved pin, and live map tiles need a network.'
            : 'Trip, bookings, and stays are saved on this device. Live lookup needs a network.',
      };
    }

    return {
      kind: 'offline',
      body:
        surface === 'map'
          ? 'Saved pins stay on this device. Live map tiles need a network. Directions use the saved pin, not a cached route.'
          : 'Trip, bookings, stays, and saved pins are on this device. Map tiles and live lookup need a network.',
    };
  }

  if (
    surface === 'map' &&
    facts.unmappedStopCount > 0
  ) {
    return {
      kind: 'unmapped',
      body: 'Stops without saved coordinates stay off the map. TravelOS does not invent a pin.',
    };
  }

  return null;
}
