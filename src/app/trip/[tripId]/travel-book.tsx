import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';
import { UtilityScreenHeader } from '@/components/ui/utility-screen';
import type { Memory } from '@/domain/entities/memory';
import type { TravelBook } from '@/domain/entities/travel-book';
import {
  useTripWorkspace,
  useTripWorkspaceFocusRefresh,
} from '@/features/trip-workspace/trip-workspace-context';
import { tripDestinationLabel } from '@/services/destination-authoring';
import { memoryService } from '@/services/memory-service';
import {
  deleteTravelBook,
  getTravelBook,
  saveTravelBook,
} from '@/services/travel-book-service';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  spacing,
} from '@/theme';

function chronologicalMemories(
  memories: Memory[],
): Memory[] {
  return [...memories].sort((left, right) => {
    const byCapturedAt =
      left.capturedAt.localeCompare(right.capturedAt);

    if (byCapturedAt !== 0) {
      return byCapturedAt;
    }

    const byCreatedAt =
      left.createdAt.localeCompare(right.createdAt);

    if (byCreatedAt !== 0) {
      return byCreatedAt;
    }

    return left.id.localeCompare(right.id);
  });
}

function formatMomentDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Moment date unavailable';
  }

  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TravelBookScreen() {
  const { workspace } = useTripWorkspace();

  useTripWorkspaceFocusRefresh();

  const trip = workspace.trip;
  const destinationLabel =
    tripDestinationLabel(trip.destinations);

  const [memories, setMemories] = useState<Memory[]>(
    () => chronologicalMemories(workspace.memories),
  );

  const dayById = useMemo(
    () =>
      new Map(
        workspace.days.map((day) => [day.id, day]),
      ),
    [workspace.days],
  );

  const stopById = useMemo(
    () =>
      new Map(
        workspace.stops.map((stop) => [stop.id, stop]),
      ),
    [workspace.stops],
  );

  const [book, setBook] =
    useState<TravelBook | null>(null);
  const [title, setTitle] = useState(trip.title);
  const [summary, setSummary] = useState('');
  const [selectedIds, setSelectedIds] = useState<
    string[]
  >([]);
  const [coverImageUri, setCoverImageUri] =
    useState<string | undefined>();
  const [isPublished, setIsPublished] =
    useState(false);
  const [isLoading, setIsLoading] =
    useState(true);
  const [isSaving, setIsSaving] =
    useState(false);

  const resetDraft = useCallback(
    (_availableMemories: Memory[]) => {
      setBook(null);
      setTitle(trip.title);
      setSummary('');
      setSelectedIds([]);
      setCoverImageUri(undefined);
      setIsPublished(false);
    },
    [trip.title],
  );

  const loadBook = useCallback(async () => {
    setIsLoading(true);

    try {
      const freshMemories = chronologicalMemories(
        await memoryService.listTripMemories(trip.id),
      );
      setMemories(freshMemories);

      const existing = await getTravelBook(trip.id);

      if (!existing) {
        resetDraft(freshMemories);
        return;
      }

      const availableIds = new Set(
        freshMemories.map((memory) => memory.id),
      );
      const validSelectedIds =
        existing.memoryIds.filter((id) =>
          availableIds.has(id),
        );

      const validCover = freshMemories.some(
        (memory) =>
          validSelectedIds.includes(memory.id) &&
          memory.type === 'photo' &&
          memory.mediaUri === existing.coverImageUri,
      )
        ? existing.coverImageUri
        : freshMemories.find(
            (memory) =>
              validSelectedIds.includes(memory.id) &&
              memory.type === 'photo' &&
              Boolean(memory.mediaUri),
          )?.mediaUri;

      setBook(existing);
      setTitle(existing.title);
      setSummary(existing.summary ?? '');
      setSelectedIds(validSelectedIds);
      setCoverImageUri(validCover);
      setIsPublished(existing.isPublished);
    } catch (error) {
      console.error(
        '[TravelBook] Load failed:',
        error,
      );
      Alert.alert(
        'Travel Book unavailable',
        'The saved book could not be loaded.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [resetDraft, trip.id]);

  useFocusEffect(
    useCallback(() => {
      void loadBook();
    }, [loadBook]),
  );

  const selectedSet = useMemo(
    () => new Set(selectedIds),
    [selectedIds],
  );

  const selectedMemories = useMemo(
    () =>
      memories.filter((memory) =>
        selectedSet.has(memory.id),
      ),
    [memories, selectedSet],
  );

  const photoCount = selectedMemories.filter(
    (memory) =>
      memory.type === 'photo' &&
      Boolean(memory.mediaUri),
  ).length;

  const toggleMemory = (memoryId: string) => {
    setSelectedIds((current) => {
      const currentSet = new Set(current);

      if (currentSet.has(memoryId)) {
        currentSet.delete(memoryId);
      } else {
        currentSet.add(memoryId);
      }

      return memories
        .filter((memory) =>
          currentSet.has(memory.id),
        )
        .map((memory) => memory.id);
    });

    const removedMemory = memories.find(
      (memory) => memory.id === memoryId,
    );

    if (
      selectedSet.has(memoryId) &&
      removedMemory?.mediaUri === coverImageUri
    ) {
      const fallback = memories.find(
        (memory) =>
          memory.id !== memoryId &&
          selectedSet.has(memory.id) &&
          memory.type === 'photo' &&
          Boolean(memory.mediaUri),
      );
      setCoverImageUri(fallback?.mediaUri);
    }
  };

  const chooseCover = (memory: Memory) => {
    if (
      memory.type !== 'photo' ||
      !memory.mediaUri
    ) {
      return;
    }

    if (!selectedSet.has(memory.id)) {
      setSelectedIds((current) => {
        const next = new Set(current);
        next.add(memory.id);

        return memories
          .filter((candidate) =>
            next.has(candidate.id),
          )
          .map((candidate) => candidate.id);
      });
    }

    setCoverImageUri(memory.mediaUri);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(
        'Add a title',
        'Your Travel Book needs a title before it can be saved.',
      );
      return;
    }

    setIsSaving(true);

    try {
      const saved = await saveTravelBook({
        existing: book,
        tripId: trip.id,
        title,
        summary,
        memoryIds: selectedIds,
        coverImageUri,
        isPublished,
        memories,
      });

      setBook(saved);
      setTitle(saved.title);
      setSummary(saved.summary ?? '');
      setSelectedIds(saved.memoryIds);
      setCoverImageUri(saved.coverImageUri);
      setIsPublished(saved.isPublished);

      Alert.alert(
        'Travel Book saved',
        saved.isPublished
          ? 'This book is marked as published in your local TravelOS library.'
          : 'Your draft is saved locally.',
      );
    } catch (error) {
      console.error(
        '[TravelBook] Save failed:',
        error,
      );
      Alert.alert(
        'Could not save',
        error instanceof Error
          ? error.message
          : 'The Travel Book could not be saved.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!book) {
      return;
    }

    Alert.alert(
      'Delete Travel Book?',
      'The book layout will be deleted. Your Memories will stay untouched.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteTravelBook(book.id);
                await loadBook();
                Alert.alert(
                  'Travel Book deleted',
                  'The book was removed. Your Memories are still saved.',
                );
              } catch (error) {
                console.error(
                  '[TravelBook] Delete failed:',
                  error,
                );
                Alert.alert(
                  'Could not delete',
                  'The Travel Book could not be deleted.',
                );
              }
            })();
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <Screen>
        <UtilityScreenHeader
          eyebrow={destinationLabel.toUpperCase()}
          title="Travel Book"
          subtitle="Shape real trip moments into a lasting story."
        />
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.loadingText}>
            Opening your Travel Book…
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <UtilityScreenHeader
        eyebrow={destinationLabel.toUpperCase()}
        title="Travel Book"
        subtitle="Shape real trip moments into a lasting story."
      />

      <View style={styles.truthNote}>
        <Ionicons
          name="shield-checkmark-outline"
          size={18}
          color={colors.teal}
        />
        <Text style={styles.truthText}>
          V1 uses only your saved Memories. No AI-written
          events or invented details are added.
        </Text>
      </View>

      <View style={styles.coverCard}>
        {coverImageUri ? (
          <Image
            source={{ uri: coverImageUri }}
            resizeMode="cover"
            style={styles.coverImage}
          />
        ) : (
          <View style={styles.coverPlaceholder}>
            <View style={styles.coverPlaceholderIcon}>
              <Ionicons
                name="book-outline"
                size={30}
                color={colors.brass}
              />
            </View>
            <Text style={styles.coverPlaceholderTitle}>
              Your journey, in your words.
            </Text>
            <Text style={styles.coverPlaceholderBody}>
              Select a saved photo below to use it as the
              cover.
            </Text>
          </View>
        )}

        <View style={styles.coverCopy}>
          <Text style={styles.coverEyebrow}>
            {isPublished
              ? 'PUBLISHED · LOCAL'
              : 'DRAFT'}
          </Text>
          <Text style={styles.coverTitle}>
            {title.trim() || trip.title}
          </Text>
          <Text style={styles.coverMeta}>
            {selectedMemories.length}{' '}
            {selectedMemories.length === 1
              ? 'moment'
              : 'moments'}{' '}
            · {photoCount}{' '}
            {photoCount === 1 ? 'photo' : 'photos'}
          </Text>
        </View>
      </View>

      <SectionHeader
        eyebrow="BOOK DETAILS"
        title="Shape the story"
      />

      <View style={styles.editorCard}>
        <FieldLabel text="TITLE" />
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="A name for this journey"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <FieldLabel text="SUMMARY" />
        <TextInput
          value={summary}
          onChangeText={setSummary}
          placeholder="A short reflection in your own words…"
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.summaryInput]}
        />

        <FieldLabel text="STATE" />
        <View style={styles.stateRow}>
          <StateChoice
            label="Draft"
            description="Still shaping"
            selected={!isPublished}
            onPress={() => setIsPublished(false)}
          />
          <StateChoice
            label="Published"
            description="Finished locally"
            selected={isPublished}
            onPress={() => setIsPublished(true)}
          />
        </View>

        <Text style={styles.helperText}>
          Published is a local TravelOS state in V1.
          Sharing and export are not enabled yet.
        </Text>
      </View>

      <SectionHeader
        eyebrow="STORY"
        title="Selected moments"
      />

      {selectedMemories.length === 0 ? (
        <View style={styles.emptyStory}>
          <Ionicons
            name="albums-outline"
            size={28}
            color={colors.textMuted}
          />
          <Text style={styles.emptyStoryTitle}>
            No moments selected
          </Text>
          <Text style={styles.emptyStoryBody}>
            Choose at least one Memory below when you want
            this book to tell part of the journey.
          </Text>
        </View>
      ) : (
        <View style={styles.storyList}>
          {selectedMemories.map((memory, index) => (
            <StoryMoment
              key={memory.id}
              memory={memory}
              index={index}
              dayLabel={
                memory.dayId
                  ? dayById.get(memory.dayId)
                  : undefined
              }
              stopTitle={
                memory.stopId
                  ? stopById.get(memory.stopId)?.title
                  : undefined
              }
            />
          ))}
        </View>
      )}

      <SectionHeader
        eyebrow="CURATE"
        title="Choose what belongs"
      />

      {memories.length === 0 ? (
        <View style={styles.emptyStory}>
          <Ionicons
            name="images-outline"
            size={28}
            color={colors.textMuted}
          />
          <Text style={styles.emptyStoryTitle}>
            Add Memories first
          </Text>
          <Text style={styles.emptyStoryBody}>
            Notes and photos from Memories become the real
            material for your Travel Book.
          </Text>
        </View>
      ) : (
        <View style={styles.memoryPicker}>
          {memories.map((memory, index) => {
            const selected =
              selectedSet.has(memory.id);
            const isCover =
              Boolean(memory.mediaUri) &&
              memory.mediaUri === coverImageUri;

            return (
              <View key={memory.id}>
                {index > 0 && (
                  <View style={styles.divider} />
                )}
                <View style={styles.memoryRow}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{
                      checked: selected,
                    }}
                    style={styles.memoryMain}
                    onPress={() =>
                      toggleMemory(memory.id)
                    }
                  >
                    <View
                      style={[
                        styles.check,
                        selected &&
                          styles.checkSelected,
                      ]}
                    >
                      {selected && (
                        <Ionicons
                          name="checkmark"
                          size={15}
                          color={colors.textInverse}
                        />
                      )}
                    </View>

                    {memory.type === 'photo' &&
                    memory.mediaUri ? (
                      <Image
                        source={{
                          uri: memory.mediaUri,
                        }}
                        style={styles.memoryThumb}
                      />
                    ) : (
                      <View
                        style={
                          styles.memoryTypeIcon
                        }
                      >
                        <Ionicons
                          name="document-text-outline"
                          size={19}
                          color={colors.teal}
                        />
                      </View>
                    )}

                    <View style={styles.memoryCopy}>
                      <Text
                        numberOfLines={1}
                        style={styles.memoryTitle}
                      >
                        {memory.title?.trim() ||
                          (memory.type === 'photo'
                            ? 'Photo moment'
                            : 'Note')}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={styles.memoryMeta}
                      >
                        {formatMomentDate(
                          memory.capturedAt,
                        )}
                      </Text>
                    </View>
                  </Pressable>

                  {memory.type === 'photo' &&
                    memory.mediaUri && (
                      <Pressable
                        accessibilityRole="button"
                        style={[
                          styles.coverButton,
                          isCover &&
                            styles.coverButtonActive,
                        ]}
                        onPress={() =>
                          chooseCover(memory)
                        }
                      >
                        <Text
                          style={[
                            styles.coverButtonText,
                            isCover &&
                              styles.coverButtonTextActive,
                          ]}
                        >
                          {isCover
                            ? 'COVER'
                            : 'USE COVER'}
                        </Text>
                      </Pressable>
                    )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        disabled={isSaving}
        style={[
          styles.saveButton,
          isSaving && styles.disabled,
        ]}
        onPress={() => void handleSave()}
      >
        {isSaving ? (
          <ActivityIndicator
            color={colors.textInverse}
          />
        ) : (
          <>
            <Text style={styles.saveButtonText}>
              Save Travel Book
            </Text>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={colors.textInverse}
            />
          </>
        )}
      </Pressable>

      {book && (
        <Pressable
          accessibilityRole="button"
          style={styles.deleteButton}
          onPress={handleDelete}
        >
          <Ionicons
            name="trash-outline"
            size={17}
            color={colors.coral}
          />
          <Text style={styles.deleteButtonText}>
            Delete Travel Book
          </Text>
        </Pressable>
      )}

      <View style={styles.bottomSpace} />
    </Screen>
  );
}

function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionEyebrow}>
        {eyebrow}
      </Text>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>
    </View>
  );
}

function FieldLabel({ text }: { text: string }) {
  return (
    <Text style={styles.fieldLabel}>{text}</Text>
  );
}

function StateChoice({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description: string;
  selected: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={[
        styles.stateChoice,
        selected && styles.stateChoiceSelected,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.stateChoiceTitle,
          selected &&
            styles.stateChoiceTitleSelected,
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.stateChoiceBody,
          selected &&
            styles.stateChoiceBodySelected,
        ]}
      >
        {description}
      </Text>
    </Pressable>
  );
}

function StoryMoment({
  memory,
  index,
  dayLabel,
  stopTitle,
}: {
  memory: Memory;
  index: number;
  dayLabel:
    | {
        dayNumber: number;
        date: string;
      }
    | undefined;
  stopTitle: string | undefined;
}) {
  return (
    <View style={styles.storyMoment}>
      <View style={styles.storyIndex}>
        <Text style={styles.storyIndexText}>
          {String(index + 1).padStart(2, '0')}
        </Text>
      </View>

      <View style={styles.storyBody}>
        <Text style={styles.storyEyebrow}>
          {dayLabel
            ? `DAY ${dayLabel.dayNumber}`
            : 'MOMENT'}
          {stopTitle ? ` · ${stopTitle}` : ''}
        </Text>

        {memory.type === 'photo' &&
          memory.mediaUri && (
            <Image
              source={{ uri: memory.mediaUri }}
              resizeMode="cover"
              style={styles.storyImage}
            />
          )}

        <Text style={styles.storyTitle}>
          {memory.title?.trim() ||
            (memory.type === 'photo'
              ? 'Photo moment'
              : 'Saved note')}
        </Text>

        {memory.caption?.trim() && (
          <Text style={styles.storyCaption}>
            {memory.caption.trim()}
          </Text>
        )}

        <Text style={styles.storyDate}>
          {formatMomentDate(memory.capturedAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingState: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  loadingText: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    color: colors.textMuted,
  },
  truthNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: radius.md,
    backgroundColor: colors.tealSoft,
  },
  truthText: {
    flex: 1,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  coverCard: {
    overflow: 'hidden',
    marginTop: spacing[5],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  coverImage: {
    width: '100%',
    height: 240,
    backgroundColor: colors.backgroundSoft,
  },
  coverPlaceholder: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[7],
    backgroundColor: colors.surfaceWarm,
  },
  coverPlaceholderIcon: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.brassSoft,
  },
  coverPlaceholderTitle: {
    marginTop: spacing[4],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  coverPlaceholderBody: {
    maxWidth: 290,
    marginTop: spacing[2],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  coverCopy: {
    padding: spacing[5],
    backgroundColor: colors.brand,
  },
  coverEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.5,
    color: colors.brass,
  },
  coverTitle: {
    marginTop: spacing[2],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.title,
    lineHeight: lineHeight.title,
    color: colors.textInverse,
  },
  coverMeta: {
    marginTop: spacing[2],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: 'rgba(255,255,255,0.72)',
  },
  sectionHeader: {
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
  editorCard: {
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  fieldLabel: {
    marginTop: spacing[3],
    marginBottom: spacing[2],
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.3,
    color: colors.brass,
  },
  input: {
    minHeight: 54,
    paddingHorizontal: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceWarm,
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  summaryInput: {
    minHeight: 112,
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
  },
  stateRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  stateChoice: {
    flex: 1,
    minHeight: 74,
    justifyContent: 'center',
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceWarm,
  },
  stateChoiceSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  stateChoiceTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  stateChoiceTitleSelected: {
    color: colors.textInverse,
  },
  stateChoiceBody: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.micro,
    color: colors.textMuted,
  },
  stateChoiceBodySelected: {
    color: 'rgba(255,255,255,0.72)',
  },
  helperText: {
    marginTop: spacing[3],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
  },
  storyList: {
    gap: spacing[3],
  },
  storyMoment: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  storyIndex: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.brassSoft,
  },
  storyIndexText: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    color: colors.brass,
  },
  storyBody: {
    flex: 1,
    overflow: 'hidden',
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  storyEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.2,
    color: colors.teal,
  },
  storyImage: {
    width: '100%',
    height: 180,
    marginTop: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.backgroundSoft,
  },
  storyTitle: {
    marginTop: spacing[3],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textPrimary,
  },
  storyCaption: {
    marginTop: spacing[2],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
  },
  storyDate: {
    marginTop: spacing[3],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.micro,
    color: colors.textMuted,
  },
  emptyStory: {
    alignItems: 'center',
    padding: spacing[7],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  emptyStoryTitle: {
    marginTop: spacing[3],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    color: colors.textPrimary,
  },
  emptyStoryBody: {
    maxWidth: 310,
    marginTop: spacing[2],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  memoryPicker: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  memoryRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
  },
  memoryMain: {
    flex: 1,
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  check: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceWarm,
  },
  checkSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  memoryThumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.backgroundSoft,
  },
  memoryTypeIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.tealSoft,
  },
  memoryCopy: {
    flex: 1,
  },
  memoryTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  memoryMeta: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.micro,
    color: colors.textMuted,
  },
  coverButton: {
    marginLeft: spacing[2],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
    borderRadius: radius.pill,
    backgroundColor: colors.backgroundSoft,
  },
  coverButtonActive: {
    backgroundColor: colors.brassSoft,
  },
  coverButtonText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 9,
    letterSpacing: 0.5,
    color: colors.textMuted,
  },
  coverButtonTextActive: {
    color: colors.brass,
  },
  divider: {
    height: 1,
    marginLeft: spacing[3] + 24 + spacing[3],
    backgroundColor: colors.border,
  },
  saveButton: {
    minHeight: 54,
    marginTop: spacing[7],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderRadius: radius.md,
    backgroundColor: colors.brand,
  },
  saveButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textInverse,
  },
  deleteButton: {
    minHeight: 48,
    marginTop: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  deleteButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.coral,
  },
  disabled: {
    opacity: 0.55,
  },
  bottomSpace: {
    height: spacing[16],
  },
});
