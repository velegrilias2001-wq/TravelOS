import type { Database } from '../database/database';
import { travelOSDatabase } from '../database/expo-sqlite-database';

import type { TripFxRate } from '../../domain/entities/fx-rate';
import type { TripId } from '../../domain/entities/trip';
import type { FxRateRepository } from '../../domain/repositories/fx-rate-repository';

import {
  deleteTripFxRate,
  loadTripFxRates,
  upsertTripFxRate,
} from './fx-rate-persistence-operations';

export class SQLiteFxRateRepository
  implements FxRateRepository
{
  constructor(
    private readonly database: Database = travelOSDatabase,
  ) {}

  async getByTripId(
    tripId: TripId,
  ): Promise<TripFxRate[]> {
    return loadTripFxRates(this.database, tripId);
  }

  async save(rate: TripFxRate): Promise<void> {
    await upsertTripFxRate(this.database, rate);
  }

  async delete(id: string): Promise<void> {
    await deleteTripFxRate(this.database, id);
  }
}

export const fxRateRepository =
  new SQLiteFxRateRepository();
