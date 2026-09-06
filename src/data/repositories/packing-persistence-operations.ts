import type {
  Database,
  DatabaseConnection,
} from '../database/database';

import type {
  PackingItem,
  PackingItemId,
} from '../../domain/entities/packing-item';
import type { TripId } from '../../domain/entities/trip';

interface PackingItemRow {
  id: string;
  trip_id: string;
  title: string;
  packed: number;
  position: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: PackingItemRow): PackingItem {
  return {
    id: row.id,
    tripId: row.trip_id,
    title: row.title,
    packed: row.packed === 1,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPackingItemsByTripId(
  database: Database | DatabaseConnection,
  tripId: TripId,
): Promise<PackingItem[]> {
  const rows = await database.query<PackingItemRow>(
    `
      SELECT *
      FROM packing_items
      WHERE trip_id = ?
      ORDER BY position ASC, created_at ASC;
    `,
    [tripId],
  );

  return rows.map(mapRow);
}

export async function getPackingItem(
  database: Database | DatabaseConnection,
  id: PackingItemId,
): Promise<PackingItem | null> {
  const row = await database.queryFirst<PackingItemRow>(
    `
      SELECT *
      FROM packing_items
      WHERE id = ?;
    `,
    [id],
  );

  return row ? mapRow(row) : null;
}

export async function savePackingItem(
  database: Database | DatabaseConnection,
  item: PackingItem,
): Promise<void> {
  await database.execute(
    `
      INSERT INTO packing_items (
        id,
        trip_id,
        title,
        packed,
        position,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        packed = excluded.packed,
        position = excluded.position,
        updated_at = excluded.updated_at;
    `,
    [
      item.id,
      item.tripId,
      item.title,
      item.packed ? 1 : 0,
      item.position,
      item.createdAt,
      item.updatedAt,
    ],
  );
}

export async function deletePackingItem(
  database: Database | DatabaseConnection,
  id: PackingItemId,
): Promise<void> {
  await database.execute(
    `
      DELETE FROM packing_items
      WHERE id = ?;
    `,
    [id],
  );
}
