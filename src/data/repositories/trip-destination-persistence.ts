import type {
  Trip,
  TripDestination,
  TripId,
} from '../../domain/entities';
import type {
  DatabaseConnection,
} from '../database/database';

interface DestinationRow {
  id: string;
  trip_id: string;
  name: string;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  timezone_source: string | null;
  currency_code: string | null;
  place_id: string | null;
}

function optional<T>(
  value: T | null,
): T | undefined {
  return value ?? undefined;
}

function sqlPlaceholders(
  count: number,
): string {
  return Array.from(
    { length: count },
    () => '?',
  ).join(', ');
}

function mapDestinationRow(
  destination: DestinationRow,
): TripDestination {
  return {
    id: destination.id,
    name: destination.name,
    countryCode: optional(
      destination.country_code,
    ),
    latitude: optional(destination.latitude),
    longitude: optional(destination.longitude),
    timezone: optional(destination.timezone),
    timezoneSource:
      destination.timezone_source === 'provider' ||
      destination.timezone_source === 'catalogue' ||
      destination.timezone_source === 'traveler'
        ? destination.timezone_source
        : undefined,
    currencyCode: optional(
      destination.currency_code,
    ),
    placeId: optional(destination.place_id),
  };
}

export async function loadTripDestinationsForTrips(
  database: DatabaseConnection,
  tripIds: readonly TripId[],
): Promise<Map<TripId, TripDestination[]>> {
  const destinationsByTrip = new Map<
    TripId,
    TripDestination[]
  >();

  if (tripIds.length === 0) {
    return destinationsByTrip;
  }

  const rows = await database.query<DestinationRow>(
    `
      SELECT
        id,
        trip_id,
        name,
        country_code,
        latitude,
        longitude,
        timezone,
        timezone_source,
        currency_code,
        place_id
      FROM trip_destinations
      WHERE trip_id IN (${sqlPlaceholders(tripIds.length)})
      ORDER BY
        trip_id ASC,
        position ASC;
    `,
    [...tripIds],
  );

  for (const row of rows) {
    const destination = mapDestinationRow(row);
    const current =
      destinationsByTrip.get(row.trip_id);

    if (current) {
      current.push(destination);
      continue;
    }

    destinationsByTrip.set(row.trip_id, [
      destination,
    ]);
  }

  return destinationsByTrip;
}

export async function loadTripDestinations(
  database: DatabaseConnection,
  tripId: TripId,
): Promise<TripDestination[]> {
  const destinationsByTrip =
    await loadTripDestinationsForTrips(
      database,
      [tripId],
    );

  return destinationsByTrip.get(tripId) ?? [];
}

export async function saveTripDestinations(
  connection: DatabaseConnection,
  trip: Trip,
): Promise<void> {
  const existing = await connection.query<{
    id: string;
  }>(
    `
      SELECT id
      FROM trip_destinations
      WHERE trip_id = ?;
    `,
    [trip.id],
  );

  const nextIds = new Set(
    trip.destinations.map(
      (destination) => destination.id,
    ),
  );

  for (const row of existing) {
    if (nextIds.has(row.id)) {
      continue;
    }

    await connection.execute(
      `
        UPDATE trip_days
        SET destination_id = NULL
        WHERE
          destination_id = ? AND
          trip_id = ?;
      `,
      [row.id, trip.id],
    );

    await connection.execute(
      `
        DELETE FROM trip_destinations
        WHERE
          id = ? AND
          trip_id = ?;
      `,
      [row.id, trip.id],
    );
  }

  for (
    let position = 0;
    position < trip.destinations.length;
    position += 1
  ) {
    const destination =
      trip.destinations[position];

    await connection.execute(
      `
        INSERT INTO trip_destinations (
          id,
          trip_id,
          name,
          country_code,
          latitude,
          longitude,
          timezone,
          timezone_source,
          currency_code,
          place_id,
          position
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          country_code = excluded.country_code,
          latitude = excluded.latitude,
          longitude = excluded.longitude,
          timezone = excluded.timezone,
          timezone_source = excluded.timezone_source,
          currency_code = excluded.currency_code,
          place_id = excluded.place_id,
          position = excluded.position
        WHERE
          trip_destinations.trip_id =
            excluded.trip_id;
      `,
      [
        destination.id,
        trip.id,
        destination.name,
        destination.countryCode ?? null,
        destination.latitude ?? null,
        destination.longitude ?? null,
        destination.timezone ?? null,
        destination.timezoneSource ?? null,
        destination.currencyCode ?? null,
        destination.placeId ?? null,
        position,
      ],
    );
  }
}
