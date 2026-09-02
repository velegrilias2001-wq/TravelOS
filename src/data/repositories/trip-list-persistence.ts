import type {
  Trip,
  TripDestination,
  TripId,
  TripIntent,
  TripPace,
  TripStatus,
} from '../../domain/entities';
import type {
  DatabaseConnection,
} from '../database/database';
import {
  loadTripDestinationsForTrips,
} from './trip-destination-persistence';

interface TripRow {
  id: string;
  title: string;
  status: string;
  intent: string | null;
  pace: string | null;
  start_date: string;
  end_date: string;
  accounting_currency: string;
  created_at: string;
  updated_at: string;
}

interface TravelerLinkRow {
  trip_id: string;
  traveler_id: string;
}

function sqlPlaceholders(
  count: number,
): string {
  return Array.from(
    { length: count },
    () => '?',
  ).join(', ');
}

function mapTripRow(
  row: TripRow,
  destinations: TripDestination[],
  travelerIds: string[],
): Trip {
  return {
    id: row.id,
    title: row.title,
    status: row.status as TripStatus,
    intent:
      (row.intent as TripIntent | null) ??
      undefined,
    pace:
      (row.pace as TripPace | null) ??
      undefined,
    destinations,
    startDate: row.start_date,
    endDate: row.end_date,
    travelerIds,
    accountingCurrency:
      row.accounting_currency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadTripTravelerIdsForTrips(
  database: DatabaseConnection,
  tripIds: readonly TripId[],
): Promise<Map<TripId, string[]>> {
  const travelersByTrip = new Map<
    TripId,
    string[]
  >();

  if (tripIds.length === 0) {
    return travelersByTrip;
  }

  const rows =
    await database.query<TravelerLinkRow>(
      `
        SELECT
          trip_id,
          traveler_id
        FROM trip_travelers
        WHERE trip_id IN (${sqlPlaceholders(tripIds.length)})
        ORDER BY
          trip_id ASC,
          traveler_id ASC;
      `,
      [...tripIds],
    );

  for (const row of rows) {
    const current =
      travelersByTrip.get(row.trip_id);

    if (current) {
      current.push(row.traveler_id);
      continue;
    }

    travelersByTrip.set(
      row.trip_id,
      [row.traveler_id],
    );
  }

  return travelersByTrip;
}

async function hydrateTripRows(
  database: DatabaseConnection,
  rows: TripRow[],
): Promise<Trip[]> {
  if (rows.length === 0) {
    return [];
  }

  const tripIds = rows.map((row) => row.id);

  const [
    destinationsByTrip,
    travelersByTrip,
  ] = await Promise.all([
    loadTripDestinationsForTrips(
      database,
      tripIds,
    ),
    loadTripTravelerIdsForTrips(
      database,
      tripIds,
    ),
  ]);

  return rows.map((row) =>
    mapTripRow(
      row,
      destinationsByTrip.get(row.id) ?? [],
      travelersByTrip.get(row.id) ?? [],
    ),
  );
}

export async function loadTripList(
  database: DatabaseConnection,
): Promise<Trip[]> {
  const rows = await database.query<TripRow>(`
    SELECT *
    FROM trips
    ORDER BY start_date ASC;
  `);

  return hydrateTripRows(database, rows);
}

export async function loadTripById(
  database: DatabaseConnection,
  id: TripId,
): Promise<Trip | null> {
  const row =
    await database.queryFirst<TripRow>(
      `
        SELECT *
        FROM trips
        WHERE id = ?;
      `,
      [id],
    );

  if (!row) {
    return null;
  }

  const [trip] = await hydrateTripRows(
    database,
    [row],
  );

  return trip ?? null;
}
