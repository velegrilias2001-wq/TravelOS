import * as FileSystem from 'expo-file-system/legacy';

import type { Accommodation } from '@/domain/entities/accommodation';
import type { Booking } from '@/domain/entities/booking';
import type { Budget } from '@/domain/entities/budget';
import type { TripFxRate } from '@/domain/entities/fx-rate';
import type { Memory } from '@/domain/entities/memory';
import type { TravelBook } from '@/domain/entities/travel-book';
import type { Traveler } from '@/domain/entities/traveler';
import type { TripRuntimeState } from '@/domain/entities/trip-runtime-state';
import type { TripStopLivedState } from '@/domain/entities/trip-stop-lived-state';
import {
  buildLocalDataExportDocument,
  serializeLocalDataExport,
  type LocalDataExportDocument,
  type LocalDataExportSnapshot,
} from '@/services/local-data-export';
import { repositories } from '@/services/repository-registry';

export async function collectLocalDataExportSnapshot(): Promise<LocalDataExportSnapshot> {
  const trips = await repositories.trip.getAll();
  const tripIds = trips.map((trip) => trip.id);

  const [
    travelDNA,
    savedPlaces,
    travelers,
    days,
    stops,
    livedStates,
  ] = await Promise.all([
    repositories.travelDNA.get(),
    repositories.savedPlaces.list(),
    repositories.traveler.getAll(),
    repositories.trip.getDaysForTrips(tripIds),
    repositories.trip.getStopsForTrips(tripIds),
    repositories.stopLivedStates.getByTripIds(tripIds),
  ]);

  const bookingsByTripId: Record<string, Booking[]> = {};
  const accommodationsByTripId: Record<
    string,
    Accommodation[]
  > = {};
  const budgetsByTripId: Record<string, Budget | null> = {};
  const fxRatesByTripId: Record<string, TripFxRate[]> = {};
  const memoriesByTripId: Record<string, Memory[]> = {};
  const travelBooksByTripId: Record<
    string,
    TravelBook | null
  > = {};
  const runtimeByTripId: Record<
    string,
    TripRuntimeState | null
  > = {};
  const travelersByTripId: Record<string, Traveler[]> = {};
  const livedByTripId: Record<string, TripStopLivedState[]> =
    {};

  for (const state of livedStates) {
    const list = livedByTripId[state.tripId] ?? [];
    list.push(state);
    livedByTripId[state.tripId] = list;
  }

  await Promise.all(
    tripIds.map(async (tripId) => {
      const [
        bookings,
        accommodations,
        budget,
        fxRates,
        memories,
        travelBook,
        runtimeState,
        tripTravelers,
      ] = await Promise.all([
        repositories.booking.getByTripId(tripId),
        repositories.accommodation.getByTripId(tripId),
        repositories.budget.getByTripId(tripId),
        repositories.fxRates.getByTripId(tripId),
        repositories.memory.getByTripId(tripId),
        repositories.travelBook.getByTripId(tripId),
        repositories.runtimeState.getByTripId(tripId),
        repositories.traveler.getByTripId(tripId),
      ]);

      bookingsByTripId[tripId] = bookings;
      accommodationsByTripId[tripId] = accommodations;
      budgetsByTripId[tripId] = budget;
      fxRatesByTripId[tripId] = fxRates;
      memoriesByTripId[tripId] = memories;
      travelBooksByTripId[tripId] = travelBook;
      runtimeByTripId[tripId] = runtimeState;
      travelersByTripId[tripId] = tripTravelers;
    }),
  );

  return {
    travelDNA,
    savedPlaces,
    travelers,
    trips,
    days,
    stops,
    bookingsByTripId,
    accommodationsByTripId,
    budgetsByTripId,
    fxRatesByTripId,
    memoriesByTripId,
    travelBooksByTripId,
    runtimeByTripId,
    livedByTripId,
    travelersByTripId,
  };
}

export async function writeLocalDataExportFile(
  document: LocalDataExportDocument,
): Promise<string> {
  if (!FileSystem.documentDirectory) {
    throw new Error(
      'Persistent app storage is unavailable.',
    );
  }

  const directory = `${FileSystem.documentDirectory}travelos/exports/`;
  await FileSystem.makeDirectoryAsync(directory, {
    intermediates: true,
  });

  const stamp = document.exportedAt
    .replace(/[:.]/g, '-')
    .replace(/Z$/, 'Z');
  const path = `${directory}travelos-export-${stamp}.json`;
  await FileSystem.writeAsStringAsync(
    path,
    serializeLocalDataExport(document),
    { encoding: FileSystem.EncodingType.UTF8 },
  );

  return path;
}

export async function createLocalDataExportFile(): Promise<{
  path: string;
  document: LocalDataExportDocument;
}> {
  const snapshot = await collectLocalDataExportSnapshot();
  const document = buildLocalDataExportDocument(snapshot);
  const path = await writeLocalDataExportFile(document);
  return { path, document };
}
