import { Ionicons } from '@expo/vector-icons';

import {
  useFocusEffect,
  useRouter,
} from 'expo-router';

import {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';

import type {
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
  accommodationContextsForDay,
  splitAccommodationDateTime,
} from '@/services/accommodation-details';
import {
  formatCalendarDateForDisplay,
  resolveTodayRuntimeContext,
  type TripTimeZoneReason,
} from '@/services/time-truth';

import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  shadows,
  spacing,
} from '@/theme';

function formatDayDate(
  date: string,
): string {
  return formatCalendarDateForDisplay(
    date,
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
  return formatCalendarDateForDisplay(
    date,
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

function timeZoneFallbackCopy(
  reason: TripTimeZoneReason,
): string {
  switch (reason) {
    case 'ambiguous-destination-timezones':
      return 'Destination timezones differ, so Today is using this device’s calendar date.';
    case 'invalid-destination-timezone':
      return 'A saved destination timezone needs review, so Today is using this device’s calendar date.';
    case 'no-destination':
      return 'No destination timezone is saved, so Today is using this device’s calendar date.';
    default:
      return 'Destination timezone is not yet saved, so Today is using this device’s calendar date.';
  }
}

export default function TodayScreen() {
  const router =
    useRouter();

  const { workspace } =
    useTripWorkspace();

  useTripWorkspaceFocusRefresh();

  const [runtimeRevision, setRuntimeRevision] =
    useState(0);

  useFocusEffect(
    useCallback(() => {
      setRuntimeRevision((current) => current + 1);
    }, []),
  );

  const journey =
    useMemo(
      () =>
        resolveTodayRuntimeContext(
          workspace.trip,
          workspace.days,
        ),
      [
        runtimeRevision,
        workspace.days,
        workspace.trip,
      ],
    );

  const firstDestination =
    workspace.trip.destinations[0]?.name;
  const destination = firstDestination
    ? workspace.trip.destinations.length > 1
      ? `${firstDestination} +${workspace.trip.destinations.length - 1}`
      : firstDestination
    : 'Your destination';

  const selectedDay =
    journey.displayDay;

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

  const accommodationContexts = selectedDay
    ? accommodationContextsForDay(
        workspace.accommodations,
        selectedDay.date,
      )
    : [];

  const momentLabel =
    journey.runtime.phase === 'active'
      ? 'TODAY'
      : journey.runtime.phase === 'upcoming'
        ? 'UP NEXT'
        : journey.runtime.phase === 'completed'
          ? 'JOURNEY COMPLETE'
          : 'DATE REVIEW NEEDED';

  const dayTitle =
    journey.runtime.phase === 'active'
      ? 'Today'
      : journey.runtime.phase === 'upcoming'
        ? 'Your first day preview'
        : journey.runtime.phase === 'completed'
          ? 'Your final day history'
          : 'Trip timing unavailable';

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

        {journey.runtime.timeZone.certainty ===
          'fallback' && (
          <View style={styles.timeTruthNotice}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={colors.teal}
            />
            <Text style={styles.timeTruthNoticeText}>
              {timeZoneFallbackCopy(
                journey.runtime.timeZone.reason,
              )}
            </Text>
          </View>
        )}

        {journey.runtime.statusConflict && (
          <View style={styles.statusTruthNotice}>
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={colors.brass}
            />
            <Text style={styles.timeTruthNoticeText}>
              Saved workflow status is {journey.runtime.persistedStatus}; live journey phase is {journey.runtime.phase}. Today follows the calendar truth.
            </Text>
          </View>
        )}
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

        {accommodationContexts.length > 0 && (
          <View style={styles.stayContexts}>
            {accommodationContexts.map(({ accommodation, phase }) => {
              const dateTime = splitAccommodationDateTime(
                phase === 'check-out'
                  ? accommodation.checkOutAt
                  : accommodation.checkInAt,
              );
              const phaseLabel =
                phase === 'check-in'
                  ? journey.runtime.phase === 'completed'
                    ? 'CHECK-IN HISTORY'
                    : journey.runtime.phase === 'upcoming'
                      ? 'PLANNED CHECK-IN'
                      : 'CHECK-IN SCHEDULED'
                  : phase === 'check-out'
                    ? journey.runtime.phase === 'completed'
                      ? 'CHECK-OUT HISTORY'
                      : journey.runtime.phase === 'upcoming'
                        ? 'PLANNED CHECK-OUT'
                        : 'CHECK-OUT SCHEDULED'
                    : journey.runtime.phase === 'completed'
                      ? 'STAY HISTORY'
                      : journey.runtime.phase === 'upcoming'
                        ? 'PLANNED STAY'
                        : 'STAY SCHEDULED';

              return (
                <Pressable
                  key={`${accommodation.id}-${phase}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${accommodation.name}`}
                  style={styles.stayContext}
                  onPress={() =>
                    router.push({
                      pathname: '/trip/[tripId]/accommodation',
                      params: {
                        tripId: workspace.trip.id,
                        accommodationId: accommodation.id,
                      },
                    })
                  }
                >
                  <View style={styles.stayContextIcon}>
                    <Ionicons
                      name="bed-outline"
                      size={17}
                      color={colors.brand}
                    />
                  </View>
                  <View style={styles.stayContextCopy}>
                    <Text style={styles.stayContextLabel}>
                      {phaseLabel}{dateTime && phase !== 'stay' ? ` · ${dateTime.time}` : ''}
                    </Text>
                    <Text numberOfLines={1} style={styles.stayContextTitle}>
                      {accommodation.name}
                    </Text>
                  </View>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={colors.brand}
                  />
                </Pressable>
              );
            })}
          </View>
        )}

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
                  journey.runtime.phase ===
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
              {journey.kind === 'upcoming-preview'
                ? 'Your first day is ready to take shape.'
                : journey.kind === 'completed-history'
                  ? 'No itinerary was recorded for this final day.'
                  : journey.kind === 'active-missing-day'
                    ? 'Today is inside the trip, but its exact TripDay is unavailable.'
                    : journey.kind === 'invalid-trip-dates'
                      ? 'Travel dates need review before Today can choose a day.'
                      : 'Nothing planned for today yet.'}
            </Text>

            <Text
              style={
                styles.emptyBody
              }
            >
              {journey.kind === 'active-missing-day'
                ? 'Open Plan to repair the itinerary. TravelOS will not substitute a different day.'
                : journey.kind === 'invalid-trip-dates'
                  ? 'Open Trip Details to choose valid calendar dates.'
                  : 'Add places, activities, food and transport from your Plan.'}
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

    timeTruthNotice: {
      marginTop: spacing[4],
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing[2],
      padding: spacing[3],
      borderRadius: radius.md,
      backgroundColor: colors.tealSoft,
    },

    statusTruthNotice: {
      marginTop: spacing[3],
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing[2],
      padding: spacing[3],
      borderRadius: radius.md,
      backgroundColor: colors.brassSoft,
    },

    timeTruthNoticeText: {
      flex: 1,
      fontFamily: fontFamily.sansRegular,
      fontSize: fontSize.caption,
      lineHeight: lineHeight.caption,
      color: colors.textSecondary,
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

    stayContexts: {
      gap: spacing[3],
      marginBottom: spacing[5],
    },

    stayContext: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      padding: spacing[3],
      borderRadius: radius.md,
      backgroundColor: colors.brandSoft,
    },

    stayContextIcon: {
      width: 38,
      height: 38,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },

    stayContextCopy: {
      flex: 1,
    },

    stayContextLabel: {
      fontFamily: fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 0.8,
      color: colors.brand,
    },

    stayContextTitle: {
      marginTop: 3,
      fontFamily: fontFamily.sansMedium,
      fontSize: fontSize.bodySmall,
      color: colors.textPrimary,
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
