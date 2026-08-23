import type { SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_SCHEMA } from './schema';

export const DATABASE_VERSION = 4;

interface UserVersionRow {
  user_version: number;
}

interface TableInfoRow {
  name: string;
}

interface MigrationTripDayRow {
  id: string;
  trip_id: string;
  date: string;
  day_number: number;
  title: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  reference_count: number;
}

interface MigrationStopRow {
  id: string;
  day_id: string;
}

async function ensureAccommodationStopLink(
  db: SQLiteDatabase,
): Promise<void> {
  const columns =
    await db.getAllAsync<TableInfoRow>(
      'PRAGMA table_info(accommodations);',
    );

  const hasStopId = columns.some(
    (column) =>
      column.name === 'stop_id',
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
    CREATE INDEX IF NOT EXISTS
      idx_accommodations_stop_id
    ON accommodations(stop_id);
  `);
}

async function archiveDuplicateTripDays(
  db: SQLiteDatabase,
): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS
      migration_v3_trip_day_duplicates (
        id TEXT PRIMARY KEY NOT NULL,
        trip_id TEXT NOT NULL,
        date TEXT NOT NULL,
        day_number INTEGER NOT NULL,
        title TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        kept_day_id TEXT NOT NULL,
        archived_at TEXT NOT NULL
      );

    CREATE INDEX IF NOT EXISTS
      idx_migration_v3_trip_day_duplicates_trip_id
    ON migration_v3_trip_day_duplicates(trip_id);
  `);

  const rows =
    await db.getAllAsync<MigrationTripDayRow>(
      `
        SELECT
          d.*,
          (
            (
              SELECT COUNT(*)
              FROM trip_stops s
              WHERE s.day_id = d.id
            ) +
            (
              SELECT COUNT(*)
              FROM memories m
              WHERE m.day_id = d.id
            ) +
            (
              SELECT COUNT(*)
              FROM trip_runtime_states r
              WHERE r.current_day_id = d.id
            )
          ) AS reference_count
        FROM trip_days d
        ORDER BY
          d.trip_id ASC,
          d.date ASC,
          reference_count DESC,
          CASE
            WHEN
              d.title IS NOT NULL OR
              d.notes IS NOT NULL
            THEN 0
            ELSE 1
          END ASC,
          d.created_at ASC,
          d.id ASC;
      `,
    );

  const keeperByTripDate =
    new Map<string, string>();

  const archivedAt =
    new Date().toISOString();

  for (const row of rows) {
    const key =
      row.trip_id +
      '\u0000' +
      row.date;

    const keeperId =
      keeperByTripDate.get(key);

    if (!keeperId) {
      keeperByTripDate.set(
        key,
        row.id,
      );

      continue;
    }

    await db.runAsync(
      `
        INSERT INTO
          migration_v3_trip_day_duplicates (
            id,
            trip_id,
            date,
            day_number,
            title,
            notes,
            created_at,
            updated_at,
            kept_day_id,
            archived_at
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          kept_day_id =
            excluded.kept_day_id,
          archived_at =
            excluded.archived_at;
      `,
      [
        row.id,
        row.trip_id,
        row.date,
        row.day_number,
        row.title,
        row.notes,
        row.created_at,
        row.updated_at,
        keeperId,
        archivedAt,
      ],
    );

    await db.runAsync(
      `
        UPDATE trip_stops
        SET day_id = ?
        WHERE day_id = ?;
      `,
      [keeperId, row.id],
    );

    await db.runAsync(
      `
        UPDATE memories
        SET day_id = ?
        WHERE day_id = ?;
      `,
      [keeperId, row.id],
    );

    await db.runAsync(
      `
        UPDATE trip_runtime_states
        SET current_day_id = ?
        WHERE current_day_id = ?;
      `,
      [keeperId, row.id],
    );

    await db.runAsync(
      `
        DELETE FROM trip_days
        WHERE id = ?;
      `,
      [row.id],
    );
  }
}

async function normalizeTripDayNumbers(
  db: SQLiteDatabase,
): Promise<void> {
  const rows =
    await db.getAllAsync<MigrationTripDayRow>(
      `
        SELECT
          d.*,
          0 AS reference_count
        FROM trip_days d
        ORDER BY
          d.trip_id ASC,
          d.date ASC,
          d.created_at ASC,
          d.id ASC;
      `,
    );

  await db.execAsync(`
    UPDATE trip_days
    SET day_number = -rowid;
  `);

  let currentTripId: string | null =
    null;

  let dayNumber = 0;

  for (const row of rows) {
    if (row.trip_id !== currentTripId) {
      currentTripId = row.trip_id;
      dayNumber = 0;
    }

    dayNumber += 1;

    await db.runAsync(
      `
        UPDATE trip_days
        SET day_number = ?
        WHERE id = ?;
      `,
      [dayNumber, row.id],
    );
  }
}

async function normalizeStopPositions(
  db: SQLiteDatabase,
): Promise<void> {
  const rows =
    await db.getAllAsync<MigrationStopRow>(
      `
        SELECT
          id,
          day_id
        FROM trip_stops
        ORDER BY
          day_id ASC,
          position ASC,
          created_at ASC,
          id ASC;
      `,
    );

  await db.execAsync(`
    UPDATE trip_stops
    SET position = -rowid;
  `);

  let currentDayId: string | null =
    null;

  let position = 0;

  for (const row of rows) {
    if (row.day_id !== currentDayId) {
      currentDayId = row.day_id;
      position = 0;
    }

    position += 1;

    await db.runAsync(
      `
        UPDATE trip_stops
        SET position = ?
        WHERE id = ?;
      `,
      [position, row.id],
    );
  }
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

  /**
   * Version 3
   * Reconcile the version-2 schema drift and install
   * safe ordering/date invariants.
   *
   * Duplicate TripDay records are archived before
   * their references are consolidated. Stop content
   * and IDs are preserved while positions normalize.
   */
  if (currentVersion < 3) {
    await db.withExclusiveTransactionAsync(
      async (transaction) => {
        await ensureAccommodationStopLink(
          transaction,
        );

        await archiveDuplicateTripDays(
          transaction,
        );

        await normalizeTripDayNumbers(
          transaction,
        );

        await normalizeStopPositions(
          transaction,
        );

        await transaction.execAsync(`
          CREATE UNIQUE INDEX IF NOT EXISTS
            ux_trip_days_trip_date
          ON trip_days(trip_id, date);

          CREATE UNIQUE INDEX IF NOT EXISTS
            ux_trip_days_trip_day_number
          ON trip_days(trip_id, day_number);

          CREATE UNIQUE INDEX IF NOT EXISTS
            ux_trip_stops_day_position
          ON trip_stops(day_id, position);

          CREATE INDEX IF NOT EXISTS
            idx_trip_destinations_trip_position
          ON trip_destinations(trip_id, position);

          CREATE INDEX IF NOT EXISTS
            idx_bookings_stop_id
          ON bookings(stop_id);

          CREATE INDEX IF NOT EXISTS
            idx_accommodations_trip_id
          ON accommodations(trip_id);

          CREATE INDEX IF NOT EXISTS
            idx_accommodations_booking_id
          ON accommodations(booking_id);

          CREATE INDEX IF NOT EXISTS
            idx_budget_items_budget_id
          ON budget_items(budget_id);

          PRAGMA user_version = 3;
        `);
      },
    );
  }

  /**
   * Version 4
   * Persist the user-selected expense date without
   * fabricating dates for existing BudgetItem records.
   */
  if (currentVersion < 4) {
    await db.withExclusiveTransactionAsync(
      async (transaction) => {
        const columns =
          await transaction.getAllAsync<TableInfoRow>(
            'PRAGMA table_info(budget_items);',
          );

        const hasExpenseDate = columns.some(
          (column) =>
            column.name === 'expense_date',
        );

        if (!hasExpenseDate) {
          await transaction.execAsync(`
            ALTER TABLE budget_items
            ADD COLUMN expense_date TEXT;
          `);
        }

        await transaction.execAsync(`
          CREATE INDEX IF NOT EXISTS
            idx_budget_items_trip_expense_date
          ON budget_items(trip_id, expense_date);

          CREATE INDEX IF NOT EXISTS
            idx_budget_items_booking_id
          ON budget_items(booking_id);

          CREATE INDEX IF NOT EXISTS
            idx_budget_items_stop_id
          ON budget_items(stop_id);

          PRAGMA user_version = 4;
        `);
      },
    );
  }
}
