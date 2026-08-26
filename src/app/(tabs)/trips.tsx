import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';
import type { Trip } from '@/domain/entities';
import {
  tripDestinationLabel,
} from '@/services/destination-authoring';
import {
  formatCalendarDateForDisplay,
} from '@/services/time-truth';
import { useTripStore } from '@/store/trip-store';

import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  shadows,
  spacing,
} from '@/theme';

interface TripSection {
  key: 'planning' | 'completed' | 'archived';
  label: string;
  trips: Trip[];
}

function formatDates(trip: Trip): string {
  const sameYear =
    trip.startDate.slice(0, 4) ===
    trip.endDate.slice(0, 4);

  const start = formatCalendarDateForDisplay(
    trip.startDate,
    sameYear
      ? {
          day: 'numeric',
          month: 'short',
        }
      : {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        },
  );

  const end = formatCalendarDateForDisplay(
    trip.endDate,
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
  );

  return `${start} — ${end}`;
}

function normalizeLabel(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function sortAscendingByStartDate(
  a: Trip,
  b: Trip,
): number {
  return a.startDate.localeCompare(b.startDate);
}

function sortDescendingByStartDate(
  a: Trip,
  b: Trip,
): number {
  return b.startDate.localeCompare(a.startDate);
}

function buildTripSections(
  trips: Trip[],
): TripSection[] {
  const planning = trips
    .filter(
      (trip) =>
        trip.status === 'draft' ||
        trip.status === 'planned',
    )
    .slice()
    .sort(sortAscendingByStartDate);

  const completed = trips
    .filter(
      (trip) => trip.status === 'completed',
    )
    .slice()
    .sort(sortDescendingByStartDate);

  const archived = trips
    .filter(
      (trip) => trip.status === 'archived',
    )
    .slice()
    .sort(sortDescendingByStartDate);

  const sections: TripSection[] = [
    {
      key: 'planning',
      label: 'PLANNING',
      trips: planning,
    },
    {
      key: 'completed',
      label: 'COMPLETED',
      trips: completed,
    },
    {
      key: 'archived',
      label: 'ARCHIVED',
      trips: archived,
    },
  ];

  return sections.filter(
    (section) => section.trips.length > 0,
  );
}

export default function TripsScreen() {
  const router = useRouter();

  const trips = useTripStore(
    (state) => state.trips,
  );

  const sections = buildTripSections(trips);

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
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>
            YOUR JOURNEYS
          </Text>

          <Text style={styles.title}>
            Trips
          </Text>

          <Text style={styles.subtitle}>
            Every trip you’re planning, living or remembering.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Plan a new trip"
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.pressed,
          ]}
          onPress={() =>
            router.push('/new-trip')
          }
        >
          <Ionicons
            name="add"
            size={24}
            color={colors.textInverse}
          />
        </Pressable>
      </View>

      {trips.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyTop}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="airplane-outline"
                size={23}
                color={colors.brand}
              />
            </View>

            <View style={styles.emptyCopy}>
              <Text style={styles.emptyTitle}>
                Plan your first trip
              </Text>

              <Text style={styles.emptyBody}>
                Choose a destination and dates. TravelOS will keep everything else together as the trip takes shape.
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Plan a trip"
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
            onPress={() =>
              router.push('/new-trip')
            }
          >
            <Text style={styles.primaryButtonText}>
              Plan a trip
            </Text>

            <Ionicons
              name="arrow-forward"
              size={18}
              color={colors.textInverse}
            />
          </Pressable>
        </View>
      ) : (
        <View style={styles.library}>
          {sections.map((section) => (
            <View
              key={section.key}
              style={styles.section}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>
                  {section.label}
                </Text>

                <Text style={styles.sectionCount}>
                  {section.trips.length}{' '}
                  {section.trips.length === 1
                    ? 'trip'
                    : 'trips'}
                </Text>
              </View>

              <View style={styles.list}>
                {section.trips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    onPress={() =>
                      openTrip(trip)
                    }
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.bottomSpace} />
    </Screen>
  );
}

function TripCard({
  trip,
  onPress,
}: {
  trip: Trip;
  onPress(): void;
}) {
  const destination =
    trip.destinations.length === 0
      ? ''
      : tripDestinationLabel(
          trip.destinations,
        );

  const showDestination =
    Boolean(destination) &&
    normalizeLabel(destination) !==
      normalizeLabel(trip.title);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${trip.title}`}
      style={({ pressed }) => [
        styles.tripCard,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.tripTop}>
        <View
          style={[
            styles.statusBadge,
            trip.status === 'completed' &&
              styles.statusBadgeCompleted,
            trip.status === 'archived' &&
              styles.statusBadgeArchived,
            trip.status === 'draft' &&
              styles.statusBadgeDraft,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              trip.status === 'completed' &&
                styles.statusTextCompleted,
              trip.status === 'archived' &&
                styles.statusTextArchived,
              trip.status === 'draft' &&
                styles.statusTextDraft,
            ]}
          >
            {trip.status.toUpperCase()}
          </Text>
        </View>

        <View style={styles.openIcon}>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.brand}
          />
        </View>
      </View>

      <Text style={styles.tripTitle}>
        {trip.title}
      </Text>

      {showDestination ? (
        <View style={styles.destinationRow}>
          <Ionicons
            name="location-outline"
            size={15}
            color={colors.teal}
          />

          <Text style={styles.destinationText}>
            {destination}
          </Text>
        </View>
      ) : null}

      {trip.destinations.length === 0 ? (
        <View style={styles.destinationRow}>
          <Ionicons
            name="location-outline"
            size={15}
            color={colors.textMuted}
          />

          <Text style={styles.destinationMissing}>
            Destination not added
          </Text>
        </View>
      ) : null}

      <View style={styles.dateRow}>
        <Ionicons
          name="calendar-outline"
          size={15}
          color={colors.teal}
        />

        <Text style={styles.dateText}>
          {formatDates(trip)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: spacing[5],
    marginBottom: spacing[7],
  },

  headerCopy: {
    flex: 1,
    paddingRight: spacing[6],
  },

  eyebrow: {
    marginBottom: spacing[2],
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.8,
    color: colors.brass,
  },

  title: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.display,
    lineHeight: lineHeight.display,
    color: colors.textPrimary,
  },

  subtitle: {
    maxWidth: 360,
    marginTop: spacing[2],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
  },

  addButton: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },

  emptyCard: {
    padding: spacing[5],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.subtle,
  },

  emptyTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },

  emptyCopy: {
    flex: 1,
  },

  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textPrimary,
  },

  emptyBody: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
  },

  primaryButton: {
    minHeight: 46,
    alignSelf: 'flex-start',
    marginTop: spacing[4],
    paddingHorizontal: spacing[5],
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

  library: {
    gap: spacing[7],
  },

  section: {
    gap: spacing[3],
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[1],
  },

  sectionLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.5,
    color: colors.brass,
  },

  sectionCount: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },

  list: {
    gap: spacing[3],
  },

  tripCard: {
    padding: spacing[5],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.subtle,
  },

  tripTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },

  statusBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.pill,
    backgroundColor: colors.brassSoft,
  },

  statusBadgeCompleted: {
    backgroundColor: colors.tealSoft,
  },

  statusBadgeArchived: {
    backgroundColor: colors.backgroundSoft,
  },

  statusBadgeDraft: {
    backgroundColor: colors.brandSoft,
  },

  statusText: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.1,
    color: colors.brass,
  },

  statusTextCompleted: {
    color: colors.teal,
  },

  statusTextArchived: {
    color: colors.textMuted,
  },

  statusTextDraft: {
    color: colors.brand,
  },

  openIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSoft,
  },

  tripTitle: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.title,
    lineHeight: lineHeight.title,
    color: colors.textPrimary,
  },

  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[3],
  },

  destinationText: {
    flex: 1,
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },

  destinationMissing: {
    flex: 1,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
  },

  dateText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },

  pressed: {
    opacity: 0.82,
  },

  bottomSpace: {
    height: spacing[12],
  },
});
