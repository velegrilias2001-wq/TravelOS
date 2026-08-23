import { Ionicons } from '@expo/vector-icons';

import {
  useRouter,
} from 'expo-router';

import {
  useMemo,
} from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';

import type {
  TripDay,
  TripStop,
  TripStopType,
} from '@/domain/entities';

import {
  useTripWorkspace,
  useTripWorkspaceFocusRefresh,
} from '@/features/trip-workspace/trip-workspace-context';
import type {
  TripWorkspace,
} from '@/services/trip-service';

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

type JourneyMoment =
  | 'upcoming'
  | 'today'
  | 'completed';

function getLocalDateKey(): string {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1,
  ).padStart(2, '0');

  const day = String(
    now.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDayDate(
  date: string,
): string {
  return new Date(
    `${date}T12:00:00`,
  ).toLocaleDateString(
    'en-GB',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    },
  );
}

function formatTripDate(
  date: string,
): string {
  return new Date(
    `${date}T12:00:00`,
  ).toLocaleDateString(
    'en-GB',
    {
      day: 'numeric',
      month: 'short',
    },
  );
}

function getStopIcon(
  type: TripStopType,
): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'food':
      return 'restaurant-outline';

    case 'activity':
      return 'sparkles-outline';

    case 'transport':
      return 'car-outline';

    case 'accommodation':
      return 'bed-outline';

    case 'place':
      return 'location-outline';

    default:
      return 'ellipse-outline';
  }
}

function resolveJourneyDay(
  workspace: TripWorkspace,
): {
  moment: JourneyMoment;
  day: TripDay | null;
} {
  const today =
    getLocalDateKey();

  const days = [
    ...workspace.days,
  ].sort(
    (a, b) =>
      a.dayNumber -
      b.dayNumber,
  );

  if (days.length === 0) {
    return {
      moment: 'upcoming',
      day: null,
    };
  }

  if (
    today <
    workspace.trip.startDate
  ) {
    return {
      moment: 'upcoming',
      day: days[0],
    };
  }

  if (
    today >
    workspace.trip.endDate
  ) {
    return {
      moment: 'completed',
      day:
        days[
          days.length - 1
        ],
    };
  }

  const currentDay =
    days.find(
      (day) =>
        day.date === today,
    ) ?? null;

  return {
    moment: 'today',
    day: currentDay,
  };
}

export default function TodayScreen() {
  const router =
    useRouter();

  const { workspace } =
    useTripWorkspace();

  useTripWorkspaceFocusRefresh();

  const journey =
    useMemo(
      () => resolveJourneyDay(workspace),
      [workspace],
    );

  const destination =
    workspace.trip
      .destinations[0]
      ?.name ??
    'Your destination';

  const selectedDay =
    journey.day;

  const stops: TripStop[] =
    selectedDay
      ? workspace.stops
          .filter(
            (stop) =>
              stop.dayId ===
              selectedDay.id,
          )
          .sort(
            (a, b) =>
              a.order -
              b.order,
          )
      : [];

  const momentLabel =
    journey.moment === 'today'
      ? 'TODAY'
      : journey.moment ===
          'upcoming'
        ? 'UP NEXT'
        : 'JOURNEY COMPLETE';

  const dayTitle =
    journey.moment === 'today'
      ? 'Today'
      : journey.moment ===
          'upcoming'
        ? 'Your first day'
        : 'Your final day';

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <Pressable
          style={styles.backButton}
          onPress={() =>
            router.back()
          }
        >
          <Ionicons
            name="arrow-back"
            size={21}
            color={colors.brand}
          />
        </Pressable>

        <Text style={styles.topLabel}>
          TRIP
        </Text>

        <View
          style={styles.topSpacer}
        />
      </View>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>
          {destination.toUpperCase()}
        </Text>

        <Text style={styles.title}>
          {workspace.trip.title}
        </Text>

        <View style={styles.dateRow}>
          <Ionicons
            name="calendar-outline"
            size={17}
            color={colors.teal}
          />

          <Text style={styles.dateText}>
            {formatTripDate(
              workspace.trip.startDate,
            )}
            {'  —  '}
            {formatTripDate(
              workspace.trip.endDate,
            )}
          </Text>
        </View>
      </View>

      <View style={styles.dayCard}>
        <View style={styles.dayTop}>
          <View>
            <Text
              style={
                styles.momentLabel
              }
            >
              {momentLabel}
            </Text>

            <Text
              style={
                styles.dayTitle
              }
            >
              {dayTitle}
            </Text>
          </View>

          {selectedDay && (
            <View
              style={
                styles.dayBadge
              }
            >
              <Text
                style={
                  styles.dayBadgeText
                }
              >
                DAY{' '}
                {
                  selectedDay.dayNumber
                }
              </Text>
            </View>
          )}
        </View>

        {selectedDay && (
          <Text
            style={
              styles.dayDate
            }
          >
            {formatDayDate(
              selectedDay.date,
            )}
          </Text>
        )}

        <View
          style={
            styles.divider
          }
        />

        {stops.length === 0 ? (
          <View
            style={
              styles.emptyState
            }
          >
            <View
              style={
                styles.emptyIcon
              }
            >
              <Ionicons
                name={
                  journey.moment ===
                  'upcoming'
                    ? 'sparkles-outline'
                    : 'sunny-outline'
                }
                size={25}
                color={
                  colors.brand
                }
              />
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              {journey.moment ===
              'upcoming'
                ? 'Your first day is ready to take shape.'
                : 'Nothing planned for this day yet.'}
            </Text>

            <Text
              style={
                styles.emptyBody
              }
            >
              Add places,
              activities, food and
              transport from your
              Plan.
            </Text>
          </View>
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
                const confirmedBookings =
                  bookingsLinkedToStop(
                    workspace.bookings,
                    stop.id,
                  ).filter(
                    (booking) =>
                      booking.status ===
                      'confirmed',
                  );

                return (
                  <View
                    key={
                      stop.id
                    }
                    style={
                      styles.stopRow
                    }
                  >
                  <View
                    style={
                      styles.timelineColumn
                    }
                  >
                    <View
                      style={
                        styles.stopDot
                      }
                    />

                    {index <
                      stops.length -
                        1 && (
                      <View
                        style={
                          styles.timelineLine
                        }
                      />
                    )}
                  </View>

                  <View
                    style={
                      styles.stopCard
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
                        size={19}
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

                        {stop.type}
                      </Text>

                      {confirmedBookings.length >
                        0 && (
                        <Pressable
                          accessibilityLabel="Open confirmed booking"
                          style={
                            styles.bookingContext
                          }
                          onPress={() =>
                            router.push({
                              pathname:
                                '/trip/[tripId]/bookings',
                              params: {
                                tripId:
                                  workspace.trip.id,
                                ...(confirmedBookings.length ===
                                1
                                  ? {
                                      bookingId:
                                        confirmedBookings[0]
                                          .id,
                                    }
                                  : {}),
                              },
                            })
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
                            numberOfLines={
                              1
                            }
                            style={
                              styles.bookingContextText
                            }
                          >
                            {confirmedBookings.length ===
                            1
                              ? confirmedBookings[0]
                                  .confirmationCode
                                ? `Confirmed · ${confirmedBookings[0].confirmationCode}`
                                : 'Confirmed booking'
                              : `${confirmedBookings.length} confirmed bookings`}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                  </View>
                );
              },
            )}
          </View>
        )}

        <Pressable
          style={
            styles.planButton
          }
          onPress={() =>
            router.push({
              pathname:
                '/trip/[tripId]/plan',

              params: {
                tripId:
                  workspace.trip.id,
              },
            })
          }
        >
          <Text
            style={
              styles.planButtonText
            }
          >
            Open full plan
          </Text>

          <Ionicons
            name="arrow-forward"
            size={18}
            color={
              colors.textInverse
            }
          />
        </Pressable>
      </View>

      <View
        style={styles.bottomSpace}
      />
    </Screen>
  );
}

const styles =
  StyleSheet.create({
    topBar: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      paddingTop:
        spacing[3],
    },

    backButton: {
      width: 42,
      height: 42,
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
      ...shadows.subtle,
    },

    topLabel: {
      fontFamily:
        fontFamily.sansBold,
      fontSize:
        fontSize.micro,
      letterSpacing: 1.8,
      color:
        colors.brass,
    },

    topSpacer: {
      width: 42,
    },

    hero: {
      paddingTop:
        spacing[10],
      paddingBottom:
        spacing[8],
    },

    eyebrow: {
      fontFamily:
        fontFamily.sansBold,
      fontSize:
        fontSize.micro,
      letterSpacing: 1.8,
      color:
        colors.brass,
      marginBottom:
        spacing[3],
    },

    title: {
      fontFamily:
        fontFamily.serifSemiBold,
      fontSize:
        fontSize.display,
      lineHeight:
        lineHeight.display,
      color:
        colors.textPrimary,
    },

    dateRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap:
        spacing[2],
      marginTop:
        spacing[4],
    },

    dateText: {
      fontFamily:
        fontFamily.sansMedium,
      fontSize:
        fontSize.bodySmall,
      color:
        colors.textSecondary,
    },

    dayCard: {
      backgroundColor:
        colors.surface,
      borderRadius:
        radius.xl,
      borderWidth: 1,
      borderColor:
        colors.border,
      padding:
        spacing[6],
      ...shadows.subtle,
    },

    dayTop: {
      flexDirection:
        'row',
      alignItems:
        'flex-start',
      justifyContent:
        'space-between',
    },

    momentLabel: {
      fontFamily:
        fontFamily.sansBold,
      fontSize:
        fontSize.micro,
      letterSpacing: 1.5,
      color:
        colors.brass,
      marginBottom:
        spacing[2],
    },

    dayTitle: {
      fontFamily:
        fontFamily.serifSemiBold,
      fontSize:
        fontSize.title,
      lineHeight:
        lineHeight.title,
      color:
        colors.textPrimary,
    },

    dayBadge: {
      paddingHorizontal:
        spacing[3],
      paddingVertical:
        spacing[2],
      borderRadius:
        radius.pill,
      backgroundColor:
        colors.tealSoft,
    },

    dayBadgeText: {
      fontFamily:
        fontFamily.sansBold,
      fontSize:
        fontSize.micro,
      letterSpacing: 1,
      color:
        colors.teal,
    },

    dayDate: {
      fontFamily:
        fontFamily.sansMedium,
      fontSize:
        fontSize.bodySmall,
      color:
        colors.textSecondary,
      marginTop:
        spacing[3],
    },

    divider: {
      height: 1,
      backgroundColor:
        colors.border,
      marginVertical:
        spacing[6],
    },

    emptyState: {
      paddingVertical:
        spacing[3],
    },

    emptyIcon: {
      width: 50,
      height: 50,
      borderRadius:
        radius.md,
      backgroundColor:
        colors.brandSoft,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginBottom:
        spacing[5],
    },

    emptyTitle: {
      fontFamily:
        fontFamily.serifSemiBold,
      fontSize:
        fontSize.titleSmall,
      lineHeight:
        lineHeight.titleSmall,
      color:
        colors.textPrimary,
      marginBottom:
        spacing[3],
    },

    emptyBody: {
      fontFamily:
        fontFamily.sansRegular,
      fontSize:
        fontSize.bodySmall,
      lineHeight:
        lineHeight.bodySmall,
      color:
        colors.textSecondary,
    },

    stopList: {
      gap: 0,
    },

    stopRow: {
      flexDirection:
        'row',
      alignItems:
        'stretch',
    },

    timelineColumn: {
      width: 24,
      alignItems:
        'center',
    },

    stopDot: {
      width: 9,
      height: 9,
      borderRadius:
        radius.pill,
      backgroundColor:
        colors.teal,
      marginTop: 25,
    },

    timelineLine: {
      flex: 1,
      width: 1,
      backgroundColor:
        colors.borderStrong,
      marginVertical: 4,
    },

    stopCard: {
      flex: 1,
      minHeight: 72,
      flexDirection:
        'row',
      alignItems:
        'center',
      marginLeft:
        spacing[2],
      marginBottom:
        spacing[3],
      borderRadius:
        radius.md,
      backgroundColor:
        colors.surfaceWarm,
      paddingHorizontal:
        spacing[4],
    },

    stopIcon: {
      width: 38,
      height: 38,
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

    bookingContext: {
      alignSelf:
        'flex-start',
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 5,
      marginTop:
        spacing[2],
      paddingHorizontal:
        spacing[2],
      paddingVertical: 4,
      borderRadius:
        radius.pill,
      backgroundColor:
        colors.brassSoft,
    },

    bookingContextText: {
      flexShrink: 1,
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize:
        fontSize.micro,
      color:
        colors.brass,
    },

    planButton: {
      height: 54,
      marginTop:
        spacing[6],
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
    },

    planButtonText: {
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize:
        fontSize.bodySmall,
      color:
        colors.textInverse,
    },

    bottomSpace: {
      height:
        spacing[12],
    },
  });
