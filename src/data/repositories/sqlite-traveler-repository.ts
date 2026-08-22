import type { Database } from '../database/database';
import { travelOSDatabase } from '../database/expo-sqlite-database';

import type {
    Traveler,
    TravelerId,
    TravelerType,
} from '../../domain/entities/traveler';

import type { TripId } from '../../domain/entities/trip';
import type { TravelerRepository } from '../../domain/repositories/traveler-repository';

interface TravelerRow {
  id: string;
  first_name: string;
  last_name: string | null;
  type: string;
  email: string | null;
  phone: string | null;
  avatar_uri: string | null;
  created_at: string;
  updated_at: string;
}

function mapTraveler(row: TravelerRow): Traveler {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name ?? undefined,
    type: row.type as TravelerType,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    avatarUri: row.avatar_uri ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SQLiteTravelerRepository
  implements TravelerRepository
{
  constructor(
    private readonly database: Database = travelOSDatabase,
  ) {}

  async getById(id: TravelerId): Promise<Traveler | null> {
    const row = await this.database.queryFirst<TravelerRow>(
      `SELECT * FROM travelers WHERE id = ?;`,
      [id],
    );

    return row ? mapTraveler(row) : null;
  }

  async getByTripId(tripId: TripId): Promise<Traveler[]> {
    const rows = await this.database.query<TravelerRow>(
      `
        SELECT t.*
        FROM travelers t
        INNER JOIN trip_travelers tt
          ON tt.traveler_id = t.id
        WHERE tt.trip_id = ?
        ORDER BY t.first_name ASC;
      `,
      [tripId],
    );

    return rows.map(mapTraveler);
  }

  async save(traveler: Traveler): Promise<void> {
    await this.database.execute(
      `
        INSERT INTO travelers (
          id, first_name, last_name, type,
          email, phone, avatar_uri,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          first_name = excluded.first_name,
          last_name = excluded.last_name,
          type = excluded.type,
          email = excluded.email,
          phone = excluded.phone,
          avatar_uri = excluded.avatar_uri,
          updated_at = excluded.updated_at;
      `,
      [
        traveler.id,
        traveler.firstName,
        traveler.lastName ?? null,
        traveler.type,
        traveler.email ?? null,
        traveler.phone ?? null,
        traveler.avatarUri ?? null,
        traveler.createdAt,
        traveler.updatedAt,
      ],
    );
  }

  async delete(id: TravelerId): Promise<void> {
    await this.database.execute(
      `DELETE FROM travelers WHERE id = ?;`,
      [id],
    );
  }
}

export const travelerRepository =
  new SQLiteTravelerRepository();