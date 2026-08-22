import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';

import {
  useLocalSearchParams,
} from 'expo-router';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  Screen,
} from '@/components/ui/screen';

import type {
  TripDay,
  TripStop,
  TripStopType,
} from '@/domain/entities';

import {
  tripService,
  type TripWorkspace,
} from '@/services/trip-service';

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

export default function PlanScreen() {
  const { tripId } =
    useLocalSearchParams<{
      tripId: string;
    }>();

  const [
    workspace,
    setWorkspace,
  ] =
    useState<TripWorkspace | null>(
      null,
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

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
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const loadPlan =
    useCallback(
      async () => {
        if (!tripId) {
          return;
        }

        try {
          setIsLoading(true);

          const result =
            await tripService.getWorkspace(
              tripId,
            );

          setWorkspace(
            result,
          );
        } catch (error) {
          console.error(
            '[Plan] Load error:',
            error,
          );

          Alert.alert(
            'Could not load plan',
            'Travel OS could not load this itinerary.',
          );
        } finally {
          setIsLoading(false);
        }
      },
      [tripId],
    );

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  const openCreate = (
    day: TripDay,
  ) => {
    setEditingStop(null);

    setSelectedDay(day);

    setTitle('');
    setTime('');

    setType('place');
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
  };

  const closeModal = () => {
    setSelectedDay(null);

    setEditingStop(null);

    setTitle('');
    setTime('');

    setType('place');
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
          await tripService.updateStop(
            {
              ...editingStop,

              title:
                cleanTitle,

              type,

              startTime:
                time.trim() ||
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

              createdAt:
                now,

              updatedAt:
                now,
            };

          await tripService.addStop(
            stop,
          );
        }

        closeModal();

        await loadPlan();
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
    Alert.alert(
      'Remove from itinerary?',
      `Remove "${stop.title}" from this day?`,
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
                await tripService.deleteStop(
                  stop.id,
                );

                await loadPlan();
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
        await tripService.reorderStops(
          reordered,
        );

        await loadPlan();
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

  if (
    isLoading ||
    !workspace
  ) {
    return (
      <Screen>
        <View
          style={
            styles.center
          }
        >
          <Text
            style={
              styles.loading
            }
          >
            Building your
            itinerary…
          </Text>
        </View>
      </Screen>
    );
  }

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
                        ) => (
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
                              </View>
                            </Pressable>

                            <View
                              style={
                                styles.stopActions
                              }
                            >
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
                        ),
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
                isSaving
              }
              style={[
                styles.saveButton,

                isSaving &&
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

              {!isSaving && (
                <Ionicons
                  name="arrow-forward"
                  size={19}
                  color={
                    colors.textInverse
                  }
                />
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles =
  StyleSheet.create({
    center: {
      flex: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    loading: {
      fontFamily:
        fontFamily.sansMedium,
      fontSize:
        fontSize.bodySmall,
      color:
        colors.textMuted,
    },

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
      backgroundColor:
        colors.background,

      borderTopLeftRadius:
        radius.xxl,

      borderTopRightRadius:
        radius.xxl,

      paddingHorizontal:
        spacing[6],

      paddingBottom:
        spacing[8],
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
  });