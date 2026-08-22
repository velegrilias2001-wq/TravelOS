import { create } from 'zustand';

import type {
    Trip,
    TripId,
} from '@/domain/entities';

import { tripService } from '@/services/trip-service';

interface TripStoreState {
  trips: Trip[];

  activeTripId: TripId | null;
  activeTrip: Trip | null;

  isLoading: boolean;
  error: string | null;

  loadTrips(): Promise<void>;

  openTrip(
    id: TripId,
  ): Promise<Trip | null>;

  saveTrip(
    trip: Trip,
  ): Promise<void>;

  deleteTrip(
    id: TripId,
  ): Promise<void>;

  clearError(): void;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown TravelOS error';
}

export const useTripStore =
  create<TripStoreState>((set, get) => ({
    trips: [],

    activeTripId: null,
    activeTrip: null,

    isLoading: false,
    error: null,

    loadTrips: async () => {
      set({
        isLoading: true,
        error: null,
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
          error: getErrorMessage(error),
        });
      }
    },

    openTrip: async (id) => {
      set({
        isLoading: true,
        error: null,
      });

      try {
        const trip =
          await tripService.getTrip(id);

        set({
          activeTripId: trip ? id : null,
          activeTrip: trip,
          isLoading: false,
        });

        return trip;
      } catch (error) {
        set({
          isLoading: false,
          error: getErrorMessage(error),
        });

        return null;
      }
    },

    saveTrip: async (trip) => {
      set({
        isLoading: true,
        error: null,
      });

      try {
        await tripService.saveTrip(trip);

        const trips =
          await tripService.listTrips();

        const isActive =
          get().activeTripId === trip.id;

        set({
          trips,
          activeTrip:
            isActive
              ? trip
              : get().activeTrip,
          isLoading: false,
        });
      } catch (error) {
        set({
          isLoading: false,
          error: getErrorMessage(error),
        });

        throw error;
      }
    },

    deleteTrip: async (id) => {
      set({
        isLoading: true,
        error: null,
      });

      try {
        await tripService.deleteTrip(id);

        const trips =
          await tripService.listTrips();

        const wasActive =
          get().activeTripId === id;

        set({
          trips,
          activeTripId:
            wasActive
              ? null
              : get().activeTripId,
          activeTrip:
            wasActive
              ? null
              : get().activeTrip,
          isLoading: false,
        });
      } catch (error) {
        set({
          isLoading: false,
          error: getErrorMessage(error),
        });

        throw error;
      }
    },

    clearError: () => {
      set({ error: null });
    },
  }));