import type {
  Trip,
  TripDay,
  TripDestination,
  TripId,
  TripIntent,
  TripOrigin,
  TripPace,
  TripPartyType,
  TripStatus,
  DestinationTimezoneSource,
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
  theme_pack_id: string | null;
  party_type: string | null;
  party_size: number | null;
  origin_name: string | null;
  origin_country_code: string | null;
  origin_latitude: number | null;
  origin_longitude: number | null;
  origin_timezone: string | null;
  origin_timezone_source: string | null;
  origin_place_id: string | null;
  origin_currency_code: string | null;
  created_at: string;
  updated_at: string;
}

interface TravelerLinkRow {
  trip_id: string;
  traveler_id: string;
  role: string | null;
}

interface TripDayRow {
  id: string;
  trip_id: string;
  date: string;
  day_number: number;
  title: string | null;
  notes: string | null;
  destination_id: string | null;
  created_at: string;
  updated_at: string;
}

function sqlPlaceholders(
  count: number,
): string {
  return Array.from(
    { length: count },
    () => '?',
  ).join(', ');
}

function mapTripOrigin(
  row: TripRow,
): TripOrigin | undefined {
  const name = row.origin_name?.trim();

  if (!name) {
    return undefined;
  }

  return {
    name,
    countryCode: row.origin_country_code ?? undefined,
    latitude:
      typeof row.origin_latitude === 'number'
        ? row.origin_latitude
        : undefined,
    longitude:
      typeof row.origin_longitude === 'number'
        ? row.origin_longitude
        : undefined,
    timezone: row.origin_timezone ?? undefined,
    timezoneSource:
      (row.origin_timezone_source as
        | DestinationTimezoneSource
        | null) ?? undefined,
    placeId: row.origin_place_id ?? undefined,
    currencyCode:
      row.origin_currency_code ?? undefined,
  };
}

function mapTripRow(
  row: TripRow,
  destinations: TripDestination[],
  travelerIds: string[],
  ownerTravelerId?: string,
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
    ownerTravelerId,
    accountingCurrency:
      row.accounting_currency,
    themePackId: row.theme_pack_id ?? undefined,
    partyType:
      (row.party_type as TripPartyType | null) ??
      undefined,
    partySize:
      typeof row.party_size === 'number'
        ? row.party_size
        : undefined,
    origin: mapTripOrigin(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadTripTravelerIdsForTrips(
  database: DatabaseConnection,
  tripIds: readonly TripId[],
): Promise<{
  travelersByTrip: Map<TripId, string[]>;
  ownersByTrip: Map<TripId, string>;
}> {
  const travelersByTrip = new Map<
    TripId,
    string[]
  >();
  const ownersByTrip = new Map<TripId, string>();

  if (tripIds.length === 0) {
    return { travelersByTrip, ownersByTrip };
  }

  const rows =
    await database.query<TravelerLinkRow>(
      `
        SELECT
          trip_id,
          traveler_id,
          role
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
    } else {
      travelersByTrip.set(
        row.trip_id,
        [row.traveler_id],
      );
    }

    if (row.role === 'owner') {
      ownersByTrip.set(row.trip_id, row.traveler_id);
    }
  }

  return { travelersByTrip, ownersByTrip };
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
    memberships,
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
      memberships.travelersByTrip.get(row.id) ?? [],
      memberships.ownersByTrip.get(row.id),
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

function mapTripDay(row: TripDayRow): TripDay {
  return {
    id: row.id,
    tripId: row.trip_id,
    date: row.date,
    dayNumber: row.day_number,
    title: row.title ?? undefined,
    notes: row.notes ?? undefined,
    destinationId: row.destination_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadTripDaysForTrips(
  database: DatabaseConnection,
  tripIds: readonly TripId[],
): Promise<TripDay[]> {
  if (tripIds.length === 0) {
    return [];
  }

  const rows = await database.query<TripDayRow>(
    `
      SELECT
        id,
        trip_id,
        date,
        day_number,
        title,
        notes,
        destination_id,
        created_at,
        updated_at
      FROM trip_days
      WHERE trip_id IN (${sqlPlaceholders(tripIds.length)})
      ORDER BY
        trip_id ASC,
        day_number ASC,
        date ASC,
        id ASC;
    `,
    [...tripIds],
  );

  return rows.map(mapTripDay);
}
