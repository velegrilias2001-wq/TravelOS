import type { TripWorkspace } from './trip-service';
import { mappedDestinations } from './destination-authoring';
import { mappedStopCoordinate } from './trip-map-context';
import { strings } from '../i18n';

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
            ? strings.offline.noPinBody
            : strings.offline.liveLookupBody,
      };
    }

    return {
      kind: 'offline',
      body:
        surface === 'map'
          ? strings.offline.savedPinsBody
          : strings.offline.allSavedBody,
    };
  }

  if (
    surface === 'map' &&
    facts.unmappedStopCount > 0
  ) {
    return {
      kind: 'unmapped',
      body: strings.offline.noInventedPin,
    };
  }

  return null;
}
