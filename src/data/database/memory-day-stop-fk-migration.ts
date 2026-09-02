import type { SQLiteDatabase } from 'expo-sqlite';

import {
  dropMemoryRelationshipGuards,
  installMemoryRelationshipGuards,
} from './memory-integrity-migration';

interface ForeignKeyListRow {
  from: string;
}

interface TableInfoRow {
  name: string;
}

/**
 * Migration v15 helper.
 *
 * Memory day and stop IDs are optional. When present they
 * must point at real itinerary rows. Deleting a linked
 * TripDay or TripStop must unlink the Memory rather than
 * delete it. Same-trip ownership stays in the v7 triggers.
 *
 * Historical databases created memories without those
 * declared foreign keys. This rebuilds the table when
 * they are missing. Travel Book memberships are copied
 * first so dropping memories does not lose them.
 */
export async function installMemoryDayStopForeignKeys(
  db: SQLiteDatabase,
): Promise<void> {
  const columns =
    await db.getAllAsync<TableInfoRow>(
      'PRAGMA table_info(memories);',
    );

  if (columns.length === 0) {
    return;
  }

  await db.execAsync(`
    UPDATE memories
    SET day_id = NULL
    WHERE
      day_id IS NOT NULL AND
      NOT EXISTS (
        SELECT 1
        FROM trip_days d
        WHERE d.id = memories.day_id
      );

    UPDATE memories
    SET stop_id = NULL
    WHERE
      stop_id IS NOT NULL AND
      NOT EXISTS (
        SELECT 1
        FROM trip_stops s
        WHERE s.id = memories.stop_id
      );
  `);

  const foreignKeys =
    await db.getAllAsync<ForeignKeyListRow>(
      'PRAGMA foreign_key_list(memories);',
    );

  const hasDayForeignKey = foreignKeys.some(
    (key) => key.from === 'day_id',
  );
  const hasStopForeignKey = foreignKeys.some(
    (key) => key.from === 'stop_id',
  );

  if (!hasDayForeignKey || !hasStopForeignKey) {
    await rebuildMemoriesWithDayStopForeignKeys(db);
  }

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_memories_trip_id
    ON memories(trip_id);
  `);

  await installMemoryRelationshipGuards(db);
}

async function rebuildMemoriesWithDayStopForeignKeys(
  db: SQLiteDatabase,
): Promise<void> {
  const membershipColumns =
    await db.getAllAsync<TableInfoRow>(
      'PRAGMA table_info(travel_book_memories);',
    );

  await dropMemoryRelationshipGuards(db);

  await db.execAsync(`
    CREATE TABLE memories_v15 (
      id TEXT PRIMARY KEY NOT NULL,
      trip_id TEXT NOT NULL,
      day_id TEXT,
      stop_id TEXT,
      type TEXT NOT NULL,
      title TEXT,
      caption TEXT,
      media_uri TEXT,
      captured_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (trip_id)
        REFERENCES trips(id)
        ON DELETE CASCADE,
      FOREIGN KEY (day_id)
        REFERENCES trip_days(id)
        ON DELETE SET NULL,
      FOREIGN KEY (stop_id)
        REFERENCES trip_stops(id)
        ON DELETE SET NULL
    );

    INSERT INTO memories_v15 (
      id,
      trip_id,
      day_id,
      stop_id,
      type,
      title,
      caption,
      media_uri,
      captured_at,
      created_at,
      updated_at
    )
    SELECT
      id,
      trip_id,
      day_id,
      stop_id,
      type,
      title,
      caption,
      media_uri,
      captured_at,
      created_at,
      updated_at
    FROM memories;
  `);

  if (membershipColumns.length > 0) {
    await db.execAsync(`
      CREATE TABLE travel_book_memories_v15 (
        travel_book_id TEXT NOT NULL,
        memory_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        PRIMARY KEY (travel_book_id, memory_id),
        FOREIGN KEY (travel_book_id)
          REFERENCES travel_books(id)
          ON DELETE CASCADE,
        FOREIGN KEY (memory_id)
          REFERENCES memories_v15(id)
          ON DELETE CASCADE
      );

      INSERT INTO travel_book_memories_v15 (
        travel_book_id,
        memory_id,
        position
      )
      SELECT
        travel_book_id,
        memory_id,
        position
      FROM travel_book_memories
      WHERE EXISTS (
        SELECT 1
        FROM memories_v15 m
        WHERE m.id = travel_book_memories.memory_id
      )
      AND EXISTS (
        SELECT 1
        FROM travel_books tb
        WHERE tb.id = travel_book_memories.travel_book_id
      );

      DROP TABLE travel_book_memories;
    `);
  }

  await db.execAsync(`
    DROP TABLE memories;

    ALTER TABLE memories_v15
    RENAME TO memories;
  `);

  if (membershipColumns.length > 0) {
    await db.execAsync(`
      ALTER TABLE travel_book_memories_v15
      RENAME TO travel_book_memories;
    `);
  }
}
