import { create } from 'zustand';

import type {
  Trip,
  TripId,
} from '@/domain/entities';

import { tripService } from '@/services/trip-service';

interface TripStoreState {
  trips: Trip[];

  isLoading: boolean;

  loadTrips(): Promise<void>;

  saveTrip(
    trip: Trip,
  ): Promise<void>;

  deleteTrip(
    id: TripId,
  ): Promise<void>;
}

export const useTripStore =
  create<TripStoreState>((set) => ({
    trips: [],

    isLoading: false,

    loadTrips: async () => {
      set({
        isLoading: true,
      });

      try {
        const trips =
          await tripService.listTrips();

        set({
          trips,
          isLoading: false,
        });
      } catch (error) {
        set({
          isLoading: false,
        });

        throw error;
      }
    },

    saveTrip: async (trip) => {
      set({
        isLoading: true,
      });

      try {
        await tripService.saveTrip(trip);

        const trips =
          await tripService.listTrips();

        set({
          trips,
          isLoading: false,
        });
      } catch (error) {
        set({
          isLoading: false,
        });

        throw error;
      }
    },

    deleteTrip: async (id) => {
      set({
        isLoading: true,
      });

      try {
        await tripService.deleteTrip(id);

        const trips =
          await tripService.listTrips();

        set({
          trips,
          isLoading: false,
        });
      } catch (error) {
        set({
          isLoading: false,
        });

        throw error;
      }
    },
  }));
