import type { TripId } from '../entities/trip';
import type { TripFxRate } from '../entities/fx-rate';

export interface FxRateRepository {
  getByTripId(tripId: TripId): Promise<TripFxRate[]>;

  save(rate: TripFxRate): Promise<void>;

  delete(id: string): Promise<void>;
}
