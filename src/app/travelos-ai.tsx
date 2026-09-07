import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
  const [enabled, setEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [healthDetail, setHealthDetail] = useState<string | null>(
    null,
  );

  const reload = useCallback(async () => {
    setStatus('loading');

    try {
      const prefs = await refreshAiPreferencesCache();
      setEnabled(prefs.enabled);

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

  // Local privacy controls must not wait for a cold or unreachable server.
  useEffect(() => {
    if (status !== 'ready' || !enabled) {
      setHealthDetail('TravelOS AI is off on this device. Your saved trips still work.');
      return;
    }
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    setHealthDetail('Checking availability…');
    void probeCopilotHealth(controller.signal).then((health) => {
      if (active) {
        setHealthDetail(`${health.status === 'ready' ? 'Ready' : 'Unavailable'} · ${health.detail}`);
      }
    }).finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [enabled, status]);

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
    <Screen scroll>
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
                Chat, Discover AI explanations and free-time advice.
                Suggestions need your confirmation before they become
                saved trip facts. Manual planning remains available.
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
            When you use AI, relevant context is sent to the TravelOS
            server and its configured AI provider. Chat includes the
            messages you enter. Discover may include your Travel DNA,
            discovery preferences and catalogue places.
          </Text>
          <Text style={styles.privacy}>
            Free-time advice may also include trip dates, itinerary
            names, times and precise locations, booking titles, providers,
            amounts and payment status, stay names, addresses and
            check-in/out times, traveler counts and budget summaries.
            Structured trip context excludes confirmation codes,
            contact details and free-form notes. Avoid typing sensitive
            information into chat.
          </Text>
          <Text style={styles.privacy}>
            Provider retention and processing depend on the configured
            service; zero retention is not guaranteed. Turning AI off
            blocks new AI requests, but cannot recall data already sent.
            Online place lookup and directions are separate services.
            Provider API keys stay on the server.
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
