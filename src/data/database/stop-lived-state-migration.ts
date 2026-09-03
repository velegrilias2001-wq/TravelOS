import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Version 17
 * Persist explicit traveler done/skipped lived-stop
 * phases without rewriting Plan stop times. Delayed is
 * not stored; Companion derives it from the clock.
 *
 * Historical migration fixtures may omit later tables.
 * Skip CREATE against tables that are not present.
 */
export async function installStopLivedStates(
  db: SQLiteDatabase,
): Promise<void> {
  const stops = await db.getFirstAsync<{ name: string }>(
    `
      SELECT name
      FROM sqlite_master
      WHERE
        type = 'table' AND
        name = 'trip_stops';
    `,
  );

  const trips = await db.getFirstAsync<{ name: string }>(
    `
      SELECT name
      FROM sqlite_master
      WHERE
        type = 'table' AND
        name = 'trips';
    `,
  );

  if (!stops?.name || !trips?.name) {
    return;
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS trip_stop_lived_states (
      stop_id TEXT PRIMARY KEY NOT NULL,
      trip_id TEXT NOT NULL,
      phase TEXT NOT NULL
        CHECK (phase IN ('done', 'skipped')),
      recorded_at TEXT NOT NULL,
      FOREIGN KEY (trip_id)
        REFERENCES trips(id)
        ON DELETE CASCADE,
      FOREIGN KEY (stop_id)
        REFERENCES trip_stops(id)
        ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS
      idx_trip_stop_lived_states_trip_id
    ON trip_stop_lived_states(trip_id);

    CREATE TRIGGER IF NOT EXISTS
      validate_stop_lived_state_insert
    BEFORE INSERT ON trip_stop_lived_states
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
          'lived stop must belong to lived trip'
        )
      END;
    END;

    CREATE TRIGGER IF NOT EXISTS
      validate_stop_lived_state_update
    BEFORE UPDATE OF
      trip_id,
      stop_id
    ON trip_stop_lived_states
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
          'lived stop must belong to lived trip'
        )
      END;
    END;
  `);
}
