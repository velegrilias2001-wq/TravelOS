import type { SQLiteDatabase } from 'expo-sqlite';

interface TableInfoRow {
  name: string;
}

async function tableExists(
  db: SQLiteDatabase,
  table: string,
): Promise<boolean> {
  const row = await db.getFirstAsync<{ name: string }>(
    `
      SELECT name
      FROM sqlite_master
      WHERE
        type = 'table' AND
        name = ?;
    `,
    [table],
  );

  return Boolean(row?.name);
}

async function hasColumn(
  db: SQLiteDatabase,
  table: string,
  column: string,
): Promise<boolean> {
  if (!(await tableExists(db, table))) {
    return false;
  }

  const columns =
    await db.getAllAsync<TableInfoRow>(
      `PRAGMA table_info(${table});`,
    );

  return columns.some(
    (entry) => entry.name === column,
  );
}

/**
 * Version 16
 * Persist optional destination provider identity and
 * timezone provenance, explicit traveler FX rates, and
 * optional trip-owner membership. Never invent
 * coordinates, timezones, or market rates.
 *
 * Historical migration fixtures may omit later tables.
 * Skip ALTER/CREATE against tables that are not present.
 */
export async function installPhase1TripCore(
  db: SQLiteDatabase,
): Promise<void> {
  if (
    (await tableExists(db, 'trip_destinations')) &&
    !(await hasColumn(
      db,
      'trip_destinations',
      'place_id',
    ))
  ) {
    await db.execAsync(`
      ALTER TABLE trip_destinations
      ADD COLUMN place_id TEXT;
    `);
  }

  if (
    (await tableExists(db, 'trip_destinations')) &&
    !(await hasColumn(
      db,
      'trip_destinations',
      'timezone_source',
    ))
  ) {
    await db.execAsync(`
      ALTER TABLE trip_destinations
      ADD COLUMN timezone_source TEXT;
    `);
  }

  if (
    (await tableExists(db, 'trip_travelers')) &&
    !(await hasColumn(
      db,
      'trip_travelers',
      'role',
    ))
  ) {
    await db.execAsync(`
      ALTER TABLE trip_travelers
      ADD COLUMN role TEXT NOT NULL DEFAULT 'member';
    `);
  }

  if (await tableExists(db, 'trip_travelers')) {
    await db.execAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS trip_travelers_one_owner
      ON trip_travelers(trip_id)
      WHERE role = 'owner';
    `);
  }

  if (await tableExists(db, 'trips')) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS trip_fx_rates (
        id TEXT PRIMARY KEY NOT NULL,
        trip_id TEXT NOT NULL,
        from_currency TEXT NOT NULL,
        to_currency TEXT NOT NULL,
        rate REAL NOT NULL
          CHECK (rate > 0),
        as_of TEXT NOT NULL,
        source TEXT NOT NULL
          CHECK (source IN ('traveler')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (trip_id)
          REFERENCES trips(id)
          ON DELETE CASCADE,
        UNIQUE (trip_id, from_currency, to_currency)
      );
    `);
  }
}
