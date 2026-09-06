import { Ionicons } from '@expo/vector-icons';
import {
  useFocusEffect,
  useRouter,
  type Href,
} from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';
import { PressableScale } from '@/features/motion/pressable-scale';
import { RiseIn } from '@/features/motion/rise-in';
import { motion } from '@/features/motion/timing';
import type { Trip, TripDay } from '@/domain/entities';
import {
  loadFirstRunCompleted,
  markFirstRunCompleted,
} from '@/services/first-run-preferences';
import {
  homeFeaturedPlaceLabel,
  selectHomeReadinessGlances,
  selectHomeRuntimeSummary,
  type HomeReadinessGlance,
} from '@/services/home-runtime';
import { tripService } from '@/services/trip-service';
import { getTripThemePack } from '@/services/trip-theme';
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
  const [readinessGlances, setReadinessGlances] =
    useState<HomeReadinessGlance[]>([]);
  const [firstRunReady, setFirstRunReady] = useState(false);
  const [showFirstRun, setShowFirstRun] = useState(false);
  const [firstRunStep, setFirstRunStep] = useState<
    'decide' | 'organize'
  >('decide');

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const completed = await loadFirstRunCompleted();

      if (!cancelled) {
        setFirstRunReady(true);
        setShowFirstRun(!completed);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const finishFirstRun = useCallback(async () => {
    await markFirstRunCompleted();
    setShowFirstRun(false);
  }, []);

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

  const upcomingTripIds = useMemo(
    () =>
      runtimeSummary.upcomingTrips
        .slice(0, 3)
        .map((trip) => trip.id)
        .join('\0'),
    [runtimeSummary.upcomingTrips],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const upcoming =
        runtimeSummary.upcomingTrips.slice(0, 3);

      if (upcoming.length === 0) {
        setReadinessGlances([]);
        return () => {
          cancelled = true;
        };
      }

      void (async () => {
        try {
          const workspaces = (
            await Promise.all(
              upcoming.map((trip) =>
                tripService.getWorkspace(trip.id),
              ),
            )
          ).filter(
            (workspace): workspace is NonNullable<
              typeof workspace
            > => workspace !== null,
          );

          if (!cancelled) {
            setReadinessGlances(
              selectHomeReadinessGlances(workspaces),
            );
          }
        } catch {
          if (!cancelled) {
            setReadinessGlances([]);
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [upcomingTripIds, runtimeSummary.upcomingTrips]),
  );

  const featured = runtimeSummary.featured;
  const featuredTrip = featured?.trip;
  const featuredPhase = featured?.runtime.phase;
  const featuredTheme = getTripThemePack(
    featuredTrip?.themePackId,
  );
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

  const compositionKey = featuredTrip
    ? `featured:${featuredTrip.id}:${featuredPhase}`
    : `empty:${trips.length}`;

  return (
    <Screen scroll>
      <RiseIn factKey={`brand:${compositionKey}`}>
        <View style={styles.header}>
          <View style={styles.brandBlock}>
            <Text style={styles.brand}>
              TRAVEL OS
            </Text>
            <Text style={styles.brandTag}>
              PLAN · LIVE · KEEP
            </Text>
          </View>

          <PressableScale
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
          </PressableScale>
        </View>
      </RiseIn>

      {featuredTrip ? (
        <RiseIn
          factKey={compositionKey}
          delayMs={motion.staggerMs}
        >
          <View style={styles.featuredBlock}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Open ${featuredTrip.title}`}
            style={[
              styles.heroCard,
              { backgroundColor: featuredTheme.accent },
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

            <Text style={styles.heroMood}>
              {featuredTheme.moodEyebrow}
            </Text>

            <Text style={styles.heroGreeting}>
              {featuredPhase === 'active'
                ? 'You are on the journey.'
                : 'Your next trip is waiting.'}
            </Text>

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
                  color="rgba(255,253,248,0.75)"
                />
                <Text style={styles.heroMeta}>
                  {formatTripDates(featuredTrip)}
                </Text>
              </View>
            </View>

            <View style={styles.heroFooter}>
              <Text style={styles.heroFooterText}>
                {featuredPhase === 'active'
                  ? 'Open Companion'
                  : 'Continue planning'}
              </Text>
              <View style={styles.heroArrow}>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.brand}
                />
              </View>
            </View>
          </PressableScale>

          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Open Trip Copilot"
            style={styles.copilotDoor}
            onPress={() =>
              router.push({
                pathname: '/trip/[tripId]/copilot',
                params: { tripId: featuredTrip.id },
              })
            }
          >
            <Ionicons
              name="sparkles-outline"
              size={18}
              color={colors.brand}
            />
            <View style={styles.copilotDoorCopy}>
              <Text style={styles.copilotDoorTitle}>
                Trip Copilot
              </Text>
              <Text style={styles.copilotDoorBody}>
                Επόμενα χρήσιμα βήματα από τα αποθηκευμένα
                facts — επιβεβαίωση πριν οποιαδήποτε εγγραφή.
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textMuted}
            />
          </PressableScale>
          </View>
        </RiseIn>
      ) : (
        <RiseIn
          factKey={compositionKey}
          delayMs={motion.staggerMs}
        >
          <Text style={styles.nowEyebrow}>
            ΤΟ ΕΠΟΜΕΝΟ ΤΑΞΙΔΙ ΞΕΚΙΝΑ ΕΔΩ
          </Text>
          <Text style={styles.heading}>
            Πού θέλεις{'\n'}να πας μετά;
          </Text>
          <Text style={styles.lead}>
            Δύο δρόμοι: απόφαση με grounded ιδέες, ή οργάνωση
            από μέρος και αρχεία που έχεις ήδη.
          </Text>

          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Help me decide with TravelOS chat"
            style={styles.primaryButton}
            onPress={() =>
              router.push('/travel-chat')
            }
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={20}
              color={colors.textInverse}
            />
            <Text style={styles.primaryButtonText}>
              Βοήθησέ με να αποφασίσω
            </Text>
          </PressableScale>

          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Create a trip"
            style={styles.secondaryButton}
            onPress={() => router.push('/new-trip')}
          >
            <Ionicons
              name="add"
              size={20}
              color={colors.brand}
            />
            <Text style={styles.secondaryButtonText}>
              Ξέρω πού πάω — νέο ταξίδι
            </Text>
          </PressableScale>

          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Import bookings or files"
            style={styles.importRow}
            onPress={() =>
              router.push('/import' as Href)
            }
          >
            <View style={styles.importIcon}>
              <Ionicons
                name="download-outline"
                size={18}
                color={colors.teal}
              />
            </View>
            <View style={styles.importCopy}>
              <Text style={styles.importTitle}>
                Οργάνωση από κρατήσεις ή αρχεία
              </Text>
              <Text style={styles.importBody}>
                Εισαγωγή claims, έλεγχος, και μετά επιβεβαίωση
                στο ταξίδι — τίποτα δεν γράφεται πριν το Accept.
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textMuted}
            />
          </PressableScale>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Browse Discover catalogue"
            style={styles.tertiaryLink}
            onPress={() =>
              router.push('/discover/find-destination')
            }
          >
            <Text style={styles.tertiaryLinkText}>
              Ή περιήγηση Discover
            </Text>
          </Pressable>
        </RiseIn>
      )}

      {!featuredTrip ? (
      <RiseIn
        factKey={`life:${compositionKey}`}
        delayMs={motion.staggerMs * 3}
      >
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>
              Η ΤΑΞΙΔΙΩΤΙΚΗ ΣΟΥ ΖΩΗ
            </Text>
            <Text style={styles.sectionTitle}>
              Με μια ματιά
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
              Ταξίδια
            </Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: colors.brassSoft },
              ]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={19}
                color={colors.brass}
              />
            </View>
            <Text style={styles.statValue}>
              {isLoading ? '—' : completedTrips}
            </Text>
            <Text style={styles.statLabel}>
              Έζησες
            </Text>
          </View>

          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Open trips"
            style={styles.statCard}
            onPress={() => router.push('/trips')}
          >
            <View
              style={[
                styles.statIcon,
                { backgroundColor: colors.coralSoft },
              ]}
            >
              <Ionicons
                name="albums-outline"
                size={19}
                color={colors.coral}
              />
            </View>
            <Text style={styles.statValue}>Όλα</Text>
            <Text style={styles.statLabel}>
              Άνοιξε ταξίδια
            </Text>
          </PressableScale>
        </View>
      </RiseIn>
      ) : null}

      {readinessGlances.length > 0 ? (
        <RiseIn
          factKey={`ready:${compositionKey}:${upcomingTripIds}`}
          delayMs={motion.staggerMs * 3.5}
        >
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>
                BEFORE YOU GO
              </Text>
              <Text style={styles.sectionTitle}>
                Trip readiness
              </Text>
            </View>
          </View>

          <View style={styles.glanceList}>
            {readinessGlances.map((glance) => (
              <PressableScale
                key={glance.tripId}
                accessibilityRole="button"
                accessibilityLabel={`${glance.title} ${glance.percentReady} percent ready`}
                style={styles.glanceRow}
                onPress={() =>
                  router.push({
                    pathname: '/trip/[tripId]/more',
                    params: {
                      tripId: glance.tripId,
                    },
                  })
                }
              >
                <View style={styles.glanceCopy}>
                  <Text
                    style={styles.tripTitle}
                    numberOfLines={1}
                  >
                    {glance.title}
                  </Text>
                  <Text style={styles.tripMeta}>
                    {glance.readyCount} of{' '}
                    {glance.totalCheckCount} ready
                  </Text>
                </View>
                <Text style={styles.glancePercent}>
                  {glance.percentReady}%
                </Text>
              </PressableScale>
            ))}
          </View>
        </RiseIn>
      ) : null}

      {trips.length > 0 ? (
        <RiseIn
          factKey={`trips:${compositionKey}`}
          delayMs={motion.staggerMs * 4}
        >
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>
                TRIPS
              </Text>
              <Text style={styles.sectionTitle}>
                Recent
              </Text>
            </View>

            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="See all trips"
              onPress={() => router.push('/trips')}
            >
              <Text style={styles.sectionAction}>
                See all
              </Text>
            </PressableScale>
          </View>

          <View style={styles.tripList}>
            {trips.slice(0, 4).map((trip) => (
              <PressableScale
                key={trip.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${trip.title}`}
                style={styles.tripRow}
                onPress={() => openTrip(trip)}
              >
                <View style={styles.tripCopy}>
                  <Text
                    style={styles.tripTitle}
                    numberOfLines={1}
                  >
                    {trip.title}
                  </Text>
                  <Text style={styles.tripMeta}>
                    {formatTripDates(trip)}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textMuted}
                />
              </PressableScale>
            ))}
          </View>
        </RiseIn>
      ) : null}

      <RiseIn
        factKey={`doors:${compositionKey}`}
        delayMs={motion.staggerMs * 5}
      >
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>
              EXPLORE
            </Text>
            <Text style={styles.sectionTitle}>
              More doors
            </Text>
          </View>
        </View>

        <View style={styles.actionGrid}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Open Discover"
            style={styles.actionCard}
            onPress={() => router.push('/discover')}
          >
            <View style={styles.actionIcon}>
              <Ionicons
                name="compass-outline"
                size={23}
                color={colors.brand}
              />
            </View>
            <Text style={styles.actionTitle}>
              Discover
            </Text>
            <Text style={styles.actionDescription}>
              Grounded ιδέες για το επόμενο ταξίδι.
            </Text>
          </PressableScale>

          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Ask TravelOS chat"
            style={styles.actionCard}
            onPress={() => router.push('/travel-chat')}
          >
            <View style={styles.actionIcon}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={23}
                color={colors.brand}
              />
            </View>
            <Text style={styles.actionTitle}>
              Ρώτα το TravelOS
            </Text>
            <Text style={styles.actionDescription}>
              Chat με grounded προορισμούς, μετά Confirm.
            </Text>
          </PressableScale>
        </View>

        <View style={[styles.actionGrid, { marginTop: spacing[3] }]}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Open World"
            style={styles.actionCard}
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
              Ο κόσμος μου
            </Text>
            <Text style={styles.actionDescription}>
              Μέρη που έχεις σχεδιάσει ή ζήσει.
            </Text>
          </PressableScale>
        </View>
      </RiseIn>

      <View style={styles.bottomSpace} />

      {firstRunReady ? (
        <Modal
          visible={showFirstRun}
          animationType="fade"
          transparent
          onRequestClose={() => {
            void finishFirstRun();
          }}
        >
          <View style={styles.coachBackdrop}>
            <View style={styles.coachCard}>
              {firstRunStep === 'decide' ? (
                <>
                  <Text style={styles.coachEyebrow}>
                    ΓΝΩΡΙΜΙΑ · 1/2
                  </Text>
                  <Text style={styles.coachTitle}>
                    Δεν ξέρεις ακόμα πού;
                  </Text>
                  <Text style={styles.coachBody}>
                    Ξεκίνα από Travel Chat ή Discover. Μόνο
                    grounded ιδέες — χωρίς εφευρεμένες πόλεις.
                    Το Confirm ανοίγει Create Trip.
                  </Text>
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel="Continue to organize path"
                    style={styles.primaryButton}
                    onPress={() => setFirstRunStep('organize')}
                  >
                    <Text style={styles.primaryButtonText}>
                      Κατάλαβα — συνέχεια
                    </Text>
                  </PressableScale>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Open Travel Chat now"
                    style={styles.tertiaryLink}
                    onPress={() => {
                      void finishFirstRun().then(() => {
                        router.push('/travel-chat');
                      });
                    }}
                  >
                    <Text style={styles.tertiaryLinkText}>
                      Άνοιξε Travel Chat τώρα
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.coachEyebrow}>
                    ΓΝΩΡΙΜΙΑ · 2/2
                  </Text>
                  <Text style={styles.coachTitle}>
                    Ξέρεις ήδη πού πας;
                  </Text>
                  <Text style={styles.coachBody}>
                    Δημιούργησε το ταξίδι από Create Trip ή
                    Import. Μετά το Trip Copilot σε οδηγεί στα
                    επόμενα Accept — χωρίς δεύτερο create path.
                  </Text>
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel="Finish first-run coach"
                    style={styles.primaryButton}
                    onPress={() => {
                      void finishFirstRun();
                    }}
                  >
                    <Text style={styles.primaryButtonText}>
                      Έτοιμος — πάμε
                    </Text>
                  </PressableScale>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Create a trip now"
                    style={styles.tertiaryLink}
                    onPress={() => {
                      void finishFirstRun().then(() => {
                        router.push('/new-trip');
                      });
                    }}
                  >
                    <Text style={styles.tertiaryLinkText}>
                      Δημιούργησε ταξίδι τώρα
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </Modal>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: spacing[5],
    marginBottom: spacing[6],
  },

  brandBlock: {
    gap: spacing[1],
  },

  brand: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    letterSpacing: letterSpacing.tight,
    color: colors.brand,
  },

  brandTag: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: letterSpacing.eyebrow,
    color: colors.brass,
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

  nowEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: letterSpacing.eyebrow,
    color: colors.brass,
    marginBottom: spacing[2],
  },

  heading: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleLarge,
    lineHeight: lineHeight.titleLarge,
    letterSpacing: letterSpacing.tight,
    color: colors.textPrimary,
    marginBottom: spacing[3],
  },

  lead: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    color: colors.textSecondary,
    marginBottom: spacing[6],
    maxWidth: 340,
  },

  heroCard: {
    minHeight: 290,
    borderRadius: radius.xl,
    backgroundColor: colors.brand,
    padding: spacing[6],
    justifyContent: 'space-between',
    overflow: 'hidden',
    marginTop: spacing[4],
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
    backgroundColor: 'rgba(255,253,248,0.12)',
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.brass,
  },

  statusText: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.4,
    color: colors.textInverse,
  },

  heroContent: {
    marginTop: spacing[4],
    marginBottom: spacing[5],
  },

  heroGreeting: {
    marginTop: spacing[2],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textInverse,
  },

  heroMood: {
    marginTop: spacing[4],
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: letterSpacing.eyebrow,
    color: 'rgba(255,253,248,0.72)',
    textTransform: 'uppercase',
  },

  heroDestination: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.bodySmall,
    color: 'rgba(255,253,248,0.68)',
    marginBottom: spacing[2],
  },

  heroTitle: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.display,
    lineHeight: lineHeight.display,
    letterSpacing: letterSpacing.tight,
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
    color: 'rgba(255,253,248,0.75)',
  },

  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,253,248,0.12)',
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

  featuredBlock: {
    gap: spacing[3],
  },

  copilotDoor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },

  copilotDoorCopy: {
    flex: 1,
    gap: 4,
  },

  copilotDoorTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },

  copilotDoorBody: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    color: colors.textMuted,
  },

  primaryButton: {
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },

  primaryButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
    color: colors.textInverse,
  },

  secondaryButton: {
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
  },

  secondaryButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
    color: colors.brand,
  },

  importRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  importIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  importCopy: {
    flex: 1,
    gap: 2,
  },

  importTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },

  importBody: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
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
    letterSpacing: letterSpacing.eyebrow,
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
    minHeight: 124,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    justifyContent: 'space-between',
  },

  statIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statValue: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    color: colors.textPrimary,
    marginTop: spacing[4],
  },

  statLabel: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginTop: spacing[1],
  },

  tripList: {
    gap: spacing[2],
  },

  glanceList: {
    gap: spacing[2],
    marginBottom: spacing[2],
  },

  glanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadows.subtle,
  },

  glanceCopy: {
    flex: 1,
    gap: spacing[1],
  },

  glancePercent: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.bodyLarge,
    color: colors.teal,
  },

  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  tripCopy: {
    flex: 1,
    gap: 2,
  },

  tripTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },

  tripMeta: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },

  actionGrid: {
    flexDirection: 'row',
    gap: spacing[3],
  },

  actionCard: {
    flex: 1,
    minHeight: 148,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceWarm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
  },

  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },

  actionTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
    color: colors.textPrimary,
    marginBottom: spacing[1],
  },

  actionDescription: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },

  tertiaryLink: {
    alignSelf: 'center',
    paddingVertical: spacing[3],
    minHeight: 44,
    justifyContent: 'center',
  },

  tertiaryLinkText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.body,
    color: colors.brand,
    textAlign: 'center',
  },

  coachBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(18, 24, 28, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
  },

  coachCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing[5],
    gap: spacing[3],
    ...shadows.card,
  },

  coachEyebrow: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.caption,
    letterSpacing: letterSpacing.wide,
    color: colors.textMuted,
  },

  coachTitle: {
    fontFamily: fontFamily.serifMedium,
    fontSize: fontSize.title,
    color: colors.textPrimary,
  },

  coachBody: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    color: colors.textSecondary,
    marginBottom: spacing[2],
  },

  bottomSpace: {
    height: spacing[12],
  },
});
