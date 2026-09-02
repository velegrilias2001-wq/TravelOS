import { Ionicons } from '@expo/vector-icons';
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
  type Href,
} from 'expo-router';
import {
  useCallback,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';
import type { ImportBatch } from '@/domain/entities';
import { importReviewService } from '@/services/import-review-runtime';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  shadows,
  spacing,
} from '@/theme';

export default function ImportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    tripId?: string | string[];
  }>();
  const tripId = Array.isArray(params.tripId)
    ? params.tripId[0]
    : params.tripId;

  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [batches, setBatches] = useState<ImportBatch[]>([]);

  const reload = useCallback(async () => {
    const next = await importReviewService.listBatches();
    setBatches(next);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void (async () => {
        try {
          const next = await importReviewService.listBatches();

          if (active) {
            setBatches(next);
          }
        } catch (caught) {
          console.error(caught);
        }
      })();

      return () => {
        active = false;
      };
    }, []),
  );

  const openBatch = (batchId: string) => {
    router.push({
      pathname: '/import/review/[batchId]',
      params: {
        batchId,
        ...(tripId ? { tripId } : {}),
      },
    } as Href);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      const batch = await importReviewService.ingestIcs({
        text,
      });

      setText('');
      await reload();
      openBatch(batch.id);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'This calendar could not be imported.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
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

        <Text style={styles.eyebrow}>
          REVIEW FIRST
        </Text>

        <Text style={styles.title}>
          Import a calendar
        </Text>

        <Text style={styles.subtitle}>
          Paste an .ics calendar. TravelOS keeps every event as a claim until you accept it onto a trip. Nothing becomes a booking on its own.
        </Text>
      </View>

      <View style={styles.editor}>
        <Text style={styles.editorLabel}>
          iCalendar text
        </Text>

        <TextInput
          accessibilityLabel="iCalendar text"
          multiline
          textAlignVertical="top"
          value={text}
          onChangeText={setText}
          placeholder={'BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:Flight to Lisbon\nDTSTART:20260915T080000\nDTEND:20260915T103000\nEND:VEVENT\nEND:VCALENDAR'}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        {error ? (
          <Text style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Review calendar events"
          disabled={busy || text.trim().length === 0}
          style={({ pressed }) => [
            styles.primaryButton,
            (busy || text.trim().length === 0) &&
              styles.primaryButtonDisabled,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            void submit();
          }}
        >
          <View>
            <Text style={styles.primaryButtonEyebrow}>
              REVIEW QUEUE
            </Text>

            <Text style={styles.primaryButtonText}>
              Extract events without saving bookings
            </Text>
          </View>

          <Ionicons
            name="arrow-forward"
            size={21}
            color={colors.textInverse}
          />
        </Pressable>
      </View>

      {batches.length > 0 ? (
        <View style={styles.list}>
          <Text style={styles.sectionEyebrow}>
            RECENT REVIEWS
          </Text>

          {batches.map((batch) => (
            <Pressable
              key={batch.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${batch.sourceLabel}`}
              style={({ pressed }) => [
                styles.batchCard,
                pressed && styles.pressed,
              ]}
              onPress={() => openBatch(batch.id)}
            >
              <Text style={styles.batchEyebrow}>
                {batch.sourceKind.toUpperCase()}
              </Text>

              <Text style={styles.batchTitle}>
                {batch.sourceLabel}
              </Text>

              <Text style={styles.batchDetail}>
                {batch.skippedCount > 0
                  ? `${batch.skippedCount} events were skipped because they were incomplete.`
                  : 'Open to review extracted claims.'}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.bottomSpace} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing[4],
    marginBottom: spacing[6],
  },

  backButton: {
    width: 42,
    height: 42,
    marginBottom: spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },

  eyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.8,
    color: colors.brass,
  },

  title: {
    maxWidth: 470,
    marginTop: spacing[2],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.display,
    lineHeight: lineHeight.display,
    color: colors.textPrimary,
  },

  subtitle: {
    maxWidth: 470,
    marginTop: spacing[3],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
  },

  editor: {
    gap: spacing[3],
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  editorLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.3,
    color: colors.brass,
  },

  input: {
    minHeight: 180,
    padding: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.backgroundSoft,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textPrimary,
  },

  error: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.danger,
  },

  primaryButton: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: colors.brand,
    ...shadows.card,
  },

  primaryButtonDisabled: {
    opacity: 0.45,
  },

  primaryButtonEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.3,
    color: '#D5B887',
  },

  primaryButtonText: {
    marginTop: 2,
    maxWidth: 260,
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
    color: colors.textInverse,
  },

  list: {
    marginTop: spacing[8],
    gap: spacing[3],
  },

  sectionEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.4,
    color: colors.teal,
  },

  batchCard: {
    gap: spacing[1],
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  batchEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.2,
    color: colors.brass,
  },

  batchTitle: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textPrimary,
  },

  batchDetail: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },

  pressed: {
    opacity: 0.84,
  },

  bottomSpace: {
    height: spacing[12],
  },
});
