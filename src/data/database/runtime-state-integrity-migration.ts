import type { SQLiteDatabase } from 'expo-sqlite';

interface InvalidRuntimeLinkRow {
  trip_id: string;
  current_day_id: string | null;
  day_trip_id: string | null;
  current_stop_id: string | null;
  stop_trip_id: string | null;
}

interface ForeignKeyListRow {
  from: string;
}

/**
 * Migration v13 helper.
 *
 * TripRuntimeState remains unused as lived Companion
 * progress. This only protects optional day/stop IDs:
 * - currentDayId is optional, but when present it must
 *   belong to the runtime trip.
 * - currentStopId is optional, but when present it must
 *   belong to the runtime trip.
 * - when both exist, the stop must belong to that day.
 * - deleting a linked TripDay or TripStop unlinks the
 *   reference instead of deleting the runtime row.
 *
 * Historical invalid relationships are archived before
 * cleanup. Declared foreign keys are installed by
 * rebuilding the table when they are missing.
 */
export async function reconcileRuntimeStateRelationships(
  db: SQLiteDatabase,
): Promise<void> {
  const columns =
    await db.getAllAsync<{ name: string }>(
      'PRAGMA table_info(trip_runtime_states);',
    );

  if (columns.length === 0) {
    return;
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS
      migration_v13_invalid_runtime_state_links (
        trip_id TEXT PRIMARY KEY NOT NULL,
        current_day_id TEXT,
        day_trip_id TEXT,
        current_stop_id TEXT,
        stop_trip_id TEXT,
        archived_at TEXT NOT NULL
      );
  `);

  const invalidLinks =
    await db.getAllAsync<InvalidRuntimeLinkRow>(
      `
        SELECT
          r.trip_id,

          CASE
            WHEN
              r.current_day_id IS NOT NULL AND
              (
                d.id IS NULL OR
                d.trip_id <> r.trip_id OR
                (
                  r.current_stop_id IS NOT NULL AND
                  s.id IS NOT NULL AND
                  s.trip_id = r.trip_id AND
                  s.day_id <> r.current_day_id
                )
              )
            THEN r.current_day_id
            ELSE NULL
          END AS current_day_id,

          CASE
            WHEN
              r.current_day_id IS NOT NULL AND
              (
                d.id IS NULL OR
                d.trip_id <> r.trip_id OR
                (
                  r.current_stop_id IS NOT NULL AND
                  s.id IS NOT NULL AND
                  s.trip_id = r.trip_id AND
                  s.day_id <> r.current_day_id
                )
              )
            THEN d.trip_id
            ELSE NULL
          END AS day_trip_id,

          CASE
            WHEN
              r.current_stop_id IS NOT NULL AND
              (
                s.id IS NULL OR
                s.trip_id <> r.trip_id
              )
            THEN r.current_stop_id
            ELSE NULL
          END AS current_stop_id,

          CASE
            WHEN
              r.current_stop_id IS NOT NULL AND
              (
                s.id IS NULL OR
                s.trip_id <> r.trip_id
              )
            THEN s.trip_id
            ELSE NULL
          END AS stop_trip_id

        FROM trip_runtime_states r

        LEFT JOIN trip_days d
          ON d.id = r.current_day_id

        LEFT JOIN trip_stops s
          ON s.id = r.current_stop_id

        WHERE
          (
            r.current_day_id IS NOT NULL AND
            (
              d.id IS NULL OR
              d.trip_id <> r.trip_id
            )
          )
          OR
          (
            r.current_stop_id IS NOT NULL AND
            (
              s.id IS NULL OR
              s.trip_id <> r.trip_id
            )
          )
          OR
          (
            r.current_day_id IS NOT NULL AND
            r.current_stop_id IS NOT NULL AND
            d.id IS NOT NULL AND
            s.id IS NOT NULL AND
            d.trip_id = r.trip_id AND
            s.trip_id = r.trip_id AND
            s.day_id <> r.current_day_id
          );
      `,
    );

  const archivedAt = new Date().toISOString();

  for (const link of invalidLinks) {
    await db.runAsync(
      `
        INSERT INTO
          migration_v13_invalid_runtime_state_links (
            trip_id,
            current_day_id,
            day_trip_id,
            current_stop_id,
            stop_trip_id,
            archived_at
          )
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(trip_id) DO UPDATE SET
          current_day_id = excluded.current_day_id,
          day_trip_id = excluded.day_trip_id,
          current_stop_id = excluded.current_stop_id,
          stop_trip_id = excluded.stop_trip_id,
          archived_at = excluded.archived_at;
      `,
      [
        link.trip_id,
        link.current_day_id,
        link.day_trip_id,
        link.current_stop_id,
        link.stop_trip_id,
        archivedAt,
      ],
    );
  }

  await db.execAsync(`
    UPDATE trip_runtime_states
    SET current_day_id = NULL
    WHERE
      current_day_id IS NOT NULL AND
      NOT EXISTS (
        SELECT 1
        FROM trip_days d
        WHERE
          d.id = trip_runtime_states.current_day_id AND
          d.trip_id = trip_runtime_states.trip_id
      );

    UPDATE trip_runtime_states
    SET current_stop_id = NULL
    WHERE
      current_stop_id IS NOT NULL AND
      NOT EXISTS (
        SELECT 1
        FROM trip_stops s
        WHERE
          s.id = trip_runtime_states.current_stop_id AND
          s.trip_id = trip_runtime_states.trip_id
      );

    UPDATE trip_runtime_states
    SET current_day_id = NULL
    WHERE
      current_day_id IS NOT NULL AND
      current_stop_id IS NOT NULL AND
      EXISTS (
        SELECT 1
        FROM trip_stops s
        WHERE
          s.id = trip_runtime_states.current_stop_id AND
          s.trip_id = trip_runtime_states.trip_id AND
          s.day_id <> trip_runtime_states.current_day_id
      );
  `);

  const foreignKeys =
    await db.getAllAsync<ForeignKeyListRow>(
      'PRAGMA foreign_key_list(trip_runtime_states);',
    );

  const hasDayForeignKey = foreignKeys.some(
    (key) => key.from === 'current_day_id',
  );
  const hasStopForeignKey = foreignKeys.some(
    (key) => key.from === 'current_stop_id',
  );

  if (!hasDayForeignKey || !hasStopForeignKey) {
    await db.execAsync(`
      CREATE TABLE trip_runtime_states_v13 (
        trip_id TEXT PRIMARY KEY NOT NULL,
        phase TEXT NOT NULL,
        current_day_id TEXT,
        current_stop_id TEXT,
        last_activity_at TEXT,
        is_companion_active INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (trip_id)
          REFERENCES trips(id)
          ON DELETE CASCADE,
        FOREIGN KEY (current_day_id)
          REFERENCES trip_days(id)
          ON DELETE SET NULL,
        FOREIGN KEY (current_stop_id)
          REFERENCES trip_stops(id)
          ON DELETE SET NULL
      );

      INSERT INTO trip_runtime_states_v13 (
        trip_id,
        phase,
        current_day_id,
        current_stop_id,
        last_activity_at,
        is_companion_active,
        updated_at
      )
      SELECT
        trip_id,
        phase,
        current_day_id,
        current_stop_id,
        last_activity_at,
        is_companion_active,
        updated_at
      FROM trip_runtime_states;

      DROP TABLE trip_runtime_states;

      ALTER TABLE trip_runtime_states_v13
      RENAME TO trip_runtime_states;
    `);
  }

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS
      idx_trip_runtime_states_current_day_id
    ON trip_runtime_states(current_day_id);

    CREATE INDEX IF NOT EXISTS
      idx_trip_runtime_states_current_stop_id
    ON trip_runtime_states(current_stop_id);

    CREATE TRIGGER IF NOT EXISTS
      validate_runtime_state_day_insert
    BEFORE INSERT ON trip_runtime_states
    WHEN NEW.current_day_id IS NOT NULL
    BEGIN
      SELECT CASE
        WHEN NOT EXISTS (
          SELECT 1
          FROM trip_days d
          WHERE
            d.id = NEW.current_day_id AND
            d.trip_id = NEW.trip_id
        )
        THEN RAISE(
          ABORT,
          'runtime state day must belong to runtime trip'
        )
      END;
    END;

    CREATE TRIGGER IF NOT EXISTS
      validate_runtime_state_day_update
    BEFORE UPDATE OF
      trip_id,
      current_day_id
    ON trip_runtime_states
    WHEN NEW.current_day_id IS NOT NULL
    BEGIN
      SELECT CASE
        WHEN NOT EXISTS (
          SELECT 1
          FROM trip_days d
          WHERE
            d.id = NEW.current_day_id AND
            d.trip_id = NEW.trip_id
        )
        THEN RAISE(
          ABORT,
          'runtime state day must belong to runtime trip'
        )
      END;
    END;

    CREATE TRIGGER IF NOT EXISTS
      validate_runtime_state_stop_insert
    BEFORE INSERT ON trip_runtime_states
    WHEN NEW.current_stop_id IS NOT NULL
    BEGIN
      SELECT CASE
        WHEN NOT EXISTS (
          SELECT 1
          FROM trip_stops s
          WHERE
            s.id = NEW.current_stop_id AND
            s.trip_id = NEW.trip_id
        )
        THEN RAISE(
          ABORT,
          'runtime state stop must belong to runtime trip'
        )
      END;
    END;

    CREATE TRIGGER IF NOT EXISTS
      validate_runtime_state_stop_update
    BEFORE UPDATE OF
      trip_id,
      current_stop_id
    ON trip_runtime_states
    WHEN NEW.current_stop_id IS NOT NULL
    BEGIN
      SELECT CASE
        WHEN NOT EXISTS (
          SELECT 1
          FROM trip_stops s
          WHERE
            s.id = NEW.current_stop_id AND
            s.trip_id = NEW.trip_id
        )
        THEN RAISE(
          ABORT,
          'runtime state stop must belong to runtime trip'
        )
      END;
    END;

    CREATE TRIGGER IF NOT EXISTS
      validate_runtime_state_day_stop_insert
    BEFORE INSERT ON trip_runtime_states
    WHEN
      NEW.current_day_id IS NOT NULL AND
      NEW.current_stop_id IS NOT NULL
    BEGIN
      SELECT CASE
        WHEN NOT EXISTS (
          SELECT 1
          FROM trip_stops s
          WHERE
            s.id = NEW.current_stop_id AND
            s.trip_id = NEW.trip_id AND
            s.day_id = NEW.current_day_id
        )
        THEN RAISE(
          ABORT,
          'runtime state day and stop must describe the same trip day'
        )
      END;
    END;

    CREATE TRIGGER IF NOT EXISTS
      validate_runtime_state_day_stop_update
    BEFORE UPDATE OF
      trip_id,
      current_day_id,
      current_stop_id
    ON trip_runtime_states
    WHEN
      NEW.current_day_id IS NOT NULL AND
      NEW.current_stop_id IS NOT NULL
    BEGIN
      SELECT CASE
        WHEN NOT EXISTS (
          SELECT 1
          FROM trip_stops s
          WHERE
            s.id = NEW.current_stop_id AND
            s.trip_id = NEW.trip_id AND
            s.day_id = NEW.current_day_id
        )
        THEN RAISE(
          ABORT,
          'runtime state day and stop must describe the same trip day'
        )
      END;
    END;
  `);
}
