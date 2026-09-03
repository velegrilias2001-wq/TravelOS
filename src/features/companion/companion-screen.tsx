import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import {
  useEffect,
  useMemo,
  useRef,
  type PropsWithChildren,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';
import type {
  Accommodation,
  Booking,
  TripStopId,
  TripStopLivedPhase,
  TripStopType,
} from '@/domain/entities';
import {
  useTripWorkspace,
  useTripWorkspaceFocusRefresh,
} from '@/features/trip-workspace/trip-workspace-context';
import { useNetworkReachability } from '@/features/offline/use-network-reachability';
import { SlideNotice } from '@/features/motion/slide-notice';
import {
  splitAccommodationDateTime,
  type AccommodationDayContext,
} from '@/services/accommodation-details';
import { formatBookingTemporalValue } from '@/services/booking-time';
import {
  selectCompanion,
  type CompanionReadiness,
  type CompanionSelection,
  type CompanionStopContext,
} from '@/services/companion';
import { companionStopBoundaryTimes } from '@/services/companion-refresh';
import {
  collectOfflineTripFacts,
  selectOfflineTripNotice,
} from '@/services/offline-trip-context';
import {
  mappedStopCoordinate,
  systemDirectionsUrl,
} from '@/services/trip-map-context';
import { formatCalendarDateForDisplay } from '@/services/time-truth';
import { companionActivePlaceLabel } from '@/services/trip-day-destination';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  shadows,
  spacing,
} from '@/theme';

import { useCompanionPlanChangeNotice } from './use-companion-plan-change';
import { useCompanionRuntimeRefresh } from './use-companion-runtime-refresh';

type CompanionPath =
  | '/trip/[tripId]/plan'
  | '/trip/[tripId]/map'
  | '/trip/[tripId]/bookings'
  | '/trip/[tripId]/accommodation'
  | '/trip/[tripId]/budget'
  | '/trip/[tripId]/travelers'
  | '/trip/[tripId]/details';

type OpenRoute = (
  pathname: CompanionPath,
  params?: Record<string, string>,
) => void;

type LivedProgressActions = {
  record(
    stopId: TripStopId,
    phase: TripStopLivedPhase,
  ): void;
  clear(stopId: TripStopId): void;
};

function openStopDirections(
  context: CompanionStopContext,
): void {
  const coordinate = mappedStopCoordinate(context.stop);

  if (!coordinate) {
    return;
  }

  const url = systemDirectionsUrl(
    coordinate,
    context.stop.title,
    Platform.OS,
  );

  if (!url) {
    return;
  }

  void Linking.openURL(url);
}

function formatTripDate(date: string): string {
  return formatCalendarDateForDisplay(date, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDayDate(date: string): string {
  return formatCalendarDateForDisplay(date, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function stopIcon(
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

export function CompanionScreen() {
  const router = useRouter();
  const { workspace, actions } = useTripWorkspace();
  useTripWorkspaceFocusRefresh();
  const {
    notice: planChangeNotice,
    dismiss: dismissPlanChange,
  } = useCompanionPlanChangeNotice(workspace);
  const reachability = useNetworkReachability();
  const offlineNotice = useMemo(
    () =>
      selectOfflineTripNotice({
        reachability,
        facts: collectOfflineTripFacts(workspace),
        surface: 'companion',
      }),
    [reachability, workspace],
  );

  const initial = useMemo(
    () => selectCompanion(workspace),
    [workspace],
  );
  const stopBoundaryTimes = useMemo(
    () =>
      initial.mode === 'active' &&
      initial.timingReliable
        ? companionStopBoundaryTimes(
            initial.stopContexts.map(
              (context) => context.stop,
            ),
          )
        : [],
    [initial],
  );
  const runtimeRevision = useCompanionRuntimeRefresh(
    initial.runtime.timeZone,
    stopBoundaryTimes,
  );
  const selection = useMemo(
    () => selectCompanion(workspace),
    [runtimeRevision, workspace],
  );

  const openRoute: OpenRoute = (pathname, params = {}) => {
    router.push({
      pathname,
      params: { tripId: workspace.trip.id, ...params },
    });
  };
  const livedProgress: LivedProgressActions = {
    record: (stopId, phase) => {
      void actions.recordStopLivedPhase(stopId, phase);
    },
    clear: (stopId) => {
      void actions.clearStopLivedPhase(stopId);
    },
  };
  const destinations = workspace.trip.destinations
    .map((destination) => destination.name.trim())
    .filter(Boolean)
    .join(' · ');
  const heroPlace =
    selection.mode === 'active'
      ? companionActivePlaceLabel(
          selection.displayDay,
          workspace.trip.destinations,
        )
      : destinations || 'Destination not yet set';

  return (
    <Screen scroll contentStyle={styles.screenContent}>
      <View style={styles.topBar}>
        <RoundButton
          icon="arrow-back"
          label="Go back"
          onPress={() => router.back()}
        />
        <Text style={styles.topLabel}>COMPANION</Text>
        <RoundButton
          icon="options-outline"
          label="Open trip details"
          onPress={() => openRoute('/trip/[tripId]/details')}
        />
      </View>

      <View style={styles.hero}>
        <View style={styles.phasePill}>
          <View style={styles.phaseDot} />
          <Text style={styles.phaseText}>
            {selection.mode === 'upcoming'
              ? 'BEFORE THE JOURNEY'
              : selection.mode === 'active'
                ? 'ON THE JOURNEY'
                : selection.mode === 'completed'
                  ? 'JOURNEY COMPLETE'
                  : 'DATES NEED REVIEW'}
          </Text>
        </View>
        <Text style={styles.destination}>
          {heroPlace.toUpperCase()}
        </Text>
        <Text style={styles.tripTitle}>{workspace.trip.title}</Text>
        <Text style={styles.tripDates}>
          {formatTripDate(workspace.trip.startDate)} —{' '}
          {formatTripDate(workspace.trip.endDate)}
        </Text>

        {selection.runtime.statusConflict && (
          <TruthNotice
            icon="shield-checkmark-outline"
            brass
            body="Trip status and travel dates differ. Companion follows your travel dates."
          />
        )}
        {planChangeNotice ? (
          <TruthNotice
            icon="sync-outline"
            body={planChangeNotice}
            onDismiss={dismissPlanChange}
          />
        ) : null}
        {offlineNotice ? (
          <SlideNotice
            noticeKey={offlineNotice.body}
          >
            <TruthNotice
              icon="cloud-offline-outline"
              body={offlineNotice.body}
            />
          </SlideNotice>
        ) : null}
      </View>

      <PhaseTransition phase={selection.mode}>
        {selection.mode === 'upcoming' ? (
          <Upcoming
            selection={selection}
            openRoute={openRoute}
          />
        ) : selection.mode === 'active' ? (
          <Active
            selection={selection}
            openRoute={openRoute}
            livedProgress={livedProgress}
          />
        ) : selection.mode === 'completed' ? (
          <Completed
            selection={selection}
            openRoute={openRoute}
          />
        ) : (
          <DateReview
            onPress={() => openRoute('/trip/[tripId]/details')}
          />
        )}
      </PhaseTransition>
      <View style={styles.bottomSpace} />
    </Screen>
  );
}

function Upcoming({
  selection,
  openRoute,
}: {
  selection: CompanionSelection;
  openRoute: OpenRoute;
}) {
  return (
    <View style={styles.stack}>
      <View style={styles.darkCard}>
        <Text style={styles.darkEyebrow}>DEPARTURE</Text>
        <Text
          accessibilityLabel={`${selection.countdownDays ?? 0} days until departure`}
          style={styles.countdown}
        >
          {selection.countdownDays ?? '—'}
        </Text>
        <Text style={styles.darkTitle}>
          {selection.countdownDays === 1 ? 'day to go' : 'days to go'}
        </Text>
        <View style={styles.brassRule} />
        <Text style={styles.darkBody}>
          Finish the essentials and take a first look at the journey ahead.
        </Text>
      </View>

      {selection.displayDay && (
        <FirstDayPreview selection={selection} openRoute={openRoute} />
      )}

      {selection.nextAccommodation && (
        <StayCard
          accommodation={selection.nextAccommodation}
          label="NEXT CHECK-IN"
          onPress={() =>
            openRoute('/trip/[tripId]/accommodation', {
              accommodationId: selection.nextAccommodation?.id ?? '',
            })
          }
        />
      )}
      {selection.relevantUnlinkedBookings.map((booking) => (
        <BookingCard
          key={booking.id}
          booking={booking}
          label="EARLY BOOKING CONTEXT"
          onPress={() =>
            openRoute('/trip/[tripId]/bookings', {
              bookingId: booking.id,
            })
          }
        />
      ))}
      <Readiness readiness={selection.readiness} openRoute={openRoute} />
    </View>
  );
}

function FirstDayPreview({
  selection,
  openRoute,
}: {
  selection: CompanionSelection;
  openRoute: OpenRoute;
}) {
  if (!selection.displayDay) {
    return null;
  }

  return (
    <View style={styles.firstDayCard}>
      <View style={styles.firstDayHeader}>
        <View style={styles.flex}>
          <Text style={styles.sectionEyebrow}>FIRST DAY</Text>
          <Text style={styles.firstDayDate}>
            {formatDayDate(selection.displayDay.date)}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View first day in Plan"
          hitSlop={8}
          onPress={() => openRoute('/trip/[tripId]/plan')}
        >
          <Text style={styles.sectionAction}>VIEW PLAN</Text>
        </Pressable>
      </View>

      <View style={styles.firstDayBody}>
        {selection.stopContexts.length === 0 ? (
          <Empty
            icon="calendar-outline"
            title="Your first day is open"
            body="Add a moment when you’re ready."
          />
        ) : (
          <View style={styles.list}>
            {selection.stopContexts.slice(0, 3).map((context) => (
              <CompactStop
                key={context.stop.id}
                context={context}
                onPress={() =>
                  openRoute('/trip/[tripId]/plan', {
                    stopId: context.stop.id,
                  })
                }
              />
            ))}
            {selection.stopContexts.length > 3 && (
              <Text style={styles.moreText}>
                +{selection.stopContexts.length - 3} more moments in Plan
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function Active({
  selection,
  openRoute,
  livedProgress,
}: {
  selection: CompanionSelection;
  openRoute: OpenRoute;
  livedProgress: LivedProgressActions;
}) {
  if (!selection.displayDay) {
    return (
      <Section eyebrow="TODAY" title="Today’s plan is unavailable">
        <Empty
          icon="calendar-clear-outline"
          title="Check your trip dates"
          body="Today falls within this trip, but its itinerary could not be found."
        />
        <PrimaryButton
          label="Open Plan"
          onPress={() => openRoute('/trip/[tripId]/plan')}
        />
      </Section>
    );
  }

  return (
    <View style={styles.stack}>
      <View style={styles.progressCard}>
        <View style={styles.progressCopy}>
          <Text style={styles.darkEyebrow}>TODAY</Text>
          <Text style={styles.progressTitle}>
            Day {selection.dayIndex ?? '—'} of {selection.totalDays}
          </Text>
          <Text style={styles.darkMeta}>
            {formatDayDate(selection.displayDay.date)}
          </Text>
        </View>
        <View style={styles.remainingBadge}>
          <Text style={styles.remainingNumber}>
            {selection.timingReliable
              ? selection.remainingStops.length
              : selection.stopContexts.length}
          </Text>
          <Text style={styles.remainingLabel}>
            {selection.timingReliable ? 'TIMED AHEAD' : 'ON PLAN'}
          </Text>
        </View>
      </View>

      {selection.currentStop && (
        <FocusStop
          label="NOW"
          context={selection.currentStop}
          openRoute={openRoute}
          livedProgress={livedProgress}
        />
      )}
      {selection.nextStop && (
        <FocusStop
          label="NEXT"
          context={selection.nextStop}
          openRoute={openRoute}
          livedProgress={livedProgress}
        />
      )}
      {!selection.timingReliable && selection.stopContexts.length > 0 && (
        <TruthNotice
          icon="reorder-three-outline"
          body="Live now and next timing needs a saved timezone for today’s city. Today’s itinerary remains in plan order."
        />
      )}
      {selection.timingReliable &&
        !selection.currentStop &&
        !selection.nextStop &&
        selection.stopContexts.length > 0 && (
          <TruthNotice
            icon="checkmark-done-outline"
            body={
              selection.stopContexts.some(
                (context) =>
                  context.phase === 'done' ||
                  context.phase === 'skipped',
              )
                ? 'No later timed moment is still open today. Done and skipped marks do not change the saved plan.'
                : 'No later timed moment is saved today. Moments without a time remain visible without being called current.'
            }
          />
        )}

      <Section
        eyebrow="TODAY"
        title={selection.displayDay.title || 'Today’s plan'}
        meta={
          selection.timingReliable && selection.localTime
            ? `${selection.localTime} in ${selection.runtime.timeZone.timeZone}`
            : 'Plan order'
        }
        action="Full Plan"
        onAction={() => openRoute('/trip/[tripId]/plan')}
      >
        {selection.stopContexts.length === 0 ? (
          <Empty
            icon="sunny-outline"
            title="Nothing is planned for this day"
            body="Companion has no moment to call current or next. The day remains open."
          />
        ) : (
          <View>
            {selection.stopContexts.map((context, index) => (
              <TimelineStop
                key={context.stop.id}
                context={context}
                last={index === selection.stopContexts.length - 1}
                onPress={() =>
                  openRoute('/trip/[tripId]/plan', {
                    stopId: context.stop.id,
                  })
                }
                livedProgress={livedProgress}
              />
            ))}
          </View>
        )}
      </Section>

      {selection.currentAccommodation ? (
        <StayCard
          accommodation={selection.currentAccommodation}
          label="CURRENT STAY"
          onPress={() =>
            openRoute('/trip/[tripId]/accommodation', {
              accommodationId:
                selection.currentAccommodation?.id ?? '',
            })
          }
        />
      ) : (
        selection.relevantAccommodations.map((context) => (
          <StayContext
            key={`${context.accommodation.id}-${context.phase}`}
            context={context}
            onPress={() =>
              openRoute('/trip/[tripId]/accommodation', {
                accommodationId: context.accommodation.id,
              })
            }
          />
        ))
      )}
      {selection.relevantUnlinkedBookings.map((booking) => (
        <BookingCard
          key={booking.id}
          booking={booking}
          label="TODAY · UNLINKED BOOKING"
          onPress={() =>
            openRoute('/trip/[tripId]/bookings', {
              bookingId: booking.id,
            })
          }
        />
      ))}
      <ModuleActions openRoute={openRoute} />
    </View>
  );
}

function Completed({
  selection,
  openRoute,
}: {
  selection: CompanionSelection;
  openRoute: OpenRoute;
}) {
  return (
    <View style={styles.stack}>
      <View style={styles.darkCard}>
        <View style={styles.completeIcon}>
          <Ionicons name="checkmark" size={24} color={colors.textInverse} />
        </View>
        <Text style={styles.darkEyebrow}>JOURNEY COMPLETE</Text>
        <Text style={styles.completeTitle}>This trip is no longer live.</Text>
        <Text style={styles.darkBody}>
          Companion now shows your saved trip history. Nothing is presented as happening now.
        </Text>
        <View style={styles.summaryRow}>
          <Summary value={selection.summary.dayCount} label="DAYS" />
          <Summary value={selection.summary.stopCount} label="MOMENTS" />
          <Summary value={selection.summary.bookingCount} label="BOOKINGS" />
        </View>
      </View>

      {selection.displayDay && (
        <Section
          eyebrow="FINAL DAY"
          title={selection.displayDay.title || 'Final day history'}
          meta={formatDayDate(selection.displayDay.date)}
          action="Open Plan"
          onAction={() => openRoute('/trip/[tripId]/plan')}
        >
          {selection.stopContexts.length === 0 ? (
            <Empty
              icon="book-outline"
              title="No final-day itinerary was recorded"
              body="No moments were added to this day."
            />
          ) : (
            <View style={styles.list}>
              {selection.stopContexts.map((context) => (
                <CompactStop
                  key={context.stop.id}
                  context={context}
                  onPress={() =>
                    openRoute('/trip/[tripId]/plan', {
                      stopId: context.stop.id,
                    })
                  }
                />
              ))}
            </View>
          )}
        </Section>
      )}
      <View style={styles.futureCard}>
        <Text style={styles.sectionEyebrow}>AFTER TRAVEL</Text>
        <Text style={styles.futureTitle}>Memories and Travel Book</Text>
        <Text style={styles.futureBody}>
          Memories and Travel Book will help you relive this journey in a future update.
        </Text>
      </View>
      <ModuleActions openRoute={openRoute} />
    </View>
  );
}

function DateReview({ onPress }: { onPress: () => void }) {
  return (
    <Section eyebrow="DATE REVIEW" title="Companion needs valid trip dates">
      <Empty
        icon="alert-circle-outline"
        title="Live context is unavailable"
        body="The saved dates need attention before Companion can show the right day or moment."
      />
      <PrimaryButton label="Review Trip Details" onPress={onPress} />
    </Section>
  );
}

function PhaseTransition({
  phase,
  children,
}: PropsWithChildren<{ phase: string }>) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    let mounted = true;
    let animation: Animated.CompositeAnimation | null = null;

    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!mounted || reduceMotion) {
        opacity.setValue(1);
        translateY.setValue(0);
        return;
      }
      opacity.setValue(0);
      translateY.setValue(10);
      animation = Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]);
      animation.start();
    });

    return () => {
      mounted = false;
      animation?.stop();
    };
  }, [opacity, phase, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

function Section({
  eyebrow,
  title,
  meta,
  action,
  onAction,
  children,
}: PropsWithChildren<{
  eyebrow: string;
  title: string;
  meta?: string;
  action?: string;
  onAction?: () => void;
}>) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionCopy}>
          <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
          <Text style={styles.sectionTitle}>{title}</Text>
          {meta && <Text style={styles.sectionMeta}>{meta}</Text>}
        </View>
        {action && onAction && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action}
            hitSlop={8}
            onPress={onAction}
          >
            <Text style={styles.sectionAction}>{action}</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function timelineStopLabel(
  phase: CompanionStopContext['phase'],
): string {
  switch (phase) {
    case 'current':
      return 'NOW';
    case 'next':
      return 'NEXT';
    case 'previous':
      return 'EARLIER';
    case 'delayed':
      return 'DELAYED';
    case 'done':
      return 'DONE';
    case 'skipped':
      return 'SKIPPED';
    case 'untimed':
      return 'NO TIME';
    case 'ordered':
      return 'PLAN ORDER';
    case 'history':
      return 'HISTORY';
    default:
      return 'LATER';
  }
}

function LivedProgressPills({
  context,
  livedProgress,
}: {
  context: CompanionStopContext;
  livedProgress: LivedProgressActions;
}) {
  if (
    context.phase === 'done' ||
    context.phase === 'skipped'
  ) {
    return (
      <PillAction
        icon="arrow-undo-outline"
        label="Undo"
        onPress={() => livedProgress.clear(context.stop.id)}
      />
    );
  }

  return (
    <>
      <PillAction
        icon="checkmark-outline"
        label="Done"
        onPress={() =>
          livedProgress.record(context.stop.id, 'done')
        }
      />
      <PillAction
        icon="play-skip-forward-outline"
        label="Skip"
        onPress={() =>
          livedProgress.record(context.stop.id, 'skipped')
        }
      />
    </>
  );
}

function FocusStop({
  label,
  context,
  openRoute,
  livedProgress,
}: {
  label: 'NOW' | 'NEXT';
  context: CompanionStopContext;
  openRoute: OpenRoute;
  livedProgress: LivedProgressActions;
}) {
  const booking = context.bookings[0];

  return (
    <View style={[styles.focusCard, label === 'NEXT' && styles.nextCard]}>
      <View style={styles.focusTop}>
        <Text style={styles.focusLabel}>{label}</Text>
        <Text style={styles.focusTime}>
          {context.stop.startTime}
          {context.stop.endTime ? ` — ${context.stop.endTime}` : ''}
        </Text>
      </View>
      <View style={styles.focusMain}>
        <View style={styles.focusIcon}>
          <Ionicons
            name={stopIcon(context.stop.type)}
            size={23}
            color={colors.teal}
          />
        </View>
        <View style={styles.flex}>
          <Text style={styles.focusTitle}>{context.stop.title}</Text>
          <Text numberOfLines={1} style={styles.focusMeta}>
            {context.stop.location?.name || context.stop.type}
          </Text>
        </View>
      </View>
      {booking && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open linked booking ${booking.title}`}
          style={styles.bookingTruth}
          onPress={() =>
            openRoute('/trip/[tripId]/bookings', {
              bookingId: booking.id,
            })
          }
        >
          <Ionicons name="ticket-outline" size={15} color={colors.brass} />
          <Text numberOfLines={1} style={styles.bookingTruthText}>
            {booking.status}
            {booking.provider ? ` · ${booking.provider}` : ''}
            {typeof booking.isPaid === 'boolean'
              ? booking.isPaid
                ? ' · paid'
                : ' · unpaid'
              : ''}
          </Text>
          <Ionicons name="chevron-forward" size={15} color={colors.brass} />
        </Pressable>
      )}
      <View style={styles.actionRow}>
        <LivedProgressPills
          context={context}
          livedProgress={livedProgress}
        />
        <PillAction
          icon="create-outline"
          label="Open in Plan"
          onPress={() =>
            openRoute('/trip/[tripId]/plan', {
              stopId: context.stop.id,
            })
          }
        />
        {context.isMapped && (
          <PillAction
            icon="map-outline"
            label="Show on Map"
            onPress={() =>
              openRoute('/trip/[tripId]/map', {
                stopId: context.stop.id,
              })
            }
          />
        )}
        {context.isMapped && (
          <PillAction
            icon="navigate-outline"
            label="Directions"
            onPress={() => openStopDirections(context)}
          />
        )}
      </View>
    </View>
  );
}

function TimelineStop({
  context,
  last,
  onPress,
  livedProgress,
}: {
  context: CompanionStopContext;
  last: boolean;
  onPress: () => void;
  livedProgress: LivedProgressActions;
}) {
  const label = timelineStopLabel(context.phase);

  return (
    <View style={styles.timelineRow}>
      <View style={styles.rail}>
        <View
          style={[
            styles.dot,
            context.phase === 'current' && styles.dotCurrent,
            (context.phase === 'previous' ||
              context.phase === 'delayed' ||
              context.phase === 'done' ||
              context.phase === 'skipped') &&
              styles.dotPast,
          ]}
        />
        {!last && <View style={styles.line} />}
      </View>
      <View style={styles.flex}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${context.stop.title} in Plan, ${label.toLowerCase()}`}
          style={styles.timelineCard}
          onPress={onPress}
        >
          <View style={styles.flex}>
            <Text style={styles.timelineLabel}>{label}</Text>
            <Text style={styles.rowTitle}>{context.stop.title}</Text>
            <Text style={styles.rowMeta}>
              {context.stop.startTime ? `${context.stop.startTime} · ` : ''}
              {context.stop.type}
              {context.bookings.length > 0
                ? ` · ${context.bookings.length} linked ${context.bookings.length === 1 ? 'booking' : 'bookings'}`
                : ''}
            </Text>
          </View>
          {context.isMapped && (
            <Ionicons name="location-outline" size={17} color={colors.teal} />
          )}
        </Pressable>
        <View style={styles.timelineLivedActions}>
          <LivedProgressPills
            context={context}
            livedProgress={livedProgress}
          />
        </View>
      </View>
    </View>
  );
}

function CompactStop({
  context,
  onPress,
}: {
  context: CompanionStopContext;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${context.stop.title} in Plan`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.rowIcon}>
        <Ionicons
          name={stopIcon(context.stop.type)}
          size={18}
          color={colors.teal}
        />
      </View>
      <View style={styles.flex}>
        <Text numberOfLines={1} style={styles.rowTitle}>
          {context.stop.title}
        </Text>
        <Text style={styles.rowMeta}>
          {context.stop.startTime ? `${context.stop.startTime} · ` : 'No time · '}
          {context.stop.type}
          {context.bookings.length > 0
            ? ` · ${context.bookings.length} linked ${context.bookings.length === 1 ? 'booking' : 'bookings'}`
            : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
    </Pressable>
  );
}

function StayCard({
  accommodation,
  label,
  onPress,
}: {
  accommodation: Accommodation;
  label: string;
  onPress: () => void;
}) {
  const checkIn = splitAccommodationDateTime(accommodation.checkInAt);
  const checkOut = splitAccommodationDateTime(accommodation.checkOutAt);

  return (
    <ContextCard
      icon="bed-outline"
      label={label}
      title={accommodation.name}
      meta={`${
        checkIn
          ? `${formatTripDate(checkIn.date)} · ${checkIn.time}`
          : accommodation.address || 'Stay details saved'
      }${checkOut ? ` — ${formatTripDate(checkOut.date)}` : ''}`}
      onPress={onPress}
    />
  );
}

function StayContext({
  context,
  onPress,
}: {
  context: AccommodationDayContext;
  onPress: () => void;
}) {
  const event = splitAccommodationDateTime(
    context.phase === 'check-out'
      ? context.accommodation.checkOutAt
      : context.accommodation.checkInAt,
  );

  return (
    <ContextCard
      icon="bed-outline"
      label={
        context.phase === 'check-in'
          ? 'CHECK-IN TODAY'
          : context.phase === 'check-out'
            ? 'CHECK-OUT TODAY'
            : 'TODAY’S STAY'
      }
      title={context.accommodation.name}
      meta={event ? `${event.time} local` : 'Stay context saved'}
      onPress={onPress}
    />
  );
}

function BookingCard({
  booking,
  label,
  onPress,
}: {
  booking: Booking;
  label: string;
  onPress: () => void;
}) {
  const time = formatBookingTemporalValue(booking.startAt);

  return (
    <ContextCard
      icon="ticket-outline"
      label={label}
      title={booking.title}
      meta={`${booking.status}${booking.provider ? ` · ${booking.provider}` : ''}${time ? ` · ${time}` : ''}`}
      onPress={onPress}
      brass
    />
  );
}

function ContextCard({
  icon,
  label,
  title,
  meta,
  onPress,
  brass = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  title: string;
  meta: string;
  onPress: () => void;
  brass?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${title}`}
      style={({ pressed }) => [
        styles.contextCard,
        brass && styles.contextCardBrass,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.contextIcon}>
        <Ionicons
          name={icon}
          size={21}
          color={brass ? colors.brass : colors.brand}
        />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.contextLabel, brass && styles.brassText]}>
          {label}
        </Text>
        <Text numberOfLines={1} style={styles.contextTitle}>{title}</Text>
        <Text numberOfLines={1} style={styles.contextMeta}>{meta}</Text>
      </View>
      <Ionicons
        name="arrow-forward"
        size={18}
        color={brass ? colors.brass : colors.brand}
      />
    </Pressable>
  );
}

function Readiness({
  readiness,
  openRoute,
}: {
  readiness: CompanionReadiness;
  openRoute: OpenRoute;
}) {
  const rows: Array<{
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    body: string;
    ready: boolean;
    action: 'ADD' | 'CONTINUE' | 'VIEW';
    route: CompanionPath;
  }> = [
    {
      icon: 'calendar-outline',
      title: 'Plan',
      body: `${readiness.populatedDayCount} of ${readiness.totalDayCount} days planned`,
      ready:
        readiness.totalDayCount > 0 &&
        readiness.populatedDayCount === readiness.totalDayCount,
      action: readiness.populatedDayCount > 0 ? 'CONTINUE' : 'ADD',
      route: '/trip/[tripId]/plan',
    },
    {
      icon: 'bed-outline',
      title: 'Accommodation',
      body:
        readiness.accommodationCount > 0
          ? `${readiness.accommodationCount} ${readiness.accommodationCount === 1 ? 'stay' : 'stays'} saved`
          : 'Stay not added',
      ready: readiness.accommodationCount > 0,
      action: readiness.accommodationCount > 0 ? 'VIEW' : 'ADD',
      route: '/trip/[tripId]/accommodation',
    },
    {
      icon: 'briefcase-outline',
      title: 'Bookings',
      body:
        readiness.bookingCount > 0
          ? `${readiness.bookingCount} active ${readiness.bookingCount === 1 ? 'booking' : 'bookings'}`
          : 'Bookings not added',
      ready: readiness.bookingCount > 0,
      action: readiness.bookingCount > 0 ? 'VIEW' : 'ADD',
      route: '/trip/[tripId]/bookings',
    },
    {
      icon: 'people-outline',
      title: 'Travelers',
      body:
        readiness.travelerCount > 0
          ? `${readiness.travelerCount} ${readiness.travelerCount === 1 ? 'traveler' : 'travelers'} added`
          : 'Travelers not added',
      ready: readiness.travelerCount > 0,
      action: readiness.travelerCount > 0 ? 'VIEW' : 'ADD',
      route: '/trip/[tripId]/travelers',
    },
    {
      icon: 'wallet-outline',
      title: 'Budget',
      body: readiness.budgetConfigured ? 'Budget set' : 'Budget not set',
      ready: readiness.budgetConfigured,
      action: readiness.budgetConfigured ? 'VIEW' : 'ADD',
      route: '/trip/[tripId]/budget',
    },
  ];
  const orderedRows = [...rows].sort(
    (a, b) => Number(a.ready) - Number(b.ready),
  );

  return (
    <View style={styles.readiness}>
      <View style={styles.readinessHeader}>
        <View>
          <Text style={styles.readinessEyebrow}>BEFORE YOU GO</Text>
          <Text style={styles.readinessTitle}>Trip readiness</Text>
        </View>
      </View>
      <View style={styles.readinessList}>
        {orderedRows.map((row, index) => (
          <Pressable
            key={row.title}
            accessibilityRole="button"
            accessibilityLabel={`Open ${row.title}. ${row.body}`}
            style={({ pressed }) => [
              styles.readinessRow,
              index < orderedRows.length - 1 && styles.readinessDivider,
              pressed && styles.pressed,
            ]}
            onPress={() => openRoute(row.route)}
          >
            <View
              style={[
                styles.readinessIcon,
                row.ready && styles.readinessIconReady,
              ]}
            >
              <Ionicons
                name={row.ready ? 'checkmark' : row.icon}
                size={16}
                color={row.ready ? colors.teal : colors.textMuted}
              />
            </View>
            <View style={styles.flex}>
              <Text style={styles.readinessRowTitle}>{row.title}</Text>
              <Text style={styles.readinessRowMeta}>{row.body}</Text>
            </View>
            <Text style={styles.readinessAction}>{row.action}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ModuleActions({ openRoute }: { openRoute: OpenRoute }) {
  return (
    <View style={styles.moduleRow}>
      <PillAction
        icon="wallet-outline"
        label="Budget"
        onPress={() => openRoute('/trip/[tripId]/budget')}
      />
      <PillAction
        icon="people-outline"
        label="Travelers"
        onPress={() => openRoute('/trip/[tripId]/travelers')}
      />
      <PillAction
        icon="options-outline"
        label="Trip details"
        onPress={() => openRoute('/trip/[tripId]/details')}
      />
    </View>
  );
}

function RoundButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.roundButton}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color={colors.brand} />
    </Pressable>
  );
}

function PillAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.pillAction, pressed && styles.pressed]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={16} color={colors.brand} />
      <Text style={styles.pillText}>{label}</Text>
    </Pressable>
  );
}

function PrimaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
      onPress={onPress}
    >
      <Text style={styles.primaryText}>{label}</Text>
      <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
    </Pressable>
  );
}

function TruthNotice({
  icon,
  body,
  brass = false,
  onDismiss,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  body: string;
  brass?: boolean;
  onDismiss?: () => void;
}) {
  return (
    <View style={[styles.notice, brass && styles.noticeBrass]}>
      <Ionicons
        name={icon}
        size={17}
        color={brass ? colors.brass : colors.teal}
      />
      <Text style={styles.noticeText}>{body}</Text>
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss plan update"
        >
          <Ionicons
            name="close"
            size={16}
            color={colors.textMuted}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

function Empty({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={21} color={colors.teal} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyBody}>{body}</Text>
      </View>
    </View>
  );
}

function Summary({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.summary}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screenContent: { paddingBottom: spacing[8] },
  stack: { gap: spacing[5] },
  list: { gap: spacing[2] },
  pressed: { opacity: 0.72 },
  topBar: {
    paddingTop: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },
  topLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 2,
    color: colors.brass,
  },
  hero: { paddingTop: spacing[10], paddingBottom: spacing[8] },
  phasePill: {
    alignSelf: 'flex-start',
    minHeight: 28,
    paddingHorizontal: spacing[3],
    borderRadius: radius.pill,
    backgroundColor: colors.tealSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  phaseDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.teal,
  },
  phaseText: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.1,
    color: colors.teal,
  },
  destination: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.8,
    color: colors.brass,
    marginBottom: spacing[3],
  },
  tripTitle: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.display,
    lineHeight: lineHeight.display,
    color: colors.textPrimary,
  },
  tripDates: {
    marginTop: spacing[3],
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.bodySmall,
    color: colors.textSecondary,
  },
  notice: {
    marginTop: spacing[4],
    padding: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.tealSoft,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  noticeBrass: { backgroundColor: colors.brassSoft },
  noticeText: {
    flex: 1,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  darkCard: {
    padding: spacing[6],
    borderRadius: radius.xl,
    backgroundColor: colors.brand,
    ...shadows.card,
  },
  darkEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.7,
    color: '#D4C29F',
  },
  countdown: {
    marginTop: spacing[2],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: 70,
    lineHeight: 76,
    color: colors.textInverse,
  },
  darkTitle: {
    fontFamily: fontFamily.serifMedium,
    fontSize: fontSize.titleSmall,
    color: colors.textInverse,
  },
  darkBody: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: '#DCE7E3',
  },
  darkMeta: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: '#DCE7E3',
  },
  brassRule: {
    width: 44,
    height: 2,
    marginVertical: spacing[5],
    backgroundColor: colors.brass,
  },
  progressCard: {
    padding: spacing[5],
    borderRadius: radius.xl,
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    ...shadows.card,
  },
  progressCopy: { flex: 1 },
  progressTitle: {
    marginTop: spacing[2],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.title,
    color: colors.textInverse,
  },
  remainingBadge: {
    minWidth: 78,
    padding: spacing[3],
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  remainingNumber: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.title,
    color: colors.textInverse,
  },
  remainingLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: 9,
    letterSpacing: 1,
    color: '#D4C29F',
  },
  firstDayCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    ...shadows.subtle,
  },
  firstDayHeader: {
    minHeight: 72,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceWarm,
  },
  firstDayDate: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodyLarge,
    color: colors.textPrimary,
  },
  firstDayBody: {
    padding: spacing[4],
  },
  section: {
    padding: spacing[5],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.subtle,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  sectionCopy: { flex: 1 },
  sectionEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.5,
    color: colors.brass,
  },
  sectionTitle: {
    marginTop: spacing[2],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textPrimary,
  },
  sectionMeta: {
    marginTop: spacing[2],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  sectionAction: {
    minHeight: 44,
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.caption,
    color: colors.teal,
  },
  sectionBody: { marginTop: spacing[5] },
  focusCard: {
    padding: spacing[5],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.teal,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  nextCard: { borderColor: colors.borderStrong },
  focusTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  focusLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.8,
    color: colors.brass,
  },
  focusTime: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.teal,
  },
  focusMain: {
    marginTop: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  focusIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusTitle: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textPrimary,
  },
  focusMeta: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  bookingTruth: {
    minHeight: 48,
    marginTop: spacing[4],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.brassSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  bookingTruthText: {
    flex: 1,
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  actionRow: {
    marginTop: spacing[4],
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  pillAction: {
    minHeight: 44,
    paddingHorizontal: spacing[3],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  pillText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.caption,
    color: colors.brand,
  },
  timelineRow: { minHeight: 76, flexDirection: 'row' },
  timelineLivedActions: {
    marginTop: spacing[2],
    marginBottom: spacing[3],
    marginLeft: spacing[2],
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  rail: { width: 22, alignItems: 'center' },
  dot: {
    width: 9,
    height: 9,
    marginTop: 25,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.teal,
    backgroundColor: colors.surface,
  },
  dotCurrent: {
    width: 13,
    height: 13,
    marginTop: 23,
    borderWidth: 3,
    backgroundColor: colors.tealSoft,
  },
  dotPast: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.borderStrong,
  },
  line: {
    flex: 1,
    width: 1,
    marginVertical: 3,
    backgroundColor: colors.borderStrong,
  },
  timelineCard: {
    flex: 1,
    minHeight: 66,
    marginLeft: spacing[2],
    marginBottom: spacing[2],
    padding: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.surfaceWarm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.brass,
  },
  row: {
    minHeight: 68,
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.surfaceWarm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  rowMeta: {
    marginTop: 3,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  moreText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  contextCard: {
    minHeight: 92,
    padding: spacing[4],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.brandSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  contextCardBrass: { backgroundColor: colors.brassSoft },
  contextIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.1,
    color: colors.brand,
  },
  brassText: { color: colors.brass },
  contextTitle: {
    marginTop: spacing[1],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.bodyLarge,
    color: colors.textPrimary,
  },
  contextMeta: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },
  readiness: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  readinessHeader: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceWarm,
  },
  readinessEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.3,
    color: colors.brass,
  },
  readinessTitle: {
    marginTop: spacing[1],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.bodyLarge,
    color: colors.textPrimary,
  },
  readinessList: {
    paddingHorizontal: spacing[4],
  },
  readinessRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  readinessDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  readinessIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSoft,
  },
  readinessIconReady: {
    backgroundColor: colors.tealSoft,
  },
  readinessRowTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.caption,
    color: colors.textPrimary,
  },
  readinessRowMeta: {
    marginTop: 2,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.micro,
    color: colors.textMuted,
  },
  readinessAction: {
    fontFamily: fontFamily.sansBold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.teal,
  },
  empty: {
    padding: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.surfaceWarm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  emptyIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  emptyBody: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  primaryButton: {
    minHeight: 52,
    marginTop: spacing[4],
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  primaryText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textInverse,
  },
  completeIcon: {
    width: 48,
    height: 48,
    marginBottom: spacing[5],
    borderRadius: radius.pill,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeTitle: {
    marginTop: spacing[2],
    marginBottom: spacing[3],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.title,
    lineHeight: lineHeight.title,
    color: colors.textInverse,
  },
  summaryRow: {
    marginTop: spacing[6],
    flexDirection: 'row',
    gap: spacing[2],
  },
  summary: {
    flex: 1,
    minHeight: 72,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    color: colors.textInverse,
  },
  summaryLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: 9,
    letterSpacing: 1,
    color: '#D4C29F',
  },
  futureCard: {
    padding: spacing[5],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
  },
  futureTitle: {
    marginTop: spacing[2],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    color: colors.textPrimary,
  },
  futureBody: {
    marginTop: spacing[2],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
  },
  moduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  bottomSpace: { height: spacing[12] },
});
