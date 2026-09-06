import { Ionicons } from '@expo/vector-icons';
import {
  useFocusEffect,
  useRouter,
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
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';
import { UtilityScreenHeader } from '@/components/ui/utility-screen';
import type { PackingItem } from '@/domain/entities';
import {
  useTripWorkspace,
  useTripWorkspaceFocusRefresh,
} from '@/features/trip-workspace/trip-workspace-context';
import {
  packingProgress,
  packingService,
} from '@/services/packing-service';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  shadows,
  spacing,
} from '@/theme';

export default function PackingScreen() {
  const router = useRouter();
  const { workspace } = useTripWorkspace();
  useTripWorkspaceFocusRefresh();

  const [items, setItems] = useState<PackingItem[]>(
    [],
  );
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<
    'loading' | 'ready' | 'error'
  >('loading');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');

    try {
      const listed = await packingService.list(
        workspace.trip.id,
      );
      setItems(listed);
      setStatus('ready');
    } catch {
      setItems([]);
      setStatus('error');
    }
  }, [workspace.trip.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const progress = packingProgress(items);

  const addItem = async () => {
    if (busy) {
      return;
    }

    setBusy(true);

    try {
      await packingService.addItem(
        workspace.trip.id,
        draft,
      );
      setDraft('');
      await load();
    } catch (error) {
      Alert.alert(
        'Could not add item',
        error instanceof Error
          ? error.message
          : 'Try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const togglePacked = async (item: PackingItem) => {
    if (busy) {
      return;
    }

    setBusy(true);

    try {
      await packingService.setPacked(
        item.id,
        !item.packed,
      );
      await load();
    } catch (error) {
      Alert.alert(
        'Could not update item',
        error instanceof Error
          ? error.message
          : 'Try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const removeItem = (item: PackingItem) => {
    Alert.alert(
      'Remove packing item?',
      `"${item.title}" will be deleted from this trip.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusy(true);

              try {
                await packingService.deleteItem(
                  item.id,
                );
                await load();
              } catch (error) {
                Alert.alert(
                  'Could not remove item',
                  error instanceof Error
                    ? error.message
                    : 'Try again.',
                );
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <Screen scroll>
      <UtilityScreenHeader
        eyebrow="BEFORE YOU GO"
        title="Packing"
        subtitle="Traveler-authored checklist for this trip."
        leading={(
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to More"
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={colors.brand}
            />
          </Pressable>
        )}
      />

      <View style={styles.progressCard}>
        <Text style={styles.progressValue}>
          {progress.percentPacked}%
        </Text>
        <Text style={styles.progressBody}>
          {progress.total === 0
            ? 'Add items you plan to pack. Nothing is invented for you.'
            : `${progress.packed} of ${progress.total} packed`}
        </Text>
      </View>

      <View style={styles.addRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Add packing item"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          maxLength={120}
          returnKeyType="done"
          onSubmitEditing={() => {
            void addItem();
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add packing item"
          disabled={busy || draft.trim().length === 0}
          style={({ pressed }) => [
            styles.addButton,
            (busy || draft.trim().length === 0) &&
              styles.addButtonDisabled,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            void addItem();
          }}
        >
          <Ionicons
            name="add"
            size={22}
            color={colors.textInverse}
          />
        </Pressable>
      </View>

      {status === 'loading' ? (
        <ActivityIndicator
          color={colors.brand}
          style={styles.loader}
        />
      ) : null}

      {status === 'error' ? (
        <Text style={styles.errorText}>
          Could not load packing items.
        </Text>
      ) : null}

      <View style={styles.list}>
        {items.map((item) => (
          <View key={item.id} style={styles.row}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{
                checked: item.packed,
              }}
              accessibilityLabel={item.title}
              style={styles.checkHit}
              onPress={() => {
                void togglePacked(item);
              }}
            >
              <Ionicons
                name={
                  item.packed
                    ? 'checkbox'
                    : 'square-outline'
                }
                size={24}
                color={
                  item.packed
                    ? colors.teal
                    : colors.textMuted
                }
              />
              <Text
                style={[
                  styles.itemTitle,
                  item.packed && styles.itemPacked,
                ]}
              >
                {item.title}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.title}`}
              hitSlop={8}
              onPress={() => removeItem(item)}
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color={colors.textMuted}
              />
            </Pressable>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    ...shadows.subtle,
  },
  progressCard: {
    marginTop: spacing[4],
    marginBottom: spacing[4],
    padding: spacing[4],
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadows.subtle,
    gap: spacing[1],
  },
  progressValue: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    color: colors.brand,
  },
  progressBody: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textMuted,
  },
  addRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.body,
    color: colors.textPrimary,
    ...shadows.subtle,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.85,
  },
  loader: {
    marginVertical: spacing[4],
  },
  errorText: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    color: colors.coral,
    marginBottom: spacing[3],
  },
  list: {
    gap: spacing[2],
    paddingBottom: spacing[8],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    ...shadows.subtle,
    gap: spacing[3],
  },
  checkHit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  itemTitle: {
    flex: 1,
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  itemPacked: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
});
