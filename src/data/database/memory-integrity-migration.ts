import type { SQLiteDatabase } from 'expo-sqlite';

interface InvalidMemoryLinkRow {
  memory_id: string;
  memory_trip_id: string;
  day_id: string | null;
  day_trip_id: string | null;
  stop_id: string | null;
  stop_trip_id: string | null;
}

interface InvalidTravelBookMemoryLinkRow {
  travel_book_id: string;
  book_trip_id: string | null;
  memory_id: string;
  memory_trip_id: string | null;
  position: number;
}

/**
 * Migration v7 helper.
 *
 * Memory relationship rules:
 * - dayId is optional, but when present it must belong to the Memory trip.
 * - stopId is optional, but when present it must belong to the Memory trip.
 * - when both dayId and stopId exist, the stop must belong to that exact day.
 * - deleting a linked TripDay or TripStop must preserve the Memory and unlink it.
 *
 * Travel Book relationship rules:
 * - a TravelBook may contain only Memories from the same trip.
 * - existing FK cascades continue to remove membership rows when a
 *   TravelBook or Memory is deleted.
 *
 * Historical invalid relationships are archived before cleanup.
 */
export async function reconcileMemoryRelationships(
  db: SQLiteDatabase,
): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS
      migration_v7_invalid_memory_links (
        memory_id TEXT PRIMARY KEY NOT NULL,
        memory_trip_id TEXT NOT NULL,
        day_id TEXT,
        day_trip_id TEXT,
        stop_id TEXT,
        stop_trip_id TEXT,
        archived_at TEXT NOT NULL
      );

    CREATE INDEX IF NOT EXISTS
      idx_migration_v7_invalid_memory_links_day_id
    ON migration_v7_invalid_memory_links(day_id);

    CREATE INDEX IF NOT EXISTS
      idx_migration_v7_invalid_memory_links_stop_id
    ON migration_v7_invalid_memory_links(stop_id);

    CREATE TABLE IF NOT EXISTS
      migration_v7_invalid_travel_book_memory_links (
        travel_book_id TEXT NOT NULL,
        book_trip_id TEXT,
        memory_id TEXT NOT NULL,
        memory_trip_id TEXT,
        position INTEGER NOT NULL,
        archived_at TEXT NOT NULL,

        PRIMARY KEY (travel_book_id, memory_id)
      );

    CREATE INDEX IF NOT EXISTS
      idx_migration_v7_invalid_book_memory_memory_id
    ON migration_v7_invalid_travel_book_memory_links(memory_id);
  `);

  const invalidMemoryLinks =
    await db.getAllAsync<InvalidMemoryLinkRow>(
      `
        SELECT
          m.id AS memory_id,
          m.trip_id AS memory_trip_id,

          CASE
            WHEN
              m.day_id IS NOT NULL AND
              (
                d.id IS NULL OR
                d.trip_id <> m.trip_id OR
                (
                  m.stop_id IS NOT NULL AND
                  s.id IS NOT NULL AND
                  s.trip_id = m.trip_id AND
                  s.day_id <> m.day_id
                )
              )
            THEN m.day_id
            ELSE NULL
          END AS day_id,

          CASE
            WHEN
              m.day_id IS NOT NULL AND
              (
                d.id IS NULL OR
                d.trip_id <> m.trip_id OR
                (
                  m.stop_id IS NOT NULL AND
                  s.id IS NOT NULL AND
                  s.trip_id = m.trip_id AND
                  s.day_id <> m.day_id
                )
              )
            THEN d.trip_id
            ELSE NULL
          END AS day_trip_id,

          CASE
            WHEN
              m.stop_id IS NOT NULL AND
              (
                s.id IS NULL OR
                s.trip_id <> m.trip_id
              )
            THEN m.stop_id
            ELSE NULL
          END AS stop_id,

          CASE
            WHEN
              m.stop_id IS NOT NULL AND
              (
                s.id IS NULL OR
                s.trip_id <> m.trip_id
              )
            THEN s.trip_id
            ELSE NULL
          END AS stop_trip_id

        FROM memories m

        LEFT JOIN trip_days d
          ON d.id = m.day_id

        LEFT JOIN trip_stops s
          ON s.id = m.stop_id

        WHERE
          (
            m.day_id IS NOT NULL AND
            (
              d.id IS NULL OR
              d.trip_id <> m.trip_id
            )
          )
          OR
          (
            m.stop_id IS NOT NULL AND
            (
              s.id IS NULL OR
              s.trip_id <> m.trip_id
            )
          )
          OR
          (
            m.day_id IS NOT NULL AND
            m.stop_id IS NOT NULL AND
            d.id IS NOT NULL AND
            s.id IS NOT NULL AND
            d.trip_id = m.trip_id AND
            s.trip_id = m.trip_id AND
            s.day_id <> m.day_id
          );
      `,
    );

  const invalidBookMemoryLinks =
    await db.getAllAsync<InvalidTravelBookMemoryLinkRow>(
      `
        SELECT
          tbm.travel_book_id,
          tb.trip_id AS book_trip_id,
          tbm.memory_id,
          m.trip_id AS memory_trip_id,
          tbm.position
        FROM travel_book_memories tbm
        LEFT JOIN travel_books tb
          ON tb.id = tbm.travel_book_id
        LEFT JOIN memories m
          ON m.id = tbm.memory_id
        WHERE
          tb.id IS NULL OR
          m.id IS NULL OR
          tb.trip_id <> m.trip_id;
      `,
    );

  const archivedAt = new Date().toISOString();

  for (const link of invalidMemoryLinks) {
    await db.runAsync(
      `
        INSERT INTO migration_v7_invalid_memory_links (
          memory_id,
          memory_trip_id,
          day_id,
          day_trip_id,
          stop_id,
          stop_trip_id,
          archived_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(memory_id) DO UPDATE SET
          memory_trip_id = excluded.memory_trip_id,
          day_id = excluded.day_id,
          day_trip_id = excluded.day_trip_id,
          stop_id = excluded.stop_id,
          stop_trip_id = excluded.stop_trip_id,
          archived_at = excluded.archived_at;
      `,
      [
        link.memory_id,
        link.memory_trip_id,
        link.day_id,
        link.day_trip_id,
        link.stop_id,
        link.stop_trip_id,
        archivedAt,
      ],
    );
  }

  for (const link of invalidBookMemoryLinks) {
    await db.runAsync(
      `
        INSERT INTO
          migration_v7_invalid_travel_book_memory_links (
            travel_book_id,
            book_trip_id,
            memory_id,
            memory_trip_id,
            position,
            archived_at
          )
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(travel_book_id, memory_id) DO UPDATE SET
          book_trip_id = excluded.book_trip_id,
          memory_trip_id = excluded.memory_trip_id,
          position = excluded.position,
          archived_at = excluded.archived_at;
      `,
      [
        link.travel_book_id,
        link.book_trip_id,
        link.memory_id,
        link.memory_trip_id,
        link.position,
        archivedAt,
      ],
    );
  }

  await db.execAsync(`
    /*
     * Missing or cross-trip day links are invalid.
     */
    UPDATE memories
    SET day_id = NULL
    WHERE
      day_id IS NOT NULL AND
      NOT EXISTS (
        SELECT 1
        FROM trip_days d
        WHERE
          d.id = memories.day_id AND
          d.trip_id = memories.trip_id
      );

    /*
     * Missing or cross-trip stop links are invalid.
     */
    UPDATE memories
    SET stop_id = NULL
    WHERE
      stop_id IS NOT NULL AND
      NOT EXISTS (
        SELECT 1
        FROM trip_stops s
        WHERE
          s.id = memories.stop_id AND
          s.trip_id = memories.trip_id
      );

    /*
     * If both links are individually valid but disagree,
     * preserve the more-specific Stop link and unlink Day.
     * The Day can always be derived from the exact Stop.
     */
    UPDATE memories
    SET day_id = NULL
    WHERE
      day_id IS NOT NULL AND
      stop_id IS NOT NULL AND
      EXISTS (
        SELECT 1
        FROM trip_stops s
        WHERE
          s.id = memories.stop_id AND
          s.trip_id = memories.trip_id AND
          s.day_id <> memories.day_id
      );

    /*
     * Remove historical cross-trip TravelBook membership.
     * The Memory and TravelBook themselves are preserved.
     */
    DELETE FROM travel_book_memories
    WHERE NOT EXISTS (
      SELECT 1
      FROM travel_books tb
      JOIN memories m
        ON m.id = travel_book_memories.memory_id
      WHERE
        tb.id = travel_book_memories.travel_book_id AND
        tb.trip_id = m.trip_id
    );

    CREATE INDEX IF NOT EXISTS idx_memories_day_id
    ON memories(day_id);

    CREATE INDEX IF NOT EXISTS idx_memories_stop_id
    ON memories(stop_id);

    CREATE INDEX IF NOT EXISTS idx_travel_book_memories_memory_id
    ON travel_book_memories(memory_id);

    CREATE INDEX IF NOT EXISTS idx_travel_book_memories_book_position
    ON travel_book_memories(travel_book_id, position);

    /*
     * Memory -> TripDay ownership.
     */
    CREATE TRIGGER IF NOT EXISTS
      validate_memory_day_insert
    BEFORE INSERT ON memories
    WHEN NEW.day_id IS NOT NULL
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
          'memory day must belong to memory trip'
        )
      END;
    END;

    CREATE TRIGGER IF NOT EXISTS
      validate_memory_day_update
    BEFORE UPDATE OF trip_id, day_id ON memories
    WHEN NEW.day_id IS NOT NULL
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
          'memory day must belong to memory trip'
        )
      END;
    END;

    /*
     * Memory -> TripStop ownership.
     */
    CREATE TRIGGER IF NOT EXISTS
      validate_memory_stop_insert
    BEFORE INSERT ON memories
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
          'memory stop must belong to memory trip'
        )
      END;
    END;

    CREATE TRIGGER IF NOT EXISTS
      validate_memory_stop_update
    BEFORE UPDATE OF trip_id, stop_id ON memories
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
          'memory stop must belong to memory trip'
        )
      END;
    END;

    /*
     * When both dayId and stopId are present they must
     * describe the same exact itinerary day.
     */
    CREATE TRIGGER IF NOT EXISTS
      validate_memory_day_stop_insert
    BEFORE INSERT ON memories
    WHEN
      NEW.day_id IS NOT NULL AND
      NEW.stop_id IS NOT NULL
    BEGIN
      SELECT CASE
        WHEN NOT EXISTS (
          SELECT 1
          FROM trip_stops s
          WHERE
            s.id = NEW.stop_id AND
            s.trip_id = NEW.trip_id AND
            s.day_id = NEW.day_id
        )
        THEN RAISE(
          ABORT,
          'memory day and stop must describe the same trip day'
        )
      END;
    END;

    CREATE TRIGGER IF NOT EXISTS
      validate_memory_day_stop_update
    BEFORE UPDATE OF trip_id, day_id, stop_id ON memories
    WHEN
      NEW.day_id IS NOT NULL AND
      NEW.stop_id IS NOT NULL
    BEGIN
      SELECT CASE
        WHEN NOT EXISTS (
          SELECT 1
          FROM trip_stops s
          WHERE
            s.id = NEW.stop_id AND
            s.trip_id = NEW.trip_id AND
            s.day_id = NEW.day_id
        )
        THEN RAISE(
          ABORT,
          'memory day and stop must describe the same trip day'
        )
      END;
    END;

    /*
     * A Memory survives removal of itinerary context.
     */
    CREATE TRIGGER IF NOT EXISTS
      unlink_memories_after_day_delete
    AFTER DELETE ON trip_days
    BEGIN
      UPDATE memories
      SET day_id = NULL
      WHERE day_id = OLD.id;
    END;

    CREATE TRIGGER IF NOT EXISTS
      unlink_memories_after_stop_delete
    AFTER DELETE ON trip_stops
    BEGIN
      UPDATE memories
      SET stop_id = NULL
      WHERE stop_id = OLD.id;
    END;

    /*
     * TravelBook -> Memory same-trip membership.
     */
    CREATE TRIGGER IF NOT EXISTS
      validate_travel_book_memory_insert
    BEFORE INSERT ON travel_book_memories
    BEGIN
      SELECT CASE
        WHEN NOT EXISTS (
          SELECT 1
          FROM travel_books tb
          JOIN memories m
            ON m.id = NEW.memory_id
          WHERE
            tb.id = NEW.travel_book_id AND
            tb.trip_id = m.trip_id
        )
        THEN RAISE(
          ABORT,
          'travel book memory must belong to travel book trip'
        )
      END;
    END;

    CREATE TRIGGER IF NOT EXISTS
      validate_travel_book_memory_update
    BEFORE UPDATE OF travel_book_id, memory_id
    ON travel_book_memories
    BEGIN
      SELECT CASE
        WHEN NOT EXISTS (
          SELECT 1
          FROM travel_books tb
          JOIN memories m
            ON m.id = NEW.memory_id
          WHERE
            tb.id = NEW.travel_book_id AND
            tb.trip_id = m.trip_id
        )
        THEN RAISE(
          ABORT,
          'travel book memory must belong to travel book trip'
        )
      END;
    END;

    /*
     * Existing membership also constrains later parent
     * trip_id edits.
     */
    CREATE TRIGGER IF NOT EXISTS
      validate_memory_trip_update_for_travel_books
    BEFORE UPDATE OF trip_id ON memories
    WHEN EXISTS (
      SELECT 1
      FROM travel_book_memories tbm
      JOIN travel_books tb
        ON tb.id = tbm.travel_book_id
      WHERE
        tbm.memory_id = OLD.id AND
        tb.trip_id <> NEW.trip_id
    )
    BEGIN
      SELECT RAISE(
        ABORT,
        'linked memory must remain in travel book trip'
      );
    END;

    CREATE TRIGGER IF NOT EXISTS
      validate_travel_book_trip_update_for_memories
    BEFORE UPDATE OF trip_id ON travel_books
    WHEN EXISTS (
      SELECT 1
      FROM travel_book_memories tbm
      JOIN memories m
        ON m.id = tbm.memory_id
      WHERE
        tbm.travel_book_id = OLD.id AND
        m.trip_id <> NEW.trip_id
    )
    BEGIN
      SELECT RAISE(
        ABORT,
        'travel book must remain in linked memory trip'
      );
    END;
  `);
}
