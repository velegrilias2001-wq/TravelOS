import type {
  ImportBatch,
  ImportBatchId,
  ImportClaim,
  ImportClaimId,
} from '../entities/import-claim';
import type { Booking } from '../entities/booking';

export interface ImportRepository {
  listBatches(): Promise<ImportBatch[]>;

  getBatch(
    id: ImportBatchId,
  ): Promise<ImportBatch | null>;

  getBatchByContentHash(
    contentHash: string,
  ): Promise<ImportBatch | null>;

  listClaims(
    batchId: ImportBatchId,
  ): Promise<ImportClaim[]>;

  getClaim(
    id: ImportClaimId,
  ): Promise<ImportClaim | null>;

  saveBatch(
    batch: ImportBatch,
    claims: ImportClaim[],
  ): Promise<void>;

  saveClaim(claim: ImportClaim): Promise<void>;

  acceptClaim(
    claim: ImportClaim,
    booking: Booking,
  ): Promise<void>;
}
