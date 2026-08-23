import type {
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
