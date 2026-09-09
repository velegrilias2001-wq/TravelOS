import { create } from 'zustand';
import type { Trip, TripId } from '@/domain/entities';
import { tripService } from '@/services/trip-service';
import { createLatestListLoader } from '@/services/latest-list-loader';

interface TripStoreState {
  trips: Trip[];
  isLoading: boolean;
  loadTrips(): Promise<void>;
  clearTrips(): void;
  saveTrip(trip: Trip): Promise<void>;
  deleteTrip(id: TripId): Promise<void>;
}

export const useTripStore = create<TripStoreState>((set, get) => {
  const loader = createLatestListLoader(
    () => tripService.listTrips(),
    set,
    () => {
      void import('@/services/trip-notifications-runtime')
        .then(module => module.reconcileTripNotifications())
        .catch(() => {});
    },
  );
  return {
    trips: [],
    isLoading: false,
    loadTrips: loader.load,
    clearTrips: loader.clear,
    saveTrip: async trip => {
      await tripService.saveTrip(trip);
      await get().loadTrips();
    },
    deleteTrip: async id => {
      await tripService.deleteTrip(id);
      await get().loadTrips();
    },
  };
});
