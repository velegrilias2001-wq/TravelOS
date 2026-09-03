import { Ionicons } from '@expo/vector-icons';
import {
  useFocusEffect,
  useRouter,
  type Href,
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
import type { Trip, TripDay } from '@/domain/entities';
import {
  homeFeaturedPlaceLabel,
  selectHomeRuntimeSummary,
} from '@/services/home-runtime';
import { tripService } from '@/services/trip-service';
import {
  formatCalendarDateForDisplay,
  systemRuntimeClock,
} from '@/services/time-truth';
import { useTripStore } from '@/store/trip-store';
import {
  colors,
  fontFamily,
  fontSize,
  letterSpacing,
  lineHeight,
  radius,
  shadows,
  spacing,
} from '@/theme';

function formatTripDates(trip: Trip): string {
  const startLabel = formatCalendarDateForDisplay(
    trip.startDate,
    {
    day: 'numeric',
    month: 'short',
    },
  );

  const endLabel = formatCalendarDateForDisplay(
    trip.endDate,
    {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    },
  );

  return `${startLabel} — ${endLabel}`;
}

export default function HomeScreen() {
  const router = useRouter();

  const trips = useTripStore(
    (state) => state.trips,
  );

  const isLoading = useTripStore(
    (state) => state.isLoading,
  );

  const [runtimeRevision, setRuntimeRevision] =
    useState(0);
  const [days, setDays] = useState<TripDay[]>(
    [],
  );

  const tripIds = useMemo(
    () => trips.map((trip) => trip.id).join('\0'),
    [trips],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setRuntimeRevision((current) => current + 1);

      void (async () => {
        try {
          const loaded =
            await tripService.listDaysForTrips(
              trips.map((trip) => trip.id),
            );

          if (!cancelled) {
            setDays(loaded);
          }
        } catch {
          if (!cancelled) {
            setDays([]);
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [tripIds, trips]),
  );

  const runtimeSummary = useMemo(() => {
    const instant = systemRuntimeClock.now();
    const deviceZone =
      systemRuntimeClock.deviceTimeZone();
    const clock = {
      now: () => instant,
      deviceTimeZone: () => deviceZone,
    };

    return selectHomeRuntimeSummary(
      trips,
      days,
      clock,
    );
  }, [runtimeRevision, trips, days]);

  const featured = runtimeSummary.featured;
  const featuredTrip = featured?.trip;
  const featuredPhase = featured?.runtime.phase;
  const completedTrips =
    runtimeSummary.completedCount;

  const openTrip = (trip: Trip) => {
    router.push({
      pathname: '/trip/[tripId]',
      params: {
        tripId: trip.id,
      },
    });
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>
            TRAVEL OS
          </Text>

          <Text style={styles.heading}>
            Your world,
            {'\n'}
            beautifully planned.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          style={styles.profileButton}
          onPress={() => router.push('/profile')}
        >
          <Ionicons
            name="person-outline"
            size={20}
            color={colors.brand}
          />
        </Pressable>
      </View>

      {featuredTrip ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${featuredTrip.title}`}
          style={({ pressed }) => [
            styles.heroCard,
            pressed && styles.pressed,
          ]}
          onPress={() => openTrip(featuredTrip)}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />

              <Text style={styles.statusText}>
                {featuredPhase === 'active'
                  ? 'HAPPENING NOW'
                  : 'UP NEXT'}
              </Text>
            </View>

            <Ionicons
              name="arrow-forward"
              size={22}
              color={colors.textInverse}
            />
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.heroDestination}>
              {featured
                ? homeFeaturedPlaceLabel(
                    featured.trip,
                    featured.runtime,
                  )
                : 'Destination not set'}
            </Text>

            <Text
              style={styles.heroTitle}
              numberOfLines={2}
            >
              {featuredTrip.title}
            </Text>

            <View style={styles.metaRow}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color="rgba(255,255,255,0.75)"
              />

              <Text style={styles.heroMeta}>
                {formatTripDates(featuredTrip)}
              </Text>
            </View>
          </View>

          <View style={styles.heroFooter}>
            <Text style={styles.heroFooterText}>
              Open trip
            </Text>

            <View style={styles.heroArrow}>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.brand}
              />
            </View>
          </View>
        </Pressable>
      ) : (
        <View style={styles.emptyHero}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="airplane-outline"
              size={25}
              color={colors.brand}
            />
          </View>

          <Text style={styles.emptyEyebrow}>
            YOUR NEXT JOURNEY
          </Text>

          <Text style={styles.emptyTitle}>
            Where are you going next?
          </Text>

          <Text style={styles.emptyBody}>
            Build your first trip and keep your
            plans, bookings and memories together.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Plan a trip"
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push('/new-trip')}
          >
            <Ionicons
              name="add"
              size={20}
              color={colors.textInverse}
            />

            <Text style={styles.primaryButtonText}>
              Plan a trip
            </Text>
          </Pressable>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>
            YOUR TRAVEL LIFE
          </Text>

          <Text style={styles.sectionTitle}>
            At a glance
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons
              name="map-outline"
              size={19}
              color={colors.teal}
            />
          </View>

          <Text style={styles.statValue}>
            {isLoading ? '—' : trips.length}
          </Text>

          <Text style={styles.statLabel}>
            Trips
          </Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color={colors.teal}
            />
          </View>

          <Text style={styles.statValue}>
            {isLoading ? '—' : completedTrips}
          </Text>

          <Text style={styles.statLabel}>
            Completed
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>
            EXPLORE
          </Text>

          <Text style={styles.sectionTitle}>
            Where to next?
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Discover"
          onPress={() => router.push('/discover')}
        >
          <Text style={styles.sectionAction}>
            Discover
          </Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Plan a new trip"
        style={({ pressed }) => [
          styles.newTripCard,
          pressed && styles.pressed,
        ]}
        onPress={() => router.push('/new-trip')}
      >
        <View style={styles.newTripIcon}>
          <Ionicons
            name="airplane-outline"
            size={23}
            color={colors.textInverse}
          />
        </View>

        <View style={styles.newTripCopy}>
          <Text style={styles.newTripEyebrow}>
            START A JOURNEY
          </Text>

          <Text style={styles.newTripTitle}>
            Plan a new trip
          </Text>

          <Text style={styles.newTripDescription}>
            Choose a destination and dates.
          </Text>
        </View>

        <View style={styles.newTripArrow}>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={colors.brand}
          />
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Import a calendar"
        style={({ pressed }) => [
          styles.importCard,
          pressed && styles.pressed,
        ]}
        onPress={() => router.push('/import' as Href)}
      >
        <View style={styles.importIcon}>
          <Ionicons
            name="download-outline"
            size={22}
            color={colors.brand}
          />
        </View>

        <View style={styles.newTripCopy}>
          <Text style={styles.importEyebrow}>
            ALREADY BOOKED
          </Text>

          <Text style={styles.importTitle}>
            Import a calendar
          </Text>

          <Text style={styles.importDescription}>
            Review .ics events before they become bookings.
          </Text>
        </View>

        <View style={styles.importArrow}>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={colors.brand}
          />
        </View>
      </Pressable>

      <View style={styles.actionGrid}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open my trips"
          style={({ pressed }) => [
            styles.actionCard,
            pressed && styles.pressed,
          ]}
          onPress={() => router.push('/trips')}
        >
          <View style={styles.actionIcon}>
            <Ionicons
              name="calendar-outline"
              size={22}
              color={colors.brand}
            />
          </View>

          <Text style={styles.actionTitle}>
            My trips
          </Text>

          <Text style={styles.actionDescription}>
            Trips you have started.
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open my world"
          style={({ pressed }) => [
            styles.actionCard,
            pressed && styles.pressed,
          ]}
          onPress={() => router.push('/world')}
        >
          <View style={styles.actionIcon}>
            <Ionicons
              name="earth-outline"
              size={23}
              color={colors.brand}
            />
          </View>

          <Text style={styles.actionTitle}>
            My world
          </Text>

          <Text style={styles.actionDescription}>
            Places you have been.
          </Text>
        </Pressable>
      </View>

      <View style={styles.bottomSpace} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: spacing[5],
    marginBottom: spacing[8],
  },

  brand: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.caption,
    letterSpacing: letterSpacing.eyebrow,
    color: colors.brass,
    marginBottom: spacing[3],
  },

  heading: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleLarge,
    lineHeight: lineHeight.titleLarge,
    letterSpacing: -0.8,
    color: colors.textPrimary,
  },

  profileButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },

  heroCard: {
    minHeight: 290,
    borderRadius: radius.xl,
    backgroundColor: colors.brand,
    padding: spacing[6],
    justifyContent: 'space-between',
    overflow: 'hidden',
    ...shadows.card,
  },

  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: '#D5B887',
  },

  statusText: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.4,
    color: colors.textInverse,
  },

  heroContent: {
    marginVertical: spacing[8],
  },

  heroDestination: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.bodySmall,
    color: 'rgba(255,255,255,0.68)',
    marginBottom: spacing[2],
  },

  heroTitle: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.display,
    lineHeight: lineHeight.display,
    letterSpacing: -0.8,
    color: colors.textInverse,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[4],
  },

  heroMeta: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.bodySmall,
    color: 'rgba(255,255,255,0.75)',
  },

  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },

  heroFooterText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textInverse,
  },

  heroArrow: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyHero: {
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceWarm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[7],
    ...shadows.subtle,
  },

  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[6],
  },

  emptyEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.6,
    color: colors.brass,
    marginBottom: spacing[2],
  },

  emptyTitle: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.title,
    lineHeight: lineHeight.title,
    color: colors.textPrimary,
    marginBottom: spacing[3],
  },

  emptyBody: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing[6],
  },

  primaryButton: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },

  primaryButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textInverse,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing[10],
    marginBottom: spacing[4],
  },

  sectionEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.6,
    color: colors.brass,
    marginBottom: spacing[1],
  },

  sectionTitle: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    color: colors.textPrimary,
  },

  sectionAction: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.teal,
  },

  statsRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },

  statCard: {
    flex: 1,
    minHeight: 132,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[5],
    ...shadows.subtle,
  },

  statIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },

  statValue: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.title,
    color: colors.textPrimary,
  },

  statLabel: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginTop: spacing[1],
  },

  newTripCard: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    marginBottom: spacing[3],
    padding: spacing[5],
    borderRadius: radius.lg,
    backgroundColor: colors.brand,
    ...shadows.card,
  },

  newTripIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  newTripCopy: {
    flex: 1,
  },

  newTripEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.4,
    color: '#D5B887',
  },

  newTripTitle: {
    marginTop: spacing[1],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textInverse,
  },

  newTripDescription: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: 'rgba(255,255,255,0.72)',
  },

  newTripArrow: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },

  importCard: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    marginBottom: spacing[3],
    padding: spacing[5],
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },

  importIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSoft,
  },

  importEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.4,
    color: colors.brass,
  },

  importTitle: {
    marginTop: spacing[1],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textPrimary,
  },

  importDescription: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },

  importArrow: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSoft,
  },

  actionGrid: {
    flexDirection: 'row',
    gap: spacing[3],
  },

  actionCard: {
    flex: 1,
    minHeight: 160,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[5],
    ...shadows.subtle,
  },

  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[5],
  },

  actionTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
    color: colors.textPrimary,
    marginBottom: spacing[2],
  },

  actionDescription: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: fontSize.body,
    color: colors.textMuted,
  },

  pressed: {
    opacity: 0.82,
  },

  bottomSpace: {
    height: spacing[12],
  },
});
