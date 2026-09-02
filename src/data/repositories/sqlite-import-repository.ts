import type { Database } from '../database/database';
import { travelOSDatabase } from '../database/expo-sqlite-database';

import type { Booking } from '../../domain/entities/booking';
import type {
  ImportBatch,
  ImportBatchId,
  ImportClaim,
  ImportClaimId,
} from '../../domain/entities/import-claim';
import type {
  ImportRepository,
} from '../../domain/repositories/import-repository';

import {
  acceptImportClaim,
  getImportBatch,
  getImportBatchByContentHash,
  getImportClaim,
  listImportBatches,
  listImportClaims,
  saveImportBatchWithClaims,
  saveImportClaim,
} from './import-persistence-operations';

export class SQLiteImportRepository
  implements ImportRepository
{
  constructor(
    private readonly database: Database =
      travelOSDatabase,
  ) {}

  async listBatches(): Promise<ImportBatch[]> {
    return listImportBatches(this.database);
  }

  async getBatch(
    id: ImportBatchId,
  ): Promise<ImportBatch | null> {
    return getImportBatch(this.database, id);
  }

  async getBatchByContentHash(
    contentHash: string,
  ): Promise<ImportBatch | null> {
    return getImportBatchByContentHash(
      this.database,
      contentHash,
    );
  }

  async listClaims(
    batchId: ImportBatchId,
  ): Promise<ImportClaim[]> {
    return listImportClaims(this.database, batchId);
  }

  async getClaim(
    id: ImportClaimId,
  ): Promise<ImportClaim | null> {
    return getImportClaim(this.database, id);
  }

  async saveBatch(
    batch: ImportBatch,
    claims: ImportClaim[],
  ): Promise<void> {
    await saveImportBatchWithClaims(
      this.database,
      batch,
      claims,
    );
  }

  async saveClaim(claim: ImportClaim): Promise<void> {
    await saveImportClaim(this.database, claim);
  }

  async acceptClaim(
    claim: ImportClaim,
    booking: Booking,
  ): Promise<void> {
    await acceptImportClaim(
      this.database,
      claim,
      booking,
    );
  }
}

export const importRepository =
  new SQLiteImportRepository();
