import type { Trip, TripId } from '../entities/trip';
import type { TripDay } from '../entities/trip-day';
import type {
  TripStop,
  TripStopId,
} from '../entities/trip-stop';

export interface TripRepository {
  getAll(): Promise<Trip[]>;

  getById(id: TripId): Promise<Trip | null>;

  save(trip: Trip): Promise<void>;

  delete(id: TripId): Promise<void>;

  getDays(tripId: TripId): Promise<TripDay[]>;

  getDaysForTrips(
    tripIds: readonly TripId[],
  ): Promise<TripDay[]>;

  getStopsForTrips(
    tripIds: readonly TripId[],
  ): Promise<TripStop[]>;

  saveDay(day: TripDay): Promise<void>;

  ensureDays(
    days: TripDay[],
  ): Promise<void>;

  getStops(tripId: TripId): Promise<TripStop[]>;

  getStopById(id: TripStopId): Promise<TripStop | null>;

  saveStop(stop: TripStop): Promise<void>;

  reorderStops(
    stops: TripStop[],
  ): Promise<void>;

  deleteStop(id: TripStopId): Promise<void>;
}
