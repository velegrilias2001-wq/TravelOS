import type { Database } from '../database/database';

import type {
  Accommodation,
  AccommodationId,
  AccommodationType,
  BookingId,
  TripId,
  TripStopId,
} from '../../domain/entities';

interface AccommodationRow {
  id: string;
  trip_id: string;
  stop_id: string | null;
  booking_id: string | null;
  name: string;
  type: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  check_in_at: string | null;
  check_out_at: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapAccommodation(
  row: AccommodationRow,
): Accommodation {
  return {
    id: row.id,
    tripId: row.trip_id,
    stopId: row.stop_id ?? undefined,
    bookingId: row.booking_id ?? undefined,
    name: row.name,
    type: row.type as AccommodationType,
    address: row.address ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    checkInAt: row.check_in_at ?? undefined,
    checkOutAt: row.check_out_at ?? undefined,
    phone: row.phone ?? undefined,
    website: row.website ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAccommodationById(
  database: Database,
  id: AccommodationId,
): Promise<Accommodation | null> {
  const row =
    await database.queryFirst<AccommodationRow>(
      `
        SELECT *
        FROM accommodations
        WHERE id = ?;
      `,
      [id],
    );

  return row ? mapAccommodation(row) : null;
}

export async function getAccommodationsByTripId(
  database: Database,
  tripId: TripId,
): Promise<Accommodation[]> {
  const rows =
    await database.query<AccommodationRow>(
      `
        SELECT *
        FROM accommodations
        WHERE trip_id = ?
        ORDER BY
          CASE
            WHEN check_in_at IS NULL THEN 1
            ELSE 0
          END,
          check_in_at ASC,
          created_at ASC,
          id ASC;
      `,
      [tripId],
    );

  return rows.map(mapAccommodation);
}

export async function getAccommodationsByBookingId(
  database: Database,
  bookingId: BookingId,
): Promise<Accommodation[]> {
  const rows =
    await database.query<AccommodationRow>(
      `
        SELECT *
        FROM accommodations
        WHERE booking_id = ?
        ORDER BY
          CASE
            WHEN check_in_at IS NULL THEN 1
            ELSE 0
          END,
          check_in_at ASC,
          created_at ASC,
          id ASC;
      `,
      [bookingId],
    );

  return rows.map(mapAccommodation);
}

export async function getAccommodationsByStopId(
  database: Database,
  stopId: TripStopId,
): Promise<Accommodation[]> {
  const rows =
    await database.query<AccommodationRow>(
      `
        SELECT *
        FROM accommodations
        WHERE stop_id = ?
        ORDER BY
          CASE
            WHEN check_in_at IS NULL THEN 1
            ELSE 0
          END,
          check_in_at ASC,
          created_at ASC,
          id ASC;
      `,
      [stopId],
    );

  return rows.map(mapAccommodation);
}

export async function saveCanonicalAccommodation(
  database: Database,
  accommodation: Accommodation,
): Promise<void> {
  await database.transaction(
    async (transaction) => {
      if (accommodation.bookingId) {
        const booking =
          await transaction.queryFirst<{
            id: string;
          }>(
            `
              SELECT id
              FROM bookings
              WHERE id = ? AND trip_id = ?;
            `,
            [
              accommodation.bookingId,
              accommodation.tripId,
            ],
          );

        if (!booking) {
          throw new Error(
            'Accommodation booking must belong to the same trip',
          );
        }
      }

      if (accommodation.stopId) {
        const stop =
          await transaction.queryFirst<{
            id: string;
          }>(
            `
              SELECT id
              FROM trip_stops
              WHERE id = ? AND trip_id = ?;
            `,
            [
              accommodation.stopId,
              accommodation.tripId,
            ],
          );

        if (!stop) {
          throw new Error(
            'Accommodation stop must belong to the same trip',
          );
        }
      }

      await transaction.execute(
        `
          INSERT INTO accommodations (
            id,
            trip_id,
            stop_id,
            booking_id,
            name,
            type,
            address,
            latitude,
            longitude,
            check_in_at,
            check_out_at,
            phone,
            website,
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
            stop_id = excluded.stop_id,
            booking_id = excluded.booking_id,
            name = excluded.name,
            type = excluded.type,
            address = excluded.address,
            latitude = excluded.latitude,
            longitude = excluded.longitude,
            check_in_at = excluded.check_in_at,
            check_out_at = excluded.check_out_at,
            phone = excluded.phone,
            website = excluded.website,
            notes = excluded.notes,
            updated_at = excluded.updated_at;
        `,
        [
          accommodation.id,
          accommodation.tripId,
          accommodation.stopId ?? null,
          accommodation.bookingId ?? null,
          accommodation.name,
          accommodation.type,
          accommodation.address ?? null,
          accommodation.latitude ?? null,
          accommodation.longitude ?? null,
          accommodation.checkInAt ?? null,
          accommodation.checkOutAt ?? null,
          accommodation.phone ?? null,
          accommodation.website ?? null,
          accommodation.notes ?? null,
          accommodation.createdAt,
          accommodation.updatedAt,
        ],
      );
    },
  );
}

export async function deleteCanonicalAccommodation(
  database: Database,
  id: AccommodationId,
): Promise<void> {
  await database.execute(
    'DELETE FROM accommodations WHERE id = ?;',
    [id],
  );
}
