import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { InlineError } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { UtilityScreenHeader } from '@/components/ui/utility-screen';
import { probeCopilotHealth } from '@/features/copilot/probe-copilot-health';
import {
  persistAiPreferences,
  refreshAiPreferencesCache,
} from '@/services/ai-preferences-runtime';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  spacing,
} from '@/theme';

type LoadStatus = 'loading' | 'ready' | 'error';

export default function TravelOsAiScreen() {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [enabled, setEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [healthDetail, setHealthDetail] = useState<string | null>(
    null,
  );

  const reload = useCallback(async () => {
    setStatus('loading');

    try {
      const prefs = await refreshAiPreferencesCache();
      setEnabled(prefs.enabled);

      if (prefs.enabled) {
        const health = await probeCopilotHealth();
        setHealthDetail(
          `${health.status === 'ready' ? 'Ready' : 'Unavailable'} · ${health.detail}`,
        );
      } else {
        setHealthDetail(
          'TravelOS AI is off on this device. Plan, Map, and trips still work.',
        );
      }

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

  const persistEnabled = async (nextEnabled: boolean) => {
    setIsSaving(true);
    setEnabled(nextEnabled);

    try {
      await persistAiPreferences({ enabled: nextEnabled });
      await reload();
    } catch {
      setEnabled(!nextEnabled);
      setStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen>
      <UtilityScreenHeader
        eyebrow="YOUR TRAVELOS"
        title="TravelOS AI"
        subtitle="Grounded travel intelligence"
        leading={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Profile"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={colors.textPrimary}
            />
          </Pressable>
        }
      />

      {status === 'loading' ? (
        <ActivityIndicator
          color={colors.brand}
          style={styles.loader}
        />
      ) : null}

      {status === 'error' ? (
        <InlineError
          title="Could not load AI settings"
          body="Try again from Profile."
        />
      ) : null}

      {status === 'ready' ? (
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>
                Use TravelOS AI
              </Text>
              <Text style={styles.rowBody}>
                Chat, Trip Copilot ideas, Discover explain,
                and free-time suggestions. Never invents
                destinations or writes trip truth without
                your confirm.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Use TravelOS AI"
              value={enabled}
              disabled={isSaving}
              onValueChange={(value) => {
                void persistEnabled(value);
              }}
              trackColor={{
                false: colors.border,
                true: colors.teal,
              }}
            />
          </View>

          {healthDetail ? (
            <Text style={styles.health}>{healthDetail}</Text>
          ) : null}

          <Text style={styles.privacy}>
            When on, this device may send Travel DNA summary,
            Discover Brief, grounded catalogue identities, and
            trip readiness counts to your TravelOS AI proxy.
            Provider API keys stay on the server. Retention:
            none by TravelOS. Server kill-switch: AI_ENABLED=false.
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    marginTop: spacing[8],
  },
  card: {
    marginHorizontal: spacing[5],
    marginTop: spacing[4],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[5],
    gap: spacing[4],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  rowCopy: {
    flex: 1,
    gap: spacing[2],
  },
  rowTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  rowBody: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textMuted,
  },
  health: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textPrimary,
  },
  privacy: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
  },
});
