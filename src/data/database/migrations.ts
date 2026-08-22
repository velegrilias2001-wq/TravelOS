import type { SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_SCHEMA } from './schema';

export const DATABASE_VERSION = 2;

interface UserVersionRow {
  user_version: number;
}

interface TableInfoRow {
  name: string;
}

export async function migrateDatabase(
  db: SQLiteDatabase,
): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  const versionRow =
    await db.getFirstAsync<UserVersionRow>(
      'PRAGMA user_version',
    );

  let currentVersion =
    versionRow?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  /**
   * Version 1
   * Initial TravelOS database.
   *
   * CREATE TABLE IF NOT EXISTS also makes this safe
   * for the database created before versioning existed.
   */
  if (currentVersion < 1) {
    await db.execAsync(DATABASE_SCHEMA);

    currentVersion = 1;

    await db.execAsync(
      'PRAGMA user_version = 1;',
    );
  }

  /**
   * Version 2
   * Link accommodations directly to itinerary stops.
   */
  if (currentVersion < 2) {
    const columns =
      await db.getAllAsync<TableInfoRow>(
        'PRAGMA table_info(accommodations);',
      );

    const hasStopId = columns.some(
      (column) => column.name === 'stop_id',
    );

    if (!hasStopId) {
      await db.execAsync(`
        ALTER TABLE accommodations
        ADD COLUMN stop_id TEXT
        REFERENCES trip_stops(id)
        ON DELETE SET NULL;
      `);
    }

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_accommodations_stop_id
      ON accommodations(stop_id);

      PRAGMA user_version = 2;
    `);
  }
}