import type { SQLiteDatabase } from 'expo-sqlite';

interface InvalidStopDayRow {
  stop_id: string;
  stop_trip_id: string;
  day_id: string;
  day_trip_id: string | null;
  title: string;
  type: string;
  position: number;
  created_at: string;
  updated_at: string;
}

/**
 * Migration v14 helper.
 *
 * A TripStop must belong to a TripDay on the same trip.
 * Missing or cross-trip days are archived, then the stop
 * is deleted so Booking/Accommodation/Memory/runtime
 * unlinks can run through existing foreign keys and
 * triggers. Stop content is kept in the archive, not
 * moved onto another trip.
 */
export async function reconcileStopDayRelationships(
  db: SQLiteDatabase,
): Promise<void> {
  const columns =
    await db.getAllAsync<{ name: string }>(
      'PRAGMA table_info(trip_stops);',
    );

  if (columns.length === 0) {
    return;
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS
      migration_v14_invalid_stop_day_links (
        stop_id TEXT PRIMARY KEY NOT NULL,
        stop_trip_id TEXT NOT NULL,
        day_id TEXT NOT NULL,
        day_trip_id TEXT,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        position INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        archived_at TEXT NOT NULL
      );
  `);

  const invalidStops =
    await db.getAllAsync<InvalidStopDayRow>(
      `
        SELECT
          s.id AS stop_id,
          s.trip_id AS stop_trip_id,
          s.day_id,
          d.trip_id AS day_trip_id,
          s.title,
          s.type,
          s.position,
          s.created_at,
          s.updated_at
        FROM trip_stops s
        LEFT JOIN trip_days d
          ON d.id = s.day_id
        WHERE
          d.id IS NULL OR
          d.trip_id <> s.trip_id;
      `,
    );

  const archivedAt = new Date().toISOString();

  for (const stop of invalidStops) {
    await db.runAsync(
      `
        INSERT INTO
          migration_v14_invalid_stop_day_links (
            stop_id,
            stop_trip_id,
            day_id,
            day_trip_id,
            title,
            type,
            position,
            created_at,
            updated_at,
            archived_at
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(stop_id) DO UPDATE SET
          stop_trip_id = excluded.stop_trip_id,
          day_id = excluded.day_id,
          day_trip_id = excluded.day_trip_id,
          title = excluded.title,
          type = excluded.type,
          position = excluded.position,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          archived_at = excluded.archived_at;
      `,
      [
        stop.stop_id,
        stop.stop_trip_id,
        stop.day_id,
        stop.day_trip_id,
        stop.title,
        stop.type,
        stop.position,
        stop.created_at,
        stop.updated_at,
        archivedAt,
      ],
    );
  }

  await db.execAsync(`
    DELETE FROM trip_stops
    WHERE
      NOT EXISTS (
        SELECT 1
        FROM trip_days d
        WHERE
          d.id = trip_stops.day_id AND
          d.trip_id = trip_stops.trip_id
      );

    CREATE TRIGGER IF NOT EXISTS
      validate_trip_stop_day_insert
    BEFORE INSERT ON trip_stops
    BEGIN
      SELECT CASE
        WHEN NOT EXISTS (
          SELECT 1
          FROM trip_days d
          WHERE
            d.id = NEW.day_id AND
            d.trip_id = NEW.trip_id
        )
        THEN RAISE(
          ABORT,
          'trip stop day must belong to the same trip'
        )
      END;
    END;

    CREATE TRIGGER IF NOT EXISTS
      validate_trip_stop_day_update
    BEFORE UPDATE OF
      trip_id,
      day_id
    ON trip_stops
    BEGIN
      SELECT CASE
        WHEN NOT EXISTS (
          SELECT 1
          FROM trip_days d
          WHERE
            d.id = NEW.day_id AND
            d.trip_id = NEW.trip_id
        )
        THEN RAISE(
          ABORT,
          'trip stop day must belong to the same trip'
        )
      END;
    END;

    CREATE TRIGGER IF NOT EXISTS
      validate_trip_day_trip_update_for_stops
    BEFORE UPDATE OF trip_id ON trip_days
    WHEN EXISTS (
      SELECT 1
      FROM trip_stops s
      WHERE
        s.day_id = OLD.id AND
        s.trip_id <> NEW.trip_id
    )
    BEGIN
      SELECT RAISE(
        ABORT,
        'trip day cannot leave its itinerary stops'
      );
    END;
  `);
}
