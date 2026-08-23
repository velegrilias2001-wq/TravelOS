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

import {
  Screen,
} from '@/components/ui/screen';

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
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  shadows,
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
  return new Date(
    `${date}T12:00:00`,
  ).toLocaleDateString(
    'en-GB',
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

  const resetModal = () => {
    setSelectedDay(null);

    setEditingStop(null);

    setTitle('');
    setTime('');

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

      const destination =
        workspace.trip
          .destinations[0];

      const initialLatitude =
        pickedLocation
          ?.latitude ??
        destination
          ?.latitude;

      const initialLongitude =
        pickedLocation
          ?.longitude ??
        destination
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
          'Travel OS could not open the location picker. Please try again.',
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
          'Give this stop or activity a name.',
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
                time.trim() ||
                undefined,

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

              startTime:
                time.trim() ||
                undefined,

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
        console.error(
          '[Plan] Save error:',
          error,
        );

        Alert.alert(
          'Could not save activity',
          'Please try again.',
        );
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
        ? `\n\n${linkedBookings.length} linked ${
            linkedBookings.length ===
            1
              ? 'booking'
              : 'bookings'
          } will remain saved and become unlinked.`
        : '';

    Alert.alert(
      'Remove from itinerary?',
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
                  'Could not remove activity',
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
          'Could not reorder itinerary',
          'Please try again.',
        );
      }
    };

  return (
    <>
      <Screen scroll>
        <View
          style={
            styles.header
          }
        >
          <Text
            style={
              styles.eyebrow
            }
          >
            {workspace.trip
              .destinations[0]
              ?.name.toUpperCase() ??
              'YOUR TRIP'}
          </Text>

          <Text
            style={
              styles.pageTitle
            }
          >
            Your plan
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Shape each day,
            one moment at a
            time.
          </Text>
        </View>

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

              return (
                <View
                  key={
                    day.id
                  }
                  style={
                    styles.daySection
                  }
                >
                  <View
                    style={
                      styles.dayHeader
                    }
                  >
                    <View
                      style={
                        styles.dayNumber
                      }
                    >
                      <Text
                        style={
                          styles.dayNumberText
                        }
                      >
                        {
                          day.dayNumber
                        }
                      </Text>
                    </View>

                    <View
                      style={
                        styles.dayCopy
                      }
                    >
                      <Text
                        style={
                          styles.dayLabel
                        }
                      >
                        DAY{' '}
                        {
                          day.dayNumber
                        }
                      </Text>

                      <Text
                        style={
                          styles.dayDate
                        }
                      >
                        {formatDayDate(
                          day.date,
                        )}
                      </Text>
                    </View>

                    <Pressable
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
                  </View>

                  {stops.length ===
                  0 ? (
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
                        Add your first
                        moment
                      </Text>
                    </Pressable>
                  ) : (
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

                          return (
                            <View
                              key={
                                stop.id
                              }
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
                                  {stop.startTime
                                    ? `${stop.startTime} · `
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

                              <Pressable
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

                              <Pressable
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
                          );
                        },
                      )}
                    </View>
                  )}
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
                      READY FOR MAP
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

                      {hasCoordinates(
                        pickedLocation,
                      ) && (
                        <Text
                          style={
                            styles.coordinateText
                          }
                        >
                          {pickedLocation.latitude.toFixed(
                            5,
                          )}
                          {'  ·  '}
                          {pickedLocation.longitude.toFixed(
                            5,
                          )}
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
                        No location selected
                      </Text>

                      <Text
                        style={
                          styles.locationEmptyBody
                        }
                      >
                        Choose a real place to show it on your trip map.
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
                  TIME
                </Text>

                <TextInput
                  value={time}
                  onChangeText={
                    setTime
                  }
                  placeholder="10:30"
                  placeholderTextColor={
                    colors.textMuted
                  }
                  style={
                    styles.input
                  }
                />
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
                      : 'Add to itinerary'}
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
    header: {
      paddingTop:
        spacing[6],
      paddingBottom:
        spacing[8],
    },

    eyebrow: {
      fontFamily:
        fontFamily.sansBold,
      fontSize:
        fontSize.micro,
      letterSpacing:
        1.8,
      color:
        colors.brass,
      marginBottom:
        spacing[2],
    },

    pageTitle: {
      fontFamily:
        fontFamily.serifSemiBold,
      fontSize:
        fontSize.display,
      lineHeight:
        lineHeight.display,
      color:
        colors.textPrimary,
    },

    subtitle: {
      fontFamily:
        fontFamily.sansRegular,
      fontSize:
        fontSize.bodySmall,
      color:
        colors.textSecondary,
      marginTop:
        spacing[3],
    },

    timeline: {
      gap:
        spacing[8],
    },

    daySection: {
      gap:
        spacing[4],
    },

    dayHeader: {
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    dayNumber: {
      width: 42,
      height: 42,
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
        fontSize.bodyLarge,
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
        fontSize.body,
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
      minHeight: 66,
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
      justifyContent:
        'center',
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
        spacing[3],
    },

    stopCard: {
      minHeight: 78,
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
      ...shadows.subtle,
    },

    stopMain: {
      flex: 1,
      minHeight: 76,
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
      width: 30,
      height: 34,
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

    coordinateText: {
      fontFamily:
        fontFamily.sansMedium,

      fontSize:
        fontSize.micro,

      color:
        colors.textMuted,

      marginTop:
        spacing[2],
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
