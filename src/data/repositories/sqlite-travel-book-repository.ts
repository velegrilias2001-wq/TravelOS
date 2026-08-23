import type { Database } from '../database/database';
import { travelOSDatabase } from '../database/expo-sqlite-database';

import type { TripId } from '../../domain/entities/trip';

import type {
    TravelBook,
    TravelBookId,
} from '../../domain/entities/travel-book';

import type { TravelBookRepository } from '../../domain/repositories/travel-book-repository';

interface TravelBookRow {
  id: string;
  trip_id: string;
  title: string;
  cover_image_uri: string | null;
  summary: string | null;
  is_published: number;
  created_at: string;
  updated_at: string;
}

interface MemoryLinkRow {
  memory_id: string;
}

export class SQLiteTravelBookRepository
  implements TravelBookRepository
{
  constructor(
    private readonly database: Database = travelOSDatabase,
  ) {}

  private async hydrate(row: TravelBookRow): Promise<TravelBook> {
    const memoryRows =
      await this.database.query<MemoryLinkRow>(
        `
          SELECT memory_id
          FROM travel_book_memories
          WHERE travel_book_id = ?
          ORDER BY position ASC;
        `,
        [row.id],
      );

    return {
      id: row.id,
      tripId: row.trip_id,
      title: row.title,
      coverImageUri: row.cover_image_uri ?? undefined,
      memoryIds: memoryRows.map((item) => item.memory_id),
      summary: row.summary ?? undefined,
      isPublished: row.is_published === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getById(
    id: TravelBookId,
  ): Promise<TravelBook | null> {
    const row =
      await this.database.queryFirst<TravelBookRow>(
        `SELECT * FROM travel_books WHERE id = ?;`,
        [id],
      );

    return row ? this.hydrate(row) : null;
  }

  async getByTripId(
    tripId: TripId,
  ): Promise<TravelBook | null> {
    const row =
      await this.database.queryFirst<TravelBookRow>(
        `SELECT * FROM travel_books WHERE trip_id = ?;`,
        [tripId],
      );

    return row ? this.hydrate(row) : null;
  }

  async save(book: TravelBook): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await transaction.execute(
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

      await transaction.execute(
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
        const memoryId = book.memoryIds[position];

        await transaction.execute(
          `
            INSERT INTO travel_book_memories (
              travel_book_id,
              memory_id,
              position
            )
            VALUES (?, ?, ?);
          `,
          [book.id, memoryId, position],
        );
      }
    });
  }

  async delete(id: TravelBookId): Promise<void> {
    await this.database.execute(
      `DELETE FROM travel_books WHERE id = ?;`,
      [id],
    );
  }
}

export const travelBookRepository =
  new SQLiteTravelBookRepository();
