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
  name: string;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  currency_code: string | null;
}

function optional<T>(
  value: T | null,
): T | undefined {
  return value ?? undefined;
}

export async function loadTripDestinations(
  database: DatabaseConnection,
  tripId: TripId,
): Promise<TripDestination[]> {
  const rows = await database.query<DestinationRow>(
    `
      SELECT
        id,
        name,
        country_code,
        latitude,
        longitude,
        timezone,
        currency_code
      FROM trip_destinations
      WHERE trip_id = ?
      ORDER BY position ASC;
    `,
    [tripId],
  );

  return rows.map((destination) => ({
    id: destination.id,
    name: destination.name,
    countryCode: optional(
      destination.country_code,
    ),
    latitude: optional(destination.latitude),
    longitude: optional(destination.longitude),
    timezone: optional(destination.timezone),
    currencyCode: optional(
      destination.currency_code,
    ),
  }));
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
          currency_code,
          position
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          country_code = excluded.country_code,
          latitude = excluded.latitude,
          longitude = excluded.longitude,
          timezone = excluded.timezone,
          currency_code = excluded.currency_code,
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
        destination.currencyCode ?? null,
        position,
      ],
    );
  }
}
