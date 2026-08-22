import { Ionicons } from '@expo/vector-icons';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useEffect } from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';
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

export default function TodayScreen() {
  const router = useRouter();

  const { tripId } =
    useLocalSearchParams<{
      tripId: string;
    }>();

  const activeTrip = useTripStore(
    (state) => state.activeTrip,
  );

  const activeTripId = useTripStore(
    (state) => state.activeTripId,
  );

  const openTrip = useTripStore(
    (state) => state.openTrip,
  );

  const isLoading = useTripStore(
    (state) => state.isLoading,
  );

  useEffect(() => {
    if (
      tripId &&
      activeTripId !== tripId
    ) {
      void openTrip(tripId);
    }
  }, [
    tripId,
    activeTripId,
    openTrip,
  ]);

  if (
    isLoading ||
    !activeTrip ||
    activeTrip.id !== tripId
  ) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.loading}>
            Loading your trip…
          </Text>
        </View>
      </Screen>
    );
  }

  const destination =
    activeTrip.destinations[0]?.name ??
    'Your destination';

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
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

        <View style={styles.topSpacer} />
      </View>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>
          {destination.toUpperCase()}
        </Text>

        <Text style={styles.title}>
          {activeTrip.title}
        </Text>

        <View style={styles.dateRow}>
          <Ionicons
            name="calendar-outline"
            size={17}
            color={colors.teal}
          />

          <Text style={styles.dateText}>
            {activeTrip.startDate}
            {'  —  '}
            {activeTrip.endDate}
          </Text>
        </View>
      </View>

      <View style={styles.todayCard}>
        <View style={styles.todayHeader}>
          <View>
            <Text style={styles.todayEyebrow}>
              YOUR JOURNEY
            </Text>

            <Text style={styles.todayTitle}>
              Today
            </Text>
          </View>

          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />

            <Text style={styles.statusText}>
              {activeTrip.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="sunny-outline"
              size={25}
              color={colors.brand}
            />
          </View>

          <Text style={styles.emptyTitle}>
            Your day is ready to take shape.
          </Text>

          <Text style={styles.emptyBody}>
            Add places, activities and moments
            to build the itinerary for this trip.
          </Text>
        </View>
      </View>

      <View style={styles.bottomSpace} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loading: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.bodySmall,
    color: colors.textMuted,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing[3],
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },

  topLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.8,
    color: colors.brass,
  },

  topSpacer: {
    width: 42,
  },

  hero: {
    paddingTop: spacing[10],
    paddingBottom: spacing[8],
  },

  eyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.8,
    color: colors.brass,
    marginBottom: spacing[3],
  },

  title: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.display,
    lineHeight: lineHeight.display,
    color: colors.textPrimary,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[4],
  },

  dateText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.bodySmall,
    color: colors.textSecondary,
  },

  todayCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[6],
    ...shadows.subtle,
  },

  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  todayEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.5,
    color: colors.brass,
    marginBottom: spacing[2],
  },

  todayTitle: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.title,
    color: colors.textPrimary,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.tealSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.teal,
  },

  statusText: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    color: colors.teal,
  },

  emptyState: {
    marginTop: spacing[10],
  },

  emptyIcon: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[5],
  },

  emptyTitle: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textPrimary,
    marginBottom: spacing[3],
  },

  emptyBody: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
  },

  bottomSpace: {
    height: spacing[12],
  },
});