import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import {
  pickLocation,
} from 'expo-location-picker';

import {
  FREE_TIME_ACTIVITY_COPY,
  formatFreeTimeDuration,
  freeTimeAdviceKey,
} from '@/features/copilot/free-time-activity-copy';
import { PlanAssistCard } from '@/features/copilot/plan-assist-card';
import { useFreeTimeAdvice } from '@/features/copilot/use-free-time-advice';
import { FadeIn } from '@/features/motion/fade-in';
import { playLightImpact } from '@/features/motion/haptic';
import {
  Screen,
} from '@/components/ui/screen';
import { UtilityScreenHeader } from '@/components/ui/utility-screen';
import { formatCalendarDateForDisplay } from '@/services/time-truth';
import { hasUnsavedStopDraft } from '@/services/stop-editor-draft';

import type {
  TravelDNA,
  TripDay,
  TripStop,
  TripStopType,
} from '@/domain/entities';

import {
  useTripWorkspace,
  useTripWorkspaceFocusRefresh,
} from '@/features/trip-workspace/trip-workspace-context';

import {
  bookingsLinkedToStop,
} from '@/services/booking-stop-relationship';
import {
  singleMappedDestinationCoordinate,
  tripDestinationLabel,
} from '@/services/destination-authoring';
import {
  tripDayDestination,
} from '@/services/trip-day-destination';
import {
  deriveDayFreeTimeGaps,
  deriveDayTimeConflicts,
} from '@/services/itinerary-flexibility';
import {
  planStopLivedBadge,
} from '@/services/stop-lived-progress';
import {
  buildPlanAssistCandidates,
  buildStopFromPlanAssistCandidate,
  type PlanAssistCandidate,
} from '@/services/plan-assist';
import {
  travelDNAService,
} from '@/services/travel-dna-runtime';
import {
  importReviewService,
} from '@/services/import-review-runtime';

import { colors } from '@/theme';
import { styles } from '@/features/trip-plan/plan-styles';
import {
  STOP_TYPES,
  hasCoordinates,
  type StopLocation,
} from '@/features/trip-plan/stop-types';
import { StopEditorModal } from '@/features/trip-plan/stop-editor-modal';

function firstRouteParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function formatDayDate(
  date: string,
): string {
  return formatCalendarDateForDisplay(
    date,
    {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    },
  );
}

function getStopIcon(
  type: TripStopType,
): keyof typeof Ionicons.glyphMap {
  return (
    STOP_TYPES.find(
      (item) =>
        item.value === type,
    )?.icon ??
    'location-outline'
  );
}

function formatStopTimeRange(
  stop: Pick<TripStop, 'startTime' | 'endTime'>,
): string | null {
  if (stop.startTime && stop.endTime) {
    return `${stop.startTime}–${stop.endTime}`;
  }

  if (stop.startTime) {
    return stop.startTime;
  }

  if (stop.endTime) {
    return `Until ${stop.endTime}`;
  }

  return null;
}


export default function PlanScreen() {
  const router = useRouter();

  const routeParams =
    useLocalSearchParams<{
      stopId?: string | string[];
      source?: string | string[];
      importClaimId?: string | string[];
      importTitle?: string | string[];
      importStartTime?: string | string[];
      importEndTime?: string | string[];
      importDayDate?: string | string[];
      importLocationName?: string | string[];
    }>();

  const requestedStopId = firstRouteParam(
    routeParams.stopId,
  );

  const importSource = firstRouteParam(
    routeParams.source,
  );
  const importClaimId = firstRouteParam(
    routeParams.importClaimId,
  );
  const importTitle = firstRouteParam(
    routeParams.importTitle,
  );
  const importStartTime = firstRouteParam(
    routeParams.importStartTime,
  );
  const importEndTime = firstRouteParam(
    routeParams.importEndTime,
  );
  const importDayDate = firstRouteParam(
    routeParams.importDayDate,
  );
  const importLocationName = firstRouteParam(
    routeParams.importLocationName,
  );

  const handledStopIdRef =
    useRef<string | null>(null);

  const handledImportClaimIdRef =
    useRef<string | null>(null);

  const pendingImportClaimIdRef =
    useRef<string | null>(null);

  const {
    workspace,
    actions,
    tripId,
  } = useTripWorkspace();

  useTripWorkspaceFocusRefresh();

  const [collapsedDayIds, setCollapsedDayIds] =
    useState<Set<string>>(() => new Set());

  const [focusedDayId, setFocusedDayId] =
    useState<string | null>(null);

  const toggleDay = (dayId: string) => {
    setCollapsedDayIds((current) => {
      const next = new Set(current);

      if (next.has(dayId)) {
        next.delete(dayId);
      } else {
        next.add(dayId);
      }

      return next;
    });
  };

  const focusDay = (dayId: string) => {
    setFocusedDayId(dayId);
    setCollapsedDayIds((current) => {
      const next = new Set(current);
      next.delete(dayId);
      return next;
    });
  };

  const assignDayCity = async (
    day: TripDay,
    destinationId: string | null,
  ) => {
    try {
      await actions.assignDayDestination(
        day.id,
        destinationId,
      );
    } catch (error) {
      Alert.alert(
        'City was not assigned',
        error instanceof Error
          ? error.message
          : 'Try assigning the city again.',
      );
    }
  };

  const [
    selectedDay,
    setSelectedDay,
  ] =
    useState<TripDay | null>(
      null,
    );

  const [
    editingStop,
    setEditingStop,
  ] =
    useState<TripStop | null>(
      null,
    );

  const [
    title,
    setTitle,
  ] =
    useState('');

  const [
    time,
    setTime,
  ] =
    useState('');

  const [timeEdited, setTimeEdited] =
    useState(false);

  const [originalTime, setOriginalTime] =
    useState<string | undefined>();

  const [
    endTime,
    setEndTime,
  ] =
    useState('');

  const [
    endTimeEdited,
    setEndTimeEdited,
  ] =
    useState(false);

  const [
    originalEndTime,
    setOriginalEndTime,
  ] =
    useState<string | undefined>();

  const [
    type,
    setType,
  ] =
    useState<TripStopType>(
      'place',
    );

  const [
    pickedLocation,
    setPickedLocation,
  ] =
    useState<StopLocation | null>(
      null,
    );

  const [
    isPickingLocation,
    setIsPickingLocation,
  ] =
    useState(false);

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [travelDNA, setTravelDNA] =
    useState<TravelDNA | null>(null);

  const [acceptingAssistId, setAcceptingAssistId] =
    useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void (async () => {
        try {
          const profile = await travelDNAService.get();
          if (active) {
            setTravelDNA(profile);
          }
        } catch {
          if (active) {
            setTravelDNA(null);
          }
        }
      })();

      return () => {
        active = false;
      };
    }, []),
  );

  // Plan keeps its own free-time presentation; only the request logic and the
  // activity copy are shared with Companion and Copilot.
  const {
    adviceByKey: freeTimeAdviceByKey,
    errorByKey: freeTimeAdviceErrorByKey,
    loadingKey: loadingFreeTimeKey,
    requestAdvice: requestFreeTimeAdvice,
  } = useFreeTimeAdvice(tripId);

  const resetModal = () => {
    setSelectedDay(null);

    setEditingStop(null);

    setTitle('');
    setTime('');
    setTimeEdited(false);
    setOriginalTime(undefined);
    setEndTime('');
    setEndTimeEdited(false);
    setOriginalEndTime(undefined);

    setType('place');

    setPickedLocation(null);
    pendingImportClaimIdRef.current = null;
  };

  const clearImportLineParams = () => {
    if (importSource !== 'import_line') {
      return;
    }

    router.setParams({
      source: '',
      importClaimId: '',
      importTitle: '',
      importStartTime: '',
      importEndTime: '',
      importDayDate: '',
      importLocationName: '',
      importBatchId: '',
    });
  };

  const openCreate = (
    day: TripDay,
  ) => {
    setEditingStop(null);

    setSelectedDay(day);

    setTitle('');
    setTime('');
    setTimeEdited(false);
    setOriginalTime(undefined);
    setEndTime('');
    setEndTimeEdited(false);
    setOriginalEndTime(undefined);

    setType('place');

    setPickedLocation(null);
    pendingImportClaimIdRef.current = null;
  };

  const openCreateFromImportLine = (
    day: TripDay,
    draft: {
      claimId: string;
      title: string;
      startTime?: string;
      endTime?: string;
      locationName?: string;
    },
  ) => {
    setEditingStop(null);
    setSelectedDay(day);
    setTitle(draft.title);
    setTime(draft.startTime ?? '');
    setTimeEdited(false);
    setOriginalTime(undefined);
    setEndTime(draft.endTime ?? '');
    setEndTimeEdited(false);
    setOriginalEndTime(undefined);
    setType('place');
    setPickedLocation(
      draft.locationName
        ? { name: draft.locationName }
        : null,
    );
    pendingImportClaimIdRef.current = draft.claimId;
  };

  const openEdit = (
    day: TripDay,
    stop: TripStop,
  ) => {
    setSelectedDay(day);

    setEditingStop(stop);

    setTitle(
      stop.title,
    );

    setTime(
      stop.startTime ?? '',
    );
    setTimeEdited(false);
    setOriginalTime(stop.startTime);

    setEndTime(
      stop.endTime ?? '',
    );
    setEndTimeEdited(false);
    setOriginalEndTime(stop.endTime);

    setType(
      stop.type,
    );

    setPickedLocation(
      stop.location ?? null,
    );
  };

  const discardPromptOpen = useRef(false);

  const discardModal = () => {
    resetModal();

    if (requestedStopId) {
      handledStopIdRef.current =
        null;

      router.setParams({
        stopId: '',
      });
    }

    if (importSource === 'import_line') {
      handledImportClaimIdRef.current =
        importClaimId ?? null;
      clearImportLineParams();
    }
  };

  const closeModal = () => {
    if (isSaving || isPickingLocation || discardPromptOpen.current) {
      return;
    }

    if (!hasUnsavedStopDraft({
      title, type, startTime: time, endTime, location: pickedLocation,
    }, editingStop)) {
      discardModal();
      return;
    }

    discardPromptOpen.current = true;
    Alert.alert(
      'Discard unsaved changes?',
      'Your changes have not been saved. Keep editing to finish, or discard your changes.',
      [
        {
          text: 'Keep editing',
          style: 'cancel',
          onPress: () => { discardPromptOpen.current = false; },
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            discardPromptOpen.current = false;
            discardModal();
          },
        },
      ],
      { cancelable: true, onDismiss: () => { discardPromptOpen.current = false; } },
    );
  };

  useEffect(() => {
    if (
      !requestedStopId ||
      handledStopIdRef.current ===
        requestedStopId
    ) {
      return;
    }

    const stop =
      workspace.stops.find(
        (item) =>
          item.id ===
          requestedStopId,
      );

    const day = stop
      ? workspace.days.find(
          (item) =>
            item.id ===
            stop.dayId,
        )
      : undefined;

    if (!stop || !day) {
      return;
    }

    handledStopIdRef.current =
      requestedStopId;

    openEdit(day, stop);
  }, [
    requestedStopId,
    workspace.days,
    workspace.stops,
  ]);

  useEffect(() => {
    if (
      importSource !== 'import_line' ||
      !importClaimId ||
      !importTitle ||
      handledImportClaimIdRef.current ===
        importClaimId ||
      workspace.days.length === 0
    ) {
      return;
    }

    const matchedDay = importDayDate
      ? workspace.days.find(
          (day) => day.date === importDayDate,
        )
      : undefined;

    const day = matchedDay ?? workspace.days[0];

    if (!day) {
      return;
    }

    handledImportClaimIdRef.current = importClaimId;
    focusDay(day.id);
    openCreateFromImportLine(day, {
      claimId: importClaimId,
      title: importTitle.trim(),
      startTime: importStartTime?.trim() || undefined,
      endTime: importEndTime?.trim() || undefined,
      locationName:
        importLocationName?.trim() || undefined,
    });
  }, [
    importSource,
    importClaimId,
    importTitle,
    importStartTime,
    importEndTime,
    importDayDate,
    importLocationName,
    workspace.days,
  ]);

  const chooseLocation =
    async () => {
      if (!workspace) {
        return;
      }

      const destinationCoordinate =
        singleMappedDestinationCoordinate(
          workspace.trip.destinations,
        );

      const initialLatitude =
        pickedLocation
          ?.latitude ??
        destinationCoordinate
          ?.latitude;

      const initialLongitude =
        pickedLocation
          ?.longitude ??
        destinationCoordinate
          ?.longitude;

      try {
        setIsPickingLocation(
          true,
        );

        const result =
          await pickLocation({
            title:
              'Choose location',

            doneButtonTitle:
              'Use location',

            cancelButtonTitle:
              'Cancel',

            searchPlaceholder:
              'Search places or addresses…',

            initialRadiusMeters:
              5000,

            disableCurrentLocation:
              true,

            ...(typeof initialLatitude ===
              'number' &&
            typeof initialLongitude ===
              'number'
              ? {
                  initialLatitude,
                  initialLongitude,
                }
              : {}),

            theme: {
              primary:
                colors.brand,

              pin:
                colors.coral,

              colorScheme:
                'light',
            },
          });

        if (!result) {
          return;
        }

        const resultName =
          result.name
            ?.trim();

        const resultAddress =
          result.formattedAddress
            ?.trim();

        const locationName =
          resultName ||
          resultAddress ||
          title.trim() ||
          'Selected location';

        const location:
          StopLocation = {
            name:
              locationName,

            address:
              resultAddress ||
              undefined,

            latitude:
              result.latitude,

            longitude:
              result.longitude,
          };

        setPickedLocation(
          location,
        );

        if (resultName) {
          setTitle(
            resultName,
          );
        } else if (
          !title.trim()
        ) {
          setTitle(
            locationName,
          );
        }
      } catch (error) {
        console.error(
          '[Plan] Location picker error:',
          error,
        );

        Alert.alert(
          'Could not open map',
          'TravelOS could not open the location picker. Please try again.',
        );
      } finally {
        setIsPickingLocation(
          false,
        );
      }
    };

  const removeLocation = () => {
    setPickedLocation(null);
  };

  const saveStop =
    async () => {
      if (
        !selectedDay ||
        !workspace
      ) {
        return;
      }

      const cleanTitle =
        title.trim();

      if (!cleanTitle) {
        Alert.alert(
          'Add a name',
          'Give this moment a name.',
        );

        return;
      }

      try {
        setIsSaving(true);

        if (editingStop) {
          await actions.updateStop(
            {
              ...editingStop,

              title:
                cleanTitle,

              type,

              startTime:
                timeEdited
                  ? time || undefined
                  : originalTime,

              endTime:
                endTimeEdited
                  ? endTime || undefined
                  : originalEndTime,

              location:
                pickedLocation ??
                undefined,
            },
          );
        } else {
          const dayStops =
            workspace.stops.filter(
              (stop) =>
                stop.dayId ===
                selectedDay.id,
            );

          const now =
            new Date()
              .toISOString();

          const stop:
            TripStop = {
              id:
                Crypto.randomUUID(),

              tripId:
                workspace.trip.id,

              dayId:
                selectedDay.id,

              title:
                cleanTitle,

              type,

              order:
                dayStops.length +
                1,

              startTime: time || undefined,

              endTime:
                endTime || undefined,

              location:
                pickedLocation ??
                undefined,

              createdAt:
                now,

              updatedAt:
                now,
            };

          await actions.addStop(
            stop,
          );

          const pendingClaimId =
            pendingImportClaimIdRef.current;

          if (pendingClaimId) {
            try {
              await importReviewService.acknowledgeSeed(
                pendingClaimId,
                workspace.trip.id,
              );
            } catch (acknowledgeError) {
              console.error(
                '[Plan] Import claim acknowledge failed after stop save:',
                acknowledgeError,
              );

              Alert.alert(
                'Moment saved',
                'The stop is on the plan. The import line could not be marked reviewed — you can finish that in Import Review.',
              );
            }
          }
        }

        resetModal();
        clearImportLineParams();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Please try again.';

        const isTimeValidationError =
          message.includes(
            'Stop end time must be after stop start time',
          ) ||
          message.includes(
            'must use HH:mm local time',
          ) ||
          message.includes(
            'saved stop time needs review',
          );

        if (isTimeValidationError) {
          Alert.alert(
            'Check moment time',
            message.includes(
              'Stop end time must be after stop start time',
            )
              ? 'End time must be later than start time.'
              : message,
          );
        } else {
          console.error(
            '[Plan] Save error:',
            error,
          );

          Alert.alert(
            'Could not save moment',
            message,
          );
        }
      } finally {
        setIsSaving(false);
      }
    };

  const acceptPlanAssistCandidate = async (
    day: TripDay,
    candidate: PlanAssistCandidate,
  ) => {
    if (!workspace || acceptingAssistId) {
      return;
    }

    try {
      setAcceptingAssistId(candidate.id);
      playLightImpact();

      const dayStops = workspace.stops.filter(
        (stop) => stop.dayId === day.id,
      );

      const stop = buildStopFromPlanAssistCandidate({
        candidate,
        tripId: workspace.trip.id,
        dayId: day.id,
        order: dayStops.length + 1,
        id: Crypto.randomUUID(),
        nowIso: new Date().toISOString(),
      });

      await actions.addStop(stop);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Please try again.';

      Alert.alert(
        'Could not add moment',
        message,
      );
    } finally {
      setAcceptingAssistId(null);
    }
  };

  const deleteStop = (
    stop: TripStop,
  ) => {
    const linkedBookings =
      bookingsLinkedToStop(
        workspace.bookings,
        stop.id,
      );

    const unlinkMessage =
      linkedBookings.length > 0
        ? `\n\n${linkedBookings.length} ${
            linkedBookings.length ===
            1
              ? 'booking will stay saved but will no longer be connected to this moment.'
              : 'bookings will stay saved but will no longer be connected to this moment.'
          }`
        : '';

    Alert.alert(
      'Remove moment?',
      `Remove "${stop.title}" from this day?${unlinkMessage}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Remove',
          style:
            'destructive',

          onPress:
            async () => {
              try {
                await actions.deleteStop(
                  stop.id,
                );
              } catch (
                error
              ) {
                console.error(
                  '[Plan] Delete error:',
                  error,
                );

                Alert.alert(
                  'Could not remove moment',
                  'Please try again.',
                );
              }
            },
        },
      ],
    );
  };

  const moveStop =
    async (
      day: TripDay,
      stop: TripStop,
      direction: -1 | 1,
    ) => {
      if (!workspace) {
        return;
      }

      const dayStops =
        workspace.stops
          .filter(
            (item) =>
              item.dayId ===
              day.id,
          )
          .sort(
            (a, b) =>
              a.order -
              b.order,
          );

      const currentIndex =
        dayStops.findIndex(
          (item) =>
            item.id ===
            stop.id,
        );

      const nextIndex =
        currentIndex +
        direction;

      if (
        currentIndex < 0 ||
        nextIndex < 0 ||
        nextIndex >=
          dayStops.length
      ) {
        return;
      }

      const reordered = [
        ...dayStops,
      ];

      [
        reordered[
          currentIndex
        ],
        reordered[
          nextIndex
        ],
      ] = [
        reordered[
          nextIndex
        ],
        reordered[
          currentIndex
        ],
      ];

      try {
        await actions.reorderStops(
          reordered,
        );
      } catch (error) {
        console.error(
          '[Plan] Reorder error:',
          error,
        );

        Alert.alert(
          'Could not reorder plan',
          'Please try again.',
        );
      }
    };

  const livedByStopId = workspace
    ? workspace.stopLivedStates
    : undefined;

  return (
    <>
      <Screen scroll clearTabBar>
        <UtilityScreenHeader
          eyebrow={tripDestinationLabel(
            workspace.trip.destinations,
          ).toUpperCase()}
          title="Your plan"
          subtitle={`${workspace.days.length} ${workspace.days.length === 1 ? 'day' : 'days'} · ${workspace.stops.length} ${workspace.stops.length === 1 ? 'moment' : 'moments'}`}
        />

        {workspace.days.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayStrip}
            style={styles.dayStripScroll}
          >
            {workspace.days.map((day) => {
              const selected =
                focusedDayId === day.id ||
                (!focusedDayId &&
                  day.id === workspace.days[0]?.id);
              const assignedCity =
                tripDayDestination(
                  day,
                  workspace.trip.destinations,
                );

              return (
                <Pressable
                  key={`strip-${day.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Jump to day ${day.dayNumber}, ${formatDayDate(day.date)}`}
                  accessibilityState={{ selected }}
                  style={[
                    styles.dayStripChip,
                    selected && styles.dayStripChipSelected,
                  ]}
                  onPress={() => focusDay(day.id)}
                >
                  <Text
                    style={[
                      styles.dayStripWeekday,
                      selected &&
                        styles.dayStripWeekdaySelected,
                    ]}
                  >
                    DAY {day.dayNumber}
                  </Text>
                  <Text
                    style={[
                      styles.dayStripDate,
                      selected &&
                        styles.dayStripDateSelected,
                    ]}
                  >
                    {formatDayDate(day.date)}
                  </Text>
                  {assignedCity ? (
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.dayStripCity,
                        selected &&
                          styles.dayStripCitySelected,
                      ]}
                    >
                      {assignedCity.name}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <View
          style={
            styles.timeline
          }
        >
          {workspace.days.map(
            (day) => {
              const stops =
                workspace.stops
                  .filter(
                    (stop) =>
                      stop.dayId ===
                      day.id,
                  )
                  .sort(
                    (a, b) =>
                      a.order -
                      b.order,
                  );
              const freeTimeGaps =
                deriveDayFreeTimeGaps(
                  day,
                  stops,
                );

              const timeConflicts =
                deriveDayTimeConflicts(
                  day,
                  stops,
                );

              const stopById =
                new Map(
                  stops.map(
                    (stop) => [
                      stop.id,
                      stop,
                    ],
                  ),
                );

              const freeTimeByAfterStopId =
                new Map(
                  freeTimeGaps.map(
                    (gap) => [
                      gap.afterStopId,
                      gap,
                    ],
                  ),
                );

              const collapsed =
                collapsedDayIds.has(day.id);

              const assignedCity =
                tripDayDestination(
                  day,
                  workspace.trip.destinations,
                );

              return (
                <View
                  key={
                    day.id
                  }
                  style={
                    styles.daySection
                  }
                >
                  <View style={styles.dayHeader}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Day ${day.dayNumber}, ${formatDayDate(day.date)}${stops.length > 0 ? collapsed ? ', collapsed' : ', expanded' : ''}`}
                      accessibilityState={
                        stops.length > 0
                          ? { expanded: !collapsed }
                          : undefined
                      }
                      disabled={stops.length === 0}
                      style={styles.dayToggle}
                      onPress={() => toggleDay(day.id)}
                    >
                      <View style={styles.dayNumber}>
                        <Text style={styles.dayNumberText}>
                          {day.dayNumber}
                        </Text>
                      </View>

                      <View style={styles.dayCopy}>
                        <Text style={styles.dayLabel}>
                          DAY {day.dayNumber}
                        </Text>

                        <Text style={styles.dayDate}>
                          {formatDayDate(day.date)}
                        </Text>

                        {assignedCity && (
                          <Text style={styles.dayCity}>
                            {assignedCity.name}
                          </Text>
                        )}
                      </View>

                      {stops.length > 0 && (
                        <Ionicons
                          name={collapsed ? 'chevron-down' : 'chevron-up'}
                          size={17}
                          color={colors.textMuted}
                        />
                      )}
                    </Pressable>

                    {stops.length > 0 && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Add moment to day ${day.dayNumber}`}
                        style={
                          styles.addButton
                        }
                        onPress={() =>
                          openCreate(
                            day,
                          )
                        }
                      >
                        <Ionicons
                          name="add"
                          size={21}
                          color={
                            colors.brand
                          }
                        />
                      </Pressable>
                    )}
                  </View>

                  {workspace.trip.destinations.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={
                        styles.dayCityChips
                      }
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Leave day ${day.dayNumber} city unassigned`}
                        accessibilityState={{
                          selected: !assignedCity,
                        }}
                        style={[
                          styles.dayCityChip,
                          !assignedCity &&
                            styles.dayCityChipSelected,
                        ]}
                        onPress={() => {
                          void assignDayCity(day, null);
                        }}
                      >
                        <Text
                          style={[
                            styles.dayCityChipText,
                            !assignedCity &&
                              styles.dayCityChipTextSelected,
                          ]}
                        >
                          Not set
                        </Text>
                      </Pressable>

                      {workspace.trip.destinations.map(
                        (destination) => {
                          const selected =
                            assignedCity?.id ===
                            destination.id;

                          return (
                            <Pressable
                              key={destination.id}
                              accessibilityRole="button"
                              accessibilityLabel={`Assign ${destination.name} to day ${day.dayNumber}`}
                              accessibilityState={{
                                selected,
                              }}
                              style={[
                                styles.dayCityChip,
                                selected &&
                                  styles.dayCityChipSelected,
                              ]}
                              onPress={() => {
                                void assignDayCity(
                                  day,
                                  destination.id,
                                );
                              }}
                            >
                              <Text
                                style={[
                                  styles.dayCityChipText,
                                  selected &&
                                    styles.dayCityChipTextSelected,
                                ]}
                              >
                                {destination.name}
                              </Text>
                            </Pressable>
                          );
                        },
                      )}
                    </ScrollView>
                  )}

                  {!collapsed &&
                    timeConflicts.length > 0 && (
                      <View
                        style={
                          styles.conflictList
                        }
                      >
                        {timeConflicts.map(
                          (conflict) => {
                            const firstStop =
                              stopById.get(
                                conflict.firstStopId,
                              );

                            const secondStop =
                              stopById.get(
                                conflict.secondStopId,
                              );

                            return (
                              <View
                                key={`${conflict.firstStopId}-${conflict.secondStopId}-${conflict.startTime}`}
                                style={
                                  styles.conflictCard
                                }
                              >
                                <View
                                  style={
                                    styles.conflictIcon
                                  }
                                >
                                  <Ionicons
                                    name="warning-outline"
                                    size={18}
                                    color={
                                      colors.warning
                                    }
                                  />
                                </View>

                                <View
                                  style={
                                    styles.conflictCopy
                                  }
                                >
                                  <Text
                                    style={
                                      styles.conflictEyebrow
                                    }
                                  >
                                    TIME CONFLICT
                                  </Text>

                                  <Text
                                    style={
                                      styles.conflictTitle
                                    }
                                  >
                                    {firstStop?.title ??
                                      'Moment'}{' '}
                                    overlaps{' '}
                                    {secondStop?.title ??
                                      'another moment'}
                                  </Text>

                                  <Text
                                    style={
                                      styles.conflictMeta
                                    }
                                  >
                                    {conflict.startTime}–{conflict.endTime} · {formatFreeTimeDuration(
                                      conflict.durationMinutes,
                                    )}
                                  </Text>
                                </View>
                              </View>
                            );
                          },
                        )}
                      </View>
                    )}

                  {stops.length === 0 ? (
                    <PlanAssistCard
                      cityLabel={
                        assignedCity?.name ?? null
                      }
                      candidates={buildPlanAssistCandidates(
                        {
                          dayDestination: assignedCity,
                          preferences: {
                            tripIntent:
                              workspace.trip.intent,
                            tripPace: workspace.trip.pace,
                            interests:
                              travelDNA?.interests,
                          },
                          existingTitles: stops.map(
                            (stop) => stop.title,
                          ),
                          limit: 5,
                        },
                      )}
                      acceptingId={acceptingAssistId}
                      onAccept={(candidate) => {
                        void acceptPlanAssistCandidate(
                          day,
                          candidate,
                        );
                      }}
                      onAddManually={() =>
                        openCreate(day)
                      }
                    />
                  ) : !collapsed ? (
                    <View
                      style={
                        styles.stopList
                      }
                    >
                      {stops.map(
                        (
                          stop,
                          index,
                        ) => {
                          const linkedBookings =
                            bookingsLinkedToStop(
                              workspace.bookings,
                              stop.id,
                            );

                          const livedPhase =
                            planStopLivedBadge(
                              stop.id,
                              livedByStopId,
                            );

                          const freeTimeGap =
                            freeTimeByAfterStopId.get(
                              stop.id,
                            );

                          const adviceKey =
                            freeTimeGap
                              ? freeTimeAdviceKey(
                                  day.id,
                                  freeTimeGap,
                                )
                              : null;

                          const freeTimeAdvice =
                            adviceKey
                              ? freeTimeAdviceByKey[
                                  adviceKey
                                ]
                              : undefined;

                          const freeTimeAdviceError =
                            adviceKey
                              ? freeTimeAdviceErrorByKey[
                                  adviceKey
                                ]
                              : undefined;

                          const isFreeTimeAdviceLoading =
                            adviceKey !== null &&
                            loadingFreeTimeKey ===
                              adviceKey;

                          return (
                            <View
                              key={
                                stop.id
                              }
                              style={
                                styles.stopWithGap
                              }
                            >
                              <View
                                style={
                                  styles.stopCard
                                }
                              >
                            <Pressable
                              style={
                                styles.stopMain
                              }
                              onPress={() =>
                                openEdit(
                                  day,
                                  stop,
                                )
                              }
                            >
                              <View
                                style={
                                  styles.stopIcon
                                }
                              >
                                <Ionicons
                                  name={getStopIcon(
                                    stop.type,
                                  )}
                                  size={
                                    19
                                  }
                                  color={
                                    colors.teal
                                  }
                                />
                              </View>

                              <View
                                style={
                                  styles.stopCopy
                                }
                              >
                                <Text
                                  style={
                                    styles.stopTitle
                                  }
                                >
                                  {
                                    stop.title
                                  }
                                </Text>

                                <Text
                                  style={
                                    styles.stopMeta
                                  }
                                >
                                  {formatStopTimeRange(
                                    stop,
                                  )
                                    ? `${formatStopTimeRange(
                                        stop,
                                      )} · `
                                    : ''}

                                  {
                                    stop.type
                                  }
                                </Text>

                                {livedPhase === 'done' && (
                                  <FadeIn
                                    factKey={`done:${stop.id}`}
                                  >
                                    <View
                                      style={
                                        styles.livedRow
                                      }
                                    >
                                      <Ionicons
                                        name="checkmark-circle-outline"
                                        size={13}
                                        color={
                                          colors.teal
                                        }
                                      />
                                      <Text
                                        style={
                                          styles.livedText
                                        }
                                      >
                                        Done
                                      </Text>
                                    </View>
                                  </FadeIn>
                                )}

                                {livedPhase === 'skipped' && (
                                  <FadeIn
                                    factKey={`skipped:${stop.id}`}
                                  >
                                    <View
                                      style={
                                        styles.livedRow
                                      }
                                    >
                                      <Ionicons
                                        name="close-circle-outline"
                                        size={13}
                                        color={
                                          colors.brass
                                        }
                                      />
                                      <Text
                                        style={
                                          styles.livedSkippedText
                                        }
                                      >
                                        Skipped
                                      </Text>
                                    </View>
                                  </FadeIn>
                                )}

                                {hasCoordinates(
                                  stop.location,
                                ) && (
                                  <View
                                    style={
                                      styles.mappedRow
                                    }
                                  >
                                    <Ionicons
                                      name="map-outline"
                                      size={
                                        13
                                      }
                                      color={
                                        colors.teal
                                      }
                                    />

                                    <Text
                                      style={
                                        styles.mappedText
                                      }
                                    >
                                      Mapped
                                    </Text>
                                  </View>
                                )}

                                {linkedBookings.length >
                                  0 && (
                                  <View
                                    style={
                                      styles.linkedBookingRow
                                    }
                                  >
                                    <Ionicons
                                      name="ticket-outline"
                                      size={13}
                                      color={
                                        colors.brass
                                      }
                                    />

                                    <Text
                                      style={
                                        styles.linkedBookingText
                                      }
                                    >
                                      {
                                        linkedBookings.length
                                      }{' '}
                                      {linkedBookings.length ===
                                      1
                                        ? 'booking'
                                        : 'bookings'}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </Pressable>

                            <View
                              style={
                                styles.stopActions
                              }
                            >
                              {linkedBookings.length >
                                0 && (
                                <Pressable
                                  accessibilityLabel="Open linked bookings"
                                  accessibilityRole="button"
                                  hitSlop={5}
                                  style={
                                    styles.smallAction
                                  }
                                  onPress={() =>
                                    router.push({
                                      pathname:
                                        '/trip/[tripId]/bookings',
                                      params: {
                                        tripId:
                                          workspace.trip.id,
                                        ...(linkedBookings.length ===
                                        1
                                          ? {
                                              bookingId:
                                                linkedBookings[0]
                                                  .id,
                                            }
                                          : {}),
                                      },
                                    })
                                  }
                                >
                                  <Ionicons
                                    name="ticket-outline"
                                    size={17}
                                    color={
                                      colors.brass
                                    }
                                  />
                                </Pressable>
                              )}

                              {stops.length > 1 && (
                                <>
                                  <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={`Move ${stop.title} earlier`}
                                    hitSlop={5}
                                    disabled={
                                      index ===
                                      0
                                    }
                                    style={[
                                      styles.smallAction,

                                      index ===
                                        0 &&
                                        styles.actionDisabled,
                                    ]}
                                    onPress={() =>
                                      moveStop(
                                        day,
                                        stop,
                                        -1,
                                      )
                                    }
                                  >
                                    <Ionicons
                                      name="chevron-up"
                                      size={
                                        17
                                      }
                                      color={
                                        colors.textSecondary
                                      }
                                    />
                                  </Pressable>

                                  <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={`Move ${stop.title} later`}
                                    hitSlop={5}
                                    disabled={
                                      index ===
                                      stops.length -
                                        1
                                    }
                                    style={[
                                      styles.smallAction,

                                      index ===
                                        stops.length -
                                          1 &&
                                        styles.actionDisabled,
                                    ]}
                                    onPress={() =>
                                      moveStop(
                                        day,
                                        stop,
                                        1,
                                      )
                                    }
                                  >
                                    <Ionicons
                                      name="chevron-down"
                                      size={
                                        17
                                      }
                                      color={
                                        colors.textSecondary
                                      }
                                    />
                                  </Pressable>
                                </>
                              )}

                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`Delete ${stop.title}`}
                                hitSlop={5}
                                style={
                                  styles.smallAction
                                }
                                onPress={() =>
                                  deleteStop(
                                    stop,
                                  )
                                }
                              >
                                <Ionicons
                                  name="trash-outline"
                                  size={
                                    17
                                  }
                                  color={
                                    colors.danger
                                  }
                                />
                              </Pressable>
                            </View>
                              </View>

                              {freeTimeGap && (
                                <View
                                  style={
                                    styles.freeTimeCard
                                  }
                                >
                                  <View
                                    style={
                                      styles.freeTimeHeader
                                    }
                                  >
                                    <View
                                      style={
                                        styles.freeTimeIcon
                                      }
                                    >
                                      <Ionicons
                                        name="time-outline"
                                        size={17}
                                        color={
                                          colors.teal
                                        }
                                      />
                                    </View>

                                    <View
                                      style={
                                        styles.freeTimeCopy
                                      }
                                    >
                                      <Text
                                        style={
                                          styles.freeTimeEyebrow
                                        }
                                      >
                                        FREE TIME
                                      </Text>

                                      <Text
                                        style={
                                          styles.freeTimeRange
                                        }
                                      >
                                        {freeTimeGap.startTime}–{freeTimeGap.endTime}
                                      </Text>
                                    </View>

                                    <Text
                                      style={
                                        styles.freeTimeDuration
                                      }
                                    >
                                      {formatFreeTimeDuration(
                                        freeTimeGap.durationMinutes,
                                      )}
                                    </Text>
                                  </View>

                                  <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={`Ask TravelOS how to use free time from ${freeTimeGap.startTime} to ${freeTimeGap.endTime}`}
                                    disabled={
                                      loadingFreeTimeKey !==
                                      null
                                    }
                                    style={[
                                      styles.freeTimeAIButton,

                                      loadingFreeTimeKey !==
                                        null &&
                                        !isFreeTimeAdviceLoading &&
                                        styles.freeTimeAIButtonDisabled,
                                    ]}
                                    onPress={() =>
                                      requestFreeTimeAdvice(
                                        day,
                                        freeTimeGap,
                                      )
                                    }
                                  >
                                    {isFreeTimeAdviceLoading ? (
                                      <ActivityIndicator
                                        size="small"
                                        color={
                                          colors.textInverse
                                        }
                                      />
                                    ) : (
                                      <Ionicons
                                        name="sparkles-outline"
                                        size={16}
                                        color={
                                          colors.textInverse
                                        }
                                      />
                                    )}

                                    <Text
                                      style={
                                        styles.freeTimeAIButtonText
                                      }
                                    >
                                      {isFreeTimeAdviceLoading
                                        ? 'Thinking…'
                                        : freeTimeAdvice
                                          ? 'Refresh ideas'
                                          : 'Fill this time'}
                                    </Text>
                                  </Pressable>

                                  {freeTimeAdviceError && (
                                    <Text
                                      style={
                                        styles.freeTimeAIError
                                      }
                                    >
                                      {freeTimeAdviceError}
                                    </Text>
                                  )}

                                  {freeTimeAdvice && (
                                    <View
                                      style={
                                        styles.freeTimeSuggestionList
                                      }
                                    >
                                      <View
                                        style={
                                          styles.freeTimeSuggestionHeadingRow
                                        }
                                      >
                                        <Ionicons
                                          name="sparkles-outline"
                                          size={15}
                                          color={
                                            colors.brass
                                          }
                                        />

                                        <Text
                                          style={
                                            styles.freeTimeSuggestionHeading
                                          }
                                        >
                                          TRAVELOS IDEAS
                                        </Text>
                                      </View>

                                      <Text
                                        style={
                                          styles.freeTimeSuggestionNote
                                        }
                                      >
                                        {freeTimeAdvice.provider} ·{' '}
                                        {freeTimeAdvice.model}. These stay
                                        ideas. Nothing is saved as a stop.
                                      </Text>

                                      {freeTimeAdvice.suggestions.map(
                                        (suggestion) => {
                                          const copy =
                                            FREE_TIME_ACTIVITY_COPY[
                                              suggestion.activityType
                                            ];

                                          return (
                                            <View
                                              key={
                                                suggestion.activityType
                                              }
                                              style={
                                                styles.freeTimeSuggestionCard
                                              }
                                            >
                                              <View
                                                style={
                                                  styles.freeTimeSuggestionIcon
                                                }
                                              >
                                                <Ionicons
                                                  name={
                                                    copy.icon
                                                  }
                                                  size={17}
                                                  color={
                                                    colors.teal
                                                  }
                                                />
                                              </View>

                                              <View
                                                style={
                                                  styles.freeTimeSuggestionCopy
                                                }
                                              >
                                                <Text
                                                  style={
                                                    styles.freeTimeSuggestionTitle
                                                  }
                                                >
                                                  {copy.title}
                                                </Text>

                                                <Text
                                                  style={
                                                    styles.freeTimeSuggestionBody
                                                  }
                                                >
                                                  {copy.body}
                                                </Text>
                                              </View>

                                              <Text
                                                style={
                                                  styles.freeTimeSuggestionMinutes
                                                }
                                              >
                                                {suggestion.suggestedMinutes} min
                                              </Text>
                                            </View>
                                          );
                                        },
                                      )}

                                      <Text
                                        style={
                                          styles.freeTimeAIHint
                                        }
                                      >
                                        Ideas only · nothing has been added to your plan.
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              )}
                            </View>
                          );
                        },
                      )}
                    </View>
                  ) : null}
                </View>
              );
            },
          )}
        </View>

        <View
          style={
            styles.bottomSpace
          }
        />
      </Screen>

      <StopEditorModal
        selectedDay={selectedDay}
        editingStop={editingStop}
        title={title}
        setTitle={setTitle}
        time={time}
        setTime={setTime}
        setTimeEdited={setTimeEdited}
        endTime={endTime}
        setEndTime={setEndTime}
        setEndTimeEdited={setEndTimeEdited}
        type={type}
        setType={setType}
        pickedLocation={pickedLocation}
        isPickingLocation={isPickingLocation}
        isSaving={isSaving}
        chooseLocation={chooseLocation}
        removeLocation={removeLocation}
        saveStop={saveStop}
        closeModal={closeModal}
        livedByStopId={livedByStopId}
        pendingImportClaimId={pendingImportClaimIdRef.current}
      />
    </>
  );
}
