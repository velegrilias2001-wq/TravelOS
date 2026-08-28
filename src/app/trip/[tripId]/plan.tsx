import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  pickLocation,
} from 'expo-location-picker';

import { LocalTimeField } from '@/components/ui/native-date-time-fields';
import {
  Screen,
} from '@/components/ui/screen';
import { UtilityScreenHeader } from '@/components/ui/utility-screen';
import { formatCalendarDateForDisplay } from '@/services/time-truth';

import type {
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
  deriveDayFreeTimeGaps,
  deriveDayTimeConflicts,
  type FreeTimeGap,
} from '@/services/itinerary-flexibility';
import type {
  FreeTimeActivityType,
  FreeTimeAdviceResult,
} from '@/services/ai-api-client';
import {
  aiAPIClient,
} from '@/services/ai-api-runtime';
import {
  aiContextService,
} from '@/services/ai-context-runtime';

import {
  colors,
  fontFamily,
  fontSize,
  radius,
  spacing,
} from '@/theme';

const STOP_TYPES: {
  label: string;
  value: TripStopType;
  icon:
    keyof typeof Ionicons.glyphMap;
}[] = [
  {
    label: 'Place',
    value: 'place',
    icon: 'location-outline',
  },
  {
    label: 'Activity',
    value: 'activity',
    icon: 'sparkles-outline',
  },
  {
    label: 'Food',
    value: 'food',
    icon: 'restaurant-outline',
  },
  {
    label: 'Transport',
    value: 'transport',
    icon: 'car-outline',
  },
];

const FREE_TIME_ACTIVITY_COPY: Record<
  FreeTimeActivityType,
  {
    title: string;
    body: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  slow_walk: {
    title: 'Take a slow walk',
    body: 'Keep the gap easy and unstructured.',
    icon: 'walk-outline',
  },
  coffee_or_rest: {
    title: 'Pause for coffee or rest',
    body: 'Use the time as a low-pressure reset.',
    icon: 'cafe-outline',
  },
  food_browse: {
    title: 'Browse local food',
    body: 'Explore food casually without committing to a specific venue.',
    icon: 'restaurant-outline',
  },
  culture_browse: {
    title: 'Add a little culture',
    body: 'Use the gap for a light cultural detour.',
    icon: 'library-outline',
  },
  local_browse: {
    title: 'Explore the area',
    body: 'Wander locally without turning it into a fixed stop.',
    icon: 'compass-outline',
  },
  photo_walk: {
    title: 'Take a photo walk',
    body: 'Slow down and notice the surroundings through your camera.',
    icon: 'camera-outline',
  },
  shopping_browse: {
    title: 'Browse a little',
    body: 'Leave room for casual shopping without a fixed destination.',
    icon: 'bag-outline',
  },
  wellness_pause: {
    title: 'Take a wellness pause',
    body: 'Use the gap for a calm reset before the next moment.',
    icon: 'leaf-outline',
  },
  scenic_pause: {
    title: 'Take a scenic pause',
    body: 'Keep the time open for a quiet view or a slower moment.',
    icon: 'sunny-outline',
  },
  flexible_buffer: {
    title: 'Keep the buffer',
    body: 'Protect the free time instead of filling every minute.',
    icon: 'time-outline',
  },
};

function freeTimeAdviceKey(
  dayId: string,
  gap: FreeTimeGap,
): string {
  return [
    dayId,
    gap.afterStopId,
    gap.beforeStopId,
    gap.startTime,
    gap.endTime,
    gap.durationMinutes,
  ].join(':');
}

type StopLocation =
  NonNullable<
    TripStop['location']
  >;

type MappedLocation =
  StopLocation & {
    latitude: number;
    longitude: number;
  };

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

function formatFreeTimeDuration(
  minutes: number,
): string {
  const hours =
    Math.floor(minutes / 60);

  const remainingMinutes =
    minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

function hasCoordinates(
  location:
    | TripStop['location']
    | null
    | undefined,
): location is MappedLocation {
  return (
    typeof location?.latitude ===
      'number' &&
    typeof location?.longitude ===
      'number'
  );
}

export default function PlanScreen() {
  const router = useRouter();

  const routeParams =
    useLocalSearchParams<{
      stopId?: string | string[];
    }>();

  const requestedStopId =
    Array.isArray(
      routeParams.stopId,
    )
      ? routeParams.stopId[0]
      : routeParams.stopId;

  const handledStopIdRef =
    useRef<string | null>(null);

  const {
    workspace,
    actions,
  } = useTripWorkspace();

  useTripWorkspaceFocusRefresh();

  const [collapsedDayIds, setCollapsedDayIds] =
    useState<Set<string>>(() => new Set());

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

  const [
    loadingFreeTimeKey,
    setLoadingFreeTimeKey,
  ] = useState<string | null>(null);

  const [
    freeTimeAdviceByKey,
    setFreeTimeAdviceByKey,
  ] = useState<
    Record<string, FreeTimeAdviceResult>
  >({});

  const [
    freeTimeAdviceErrorByKey,
    setFreeTimeAdviceErrorByKey,
  ] = useState<Record<string, string>>({});

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

  const closeModal = () => {
    if (
      isSaving ||
      isPickingLocation
    ) {
      return;
    }

    resetModal();

    if (requestedStopId) {
      handledStopIdRef.current =
        null;

      router.setParams({
        stopId: '',
      });
    }
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
        }

        resetModal();
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

  const requestFreeTimeAdvice =
    async (
      day: TripDay,
      gap: FreeTimeGap,
    ) => {
      if (loadingFreeTimeKey) {
        return;
      }

      const adviceKey =
        freeTimeAdviceKey(
          day.id,
          gap,
        );

      setLoadingFreeTimeKey(
        adviceKey,
      );

      setFreeTimeAdviceErrorByKey(
        (current) => {
          const next = {
            ...current,
          };

          delete next[adviceKey];

          return next;
        },
      );

      try {
        const context =
          await aiContextService.getSnapshot(
            workspace.trip.id,
          );

        if (!context) {
          throw new Error(
            'Trip context is unavailable',
          );
        }

        const result =
          await aiAPIClient.suggestForFreeTime(
            {
              context,
              dayId: day.id,
              afterStopId:
                gap.afterStopId,
              beforeStopId:
                gap.beforeStopId,
            },
          );

        if (
          result.verifiedGap.startTime !==
            gap.startTime ||
          result.verifiedGap.endTime !==
            gap.endTime ||
          result.verifiedGap.durationMinutes !==
            gap.durationMinutes
        ) {
          throw new Error(
            'Free-time context changed before the AI response returned',
          );
        }

        setFreeTimeAdviceByKey(
          (current) => ({
            ...current,
            [adviceKey]: result,
          }),
        );
      } catch (error) {
        console.error(
          '[Plan] Free-time AI error:',
          error,
        );

        setFreeTimeAdviceErrorByKey(
          (current) => ({
            ...current,
            [adviceKey]:
              'TravelOS AI is unavailable right now. Your plan has not changed.',
          }),
        );
      } finally {
        setLoadingFreeTimeKey(
          (current) =>
            current === adviceKey
              ? null
              : current,
        );
      }
    };

  return (
    <>
      <Screen scroll>
        <UtilityScreenHeader
          eyebrow={tripDestinationLabel(
            workspace.trip.destinations,
          ).toUpperCase()}
          title="Your plan"
          subtitle={`${workspace.days.length} ${workspace.days.length === 1 ? 'day' : 'days'} · ${workspace.stops.length} ${workspace.stops.length === 1 ? 'moment' : 'moments'}`}
        />

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
                    <Pressable
                      style={
                        styles.emptyDay
                      }
                      onPress={() =>
                        openCreate(
                          day,
                        )
                      }
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={20}
                        color={
                          colors.teal
                        }
                      />

                      <Text
                        style={
                          styles.emptyDayText
                        }
                      >
                        Add a moment
                      </Text>
                    </Pressable>
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

      <Modal
        visible={
          selectedDay !== null
        }
        transparent
        animationType="slide"
        onRequestClose={
          closeModal
        }
      >
        <View
          style={
            styles.modalBackdrop
          }
        >
          <View
            style={
              styles.sheet
            }
          >
            <View
              style={
                styles.sheetHandle
              }
            />

            <View
              style={
                styles.sheetHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.sheetEyebrow
                  }
                >
                  {selectedDay
                    ? `DAY ${selectedDay.dayNumber}`
                    : ''}
                </Text>

                <Text
                  style={
                    styles.sheetTitle
                  }
                >
                  {editingStop
                    ? 'Edit moment'
                    : 'Add a moment'}
                </Text>
              </View>

              <Pressable
                style={
                  styles.closeButton
                }
                onPress={
                  closeModal
                }
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={
                    colors.brand
                  }
                />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              keyboardShouldPersistTaps="handled"
            >
              <Text
                style={
                  styles.fieldLabel
                }
              >
                TYPE
              </Text>

              <View
                style={
                  styles.typeRow
                }
              >
                {STOP_TYPES.map(
                  (item) => {
                    const selected =
                      type ===
                      item.value;

                    return (
                      <Pressable
                        key={
                          item.value
                        }
                        style={[
                          styles.typeButton,

                          selected &&
                            styles.typeButtonSelected,
                        ]}
                        onPress={() =>
                          setType(
                            item.value,
                          )
                        }
                      >
                        <Ionicons
                          name={
                            item.icon
                          }
                          size={18}
                          color={
                            selected
                              ? colors.textInverse
                              : colors.brand
                          }
                        />

                        <Text
                          style={[
                            styles.typeText,

                            selected &&
                              styles.typeTextSelected,
                          ]}
                        >
                          {
                            item.label
                          }
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </View>

              <View
                style={
                  styles.field
                }
              >
                <Text
                  style={
                    styles.fieldLabel
                  }
                >
                  NAME
                </Text>

                <TextInput
                  value={title}
                  onChangeText={
                    setTitle
                  }
                  placeholder="Museum, dinner, temple…"
                  placeholderTextColor={
                    colors.textMuted
                  }
                  style={
                    styles.input
                  }
                />
              </View>

              <View
                style={
                  styles.field
                }
              >
                <View
                  style={
                    styles.locationLabelRow
                  }
                >
                  <Text
                    style={
                      styles.fieldLabel
                    }
                  >
                    LOCATION
                  </Text>

                  {hasCoordinates(
                    pickedLocation,
                  ) && (
                    <Text
                      style={
                        styles.locationReady
                      }
                    >
                      MAPPED
                    </Text>
                  )}
                </View>

                {pickedLocation ? (
                  <View
                    style={
                      styles.locationCard
                    }
                  >
                    <View
                      style={
                        styles.locationIcon
                      }
                    >
                      <Ionicons
                        name="location"
                        size={21}
                        color={
                          colors.teal
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.locationCopy
                      }
                    >
                      <Text
                        numberOfLines={
                          1
                        }
                        style={
                          styles.locationName
                        }
                      >
                        {
                          pickedLocation.name
                        }
                      </Text>

                      {pickedLocation.address && (
                        <Text
                          numberOfLines={
                            2
                          }
                          style={
                            styles.locationAddress
                          }
                        >
                          {
                            pickedLocation.address
                          }
                        </Text>
                      )}

                    </View>

                    {hasCoordinates(
                      pickedLocation,
                    ) && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={
                          colors.teal
                        }
                      />
                    )}
                  </View>
                ) : (
                  <View
                    style={
                      styles.locationEmpty
                    }
                  >
                    <Ionicons
                      name="map-outline"
                      size={22}
                      color={
                        colors.textMuted
                      }
                    />

                    <View
                      style={
                        styles.locationEmptyCopy
                      }
                    >
                      <Text
                        style={
                          styles.locationEmptyTitle
                        }
                      >
                        Add a location
                      </Text>

                      <Text
                        style={
                          styles.locationEmptyBody
                        }
                      >
                        Show this moment on your trip map.
                      </Text>
                    </View>
                  </View>
                )}

                <View
                  style={
                    styles.locationActions
                  }
                >
                  <Pressable
                    disabled={
                      isPickingLocation
                    }
                    style={[
                      styles.locationButton,

                      isPickingLocation &&
                        styles.disabled,
                    ]}
                    onPress={
                      chooseLocation
                    }
                  >
                    <Ionicons
                      name={
                        pickedLocation
                          ? 'map-outline'
                          : 'search-outline'
                      }
                      size={18}
                      color={
                        colors.textInverse
                      }
                    />

                    <Text
                      style={
                        styles.locationButtonText
                      }
                    >
                      {isPickingLocation
                        ? 'Opening map…'
                        : pickedLocation
                          ? 'Change location'
                          : 'Choose location'}
                    </Text>
                  </Pressable>

                  {pickedLocation && (
                    <Pressable
                      style={
                        styles.removeLocationButton
                      }
                      onPress={
                        removeLocation
                      }
                    >
                      <Ionicons
                        name="close"
                        size={18}
                        color={
                          colors.danger
                        }
                      />
                    </Pressable>
                  )}
                </View>
              </View>

              <View style={styles.timeSection}>
                <Text
                  style={
                    styles.fieldLabel
                  }
                >
                  TIME · OPTIONAL
                </Text>

                <View style={styles.timeRow}>
                  <View style={styles.timeColumn}>
                    <LocalTimeField
                      label="START TIME"
                      value={time}
                      onChange={(value) => {
                        setTime(value);
                        setTimeEdited(true);
                      }}
                      onClear={() => {
                        setTime('');
                        setTimeEdited(true);
                      }}
                    />
                  </View>

                  <View style={styles.timeColumn}>
                    <LocalTimeField
                      label="END TIME"
                      value={endTime}
                      onChange={(value) => {
                        setEndTime(value);
                        setEndTimeEdited(true);
                      }}
                      onClear={() => {
                        setEndTime('');
                        setEndTimeEdited(true);
                      }}
                    />
                  </View>
                </View>

                <Text style={styles.timeHelp}>
                  Add an end time when you know it. TravelOS can use real gaps between moments as flexible time.
                </Text>
              </View>

              <Pressable
                disabled={
                  isSaving ||
                  isPickingLocation
                }
                style={[
                  styles.saveButton,

                  (isSaving ||
                    isPickingLocation) &&
                    styles.disabled,
                ]}
                onPress={
                  saveStop
                }
              >
                <Text
                  style={
                    styles.saveButtonText
                  }
                >
                  {isSaving
                    ? 'Saving…'
                    : editingStop
                      ? 'Save changes'
                      : 'Add moment'}
                </Text>

                {!isSaving &&
                  !isPickingLocation && (
                    <Ionicons
                      name="arrow-forward"
                      size={19}
                      color={
                        colors.textInverse
                      }
                    />
                  )}
              </Pressable>

              <View
                style={
                  styles.sheetBottomSpace
                }
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles =
  StyleSheet.create({
    timeline: {
      gap:
        spacing[4],
    },

    daySection: {
      gap:
        spacing[2],
    },

    dayHeader: {
      flexDirection:
        'row',
      alignItems:
        'center',
      minHeight: 48,
      paddingBottom: spacing[1],
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },

    dayToggle: {
      flex: 1,
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
    },

    dayNumber: {
      width: 34,
      height: 34,
      borderRadius:
        radius.pill,
      backgroundColor:
        colors.brand,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    dayNumberText: {
      fontFamily:
        fontFamily.serifSemiBold,
      fontSize:
        fontSize.bodySmall,
      color:
        colors.textInverse,
    },

    dayCopy: {
      flex: 1,
      marginLeft:
        spacing[3],
    },

    dayLabel: {
      fontFamily:
        fontFamily.sansBold,
      fontSize:
        fontSize.micro,
      letterSpacing:
        1.4,
      color:
        colors.brass,
    },

    dayDate: {
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize:
        fontSize.bodySmall,
      color:
        colors.textPrimary,
      marginTop: 2,
    },

    addButton: {
      width: 40,
      height: 40,
      borderRadius:
        radius.pill,
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    emptyDay: {
      minHeight: 38,
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingLeft: 46,
      paddingRight:
        spacing[2],
      gap:
        spacing[2],
    },

    emptyDayText: {
      fontFamily:
        fontFamily.sansMedium,
      fontSize:
        fontSize.bodySmall,
      color:
        colors.teal,
    },

    stopList: {
      gap:
        spacing[2],
    },

    conflictList: {
      gap:
        spacing[2],
      marginBottom:
        spacing[2],
    },

    conflictCard: {
      minHeight: 64,
      marginLeft: 46,
      flexDirection:
        'row',
      alignItems:
        'center',
      gap:
        spacing[3],
      paddingHorizontal:
        spacing[3],
      paddingVertical:
        spacing[3],
      borderRadius:
        radius.md,
      borderWidth: 1,
      borderColor:
        colors.warning,
      backgroundColor:
        colors.brassSoft,
    },

    conflictIcon: {
      width: 34,
      height: 34,
      borderRadius:
        radius.pill,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        colors.surface,
    },

    conflictCopy: {
      flex: 1,
    },

    conflictEyebrow: {
      fontFamily:
        fontFamily.sansBold,
      fontSize:
        fontSize.micro,
      letterSpacing: 1.1,
      color:
        colors.warning,
    },

    conflictTitle: {
      marginTop: 2,
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize:
        fontSize.bodySmall,
      color:
        colors.textPrimary,
    },

    conflictMeta: {
      marginTop: 2,
      fontFamily:
        fontFamily.sansRegular,
      fontSize:
        fontSize.caption,
      color:
        colors.textSecondary,
    },

    stopWithGap: {
      gap:
        spacing[2],
    },

    stopCard: {
      minHeight: 70,
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius:
        radius.md,
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingHorizontal:
        spacing[3],
    },

    freeTimeCard: {
      minHeight: 54,
      marginLeft: 46,
      gap:
        spacing[3],
      paddingHorizontal:
        spacing[3],
      paddingVertical:
        spacing[3],
      borderRadius:
        radius.md,
      borderWidth: 1,
      borderColor:
        colors.teal,
      backgroundColor:
        colors.tealSoft,
    },

    freeTimeHeader: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap:
        spacing[3],
    },

    freeTimeIcon: {
      width: 32,
      height: 32,
      borderRadius:
        radius.pill,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        colors.surface,
    },

    freeTimeCopy: {
      flex: 1,
    },

    freeTimeEyebrow: {
      fontFamily:
        fontFamily.sansBold,
      fontSize:
        fontSize.micro,
      letterSpacing: 1.1,
      color:
        colors.teal,
    },

    freeTimeRange: {
      marginTop: 2,
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize:
        fontSize.bodySmall,
      color:
        colors.textPrimary,
    },

    freeTimeDuration: {
      fontFamily:
        fontFamily.sansMedium,
      fontSize:
        fontSize.caption,
      color:
        colors.textSecondary,
    },

    freeTimeAIButton: {
      minHeight: 42,
      borderRadius:
        radius.md,
      backgroundColor:
        colors.brand,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      gap:
        spacing[2],
      paddingHorizontal:
        spacing[3],
    },

    freeTimeAIButtonDisabled: {
      opacity: 0.5,
    },

    freeTimeAIButtonText: {
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize:
        fontSize.bodySmall,
      color:
        colors.textInverse,
    },

    freeTimeAIError: {
      fontFamily:
        fontFamily.sansRegular,
      fontSize:
        fontSize.caption,
      lineHeight: 18,
      color:
        colors.danger,
    },

    freeTimeSuggestionList: {
      gap:
        spacing[2],
      paddingTop:
        spacing[1],
      borderTopWidth: 1,
      borderTopColor:
        colors.border,
    },

    freeTimeSuggestionHeadingRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 6,
      marginBottom: 2,
    },

    freeTimeSuggestionHeading: {
      fontFamily:
        fontFamily.sansBold,
      fontSize:
        fontSize.micro,
      letterSpacing: 1.1,
      color:
        colors.brass,
    },

    freeTimeSuggestionCard: {
      minHeight: 68,
      flexDirection:
        'row',
      alignItems:
        'center',
      gap:
        spacing[2],
      padding:
        spacing[2],
      borderRadius:
        radius.sm,
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
    },

    freeTimeSuggestionIcon: {
      width: 34,
      height: 34,
      borderRadius:
        radius.pill,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        colors.tealSoft,
    },

    freeTimeSuggestionCopy: {
      flex: 1,
    },

    freeTimeSuggestionTitle: {
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize:
        fontSize.bodySmall,
      color:
        colors.textPrimary,
    },

    freeTimeSuggestionBody: {
      marginTop: 2,
      fontFamily:
        fontFamily.sansRegular,
      fontSize:
        fontSize.caption,
      lineHeight: 17,
      color:
        colors.textSecondary,
    },

    freeTimeSuggestionMinutes: {
      fontFamily:
        fontFamily.sansBold,
      fontSize:
        fontSize.micro,
      color:
        colors.teal,
    },

    freeTimeAIHint: {
      fontFamily:
        fontFamily.sansRegular,
      fontSize:
        fontSize.micro,
      lineHeight: 16,
      color:
        colors.textMuted,
    },

    stopMain: {
      flex: 1,
      minHeight: 68,
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    stopIcon: {
      width: 40,
      height: 40,
      borderRadius:
        radius.sm,
      backgroundColor:
        colors.tealSoft,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    stopCopy: {
      flex: 1,
      marginLeft:
        spacing[3],
    },

    stopTitle: {
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize:
        fontSize.body,
      color:
        colors.textPrimary,
    },

    stopMeta: {
      fontFamily:
        fontFamily.sansRegular,
      fontSize:
        fontSize.caption,
      color:
        colors.textMuted,
      marginTop: 3,
      textTransform:
        'capitalize',
    },

    mappedRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 4,
      marginTop: 5,
    },

    mappedText: {
      fontFamily:
        fontFamily.sansBold,
      fontSize:
        fontSize.micro,
      letterSpacing: 0.6,
      color:
        colors.teal,
      textTransform:
        'uppercase',
    },

    linkedBookingRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 4,
      marginTop: 5,
    },

    linkedBookingText: {
      fontFamily:
        fontFamily.sansBold,
      fontSize:
        fontSize.micro,
      letterSpacing: 0.5,
      color:
        colors.brass,
      textTransform:
        'uppercase',
    },

    stopActions: {
      flexDirection:
        'row',
      gap: 2,
    },

    smallAction: {
      width: 34,
      height: 44,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    actionDisabled: {
      opacity: 0.22,
    },

    modalBackdrop: {
      flex: 1,
      justifyContent:
        'flex-end',
      backgroundColor:
        colors.overlay,
    },

    sheet: {
      maxHeight: '92%',

      backgroundColor:
        colors.background,

      borderTopLeftRadius:
        radius.xxl,

      borderTopRightRadius:
        radius.xxl,

      paddingHorizontal:
        spacing[6],

      paddingBottom:
        spacing[4],
    },

    sheetHandle: {
      width: 42,
      height: 5,

      borderRadius:
        radius.pill,

      backgroundColor:
        colors.borderStrong,

      alignSelf:
        'center',

      marginTop:
        spacing[3],

      marginBottom:
        spacing[5],
    },

    sheetHeader: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      alignItems:
        'flex-start',

      marginBottom:
        spacing[6],
    },

    sheetEyebrow: {
      fontFamily:
        fontFamily.sansBold,

      fontSize:
        fontSize.micro,

      letterSpacing:
        1.5,

      color:
        colors.brass,
    },

    sheetTitle: {
      fontFamily:
        fontFamily.serifSemiBold,

      fontSize:
        fontSize.title,

      color:
        colors.textPrimary,

      marginTop:
        spacing[1],
    },

    closeButton: {
      width: 40,
      height: 40,

      borderRadius:
        radius.pill,

      backgroundColor:
        colors.surface,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    typeRow: {
      flexDirection:
        'row',

      gap:
        spacing[2],

      marginTop:
        spacing[2],

      marginBottom:
        spacing[5],
    },

    typeButton: {
      flex: 1,

      minHeight: 62,

      borderRadius:
        radius.md,

      borderWidth: 1,

      borderColor:
        colors.border,

      backgroundColor:
        colors.surface,

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 4,
    },

    typeButtonSelected: {
      backgroundColor:
        colors.brand,

      borderColor:
        colors.brand,
    },

    typeText: {
      fontFamily:
        fontFamily.sansMedium,

      fontSize:
        fontSize.micro,

      color:
        colors.textPrimary,
    },

    typeTextSelected: {
      color:
        colors.textInverse,
    },

    field: {
      gap:
        spacing[2],

      marginBottom:
        spacing[4],
    },

    fieldLabel: {
      fontFamily:
        fontFamily.sansBold,

      fontSize:
        fontSize.micro,

      letterSpacing:
        1.3,

      color:
        colors.brass,
    },

    timeSection: {
      gap:
        spacing[2],

      marginBottom:
        spacing[4],
    },

    timeRow: {
      flexDirection:
        'row',

      gap:
        spacing[2],
    },

    timeColumn: {
      flex: 1,
    },

    timeHelp: {
      fontFamily:
        fontFamily.sansRegular,

      fontSize:
        fontSize.caption,

      lineHeight: 18,

      color:
        colors.textMuted,
    },

    input: {
      height: 54,

      borderRadius:
        radius.md,

      backgroundColor:
        colors.surface,

      borderWidth: 1,

      borderColor:
        colors.border,

      paddingHorizontal:
        spacing[4],

      fontFamily:
        fontFamily.sansMedium,

      fontSize:
        fontSize.body,

      color:
        colors.textPrimary,
    },

    locationLabelRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    locationReady: {
      fontFamily:
        fontFamily.sansBold,

      fontSize:
        fontSize.micro,

      letterSpacing: 0.7,

      color:
        colors.teal,
    },

    locationCard: {
      minHeight: 88,

      backgroundColor:
        colors.surface,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius:
        radius.md,

      flexDirection:
        'row',

      alignItems:
        'center',

      padding:
        spacing[4],
    },

    locationIcon: {
      width: 42,
      height: 42,

      borderRadius:
        radius.sm,

      backgroundColor:
        colors.tealSoft,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        spacing[3],
    },

    locationCopy: {
      flex: 1,

      paddingRight:
        spacing[3],
    },

    locationName: {
      fontFamily:
        fontFamily.sansSemiBold,

      fontSize:
        fontSize.bodySmall,

      color:
        colors.textPrimary,
    },

    locationAddress: {
      fontFamily:
        fontFamily.sansRegular,

      fontSize:
        fontSize.caption,

      lineHeight: 18,

      color:
        colors.textSecondary,

      marginTop: 3,
    },

    locationEmpty: {
      minHeight: 82,

      borderRadius:
        radius.md,

      borderWidth: 1,

      borderStyle:
        'dashed',

      borderColor:
        colors.borderStrong,

      flexDirection:
        'row',

      alignItems:
        'center',

      padding:
        spacing[4],
    },

    locationEmptyCopy: {
      flex: 1,

      marginLeft:
        spacing[3],
    },

    locationEmptyTitle: {
      fontFamily:
        fontFamily.sansSemiBold,

      fontSize:
        fontSize.bodySmall,

      color:
        colors.textPrimary,
    },

    locationEmptyBody: {
      fontFamily:
        fontFamily.sansRegular,

      fontSize:
        fontSize.caption,

      color:
        colors.textMuted,

      marginTop: 2,
    },

    locationActions: {
      flexDirection:
        'row',

      gap:
        spacing[2],

      marginTop:
        spacing[3],
    },

    locationButton: {
      flex: 1,

      height: 50,

      borderRadius:
        radius.md,

      backgroundColor:
        colors.teal,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        spacing[2],
    },

    locationButtonText: {
      fontFamily:
        fontFamily.sansSemiBold,

      fontSize:
        fontSize.bodySmall,

      color:
        colors.textInverse,
    },

    removeLocationButton: {
      width: 50,
      height: 50,

      borderRadius:
        radius.md,

      borderWidth: 1,

      borderColor:
        colors.border,

      backgroundColor:
        colors.surface,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    saveButton: {
      height: 56,

      borderRadius:
        radius.md,

      backgroundColor:
        colors.brand,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        spacing[3],

      marginTop:
        spacing[3],
    },

    saveButtonText: {
      fontFamily:
        fontFamily.sansSemiBold,

      fontSize:
        fontSize.body,

      color:
        colors.textInverse,
    },

    disabled: {
      opacity: 0.6,
    },

    bottomSpace: {
      height:
        spacing[12],
    },

    sheetBottomSpace: {
      height:
        spacing[6],
    },
  });
