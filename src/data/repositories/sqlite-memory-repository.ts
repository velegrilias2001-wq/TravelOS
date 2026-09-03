import type { Database } from '../database/database';
import { travelOSDatabase } from '../database/expo-sqlite-database';

import type {
    Memory,
    MemoryId,
    MemoryType,
} from '../../domain/entities/memory';

import type { TripId } from '../../domain/entities/trip';
import type { MemoryRepository } from '../../domain/repositories/memory-repository';

interface MemoryRow {
  id: string;
  trip_id: string;
  day_id: string | null;
  stop_id: string | null;
  type: string;
  title: string | null;
  caption: string | null;
  media_uri: string | null;
  captured_at: string;
  created_at: string;
  updated_at: string;
}

function mapMemory(row: MemoryRow): Memory {
  return {
    id: row.id,
    tripId: row.trip_id,
    dayId: row.day_id ?? undefined,
    stopId: row.stop_id ?? undefined,
    type: row.type as MemoryType,
    title: row.title ?? undefined,
    caption: row.caption ?? undefined,
    mediaUri: row.media_uri ?? undefined,
    capturedAt: row.captured_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SQLiteMemoryRepository implements MemoryRepository {
  constructor(
    private readonly database: Database = travelOSDatabase,
  ) {}

  async getByTripId(tripId: TripId): Promise<Memory[]> {
    return this.getByTripIds([tripId]);
  }

  async getByTripIds(
    tripIds: readonly TripId[],
  ): Promise<Memory[]> {
    if (tripIds.length === 0) {
      return [];
    }

    const placeholders = Array.from(
      { length: tripIds.length },
      () => '?',
    ).join(', ');
    const rows = await this.database.query<MemoryRow>(
      `
        SELECT *
        FROM memories
        WHERE trip_id IN (${placeholders})
        ORDER BY
          trip_id ASC,
          captured_at ASC,
          id ASC;
      `,
      [...tripIds],
    );

    return rows.map(mapMemory);
  }

  async getById(id: MemoryId): Promise<Memory | null> {
    const row = await this.database.queryFirst<MemoryRow>(
      `SELECT * FROM memories WHERE id = ?;`,
      [id],
    );

    return row ? mapMemory(row) : null;
  }

  async save(memory: Memory): Promise<void> {
    await this.database.execute(
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

  async delete(id: MemoryId): Promise<void> {
    await this.database.execute(
      `DELETE FROM memories WHERE id = ?;`,
      [id],
    );
  }
}

export const memoryRepository =
  new SQLiteMemoryRepository();