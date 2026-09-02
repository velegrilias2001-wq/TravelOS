import type {
  Database,
  DatabaseConnection,
} from '../database/database';

import type {
  ImportBatch,
  ImportBatchId,
  ImportClaim,
  ImportClaimConfidence,
  ImportClaimEvidence,
  ImportClaimId,
  ImportClaimKind,
  ImportClaimStatus,
  ImportSourceKind,
} from '../../domain/entities/import-claim';
import type { Booking } from '../../domain/entities/booking';

import { writeCanonicalBooking } from './booking-persistence-operations';

interface ImportBatchRow {
  id: string;
  source_kind: string;
  source_label: string;
  content_hash: string;
  skipped_count: number;
  created_at: string;
}

interface ImportClaimRow {
  id: string;
  batch_id: string;
  kind: string;
  status: string;
  title: string;
  start_at: string | null;
  end_at: string | null;
  location_text: string | null;
  ics_uid: string | null;
  confidence: string;
  evidence_json: string;
  accepted_trip_id: string | null;
  accepted_booking_id: string | null;
  created_at: string;
  updated_at: string;
}

function mapBatch(row: ImportBatchRow): ImportBatch {
  return {
    id: row.id,
    sourceKind: row.source_kind as ImportSourceKind,
    sourceLabel: row.source_label,
    contentHash: row.content_hash,
    skippedCount: row.skipped_count,
    createdAt: row.created_at,
  };
}

function mapClaim(row: ImportClaimRow): ImportClaim {
  return {
    id: row.id,
    batchId: row.batch_id,
    kind: row.kind as ImportClaimKind,
    status: row.status as ImportClaimStatus,
    title: row.title,
    startAt: row.start_at ?? undefined,
    endAt: row.end_at ?? undefined,
    locationText: row.location_text ?? undefined,
    icsUid: row.ics_uid ?? undefined,
    confidence: row.confidence as ImportClaimConfidence,
    evidence: parseEvidence(row.evidence_json),
    acceptedTripId: row.accepted_trip_id ?? undefined,
    acceptedBookingId: row.accepted_booking_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseEvidence(raw: string): ImportClaimEvidence {
  try {
    const parsed = JSON.parse(raw) as ImportClaimEvidence;

    if (
      !parsed ||
      !Array.isArray(parsed.fieldsPresent)
    ) {
      return { fieldsPresent: [] };
    }

    return parsed;
  } catch {
    return { fieldsPresent: [] };
  }
}

export async function listImportBatches(
  database: Database,
): Promise<ImportBatch[]> {
  const rows = await database.query<ImportBatchRow>(
    `
      SELECT
        id,
        source_kind,
        source_label,
        content_hash,
        skipped_count,
        created_at
      FROM import_batches
      ORDER BY created_at DESC, id DESC;
    `,
  );

  return rows.map(mapBatch);
}

export async function getImportBatch(
  database: Database,
  id: ImportBatchId,
): Promise<ImportBatch | null> {
  const row = await database.queryFirst<ImportBatchRow>(
    `
      SELECT
        id,
        source_kind,
        source_label,
        content_hash,
        skipped_count,
        created_at
      FROM import_batches
      WHERE id = ?;
    `,
    [id],
  );

  return row ? mapBatch(row) : null;
}

export async function getImportBatchByContentHash(
  database: Database,
  contentHash: string,
): Promise<ImportBatch | null> {
  const row = await database.queryFirst<ImportBatchRow>(
    `
      SELECT
        id,
        source_kind,
        source_label,
        content_hash,
        skipped_count,
        created_at
      FROM import_batches
      WHERE content_hash = ?;
    `,
    [contentHash],
  );

  return row ? mapBatch(row) : null;
}

export async function listImportClaims(
  database: Database,
  batchId: ImportBatchId,
): Promise<ImportClaim[]> {
  const rows = await database.query<ImportClaimRow>(
    `
      SELECT
        id,
        batch_id,
        kind,
        status,
        title,
        start_at,
        end_at,
        location_text,
        ics_uid,
        confidence,
        evidence_json,
        accepted_trip_id,
        accepted_booking_id,
        created_at,
        updated_at
      FROM import_claims
      WHERE batch_id = ?
      ORDER BY
        CASE
          WHEN start_at IS NULL THEN 1
          ELSE 0
        END,
        start_at ASC,
        created_at ASC;
    `,
    [batchId],
  );

  return rows.map(mapClaim);
}

export async function getImportClaim(
  database: Database,
  id: ImportClaimId,
): Promise<ImportClaim | null> {
  const row = await database.queryFirst<ImportClaimRow>(
    `
      SELECT
        id,
        batch_id,
        kind,
        status,
        title,
        start_at,
        end_at,
        location_text,
        ics_uid,
        confidence,
        evidence_json,
        accepted_trip_id,
        accepted_booking_id,
        created_at,
        updated_at
      FROM import_claims
      WHERE id = ?;
    `,
    [id],
  );

  return row ? mapClaim(row) : null;
}

export async function saveImportBatchWithClaims(
  database: Database,
  batch: ImportBatch,
  claims: ImportClaim[],
): Promise<void> {
  await database.transaction(async (transaction) => {
    await transaction.execute(
      `
        INSERT INTO import_batches (
          id,
          source_kind,
          source_label,
          content_hash,
          skipped_count,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?);
      `,
      [
        batch.id,
        batch.sourceKind,
        batch.sourceLabel,
        batch.contentHash,
        batch.skippedCount,
        batch.createdAt,
      ],
    );

    for (const claim of claims) {
      await insertClaim(transaction, claim);
    }
  });
}

export async function saveImportClaim(
  database: Database,
  claim: ImportClaim,
): Promise<void> {
  await insertClaim(database, claim);
}

export async function acceptImportClaim(
  database: Database,
  claim: ImportClaim,
  booking: Booking,
): Promise<void> {
  await database.transaction(async (transaction) => {
    await writeCanonicalBooking(transaction, booking);
    await insertClaim(transaction, claim);
  });
}

async function insertClaim(
  connection: DatabaseConnection,
  claim: ImportClaim,
): Promise<void> {
  await connection.execute(
    `
      INSERT INTO import_claims (
        id,
        batch_id,
        kind,
        status,
        title,
        start_at,
        end_at,
        location_text,
        ics_uid,
        confidence,
        evidence_json,
        accepted_trip_id,
        accepted_booking_id,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        title = excluded.title,
        start_at = excluded.start_at,
        end_at = excluded.end_at,
        location_text = excluded.location_text,
        ics_uid = excluded.ics_uid,
        confidence = excluded.confidence,
        evidence_json = excluded.evidence_json,
        accepted_trip_id = excluded.accepted_trip_id,
        accepted_booking_id = excluded.accepted_booking_id,
        updated_at = excluded.updated_at;
    `,
    [
      claim.id,
      claim.batchId,
      claim.kind,
      claim.status,
      claim.title,
      claim.startAt ?? null,
      claim.endAt ?? null,
      claim.locationText ?? null,
      claim.icsUid ?? null,
      claim.confidence,
      JSON.stringify(claim.evidence),
      claim.acceptedTripId ?? null,
      claim.acceptedBookingId ?? null,
      claim.createdAt,
      claim.updatedAt,
    ],
  );
}
