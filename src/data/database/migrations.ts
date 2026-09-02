import type { SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_SCHEMA } from './schema';

import {
  reconcileMemoryRelationships,
} from './memory-integrity-migration';

export const DATABASE_VERSION = 12;

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

interface InvalidBookingStopLinkRow {
  booking_id: string;
  booking_trip_id: string;
  stop_id: string;
  stop_trip_id: string | null;
}

interface InvalidAccommodationLinkRow {
  accommodation_id: string;
  accommodation_trip_id: string;
  booking_id: string | null;
  booking_trip_id: string | null;
  stop_id: string | null;
  stop_trip_id: string | null;
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

async function reconcileBookingStopLinks(
  db: SQLiteDatabase,
): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS
      migration_v5_invalid_booking_stop_links (
        booking_id TEXT PRIMARY KEY NOT NULL,
        booking_trip_id TEXT NOT NULL,
        stop_id TEXT NOT NULL,
        stop_trip_id TEXT,
        archived_at TEXT NOT NULL
      );

    CREATE INDEX IF NOT EXISTS
      idx_migration_v5_invalid_booking_stop_links_stop_id
    ON migration_v5_invalid_booking_stop_links(stop_id);
  `);

  const invalidLinks =
    await db.getAllAsync<InvalidBookingStopLinkRow>(
      `
        SELECT
          b.id AS booking_id,
          b.trip_id AS booking_trip_id,
          b.stop_id,
          s.trip_id AS stop_trip_id
        FROM bookings b
        LEFT JOIN trip_stops s
          ON s.id = b.stop_id
        WHERE
          b.stop_id IS NOT NULL AND
          (
            s.id IS NULL OR
            s.trip_id <> b.trip_id
          );
      `,
    );

  const archivedAt =
    new Date().toISOString();

  for (const link of invalidLinks) {
    await db.runAsync(
      `
        INSERT INTO
          migration_v5_invalid_booking_stop_links (
            booking_id,
            booking_trip_id,
            stop_id,
            stop_trip_id,
            archived_at
          )
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(booking_id) DO UPDATE SET
          booking_trip_id =
            excluded.booking_trip_id,
          stop_id = excluded.stop_id,
          stop_trip_id =
            excluded.stop_trip_id,
          archived_at = excluded.archived_at;
      `,
      [
        link.booking_id,
        link.booking_trip_id,
        link.stop_id,
        link.stop_trip_id,
        archivedAt,
      ],
    );
  }

  await db.execAsync(`
    UPDATE bookings
    SET stop_id = NULL
    WHERE
      stop_id IS NOT NULL AND
      NOT EXISTS (
        SELECT 1
        FROM trip_stops s
        WHERE
          s.id = bookings.stop_id AND
          s.trip_id = bookings.trip_id
      );

    CREATE TRIGGER IF NOT EXISTS
      validate_booking_stop_insert
    BEFORE INSERT ON bookings
    WHEN NEW.stop_id IS NOT NULL
    BEGIN
      SELECT CASE
        WHEN NOT EXISTS (
          SELECT 1
          FROM trip_stops s
          WHERE
            s.id = NEW.stop_id AND
            s.trip_id = NEW.trip_id
        )
        THEN RAISE(
          ABORT,
          'booking stop must belong to booking trip'
        )
      END;
    END;

    CREATE TRIGGER IF NOT EXISTS
      validate_booking_stop_update
    BEFORE UPDATE OF trip_id, stop_id ON bookings
    WHEN NEW.stop_id IS NOT NULL
    BEGIN
      SELECT CASE
        WHEN NOT EXISTS (
          SELECT 1
          FROM trip_stops s
          WHERE
            s.id = NEW.stop_id AND
            s.trip_id = NEW.trip_id
        )
        THEN RAISE(
          ABORT,
          'booking stop must belong to booking trip'
        )
      END;
    END;
  `);
}

async function reconcileAccommodationLinks(
  db: SQLiteDatabase,
): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS
      migration_v6_invalid_accommodation_links (
        accommodation_id TEXT PRIMARY KEY NOT NULL,
        accommodation_trip_id TEXT NOT NULL,
        booking_id TEXT,
        booking_trip_id TEXT,
        stop_id TEXT,
        stop_trip_id TEXT,
        archived_at TEXT NOT NULL
      );

    CREATE INDEX IF NOT EXISTS
      idx_migration_v6_accommodation_booking_id
    ON migration_v6_invalid_accommodation_links(booking_id);

    CREATE INDEX IF NOT EXISTS
      idx_migration_v6_accommodation_stop_id
    ON migration_v6_invalid_accommodation_links(stop_id);
  `);

  const invalidLinks =
    await db.getAllAsync<InvalidAccommodationLinkRow>(
      `
        SELECT
          a.id AS accommodation_id,
          a.trip_id AS accommodation_trip_id,
          CASE
            WHEN
              a.booking_id IS NOT NULL AND
              (
                b.id IS NULL OR
                b.trip_id <> a.trip_id
              )
            THEN a.booking_id
            ELSE NULL
          END AS booking_id,
          CASE
            WHEN
              a.booking_id IS NOT NULL AND
              (
                b.id IS NULL OR
                b.trip_id <> a.trip_id
              )
            THEN b.trip_id
            ELSE NULL
          END AS booking_trip_id,
          CASE
            WHEN
              a.stop_id IS NOT NULL AND
              (
                s.id IS NULL OR
                s.trip_id <> a.trip_id
              )
            THEN a.stop_id
            ELSE NULL
          END AS stop_id,
          CASE
            WHEN
              a.stop_id IS NOT NULL AND
              (
                s.id IS NULL OR
                s.trip_id <> a.trip_id
              )
            THEN s.trip_id
            ELSE NULL
          END AS stop_trip_id
        FROM accommodations a
        LEFT JOIN bookings b
          ON b.id = a.booking_id
        LEFT JOIN trip_stops s
          ON s.id = a.stop_id
        WHERE
          (
            a.booking_id IS NOT NULL AND
            (
              b.id IS NULL OR
              b.trip_id <> a.trip_id
            )
          ) OR
          (
            a.stop_id IS NOT NULL AND
            (
              s.id IS NULL OR
              s.trip_id <> a.trip_id
            )
          );
      `,
    );

  const archivedAt = new Date().toISOString();

  for (const link of invalidLinks) {
    await db.runAsync(
      `
        INSERT INTO
          migration_v6_invalid_accommodation_links (
            accommodation_id,
            accommodation_trip_id,
            booking_id,
            booking_trip_id,
            stop_id,
            stop_trip_id,
            archived_at
          )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(accommodation_id) DO UPDATE SET
          accommodation_trip_id =
            excluded.accommodation_trip_id,
          booking_id = excluded.booking_id,
          booking_trip_id =
            excluded.booking_trip_id,
          stop_id = excluded.stop_id,
          stop_trip_id = excluded.stop_trip_id,
          archived_at = excluded.archived_at;
      `,
      [
        link.accommodation_id,
        link.accommodation_trip_id,
        link.booking_id,
        link.booking_trip_id,
        link.stop_id,
        link.stop_trip_id,
        archivedAt,
      ],
    );
  }

  await db.execAsync(`
    UPDATE accommodations
    SET booking_id = NULL
    WHERE
      booking_id IS NOT NULL AND
      NOT EXISTS (
        SELECT 1
        FROM bookings b
        WHERE
          b.id = accommodations.booking_id AND
          b.trip_id = accommodations.trip_id
      );

    UPDATE accommodations
    SET stop_id = NULL
    WHERE
      stop_id IS NOT NULL AND
      NOT EXISTS (
        SELECT 1
        FROM trip_stops s
        WHERE
          s.id = accommodations.stop_id AND
          s.trip_id = accommodations.trip_id
      );

    CREATE TRIGGER IF NOT EXISTS
      validate_accommodation_booking_insert
    BEFORE INSERT ON accommodations
    WHEN NEW.booking_id IS NOT NULL
    BEGIN
      SELECT CASE
        WHEN NOT EXISTS (
          SELECT 1
          FROM bookings b
          WHERE
            b.id = NEW.booking_id AND
            b.trip_id = NEW.trip_id
        )
        THEN RAISE(
          ABORT,
          'accommodation booking must belong to accommodation trip'
        )
      END;
    END;

    CREATE TRIGGER IF NOT EXISTS
      validate_accommodation_booking_update
    BEFORE UPDATE OF trip_id, booking_id ON accommodations
    WHEN NEW.booking_id IS NOT NULL
    BEGIN
      SELECT CASE
        WHEN NOT EXISTS (
          SELECT 1
          FROM bookings b
          WHERE
            b.id = NEW.booking_id AND
            b.trip_id = NEW.trip_id
        )
        THEN RAISE(
          ABORT,
          'accommodation booking must belong to accommodation trip'
        )
      END;
    END;

    CREATE TRIGGER IF NOT EXISTS
      validate_accommodation_stop_insert
    BEFORE INSERT ON accommodations
    WHEN NEW.stop_id IS NOT NULL
    BEGIN
      SELECT CASE
        WHEN NOT EXISTS (
          SELECT 1
          FROM trip_stops s
          WHERE
            s.id = NEW.stop_id AND
            s.trip_id = NEW.trip_id
        )
        THEN RAISE(
          ABORT,
          'accommodation stop must belong to accommodation trip'
        )
      END;
    END;

    CREATE TRIGGER IF NOT EXISTS
      validate_accommodation_stop_update
    BEFORE UPDATE OF trip_id, stop_id ON accommodations
    WHEN NEW.stop_id IS NOT NULL
    BEGIN
      SELECT CASE
        WHEN NOT EXISTS (
          SELECT 1
          FROM trip_stops s
          WHERE
            s.id = NEW.stop_id AND
            s.trip_id = NEW.trip_id
        )
        THEN RAISE(
          ABORT,
          'accommodation stop must belong to accommodation trip'
        )
      END;
    END;
  `);
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

  /**
   * Version 5
   * Make Booking.stopId the canonical many-to-one
   * Booking -> TripStop relationship. Historical
   * cross-trip links are archived and unlinked before
   * database triggers enforce same-trip ownership.
   */
  if (currentVersion < 5) {
    await db.withExclusiveTransactionAsync(
      async (transaction) => {
        await reconcileBookingStopLinks(
          transaction,
        );

        await transaction.execAsync(
          'PRAGMA user_version = 5;',
        );
      },
    );
  }

  /**
   * Version 6
   * Enforce Accommodation -> Booking and
   * Accommodation -> TripStop same-trip ownership.
   * Historical invalid links are archived and only
   * those relationships are unlinked; every
   * Accommodation record and its stay data survives.
   */
  if (currentVersion < 6) {
    await db.withExclusiveTransactionAsync(
      async (transaction) => {
        await reconcileAccommodationLinks(
          transaction,
        );

        await transaction.execAsync(
          'PRAGMA user_version = 6;',
        );
      },
    );
  }

  /**
   * Version 7
   * Harden Memory -> TripDay / TripStop and
   * TravelBook -> Memory relationship integrity.
   *
   * Historical invalid relationships are archived
   * before being unlinked. Memory and TravelBook
   * content survives relationship cleanup.
   */
  if (currentVersion < 7) {
    await db.withExclusiveTransactionAsync(
      async (transaction) => {
        await reconcileMemoryRelationships(
          transaction,
        );

        await transaction.execAsync(
          'PRAGMA user_version = 7;',
        );
      },
    );
  }

  /**
   * Version 8
   * Persist one explicit, editable local Travel DNA
   * profile. V1 stores only user-selected preferences;
   * no inferred or AI-generated traits are created.
   */
  if (currentVersion < 8) {
    await db.withExclusiveTransactionAsync(
      async (transaction) => {
        await transaction.execAsync(`
          CREATE TABLE IF NOT EXISTS travel_dna (
            singleton_key INTEGER PRIMARY KEY NOT NULL
              CHECK (singleton_key = 1),
            id TEXT NOT NULL UNIQUE,
            pace TEXT
              CHECK (
                pace IS NULL OR
                pace IN ('slow', 'balanced', 'full')
              ),
            interests_json TEXT NOT NULL DEFAULT '[]',
            travel_style TEXT
              CHECK (
                travel_style IS NULL OR
                travel_style IN ('local', 'iconic', 'mix')
              ),
            budget_style TEXT
              CHECK (
                budget_style IS NULL OR
                budget_style IN (
                  'value',
                  'comfortable',
                  'premium'
                )
              ),
            daily_rhythm TEXT
              CHECK (
                daily_rhythm IS NULL OR
                daily_rhythm IN (
                  'morning',
                  'flexible',
                  'night'
                )
              ),
            typical_party TEXT
              CHECK (
                typical_party IS NULL OR
                typical_party IN (
                  'solo',
                  'couple',
                  'friends',
                  'family'
                )
              ),
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );

          PRAGMA user_version = 8;
        `);
      },
    );
  }

  /**
   * Version 9
   * Persist explicit, trip-specific intent and pace.
   *
   * Existing trips keep both fields unset. Fresh installs
   * already receive the columns from DATABASE_SCHEMA, so
   * column checks keep this migration safe in both paths.
   */
  if (currentVersion < 9) {
    await db.withExclusiveTransactionAsync(
      async (transaction) => {
        const columns =
          await transaction.getAllAsync<TableInfoRow>(
            'PRAGMA table_info(trips);',
          );

        const hasIntent = columns.some(
          (column) => column.name === 'intent',
        );

        if (!hasIntent) {
          await transaction.execAsync(`
            ALTER TABLE trips
            ADD COLUMN intent TEXT
              CHECK (
                intent IS NULL OR
                intent IN (
                  'relax',
                  'explore',
                  'food',
                  'nature',
                  'event',
                  'social',
                  'romantic',
                  'family',
                  'work_leisure',
                  'other'
                )
              );
          `);
        }

        const hasPace = columns.some(
          (column) => column.name === 'pace',
        );

        if (!hasPace) {
          await transaction.execAsync(`
            ALTER TABLE trips
            ADD COLUMN pace TEXT
              CHECK (
                pace IS NULL OR
                pace IN (
                  'slow',
                  'balanced',
                  'full'
                )
              );
          `);
        }

        await transaction.execAsync(
          'PRAGMA user_version = 9;',
        );
      },
    );
  }

  /**
   * Version 10
   * Persist saved Discover candidates as a wishlist
   * distinct from Trips and World history.
   *
   * Rows store grounded identities only. Destination
   * coordinates and journey copy are resolved live
   * from the catalogue, never invented here.
   */
  if (currentVersion < 10) {
    await db.withExclusiveTransactionAsync(
      async (transaction) => {
        await transaction.execAsync(`
          CREATE TABLE IF NOT EXISTS saved_places (
            id TEXT PRIMARY KEY NOT NULL,
            kind TEXT NOT NULL
              CHECK (
                kind IN (
                  'destination',
                  'journey'
                )
              ),
            grounded_identity TEXT NOT NULL UNIQUE,
            source TEXT NOT NULL
              CHECK (
                source IN (
                  'curated',
                  'provider'
                )
              ),
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );

          CREATE INDEX IF NOT EXISTS
            idx_saved_places_created_at
            ON saved_places(created_at);

          PRAGMA user_version = 10;
        `);
      },
    );
  }

  /**
   * Version 11
   * Persist imported calendar claims in a review queue
   * distinct from Bookings and Trips until the traveler
   * explicitly accepts a claim onto an existing trip.
   *
   * V1 stores iCalendar events only. Location text is
   * never treated as coordinates. Dates without times
   * stay unknown instead of inventing midnight.
   */
  if (currentVersion < 11) {
    await db.withExclusiveTransactionAsync(
      async (transaction) => {
        await transaction.execAsync(`
          CREATE TABLE IF NOT EXISTS import_batches (
            id TEXT PRIMARY KEY NOT NULL,
            source_kind TEXT NOT NULL
              CHECK (
                source_kind IN ('ics')
              ),
            source_label TEXT NOT NULL,
            content_hash TEXT NOT NULL UNIQUE,
            skipped_count INTEGER NOT NULL,
            created_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS import_claims (
            id TEXT PRIMARY KEY NOT NULL,
            batch_id TEXT NOT NULL,
            kind TEXT NOT NULL
              CHECK (
                kind IN ('booking')
              ),
            status TEXT NOT NULL
              CHECK (
                status IN (
                  'pending',
                  'accepted',
                  'dismissed'
                )
              ),
            title TEXT NOT NULL,
            start_at TEXT,
            end_at TEXT,
            location_text TEXT,
            ics_uid TEXT,
            confidence TEXT NOT NULL
              CHECK (
                confidence IN (
                  'high',
                  'medium',
                  'low'
                )
              ),
            evidence_json TEXT NOT NULL,
            accepted_trip_id TEXT,
            accepted_booking_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (batch_id)
              REFERENCES import_batches(id)
              ON DELETE CASCADE,
            FOREIGN KEY (accepted_trip_id)
              REFERENCES trips(id)
              ON DELETE SET NULL,
            FOREIGN KEY (accepted_booking_id)
              REFERENCES bookings(id)
              ON DELETE SET NULL
          );

          CREATE INDEX IF NOT EXISTS
            idx_import_claims_batch_id
            ON import_claims(batch_id);

          CREATE INDEX IF NOT EXISTS
            idx_import_batches_created_at
            ON import_batches(created_at);

          PRAGMA user_version = 11;
        `);
      },
    );
  }

  /**
   * Version 12
   * Optional Day → Destination assignment by exact
   * destination ID. Unassigned days stay unassigned.
   * Destination order is never treated as the day's
   * city. Removing a destination clears the day's
   * assignment rather than deleting the day.
   *
   * Fresh installs already receive destination_id
   * from DATABASE_SCHEMA, so the column check keeps
   * this migration safe in both paths.
   */
  if (currentVersion < 12) {
    await db.withExclusiveTransactionAsync(
      async (transaction) => {
        const columns =
          await transaction.getAllAsync<TableInfoRow>(
            'PRAGMA table_info(trip_days);',
          );

        const hasTripDays = columns.length > 0;

        if (hasTripDays) {
          const hasDestinationId = columns.some(
            (column) =>
              column.name === 'destination_id',
          );

          if (!hasDestinationId) {
            await transaction.execAsync(`
              ALTER TABLE trip_days
              ADD COLUMN destination_id TEXT
                REFERENCES trip_destinations(id)
                ON DELETE SET NULL;
            `);
          }

          await transaction.execAsync(`
            CREATE INDEX IF NOT EXISTS
              idx_trip_days_destination_id
            ON trip_days(destination_id);

            CREATE TRIGGER IF NOT EXISTS
              validate_trip_day_destination_insert
            BEFORE INSERT ON trip_days
            WHEN NEW.destination_id IS NOT NULL
            BEGIN
              SELECT CASE
                WHEN NOT EXISTS (
                  SELECT 1
                  FROM trip_destinations d
                  WHERE
                    d.id = NEW.destination_id AND
                    d.trip_id = NEW.trip_id
                )
                THEN RAISE(
                  ABORT,
                  'trip day destination must belong to the same trip'
                )
              END;
            END;

            CREATE TRIGGER IF NOT EXISTS
              validate_trip_day_destination_update
            BEFORE UPDATE OF
              trip_id,
              destination_id
            ON trip_days
            WHEN NEW.destination_id IS NOT NULL
            BEGIN
              SELECT CASE
                WHEN NOT EXISTS (
                  SELECT 1
                  FROM trip_destinations d
                  WHERE
                    d.id = NEW.destination_id AND
                    d.trip_id = NEW.trip_id
                )
                THEN RAISE(
                  ABORT,
                  'trip day destination must belong to the same trip'
                )
              END;
            END;
          `);
        }

        await transaction.execAsync(`
          PRAGMA user_version = 12;
        `);
      },
    );
  }
}
