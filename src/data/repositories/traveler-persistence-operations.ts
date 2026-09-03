import type {
  Database,
  DatabaseConnection,
} from '../database/database';

import type {
  Traveler,
  TravelerId,
  TravelerType,
  TripId,
} from '../../domain/entities';

interface TravelerRow {
  id: string;
  first_name: string;
  last_name: string | null;
  type: string;
  email: string | null;
  phone: string | null;
  avatar_uri: string | null;
  created_at: string;
  updated_at: string;
}

function mapTraveler(
  row: TravelerRow,
): Traveler {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name ?? undefined,
    type: row.type as TravelerType,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    avatarUri: row.avatar_uri ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getTravelerById(
  database: DatabaseConnection,
  id: TravelerId,
): Promise<Traveler | null> {
  const row =
    await database.queryFirst<TravelerRow>(
      `SELECT * FROM travelers WHERE id = ?;`,
      [id],
    );

  return row ? mapTraveler(row) : null;
}

export async function getAllTravelers(
  database: DatabaseConnection,
): Promise<Traveler[]> {
  const rows =
    await database.query<TravelerRow>(`
      SELECT *
      FROM travelers
      ORDER BY
        first_name COLLATE NOCASE ASC,
        last_name COLLATE NOCASE ASC,
        created_at ASC,
        id ASC;
    `);

  return rows.map(mapTraveler);
}

export async function getTravelersByTripId(
  database: DatabaseConnection,
  tripId: TripId,
): Promise<Traveler[]> {
  const rows =
    await database.query<TravelerRow>(
      `
        SELECT t.*
        FROM travelers t
        INNER JOIN trip_travelers tt
          ON tt.traveler_id = t.id
        WHERE tt.trip_id = ?
        ORDER BY
          t.first_name COLLATE NOCASE ASC,
          t.last_name COLLATE NOCASE ASC,
          t.created_at ASC,
          t.id ASC;
      `,
      [tripId],
    );

  return rows.map(mapTraveler);
}

async function requireTrip(
  database: DatabaseConnection,
  tripId: TripId,
): Promise<void> {
  const trip = await database.queryFirst<{
    id: string;
  }>(
    'SELECT id FROM trips WHERE id = ?;',
    [tripId],
  );

  if (!trip) {
    throw new Error('Trip was not found');
  }
}

async function insertTraveler(
  database: DatabaseConnection,
  traveler: Traveler,
): Promise<void> {
  await database.execute(
    `
      INSERT INTO travelers (
        id,
        first_name,
        last_name,
        type,
        email,
        phone,
        avatar_uri,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      traveler.id,
      traveler.firstName,
      traveler.lastName ?? null,
      traveler.type,
      traveler.email ?? null,
      traveler.phone ?? null,
      traveler.avatarUri ?? null,
      traveler.createdAt,
      traveler.updatedAt,
    ],
  );
}

export async function saveCanonicalTraveler(
  database: DatabaseConnection,
  traveler: Traveler,
): Promise<void> {
  await database.execute(
    `
      INSERT INTO travelers (
        id,
        first_name,
        last_name,
        type,
        email,
        phone,
        avatar_uri,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        type = excluded.type,
        email = excluded.email,
        phone = excluded.phone,
        avatar_uri = excluded.avatar_uri,
        updated_at = excluded.updated_at;
    `,
    [
      traveler.id,
      traveler.firstName,
      traveler.lastName ?? null,
      traveler.type,
      traveler.email ?? null,
      traveler.phone ?? null,
      traveler.avatarUri ?? null,
      traveler.createdAt,
      traveler.updatedAt,
    ],
  );
}

export async function createTravelerForTrip(
  database: Database,
  tripId: TripId,
  traveler: Traveler,
): Promise<void> {
  await database.transaction(
    async (transaction) => {
      await requireTrip(transaction, tripId);

      const existing =
        await getTravelerById(
          transaction,
          traveler.id,
        );

      if (existing) {
        throw new Error(
          'Traveler ID is already in use',
        );
      }

      await insertTraveler(
        transaction,
        traveler,
      );

      await transaction.execute(
        `
          INSERT INTO trip_travelers (
            trip_id,
            traveler_id
          )
          VALUES (?, ?);
        `,
        [tripId, traveler.id],
      );
    },
  );
}

export async function addTravelerToTrip(
  database: Database,
  tripId: TripId,
  travelerId: TravelerId,
): Promise<void> {
  await database.transaction(
    async (transaction) => {
      await requireTrip(transaction, tripId);

      const traveler =
        await getTravelerById(
          transaction,
          travelerId,
        );

      if (!traveler) {
        throw new Error('Traveler was not found');
      }

      const membership =
        await transaction.queryFirst<{
          traveler_id: string;
        }>(
          `
            SELECT traveler_id
            FROM trip_travelers
            WHERE
              trip_id = ? AND
              traveler_id = ?;
          `,
          [tripId, travelerId],
        );

      if (membership) {
        throw new Error(
          'Traveler is already part of this trip',
        );
      }

      await transaction.execute(
        `
          INSERT INTO trip_travelers (
            trip_id,
            traveler_id
          )
          VALUES (?, ?);
        `,
        [tripId, travelerId],
      );
    },
  );
}

export async function updateTravelerForTrip(
  database: Database,
  tripId: TripId,
  traveler: Traveler,
): Promise<void> {
  await database.transaction(
    async (transaction) => {
      const membership =
        await transaction.queryFirst<{
          traveler_id: string;
        }>(
          `
            SELECT traveler_id
            FROM trip_travelers
            WHERE
              trip_id = ? AND
              traveler_id = ?;
          `,
          [tripId, traveler.id],
        );

      if (!membership) {
        throw new Error(
          'Traveler is not part of this trip',
        );
      }

      await saveCanonicalTraveler(
        transaction,
        traveler,
      );
    },
  );
}

export async function removeTravelerFromTrip(
  database: Database,
  tripId: TripId,
  travelerId: TravelerId,
): Promise<void> {
  await database.transaction(
    async (transaction) => {
      const membership =
        await transaction.queryFirst<{
          traveler_id: string;
        }>(
          `
            SELECT traveler_id
            FROM trip_travelers
            WHERE
              trip_id = ? AND
              traveler_id = ?;
          `,
          [tripId, travelerId],
        );

      if (!membership) {
        throw new Error(
          'Traveler is not part of this trip',
        );
      }

      await transaction.execute(
        `
          DELETE FROM trip_travelers
          WHERE
            trip_id = ? AND
            traveler_id = ?;
        `,
        [tripId, travelerId],
      );
    },
  );
}

export async function setTripOwner(
  database: Database,
  tripId: TripId,
  travelerId: TravelerId | null,
): Promise<void> {
  await database.transaction(
    async (transaction) => {
      await requireTrip(transaction, tripId);

      await transaction.execute(
        `
          UPDATE trip_travelers
          SET role = 'member'
          WHERE
            trip_id = ? AND
            role = 'owner';
        `,
        [tripId],
      );

      if (!travelerId) {
        return;
      }

      const membership =
        await transaction.queryFirst<{
          traveler_id: string;
        }>(
          `
            SELECT traveler_id
            FROM trip_travelers
            WHERE
              trip_id = ? AND
              traveler_id = ?;
          `,
          [tripId, travelerId],
        );

      if (!membership) {
        throw new Error(
          'Traveler is not part of this trip',
        );
      }

      await transaction.execute(
        `
          UPDATE trip_travelers
          SET role = 'owner'
          WHERE
            trip_id = ? AND
            traveler_id = ?;
        `,
        [tripId, travelerId],
      );
    },
  );
}

export async function deleteCanonicalTraveler(
  database: DatabaseConnection,
  id: TravelerId,
): Promise<void> {
  await database.execute(
    'DELETE FROM travelers WHERE id = ?;',
    [id],
  );
}
