import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useFocusEffect,
} from 'expo-router';
import {
  useCallback,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { InlineError } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import {
  UtilityScreenHeader,
} from '@/components/ui/utility-screen';
import {
  DEFAULT_NOTIFICATION_LEAD_MINUTES,
  loadNotificationPreferences,
  saveNotificationPreferences,
} from '@/data/repositories/notification-preferences-persistence';
import {
  getNotificationPermissionGranted,
  reconcileTripNotifications,
  requestNotificationPermissionGranted,
} from '@/services/trip-notifications-runtime';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  spacing,
} from '@/theme';

type LoadStatus = 'loading' | 'ready' | 'error';

export default function TripNotificationsScreen() {
  const [status, setStatus] =
    useState<LoadStatus>('loading');
  const [enabled, setEnabled] = useState(false);
  const [leadMinutes, setLeadMinutes] = useState(
    DEFAULT_NOTIFICATION_LEAD_MINUTES,
  );
  const [permissionGranted, setPermissionGranted] =
    useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const reload = useCallback(async () => {
    setStatus('loading');

    try {
      const [prefs, granted] = await Promise.all([
        loadNotificationPreferences(),
        getNotificationPermissionGranted(),
      ]);

      setEnabled(prefs.enabled);
      setLeadMinutes(prefs.leadMinutes);
      setPermissionGranted(granted);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const persistEnabled = async (
    nextEnabled: boolean,
  ) => {
    setIsSaving(true);

    try {
      if (nextEnabled) {
        const granted =
          await requestNotificationPermissionGranted();
        setPermissionGranted(granted);

        if (!granted) {
          Alert.alert(
            'Notifications are off',
            'Allow notifications in system settings to receive stop reminders.',
          );
          setEnabled(false);
          await saveNotificationPreferences({
            enabled: false,
            leadMinutes,
          });
          await reconcileTripNotifications();
          return;
        }
      }

      await saveNotificationPreferences({
        enabled: nextEnabled,
        leadMinutes,
      });
      setEnabled(nextEnabled);
      await reconcileTripNotifications();
    } catch {
      Alert.alert(
        'Could not save',
        'Notification preferences were not updated.',
      );
      await reload();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen scroll={status === 'ready'}>
      <UtilityScreenHeader
        eyebrow="YOUR TRAVELOS"
        title="Trip notifications"
        subtitle="Local reminders from your saved plan — never invented times."
        leading={<BackButton />}
      />

      {status === 'loading' ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : null}

      {status === 'error' ? (
        <InlineError
          title="Could not load preferences"
          body="Try again in a moment."
          onRetry={() => {
            void reload();
          }}
        />
      ) : null}

      {status === 'ready' ? (
        <View style={styles.body}>
          <Text style={styles.copy}>
            TravelOS can remind you shortly before a
            planned stop starts. Reminders need a
            saved destination timezone and a timed
            stop.
          </Text>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>
                  Stop start reminders
                </Text>
                <Text style={styles.rowBody}>
                  {leadMinutes} minutes before a
                  timed moment
                </Text>
              </View>
              <Switch
                accessibilityLabel="Enable stop start reminders"
                value={enabled}
                disabled={isSaving}
                onValueChange={(value) => {
                  void persistEnabled(value);
                }}
                trackColor={{
                  false: colors.border,
                  true: colors.teal,
                }}
                thumbColor={colors.textInverse}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.metaRow}>
              <Ionicons
                name={
                  permissionGranted
                    ? 'checkmark-circle'
                    : 'alert-circle-outline'
                }
                size={18}
                color={
                  permissionGranted
                    ? colors.teal
                    : colors.textMuted
                }
              />
              <Text style={styles.metaText}>
                {permissionGranted
                  ? 'System permission granted'
                  : 'System permission required'}
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh scheduled reminders"
            disabled={isSaving}
            style={({ pressed }) => [
              styles.refresh,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              void (async () => {
                setIsSaving(true);
                try {
                  await reconcileTripNotifications();
                } finally {
                  setIsSaving(false);
                }
              })();
            }}
          >
            <Text style={styles.refreshText}>
              Refresh scheduled reminders
            </Text>
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}

function BackButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back to Profile"
      style={({ pressed }) => [
        styles.backButton,
        pressed && styles.pressed,
      ]}
      onPress={() => router.back()}
    >
      <Ionicons
        name="chevron-back"
        size={22}
        color={colors.textPrimary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[8],
  },
  body: {
    gap: spacing[4],
    paddingBottom: spacing[12],
  },
  copy: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textMuted,
    paddingHorizontal: spacing[5],
  },
  card: {
    marginHorizontal: spacing[5],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[5],
    gap: spacing[4],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  rowCopy: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  rowBody: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    color: colors.textMuted,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  metaText: {
    flex: 1,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    color: colors.textMuted,
  },
  refresh: {
    alignSelf: 'flex-start',
    marginHorizontal: spacing[5],
    paddingVertical: spacing[2],
  },
  refreshText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.bodySmall,
    color: colors.brand,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
