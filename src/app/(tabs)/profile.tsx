import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Sharing from 'expo-sharing';

import { confirmDestructiveAsync } from '@/components/ui/confirm';
import { localDataFileGate } from '@/services/local-data-session';
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
import { strings } from '@/i18n';

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
            ? 'TravelOS AI'
            : snapshot.status === 'disabled'
              ? strings.profile.travelOsAiOff
              : 'AI unavailable',
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

    const release = localDataFileGate.acquire();
    if (!release) return;

    void (async () => {
      setIsExporting(true);

      try {
        const { path, document } =
          await createLocalDataExportFile();
        const canShare = await Sharing.isAvailableAsync();

        if (!canShare) {
          Alert.alert(
            strings.profile.exportSavedTitle,
            strings.profile.exportSavedBody(document.trips.length),
          );
          return;
        }

        await Sharing.shareAsync(path, {
          mimeType: 'application/json',
          dialogTitle: strings.profile.exportDialogTitle,
          UTI: 'public.json',
        });
      } catch (error) {
        Alert.alert(
          strings.profile.exportFailed,
          error instanceof Error
            ? error.message
            : strings.profile.exportFailedBody,
        );
      } finally {
        release();
        setIsExporting(false);
      }
    })();
  };

  const restoreLocalBackup = () => {
    const release = localDataFileGate.acquire();
    if (!release) return;
    setIsRestoring(true);
    void (async () => {
      try {
        const picked = await pickLocalDataExportDocument();
        if (!picked) return;
        const { document, summary, sourceLabel } = picked;
        const confirmed = await confirmDestructiveAsync({
          title: strings.profile.replaceTitle,
          message: strings.profile.replaceMessage(
            sourceLabel,
            summary.tripCount,
            summary.exportedAt,
          ),
          confirmLabel: strings.profile.replaceConfirm,
        });
        if (!confirmed) return;
        const restored = await restoreLocalDataExportDocument(document);
        Alert.alert(
          strings.profile.restoredTitle,
          restored.refreshFailed
            ? strings.profile.restoredRefreshFailed
            : strings.profile.restoredBody(restored.tripCount),
        );
      } catch (error) {
        Alert.alert(
          strings.profile.restoreFailed,
          error instanceof Error
            ? error.message
            : strings.profile.restoreFailedBody,
        );
      } finally {
        release();
        setIsRestoring(false);
      }
    })();
  };

  return (
    <Screen scroll clearTabBar>
      <Modal visible={isRestoring} transparent onRequestClose={() => {}}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.overlay }}>
          <View style={{ padding: spacing[6], borderRadius: radius.md, backgroundColor: colors.surface }}>
            <ActivityIndicator color={colors.brand} />
            <Text accessibilityRole="alert" style={{ color: colors.textPrimary, marginTop: spacing[3] }}>Backup recovery in progress…</Text>
          </View>
        </View>
      </Modal>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>
          {strings.profile.eyebrow}
        </Text>

        <Text style={styles.title}>
          {strings.profile.title}
        </Text>

        <Text style={styles.subtitle}>
          {strings.profile.subtitle}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.profile.openTravelDna}
        style={({ pressed }) => [
          styles.identityCard,
          pressed && styles.pressed,
        ]}
        onPress={() => router.push('/travel-dna')}
      >
        <View style={styles.identityIcon}>
          <Ionicons
            name="person-outline"
            size={24}
            color={colors.brand}
          />
        </View>

        <View style={styles.identityCopy}>
          <Text style={styles.identityEyebrow}>
            {strings.profile.travelProfileEyebrow}
          </Text>

          <Text style={styles.identityTitle}>
            {strings.profile.travelProfileTitle}
          </Text>

          <Text style={styles.identityBody}>
            {strings.profile.travelProfileBody}
          </Text>

          <Text style={styles.identityCta}>
            {strings.profile.openTravelDna}
          </Text>
        </View>
      </Pressable>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionEyebrow}>
          {strings.profile.lifeEyebrow}
        </Text>

        <Text style={styles.sectionTitle}>
          {strings.profile.atAGlance}
        </Text>
      </View>

      <View style={styles.statsCard}>
        <Stat
          value={trips.length}
          label={
            trips.length === 1
              ? strings.profile.tripLabel
              : strings.profile.tripsLabel
          }
        />

        <View style={styles.statDivider} />

        <Stat
          value={completedTrips}
          label={strings.profile.completed}
        />

        <View style={styles.statDivider} />

        <Stat
          value={mappedDestinations}
          label={strings.profile.mapped}
        />
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionEyebrow}>
          {strings.profile.personalizeEyebrow}
        </Text>

        <Text style={styles.sectionTitle}>
          {strings.profile.preferences}
        </Text>
      </View>

      <View style={styles.settingsCard}>
        <ActiveRow
          icon="finger-print-outline"
          title={strings.profile.travelDna}
          body={strings.profile.travelDnaBody}
          onPress={() => router.push('/travel-dna')}
        />

        <View style={styles.rowDivider} />

        <ActiveRow
          icon="bookmark-outline"
          title={strings.profile.savedIdeas}
          body={strings.profile.savedIdeasBody}
          onPress={() => router.push('/discover/saved')}
        />

        <View style={styles.rowDivider} />

        <ActiveRow
          icon="download-outline"
          title={
            isExporting
              ? strings.profile.exporting
              : strings.profile.exportBackup
          }
          body={strings.profile.exportBody}
          onPress={exportLocalBackup}
        />

        <View style={styles.rowDivider} />

        <ActiveRow
          icon="cloud-upload-outline"
          title={
            isRestoring
              ? strings.profile.restoring
              : strings.profile.restoreBackup
          }
          body={strings.profile.restoreBody}
          onPress={restoreLocalBackup}
        />

        <View style={styles.rowDivider} />

        <ActiveRow
          icon="sparkles-outline"
          title={strings.profile.travelOsAi}
          body={strings.profile.travelOsAiBody}
          onPress={() =>
            router.push('/travelos-ai' as never)
          }
        />

        <View style={styles.rowDivider} />

        <ActiveRow
          icon="pulse-outline"
          title={
            isProbingCopilot
              ? strings.profile.probing
              : strings.profile.probeAi
          }
          body={strings.profile.probeAiBody}
          onPress={checkCopilot}
        />

        <View style={styles.rowDivider} />

        <ActiveRow
          icon="notifications-outline"
          title={strings.profile.notifications}
          body={strings.profile.notificationsBody}
          onPress={() =>
            router.push('/trip-notifications' as never)
          }
        />

        <View style={styles.rowDivider} />

        <FutureRow
          icon="cloud-outline"
          title={strings.profile.accountSync}
          body={strings.profile.accountSyncBody}
        />
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionEyebrow}>
          {strings.profile.dataEyebrow}
        </Text>

        <Text style={styles.sectionTitle}>
          {strings.profile.privateByDefault}
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
            {strings.profile.tripsStayWithYou}
          </Text>

          <Text style={styles.privacyBody}>
            {strings.profile.privacyBody}
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
      accessibilityLabel={strings.a11y.open(title)}
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

  identityCta: {
    marginTop: spacing[3],
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.caption,
    color: colors.brand,
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
