import * as Crypto from 'expo-crypto';

import { repositories } from './repository-registry';
import { ImportReviewService } from './import-review-service';

export const importReviewService = new ImportReviewService(
  {
    imports: repositories.imports,
    trips: repositories.trip,
    bookings: repositories.booking,
  },
  () => Crypto.randomUUID(),
);
