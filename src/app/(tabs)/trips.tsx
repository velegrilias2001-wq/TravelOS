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

function formatDates(trip: Trip): string {
  return `${trip.startDate} — ${trip.endDate}`;
}

export default function TripsScreen() {
  const router = useRouter();

  const trips = useTripStore(
    (state) => state.trips,
  );

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
            Every journey, from first idea to
            the memories you bring home.
          </Text>
        </View>

        <Pressable
          style={styles.addButton}
          onPress={() => router.push('/new-trip')}
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
          <View style={styles.emptyIcon}>
            <Ionicons
              name="airplane-outline"
              size={28}
              color={colors.brand}
            />
          </View>

          <Text style={styles.emptyTitle}>
            Your next story starts here.
          </Text>

          <Text style={styles.emptyBody}>
            Create your first trip and Travel OS
            will keep the plan, bookings, budget
            and memories connected.
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={() =>
              router.push('/new-trip')
            }
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
      ) : (
        <View style={styles.list}>
          {trips.map((trip) => (
            <Pressable
              key={trip.id}
              style={({ pressed }) => [
                styles.tripCard,
                pressed && styles.pressed,
              ]}
              onPress={() => openTrip(trip)}
            >
              <View style={styles.tripTop}>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {trip.status.toUpperCase()}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textMuted}
                />
              </View>

              <Text style={styles.destination}>
                {trip.destinations.length === 0
                  ? 'Destination'
                  : tripDestinationLabel(
                      trip.destinations,
                    )}
              </Text>

              <Text style={styles.tripTitle}>
                {trip.title}
              </Text>

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
          ))}
        </View>
      )}

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

  headerCopy: {
    flex: 1,
    paddingRight: spacing[6],
  },

  eyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.8,
    color: colors.brass,
    marginBottom: spacing[2],
  },

  title: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.display,
    lineHeight: lineHeight.display,
    color: colors.textPrimary,
  },

  subtitle: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing[3],
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
    backgroundColor: colors.surfaceWarm,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[7],
    ...shadows.subtle,
  },

  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[6],
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
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },

  primaryButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
    color: colors.textInverse,
  },

  list: {
    gap: spacing[4],
  },

  tripCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[6],
    ...shadows.subtle,
  },

  tripTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[6],
  },

  statusBadge: {
    backgroundColor: colors.brassSoft,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.pill,
  },

  statusText: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.2,
    color: colors.brass,
  },

  destination: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginBottom: spacing[2],
  },

  tripTitle: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.title,
    lineHeight: lineHeight.title,
    color: colors.textPrimary,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[5],
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
