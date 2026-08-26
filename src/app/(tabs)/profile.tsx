import { Ionicons } from '@expo/vector-icons';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';
import {
  hasRealDestinationCoordinates,
} from '@/services/destination-authoring';
import { useTripStore } from '@/store/trip-store';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  spacing,
} from '@/theme';

export default function ProfileScreen() {
  const trips = useTripStore(
    (state) => state.trips,
  );

  const completedTrips = trips.filter(
    (trip) => trip.status === 'completed',
  ).length;

  const mappedDestinations = trips.reduce(
    (total, trip) =>
      total +
      trip.destinations.filter(
        hasRealDestinationCoordinates,
      ).length,
    0,
  );

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>
          YOUR TRAVELOS
        </Text>

        <Text style={styles.title}>
          Profile
        </Text>

        <Text style={styles.subtitle}>
          Your travel life, preferences and settings in one place.
        </Text>
      </View>

      <View style={styles.identityCard}>
        <View style={styles.identityIcon}>
          <Ionicons
            name="person-outline"
            size={24}
            color={colors.brand}
          />
        </View>

        <View style={styles.identityCopy}>
          <Text style={styles.identityEyebrow}>
            TRAVEL PROFILE
          </Text>

          <Text style={styles.identityTitle}>
            Make TravelOS feel like yours.
          </Text>

          <Text style={styles.identityBody}>
            Personal preferences, travel style and smarter recommendations will live here.
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionEyebrow}>
          YOUR TRAVEL LIFE
        </Text>

        <Text style={styles.sectionTitle}>
          At a glance
        </Text>
      </View>

      <View style={styles.statsCard}>
        <Stat
          value={trips.length}
          label={
            trips.length === 1
              ? 'Trip'
              : 'Trips'
          }
        />

        <View style={styles.statDivider} />

        <Stat
          value={completedTrips}
          label="Completed"
        />

        <View style={styles.statDivider} />

        <Stat
          value={mappedDestinations}
          label="Mapped"
        />
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionEyebrow}>
          PERSONALIZE
        </Text>

        <Text style={styles.sectionTitle}>
          Preferences & settings
        </Text>
      </View>

      <View style={styles.settingsCard}>
        <FutureRow
          icon="options-outline"
          title="Travel preferences"
          body="Interests, pace, budget style and the way you like to travel."
        />

        <View style={styles.rowDivider} />

        <FutureRow
          icon="notifications-outline"
          title="Trip notifications"
          body="Useful reminders and live-trip alerts when they matter."
        />

        <View style={styles.rowDivider} />

        <FutureRow
          icon="cloud-outline"
          title="Account & sync"
          body="Back up your trips and keep TravelOS in sync across devices."
        />
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionEyebrow}>
          YOUR DATA
        </Text>

        <Text style={styles.sectionTitle}>
          Private by default
        </Text>
      </View>

      <View style={styles.privacyCard}>
        <View style={styles.privacyIcon}>
          <Ionicons
            name="shield-checkmark-outline"
            size={21}
            color={colors.teal}
          />
        </View>

        <View style={styles.privacyCopy}>
          <Text style={styles.privacyTitle}>
            Your trips stay with you.
          </Text>

          <Text style={styles.privacyBody}>
            Travel data is currently stored on this device. Cloud backup and account sync will be added as explicit options later.
          </Text>
        </View>
      </View>

      <View style={styles.bottomSpace} />
    </Screen>
  );
}

function Stat({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

function FutureRow({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.futureRow}>
      <View style={styles.futureIcon}>
        <Ionicons
          name={icon}
          size={20}
          color={colors.teal}
        />
      </View>

      <View style={styles.futureCopy}>
        <Text style={styles.futureTitle}>
          {title}
        </Text>

        <Text style={styles.futureBody}>
          {body}
        </Text>
      </View>

      <View style={styles.soonPill}>
        <Text style={styles.soonText}>
          SOON
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing[6],
    marginBottom: spacing[6],
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
    maxWidth: 430,
    marginTop: spacing[2],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
  },

  identityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[4],
    padding: spacing[5],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  identityIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandSoft,
  },

  identityCopy: {
    flex: 1,
  },

  identityEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.3,
    color: colors.brass,
  },

  identityTitle: {
    marginTop: spacing[1],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textPrimary,
  },

  identityBody: {
    marginTop: spacing[2],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },

  sectionHeading: {
    marginTop: spacing[7],
    marginBottom: spacing[3],
  },

  sectionEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.5,
    color: colors.brass,
  },

  sectionTitle: {
    marginTop: spacing[1],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textPrimary,
  },

  statsCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  stat: {
    flex: 1,
    alignItems: 'center',
  },

  statValue: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    color: colors.textPrimary,
  },

  statLabel: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },

  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: colors.border,
  },

  settingsCard: {
    paddingHorizontal: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  futureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    paddingVertical: spacing[4],
  },

  futureIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tealSoft,
  },

  futureCopy: {
    flex: 1,
  },

  futureTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },

  futureBody: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },

  rowDivider: {
    height: 1,
    marginLeft: 52,
    backgroundColor: colors.border,
  },

  soonPill: {
    marginTop: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.pill,
    backgroundColor: colors.brassSoft,
  },

  soonText: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1,
    color: colors.brass,
  },

  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: radius.lg,
    backgroundColor: colors.tealSoft,
  },

  privacyIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },

  privacyCopy: {
    flex: 1,
  },

  privacyTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },

  privacyBody: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },

  bottomSpace: {
    height: spacing[12],
  },
});
