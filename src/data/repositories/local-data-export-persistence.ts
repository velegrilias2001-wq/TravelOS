import type { Database } from '../database/database';
import type { LocalDataExportSnapshot } from '../../services/local-data-export';
import { SQLiteAccommodationRepository } from './sqlite-accommodation-repository';
import { SQLiteBookingRepository } from './sqlite-booking-repository';
import { SQLiteBudgetRepository } from './sqlite-budget-repository';
import { SQLiteFxRateRepository } from './sqlite-fx-rate-repository';
import { SQLiteMemoryRepository } from './sqlite-memory-repository';
import { SQLitePackingRepository } from './sqlite-packing-repository';
import { SQLiteSavedPlaceRepository } from './sqlite-saved-place-repository';
import { SQLiteTravelBookRepository } from './sqlite-travel-book-repository';
import { SQLiteTravelDNARepository } from './sqlite-travel-dna-repository';
import { SQLiteTravelerRepository } from './sqlite-traveler-repository';
import { SQLiteTripRepository } from './sqlite-trip-repository';
import { SQLiteTripRuntimeStateRepository } from './sqlite-trip-runtime-state-repository';
import { SQLiteTripStopLivedStateRepository } from './sqlite-trip-stop-lived-state-repository';

/** Collect every table through the same scoped transaction, including hydration.
 * No global repository, file IO, sharing or writes belong inside this snapshot.
 */
export async function collectLocalDataExportSnapshotFromDatabase(
  database: Database,
): Promise<LocalDataExportSnapshot> {
  return database.transaction(async (connection) => {
    const rejectWrite = async (): Promise<never> => {
      throw new Error('Backup collection is read-only.');
    };
    // Reuse existing mappers without nested transactions or default-record writes.
    const reader: Database = {
      query: connection.query.bind(connection),
      queryFirst: connection.queryFirst.bind(connection),
      execute: rejectWrite,
      initialize: rejectWrite,
      transaction: rejectWrite,
    };
    const tripRepository = new SQLiteTripRepository(reader);
    const travelerRepository = new SQLiteTravelerRepository(reader);
    const trips = await tripRepository.getAll();
    const tripIds = trips.map((trip) => trip.id);
    const snapshot: LocalDataExportSnapshot = {
      trips,
      travelDNA: await new SQLiteTravelDNARepository(reader).get(),
      savedPlaces: await new SQLiteSavedPlaceRepository(reader).list(),
      travelers: await travelerRepository.getAll(),
      days: await tripRepository.getDaysForTrips(tripIds),
      stops: await tripRepository.getStopsForTrips(tripIds),
      bookingsByTripId: Object.create(null),
      accommodationsByTripId: Object.create(null),
      budgetsByTripId: Object.create(null),
      fxRatesByTripId: Object.create(null),
      memoriesByTripId: Object.create(null),
      travelBooksByTripId: Object.create(null),
      runtimeByTripId: Object.create(null),
      livedByTripId: Object.create(null),
      travelersByTripId: Object.create(null),
      packingByTripId: Object.create(null),
    };
    const livedStates = await new SQLiteTripStopLivedStateRepository(reader).getByTripIds(tripIds);
    for (const state of livedStates) {
      (snapshot.livedByTripId[state.tripId] ??= []).push(state);
    }
    const bookings = new SQLiteBookingRepository(reader);
    const accommodations = new SQLiteAccommodationRepository(reader);
    const budgets = new SQLiteBudgetRepository(reader);
    const rates = new SQLiteFxRateRepository(reader);
    const memories = new SQLiteMemoryRepository(reader);
    const books = new SQLiteTravelBookRepository(reader);
    const runtime = new SQLiteTripRuntimeStateRepository(reader);
    const packing = new SQLitePackingRepository(reader);

    // Bound work on the single connection instead of launching queries for
    // every trip concurrently. A failed read must never return a partial file.
    for (const tripId of tripIds) {
      snapshot.bookingsByTripId[tripId] = await bookings.getByTripId(tripId);
      snapshot.accommodationsByTripId[tripId] = await accommodations.getByTripId(tripId);
      snapshot.budgetsByTripId[tripId] = await budgets.getByTripId(tripId);
      snapshot.fxRatesByTripId[tripId] = await rates.getByTripId(tripId);
      snapshot.memoriesByTripId[tripId] = await memories.getByTripId(tripId);
      snapshot.travelBooksByTripId[tripId] = await books.getByTripId(tripId);
      snapshot.runtimeByTripId[tripId] = await runtime.getByTripId(tripId);
      snapshot.travelersByTripId[tripId] = await travelerRepository.getByTripId(tripId);
      snapshot.packingByTripId![tripId] = await packing.listByTripId(tripId);
    }
    return snapshot;
  });
}
