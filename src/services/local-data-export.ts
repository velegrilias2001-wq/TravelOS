import type { Accommodation } from '@/domain/entities/accommodation';
import type { Booking } from '@/domain/entities/booking';
import type { Budget } from '@/domain/entities/budget';
import type { TripFxRate } from '@/domain/entities/fx-rate';
import type { Memory } from '@/domain/entities/memory';
import type { SavedPlace } from '@/domain/entities/saved-place';
import type { TravelBook } from '@/domain/entities/travel-book';
import type { TravelDNA } from '@/domain/entities/travel-dna';
import type { Traveler } from '@/domain/entities/traveler';
import type { TripDay } from '@/domain/entities/trip-day';
import type { TripRuntimeState } from '@/domain/entities/trip-runtime-state';
import type { TripStopLivedState } from '@/domain/entities/trip-stop-lived-state';
import type { TripStop } from '@/domain/entities/trip-stop';
import type { Trip } from '@/domain/entities/trip';

export const LOCAL_DATA_EXPORT_FORMAT =
  'travelos.local-export.v1' as const;

export const LOCAL_DATA_EXPORT_CONTRACT = {
  format: LOCAL_DATA_EXPORT_FORMAT,
  mutatesSqlite: false,
  includesPhotoBytes: false,
  restoreAvailable: true,
  cloudSync: false,
} as const;

export type LocalDataExportTripBundle = {
  trip: Trip;
  days: TripDay[];
  stops: TripStop[];
  bookings: Booking[];
  accommodations: Accommodation[];
  budget: Budget | null;
  fxRates: TripFxRate[];
  memories: Memory[];
  travelBook: TravelBook | null;
  runtimeState: TripRuntimeState | null;
  livedStates: TripStopLivedState[];
  travelers: Traveler[];
};

export type LocalDataExportDocument = {
  format: typeof LOCAL_DATA_EXPORT_FORMAT;
  exportedAt: string;
  appVersion: string;
  contract: typeof LOCAL_DATA_EXPORT_CONTRACT;
  travelDNA: TravelDNA | null;
  savedPlaces: SavedPlace[];
  travelers: Traveler[];
  trips: LocalDataExportTripBundle[];
};

export type LocalDataExportSnapshot = {
  travelDNA: TravelDNA | null;
  savedPlaces: SavedPlace[];
  travelers: Traveler[];
  trips: Trip[];
  days: TripDay[];
  stops: TripStop[];
  bookingsByTripId: Record<string, Booking[]>;
  accommodationsByTripId: Record<string, Accommodation[]>;
  budgetsByTripId: Record<string, Budget | null>;
  fxRatesByTripId: Record<string, TripFxRate[]>;
  memoriesByTripId: Record<string, Memory[]>;
  travelBooksByTripId: Record<string, TravelBook | null>;
  runtimeByTripId: Record<string, TripRuntimeState | null>;
  livedByTripId: Record<string, TripStopLivedState[]>;
  travelersByTripId: Record<string, Traveler[]>;
  exportedAt?: string;
  appVersion?: string;
};

/**
 * Build a portable JSON snapshot of canonical local truth.
 * Read-only helper: never writes SQLite. Photo binary files are not embedded.
 */
export function buildLocalDataExportDocument(
  snapshot: LocalDataExportSnapshot,
): LocalDataExportDocument {
  const daysByTrip = groupByTripId(snapshot.days);
  const stopsByTrip = groupByTripId(snapshot.stops);

  return {
    format: LOCAL_DATA_EXPORT_FORMAT,
    exportedAt: snapshot.exportedAt ?? new Date().toISOString(),
    appVersion: snapshot.appVersion ?? '1.0.0',
    contract: LOCAL_DATA_EXPORT_CONTRACT,
    travelDNA: snapshot.travelDNA,
    savedPlaces: snapshot.savedPlaces,
    travelers: snapshot.travelers,
    trips: snapshot.trips.map((trip) => ({
      trip,
      days: daysByTrip.get(trip.id) ?? [],
      stops: stopsByTrip.get(trip.id) ?? [],
      bookings: snapshot.bookingsByTripId[trip.id] ?? [],
      accommodations:
        snapshot.accommodationsByTripId[trip.id] ?? [],
      budget: snapshot.budgetsByTripId[trip.id] ?? null,
      fxRates: snapshot.fxRatesByTripId[trip.id] ?? [],
      memories: snapshot.memoriesByTripId[trip.id] ?? [],
      travelBook: snapshot.travelBooksByTripId[trip.id] ?? null,
      runtimeState: snapshot.runtimeByTripId[trip.id] ?? null,
      livedStates: snapshot.livedByTripId[trip.id] ?? [],
      travelers: snapshot.travelersByTripId[trip.id] ?? [],
    })),
  };
}

export function serializeLocalDataExport(
  document: LocalDataExportDocument,
): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

function groupByTripId<T extends { tripId: string }>(
  items: readonly T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();

  for (const item of items) {
    const list = map.get(item.tripId) ?? [];
    list.push(item);
    map.set(item.tripId, list);
  }

  return map;
}
