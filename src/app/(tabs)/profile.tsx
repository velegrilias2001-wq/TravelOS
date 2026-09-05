import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Sharing from 'expo-sharing';

import { confirmDestructive } from '@/components/ui/confirm';
import { Screen } from '@/components/ui/screen';
import { probeCopilotHealth } from '@/features/copilot/probe-copilot-health';
import {
  hasRealDestinationCoordinates,
} from '@/services/destination-authoring';
import { createLocalDataExportFile } from '@/services/local-data-export-runtime';
import {
  pickLocalDataExportDocument,
  restoreLocalDataExportDocument,
} from '@/services/local-data-restore-runtime';
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
  const [isExporting, setIsExporting] =
    useState(false);
  const [isRestoring, setIsRestoring] =
    useState(false);
  const [isProbingCopilot, setIsProbingCopilot] =
    useState(false);

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

  const checkCopilot = () => {
    if (isProbingCopilot) {
      return;
    }

    void (async () => {
      setIsProbingCopilot(true);

      try {
        const snapshot = await probeCopilotHealth();
        const available =
          snapshot.toolsAvailable.length > 0
            ? `\nAvailable: ${snapshot.toolsAvailable.join(', ')}`
            : '';

        Alert.alert(
          snapshot.status === 'ready'
            ? 'TravelOS Copilot'
            : 'Copilot unavailable',
          `${snapshot.detail}${available}`,
        );
      } finally {
        setIsProbingCopilot(false);
      }
    })();
  };

  const exportLocalBackup = () => {
    if (isExporting || isRestoring) {
      return;
    }

    void (async () => {
      setIsExporting(true);

      try {
        const { path, document } =
          await createLocalDataExportFile();
        const canShare = await Sharing.isAvailableAsync();

        if (!canShare) {
          Alert.alert(
            'Export saved on this device',
            `Wrote ${document.trips.length} trip${document.trips.length === 1 ? '' : 's'} to a local JSON file. Sharing is unavailable on this platform.`,
          );
          return;
        }

        await Sharing.shareAsync(path, {
          mimeType: 'application/json',
          dialogTitle: 'Export TravelOS local backup',
          UTI: 'public.json',
        });
      } catch (error) {
        Alert.alert(
          'Export could not finish',
          error instanceof Error
            ? error.message
            : 'Something went wrong while preparing the backup.',
        );
      } finally {
        setIsExporting(false);
      }
    })();
  };

  const restoreLocalBackup = () => {
    if (isExporting || isRestoring) {
      return;
    }

    void (async () => {
      try {
        const picked = await pickLocalDataExportDocument();

        if (!picked) {
          return;
        }

        const { document, summary, sourceLabel } = picked;

        confirmDestructive({
          title: 'Replace local TravelOS data?',
          message:
            `This replaces every trip, Travel DNA, traveler, and saved idea on this device with “${sourceLabel}” (${summary.tripCount} trip${summary.tripCount === 1 ? '' : 's'}, exported ${summary.exportedAt}). Photo files are not restored. Import review queues are cleared. This cannot be undone.`,
          confirmLabel: 'Replace data',
          onConfirm: () => {
            void (async () => {
              setIsRestoring(true);

              try {
                const restored =
                  await restoreLocalDataExportDocument(
                    document,
                  );

                Alert.alert(
                  'Local backup restored',
                  `Loaded ${restored.tripCount} trip${restored.tripCount === 1 ? '' : 's'} from the backup onto this device.`,
                );
              } catch (error) {
                Alert.alert(
                  'Restore could not finish',
                  error instanceof Error
                    ? error.message
                    : 'Something went wrong while restoring the backup.',
                );
              } finally {
                setIsRestoring(false);
              }
            })();
          },
        });
      } catch (error) {
        Alert.alert(
          'Restore could not start',
          error instanceof Error
            ? error.message
            : 'Something went wrong while reading the backup.',
        );
      }
    })();
  };

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
            Your Travel DNA keeps the preferences you explicitly choose for how you like to travel.
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
        <ActiveRow
          icon="finger-print-outline"
          title="Travel DNA"
          body="Interests, pace, travel style, budget style, daily rhythm and typical travel party."
          onPress={() => router.push('/travel-dna')}
        />

        <View style={styles.rowDivider} />

        <ActiveRow
          icon="bookmark-outline"
          title="Saved ideas"
          body="Catalogue destinations and journey ideas you kept. These are not trips or visited places."
          onPress={() => router.push('/discover/saved')}
        />

        <View style={styles.rowDivider} />

        <ActiveRow
          icon="download-outline"
          title={
            isExporting
              ? 'Preparing export…'
              : 'Export local backup'
          }
          body="Save a JSON copy of your trips, Travel DNA, and related facts from this device. Photo files are not included."
          onPress={exportLocalBackup}
        />

        <View style={styles.rowDivider} />

        <ActiveRow
          icon="cloud-upload-outline"
          title={
            isRestoring
              ? 'Restoring backup…'
              : 'Restore local backup'
          }
          body="Replace the data on this device with a TravelOS JSON backup. Photo files are not restored. Confirm before continuing."
          onPress={restoreLocalBackup}
        />

        <View style={styles.rowDivider} />

        <ActiveRow
          icon="sparkles-outline"
          title={
            isProbingCopilot
              ? 'Checking copilot…'
              : 'TravelOS Copilot'
          }
          body="Local AI for free-time ideas and grounded Discover explanations. Never invents destinations or writes trip truth."
          onPress={checkCopilot}
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
            Travel data is stored on this device. Export and restore use a local JSON backup. Cloud sync and photo-file backup remain later, explicit options.
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

function ActiveRow({
  icon,
  title,
  body,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${title}`}
      style={({ pressed }) => [
        styles.settingsRow,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.activeIcon}>
        <Ionicons
          name={icon}
          size={20}
          color={colors.brand}
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

      <Ionicons
        name="chevron-forward"
        size={20}
        color={colors.textMuted}
      />
    </Pressable>
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
    <View style={styles.settingsRow}>
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

  settingsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    paddingVertical: spacing[4],
  },

  pressed: {
    opacity: 0.72,
  },

  activeIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandSoft,
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
