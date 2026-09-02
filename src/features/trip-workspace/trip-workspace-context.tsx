import { Ionicons } from '@expo/vector-icons';
import {
  useFocusEffect,
  useRouter,
} from 'expo-router';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';
import type {
  AccommodationId,
  Booking,
  BookingId,
  BudgetItemId,
  TravelerId,
  TripDayId,
  TripId,
  TripStop,
  TripStopId,
} from '@/domain/entities';
import {
  accommodationService,
} from '@/services/accommodation-service';
import type {
  AccommodationInput,
} from '@/services/accommodation-details';
import {
  budgetService,
  type BudgetExpenseInput,
} from '@/services/budget-service';
import {
  tripService,
  type TripWorkspace,
} from '@/services/trip-service';
import {
  travelerService,
} from '@/services/traveler-service';
import type {
  TravelerInput,
} from '@/services/traveler-details';
import type {
  TripDetailsInput,
} from '@/services/trip-details';
import { useTripStore } from '@/store/trip-store';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  spacing,
} from '@/theme';

import {
  TripWorkspaceLifecycle,
  type TripWorkspaceStatus,
} from './trip-workspace-lifecycle';

interface TripWorkspaceActions {
  updateTrip(input: TripDetailsInput): Promise<void>;
  deleteTrip(): Promise<void>;

  addStop(stop: TripStop): Promise<void>;
  updateStop(stop: TripStop): Promise<void>;
  deleteStop(stopId: TripStopId): Promise<void>;
  reorderStops(stops: TripStop[]): Promise<void>;
  assignDayDestination(
    dayId: TripDayId,
    destinationId: string | null,
  ): Promise<void>;

  addBooking(booking: Booking): Promise<void>;
  updateBooking(booking: Booking): Promise<void>;
  deleteBooking(bookingId: BookingId): Promise<void>;

  addAccommodation(
    input: AccommodationInput,
  ): Promise<void>;
  updateAccommodation(
    accommodationId: AccommodationId,
    input: AccommodationInput,
  ): Promise<void>;
  deleteAccommodation(
    accommodationId: AccommodationId,
  ): Promise<void>;

  createTraveler(
    input: TravelerInput,
  ): Promise<void>;
  addExistingTraveler(
    travelerId: TravelerId,
  ): Promise<void>;
  updateTraveler(
    travelerId: TravelerId,
    input: TravelerInput,
  ): Promise<void>;
  removeTraveler(
    travelerId: TravelerId,
  ): Promise<void>;

  setPlannedBudget(plannedAmount: number): Promise<void>;
  addExpense(input: BudgetExpenseInput): Promise<void>;
  updateExpense(
    expenseId: BudgetItemId,
    input: BudgetExpenseInput,
  ): Promise<void>;
  deleteExpense(expenseId: BudgetItemId): Promise<void>;
}

interface TripWorkspaceContextValue {
  tripId: TripId | null;
  status: TripWorkspaceStatus;
  workspace: TripWorkspace | null;
  error: unknown | null;

  refreshIfNeeded(): Promise<void>;
  retry(): Promise<void>;

  actions: TripWorkspaceActions;
}

interface ActiveTripWorkspaceContextValue
  extends Omit<
    TripWorkspaceContextValue,
    'tripId' | 'workspace'
  > {
  tripId: TripId;
  workspace: TripWorkspace;
}

const TripWorkspaceContext =
  createContext<TripWorkspaceContextValue | null>(
    null,
  );

interface TripWorkspaceProviderProps
  extends PropsWithChildren {
  tripId: TripId | null;
}

function requireWorkspaceTripId(
  tripId: TripId | null,
): TripId {
  if (!tripId) {
    throw new Error(
      'TripWorkspace does not have a trip ID',
    );
  }

  return tripId;
}

async function refreshTripListCache(): Promise<void> {
  try {
    await useTripStore.getState().loadTrips();
  } catch (error) {
    console.error(
      '[TripWorkspace] Trip-list refresh failed:',
      error,
    );
  }
}

export function TripWorkspaceProvider({
  tripId,
  children,
}: TripWorkspaceProviderProps) {
  const router = useRouter();

  const lifecycle = useMemo(
    () =>
      new TripWorkspaceLifecycle(
        tripId,
        (id) =>
          tripService.getWorkspace(id),
      ),
    [tripId],
  );

  const snapshot = useSyncExternalStore(
    lifecycle.subscribe,
    lifecycle.getSnapshot,
    lifecycle.getSnapshot,
  );

  useEffect(() => {
    void lifecycle.refreshIfNeeded();

    return () => {
      lifecycle.dispose();
    };
  }, [lifecycle]);

  const actions = useMemo<TripWorkspaceActions>(
    () => ({
      updateTrip: async (input) => {
        await lifecycle.runMutation(() =>
          tripService.updateTrip(
            requireWorkspaceTripId(tripId),
            input,
          ),
        );

        await refreshTripListCache();
      },

      deleteTrip: async () => {
        await lifecycle.runMutation(() =>
          tripService.deleteTrip(
            requireWorkspaceTripId(tripId),
          ),
        );

        await refreshTripListCache();
      },

      addStop: (stop) =>
        lifecycle.runMutation(() =>
          tripService.addStop(stop),
        ),

      updateStop: (stop) =>
        lifecycle.runMutation(() =>
          tripService.updateStop(stop),
        ),

      deleteStop: (stopId) =>
        lifecycle.runMutation(() =>
          tripService.deleteStop(stopId),
        ),

      reorderStops: (stops) =>
        lifecycle.runMutation(() =>
          tripService.reorderStops(stops),
        ),

      assignDayDestination: (dayId, destinationId) =>
        lifecycle.runMutation(() =>
          tripService.assignDayDestination(
            requireWorkspaceTripId(tripId),
            dayId,
            destinationId,
          ),
        ),

      addBooking: (booking) =>
        lifecycle.runMutation(() =>
          tripService.addBooking(booking),
        ),

      updateBooking: (booking) =>
        lifecycle.runMutation(() =>
          tripService.updateBooking(booking),
        ),

      deleteBooking: (bookingId) =>
        lifecycle.runMutation(() =>
          tripService.deleteBooking(bookingId),
        ),

      addAccommodation: (input) =>
        lifecycle.runMutation(() =>
          accommodationService.addAccommodation(
            requireWorkspaceTripId(tripId),
            input,
          ),
        ),

      updateAccommodation: (
        accommodationId,
        input,
      ) =>
        lifecycle.runMutation(() =>
          accommodationService.updateAccommodation(
            requireWorkspaceTripId(tripId),
            accommodationId,
            input,
          ),
        ),

      deleteAccommodation: (
        accommodationId,
      ) =>
        lifecycle.runMutation(() =>
          accommodationService.deleteAccommodation(
            requireWorkspaceTripId(tripId),
            accommodationId,
          ),
        ),

      createTraveler: (input) =>
        lifecycle.runMutation(() =>
          travelerService.createTraveler(
            requireWorkspaceTripId(tripId),
            input,
          ),
        ),

      addExistingTraveler: (travelerId) =>
        lifecycle.runMutation(() =>
          travelerService.addExistingTraveler(
            requireWorkspaceTripId(tripId),
            travelerId,
          ),
        ),

      updateTraveler: (travelerId, input) =>
        lifecycle.runMutation(() =>
          travelerService.updateTraveler(
            requireWorkspaceTripId(tripId),
            travelerId,
            input,
          ),
        ),

      removeTraveler: (travelerId) =>
        lifecycle.runMutation(() =>
          travelerService.removeTraveler(
            requireWorkspaceTripId(tripId),
            travelerId,
          ),
        ),

      setPlannedBudget: (plannedAmount) =>
        lifecycle.runMutation(() =>
          budgetService.setPlannedBudget(
            requireWorkspaceTripId(tripId),
            plannedAmount,
          ),
        ),

      addExpense: (input) =>
        lifecycle.runMutation(() =>
          budgetService.addExpense(
            requireWorkspaceTripId(tripId),
            input,
          ),
        ),

      updateExpense: (expenseId, input) =>
        lifecycle.runMutation(() =>
          budgetService.updateExpense(
            requireWorkspaceTripId(tripId),
            expenseId,
            input,
          ),
        ),

      deleteExpense: (expenseId) =>
        lifecycle.runMutation(() =>
          budgetService.deleteExpense(
            requireWorkspaceTripId(tripId),
            expenseId,
          ),
        ),
    }),
    [lifecycle, tripId],
  );

  const value = useMemo<TripWorkspaceContextValue>(
    () => ({
      tripId,
      status: snapshot.status,
      workspace: snapshot.workspace,
      error: snapshot.error,
      refreshIfNeeded:
        lifecycle.refreshIfNeeded,
      retry: lifecycle.retry,
      actions,
    }),
    [
      actions,
      lifecycle,
      snapshot,
      tripId,
    ],
  );

  const backToTrips = useCallback(() => {
    router.replace('/trips');
  }, [router]);

  let content = children;

  if (
    snapshot.status === 'loading' ||
    (
      snapshot.status === 'refreshing' &&
      !snapshot.workspace
    )
  ) {
    content = (
      <TripWorkspaceState
        icon="cloud-download-outline"
        title="Opening your trip"
        body="Loading the latest plan from your device…"
        loading
      />
    );
  } else if (
    snapshot.status === 'not-found'
  ) {
    content = (
      <TripWorkspaceState
        icon="map-outline"
        title="Trip not found"
        body="This trip may have been removed, or the link is no longer valid."
        primaryLabel="Back to Trips"
        onPrimaryPress={backToTrips}
      />
    );
  } else if (
    snapshot.status === 'error'
  ) {
    content = (
      <TripWorkspaceState
        icon="warning-outline"
        title={
          snapshot.workspace
            ? "Couldn't refresh this trip"
            : "Couldn't open this trip"
        }
        body="Your saved data has not been changed. Try loading it again."
        primaryLabel="Try again"
        onPrimaryPress={() => {
          void lifecycle.retry();
        }}
        secondaryLabel="Back to Trips"
        onSecondaryPress={backToTrips}
      />
    );
  }

  return (
    <TripWorkspaceContext.Provider
      value={value}
    >
      {content}
    </TripWorkspaceContext.Provider>
  );
}

export function useTripWorkspace(): ActiveTripWorkspaceContextValue {
  const context = useContext(
    TripWorkspaceContext,
  );

  if (!context) {
    throw new Error(
      'useTripWorkspace must be used inside TripWorkspaceProvider',
    );
  }

  if (!context.tripId || !context.workspace) {
    throw new Error(
      'TripWorkspace is not ready for consumption',
    );
  }

  return {
    ...context,
    tripId: context.tripId,
    workspace: context.workspace,
  };
}

export function useTripWorkspaceFocusRefresh(): void {
  const { refreshIfNeeded } =
    useTripWorkspace();

  useFocusEffect(
    useCallback(() => {
      void refreshIfNeeded();
    }, [refreshIfNeeded]),
  );
}

interface TripWorkspaceStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  loading?: boolean;
  primaryLabel?: string;
  onPrimaryPress?: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
}

function TripWorkspaceState({
  icon,
  title,
  body,
  loading = false,
  primaryLabel,
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
}: TripWorkspaceStateProps) {
  return (
    <Screen>
      <View style={styles.stateWrap}>
        <View style={styles.iconWrap}>
          {loading ? (
            <ActivityIndicator
              color={colors.brand}
            />
          ) : (
            <Ionicons
              name={icon}
              size={27}
              color={colors.brand}
            />
          )}
        </View>

        <Text style={styles.stateTitle}>
          {title}
        </Text>

        <Text style={styles.stateBody}>
          {body}
        </Text>

        {primaryLabel && onPrimaryPress && (
          <Pressable
            style={styles.primaryButton}
            onPress={onPrimaryPress}
          >
            <Text
              style={styles.primaryButtonText}
            >
              {primaryLabel}
            </Text>
          </Pressable>
        )}

        {secondaryLabel &&
          onSecondaryPress && (
            <Pressable
              style={styles.secondaryButton}
              onPress={onSecondaryPress}
            >
              <Text
                style={
                  styles.secondaryButtonText
                }
              >
                {secondaryLabel}
              </Text>
            </Pressable>
          )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },

  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[6],
    backgroundColor: colors.brandSoft,
  },

  stateTitle: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.title,
    lineHeight: lineHeight.title,
    color: colors.textPrimary,
    textAlign: 'center',
  },

  stateBody: {
    maxWidth: 320,
    marginTop: spacing[3],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  primaryButton: {
    minWidth: 180,
    height: 52,
    marginTop: spacing[7],
    paddingHorizontal: spacing[6],
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },

  primaryButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textInverse,
  },

  secondaryButton: {
    minWidth: 180,
    height: 48,
    marginTop: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.brand,
  },
});
