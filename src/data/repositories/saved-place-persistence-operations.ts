import type { Database } from '../database/database';

import type {
  DiscoverCandidateSource,
  SavedPlace,
  SavedPlaceId,
  SavedPlaceKind,
} from '../../domain/entities';

interface SavedPlaceRow {
  id: string;
  kind: string;
  grounded_identity: string;
  source: string;
  created_at: string;
  updated_at: string;
}

function mapSavedPlace(
  row: SavedPlaceRow,
): SavedPlace {
  return {
    id: row.id,
    kind: row.kind as SavedPlaceKind,
    groundedIdentity: row.grounded_identity,
    source: row.source as DiscoverCandidateSource,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listSavedPlaces(
  database: Database,
): Promise<SavedPlace[]> {
  const rows =
    await database.query<SavedPlaceRow>(
      `
        SELECT
          id,
          kind,
          grounded_identity,
          source,
          created_at,
          updated_at
        FROM saved_places
        ORDER BY created_at DESC, id DESC;
      `,
    );

  return rows.map(mapSavedPlace);
}

export async function getSavedPlaceByIdentity(
  database: Database,
  groundedIdentity: string,
): Promise<SavedPlace | null> {
  const row =
    await database.queryFirst<SavedPlaceRow>(
      `
        SELECT
          id,
          kind,
          grounded_identity,
          source,
          created_at,
          updated_at
        FROM saved_places
        WHERE grounded_identity = ?;
      `,
      [groundedIdentity],
    );

  return row ? mapSavedPlace(row) : null;
}

export async function saveSavedPlace(
  database: Database,
  place: SavedPlace,
): Promise<void> {
  await database.execute(
    `
      INSERT INTO saved_places (
        id,
        kind,
        grounded_identity,
        source,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(grounded_identity) DO UPDATE SET
        kind = excluded.kind,
        source = excluded.source,
        updated_at = excluded.updated_at;
    `,
    [
      place.id,
      place.kind,
      place.groundedIdentity,
      place.source,
      place.createdAt,
      place.updatedAt,
    ],
  );
}

export async function deleteSavedPlace(
  database: Database,
  id: SavedPlaceId,
): Promise<void> {
  await database.execute(
    `DELETE FROM saved_places WHERE id = ?;`,
    [id],
  );
}
