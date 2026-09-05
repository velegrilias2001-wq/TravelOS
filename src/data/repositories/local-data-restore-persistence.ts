import type {
  Database,
  DatabaseConnection,
} from '../database/database';
import type { Memory } from '../../domain/entities/memory';
import type { SavedPlace } from '../../domain/entities/saved-place';
import type { TravelBook } from '../../domain/entities/travel-book';
import type { TravelDNA } from '../../domain/entities/travel-dna';
import type { TripDay } from '../../domain/entities/trip-day';
import type { TripRuntimeState } from '../../domain/entities/trip-runtime-state';
import type { TripStop } from '../../domain/entities/trip-stop';
import type { LocalDataExportDocument } from '../../services/local-data-export';

import { writeCanonicalAccommodation } from './accommodation-persistence-operations';
import { writeCanonicalBooking } from './booking-persistence-operations';
import {
  upsertBudgetItem,
  upsertBudgetPlan,
} from './budget-persistence-operations';
import { upsertTripFxRate } from './fx-rate-persistence-operations';
import { upsertTripStopLivedState } from './stop-lived-persistence-operations';
import { saveCanonicalTraveler } from './traveler-persistence-operations';
import { writeCanonicalTrip } from './trip-persistence-operations';

const USER_TABLE_DELETE_ORDER = [
  'import_claims',
  'import_batches',
  'travel_book_memories',
  'travel_books',
  'memories',
  'trip_stop_lived_states',
  'trip_runtime_states',
  'budget_items',
  'budgets',
  'trip_fx_rates',
  'accommodations',
  'bookings',
  'trip_stops',
  'trip_days',
  'trip_destinations',
  'trip_travelers',
  'trips',
  'travelers',
  'saved_places',
  'travel_dna',
] as const;

/**
 * Atomically replace canonical local TravelOS data with an export document.
 * Preserves exported IDs. Does not invent facts or restore photo bytes.
 * Import review queues are wiped (not part of the export contract).
 */
export async function replaceLocalDataFromExport(
  database: Database,
  document: LocalDataExportDocument,
): Promise<void> {
  await database.transaction(async (connection) => {
    await wipeCanonicalUserTables(connection);
    await insertExportDocument(connection, document);
  });
}

async function wipeCanonicalUserTables(
  connection: DatabaseConnection,
): Promise<void> {
  for (const table of USER_TABLE_DELETE_ORDER) {
    await connection.execute(`DELETE FROM ${table};`);
  }
}

async function insertExportDocument(
  connection: DatabaseConnection,
  document: LocalDataExportDocument,
): Promise<void> {
  const travelersById = new Map(
    document.travelers.map((traveler) => [
      traveler.id,
      traveler,
    ]),
  );

  for (const bundle of document.trips) {
    for (const traveler of bundle.travelers) {
      travelersById.set(traveler.id, traveler);
    }
  }

  for (const traveler of travelersById.values()) {
    await saveCanonicalTraveler(connection, traveler);
  }

  if (document.travelDNA) {
    await writeTravelDNA(connection, document.travelDNA);
  }

  for (const place of document.savedPlaces) {
    await writeSavedPlace(connection, place);
  }

  for (const bundle of document.trips) {
    await writeCanonicalTrip(connection, bundle.trip);

    for (const day of bundle.days) {
      await writeTripDay(connection, day);
    }

    for (const stop of bundle.stops) {
      await writeTripStop(connection, stop);
    }

    for (const booking of bundle.bookings) {
      await writeCanonicalBooking(connection, booking);
    }

    for (const accommodation of bundle.accommodations) {
      await writeCanonicalAccommodation(
        connection,
        accommodation,
      );
    }

    if (bundle.budget) {
      await upsertBudgetPlan(connection, bundle.budget);

      for (const item of bundle.budget.items) {
        await upsertBudgetItem(connection, item);
      }
    }

    for (const rate of bundle.fxRates) {
      await upsertTripFxRate(connection, rate);
    }

    for (const memory of bundle.memories) {
      await writeMemory(connection, memory);
    }

    if (bundle.travelBook) {
      await writeTravelBook(connection, bundle.travelBook);
    }

    for (const lived of bundle.livedStates) {
      await upsertTripStopLivedState(connection, lived);
    }

    if (bundle.runtimeState) {
      await writeRuntimeState(connection, bundle.runtimeState);
    }
  }
}

async function writeTravelDNA(
  connection: DatabaseConnection,
  profile: TravelDNA,
): Promise<void> {
  await connection.execute(
    `
      INSERT INTO travel_dna (
        singleton_key,
        id,
        pace,
        interests_json,
        travel_style,
        budget_style,
        daily_rhythm,
        typical_party,
        created_at,
        updated_at
      )
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(singleton_key) DO UPDATE SET
        id = excluded.id,
        pace = excluded.pace,
        interests_json = excluded.interests_json,
        travel_style = excluded.travel_style,
        budget_style = excluded.budget_style,
        daily_rhythm = excluded.daily_rhythm,
        typical_party = excluded.typical_party,
        updated_at = excluded.updated_at;
    `,
    [
      profile.id,
      profile.pace ?? null,
      JSON.stringify(profile.interests),
      profile.travelStyle ?? null,
      profile.budgetStyle ?? null,
      profile.dailyRhythm ?? null,
      profile.typicalParty ?? null,
      profile.createdAt,
      profile.updatedAt,
    ],
  );
}

async function writeSavedPlace(
  connection: DatabaseConnection,
  place: SavedPlace,
): Promise<void> {
  await connection.execute(
    `
      INSERT INTO saved_places (
        id,
        kind,
        grounded_identity,
        source,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(grounded_identity) DO UPDATE SET
        kind = excluded.kind,
        source = excluded.source,
        updated_at = excluded.updated_at;
    `,
    [
      place.id,
      place.kind,
      place.groundedIdentity,
      place.source,
      place.createdAt,
      place.updatedAt,
    ],
  );
}

async function writeTripDay(
  connection: DatabaseConnection,
  day: TripDay,
): Promise<void> {
  await connection.execute(
    `
      INSERT INTO trip_days (
        id,
        trip_id,
        date,
        day_number,
        title,
        notes,
        destination_id,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        trip_id = excluded.trip_id,
        date = excluded.date,
        day_number = excluded.day_number,
        title = excluded.title,
        notes = excluded.notes,
        destination_id = excluded.destination_id,
        updated_at = excluded.updated_at;
    `,
    [
      day.id,
      day.tripId,
      day.date,
      day.dayNumber,
      day.title ?? null,
      day.notes ?? null,
      day.destinationId ?? null,
      day.createdAt,
      day.updatedAt,
    ],
  );
}

async function writeTripStop(
  connection: DatabaseConnection,
  stop: TripStop,
): Promise<void> {
  await connection.execute(
    `
      INSERT INTO trip_stops (
        id,
        trip_id,
        day_id,
        title,
        type,
        position,
        location_name,
        address,
        latitude,
        longitude,
        place_id,
        start_time,
        end_time,
        notes,
        created_at,
        updated_at
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        trip_id = excluded.trip_id,
        day_id = excluded.day_id,
        title = excluded.title,
        type = excluded.type,
        position = excluded.position,
        location_name = excluded.location_name,
        address = excluded.address,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        place_id = excluded.place_id,
        start_time = excluded.start_time,
        end_time = excluded.end_time,
        notes = excluded.notes,
        updated_at = excluded.updated_at;
    `,
    [
      stop.id,
      stop.tripId,
      stop.dayId,
      stop.title,
      stop.type,
      stop.order,
      stop.location?.name ?? null,
      stop.location?.address ?? null,
      stop.location?.latitude ?? null,
      stop.location?.longitude ?? null,
      stop.location?.placeId ?? null,
      stop.startTime ?? null,
      stop.endTime ?? null,
      stop.notes ?? null,
      stop.createdAt,
      stop.updatedAt,
    ],
  );
}

async function writeMemory(
  connection: DatabaseConnection,
  memory: Memory,
): Promise<void> {
  await connection.execute(
    `
      INSERT INTO memories (
        id, trip_id, day_id, stop_id, type,
        title, caption, media_uri,
        captured_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        trip_id = excluded.trip_id,
        day_id = excluded.day_id,
        stop_id = excluded.stop_id,
        type = excluded.type,
        title = excluded.title,
        caption = excluded.caption,
        media_uri = excluded.media_uri,
        captured_at = excluded.captured_at,
        updated_at = excluded.updated_at;
    `,
    [
      memory.id,
      memory.tripId,
      memory.dayId ?? null,
      memory.stopId ?? null,
      memory.type,
      memory.title ?? null,
      memory.caption ?? null,
      memory.mediaUri ?? null,
      memory.capturedAt,
      memory.createdAt,
      memory.updatedAt,
    ],
  );
}

async function writeTravelBook(
  connection: DatabaseConnection,
  book: TravelBook,
): Promise<void> {
  await connection.execute(
    `
      INSERT INTO travel_books (
        id, trip_id, title, cover_image_uri,
        summary, is_published,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        trip_id = excluded.trip_id,
        title = excluded.title,
        cover_image_uri = excluded.cover_image_uri,
        summary = excluded.summary,
        is_published = excluded.is_published,
        updated_at = excluded.updated_at;
    `,
    [
      book.id,
      book.tripId,
      book.title,
      book.coverImageUri ?? null,
      book.summary ?? null,
      book.isPublished ? 1 : 0,
      book.createdAt,
      book.updatedAt,
    ],
  );

  await connection.execute(
    `
      DELETE FROM travel_book_memories
      WHERE travel_book_id = ?;
    `,
    [book.id],
  );

  for (
    let position = 0;
    position < book.memoryIds.length;
    position += 1
  ) {
    await connection.execute(
      `
        INSERT INTO travel_book_memories (
          travel_book_id,
          memory_id,
          position
        )
        VALUES (?, ?, ?);
      `,
      [book.id, book.memoryIds[position], position],
    );
  }
}

async function writeRuntimeState(
  connection: DatabaseConnection,
  state: TripRuntimeState,
): Promise<void> {
  await connection.execute(
    `
      INSERT INTO trip_runtime_states (
        trip_id, phase, current_day_id,
        current_stop_id, last_activity_at,
        is_companion_active, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(trip_id) DO UPDATE SET
        phase = excluded.phase,
        current_day_id = excluded.current_day_id,
        current_stop_id = excluded.current_stop_id,
        last_activity_at = excluded.last_activity_at,
        is_companion_active = excluded.is_companion_active,
        updated_at = excluded.updated_at;
    `,
    [
      state.tripId,
      state.phase,
      state.currentDayId ?? null,
      state.currentStopId ?? null,
      state.lastActivityAt ?? null,
      state.isCompanionActive ? 1 : 0,
      state.updatedAt,
    ],
  );
}
