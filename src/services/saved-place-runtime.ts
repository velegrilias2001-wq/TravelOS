import * as Crypto from 'expo-crypto';

import {
  repositories,
} from './repository-registry';
import {
  SavedPlaceService,
} from './saved-place-service';

export const savedPlaceService =
  new SavedPlaceService(
    repositories,
    () => Crypto.randomUUID(),
  );
