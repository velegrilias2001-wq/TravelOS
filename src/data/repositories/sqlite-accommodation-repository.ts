import type { Database } from '../database/database';
import { travelOSDatabase } from '../database/expo-sqlite-database';

import type {
    Accommodation,
    AccommodationId,
    AccommodationType,
} from '../../domain/entities/accommodation';

import type { TripId } from '../../domain/entities/trip';
import type { AccommodationRepository } from '../../domain/repositories/accommodation-repository';

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

export class SQLiteAccommodationRepository
  implements AccommodationRepository
{
  constructor(
    private readonly database: Database = travelOSDatabase,
  ) {}

  async getById(
    id: AccommodationId,
  ): Promise<Accommodation | null> {
    const row =
      await this.database.queryFirst<AccommodationRow>(
        `SELECT * FROM accommodations WHERE id = ?;`,
        [id],
      );

    return row ? mapAccommodation(row) : null;
  }

  async getByTripId(
    tripId: TripId,
  ): Promise<Accommodation[]> {
    const rows =
      await this.database.query<AccommodationRow>(
        `
          SELECT *
          FROM accommodations
          WHERE trip_id = ?
          ORDER BY check_in_at ASC;
        `,
        [tripId],
      );

    return rows.map(mapAccommodation);
  }

  async save(accommodation: Accommodation): Promise<void> {
    await this.database.execute(
      `
        INSERT INTO accommodations (
          id, trip_id, stop_id, booking_id,
          name, type, address, latitude, longitude,
          check_in_at, check_out_at,
          phone, website, notes,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
  }

  async delete(id: AccommodationId): Promise<void> {
    await this.database.execute(
      `DELETE FROM accommodations WHERE id = ?;`,
      [id],
    );
  }
}

export const accommodationRepository =
  new SQLiteAccommodationRepository();