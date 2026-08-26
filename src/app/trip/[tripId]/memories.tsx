import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';
import {
  CompactSummaryStrip,
  UtilityScreenHeader,
} from '@/components/ui/utility-screen';
import type {
  Memory,
} from '@/domain/entities/memory';
import type {
  TripDay,
} from '@/domain/entities/trip-day';
import type {
  TripStop,
} from '@/domain/entities/trip-stop';
import {
  useTripWorkspace,
  useTripWorkspaceFocusRefresh,
} from '@/features/trip-workspace/trip-workspace-context';
import {
  deleteManagedMemoryMedia,
  persistMemoryImage,
} from '@/services/memory-media';
import {
  memoryService,
  type EditableMemoryType,
} from '@/services/memory-service';
import {
  tripDestinationLabel,
} from '@/services/destination-authoring';
import {
  formatCalendarDateForDisplay,
} from '@/services/time-truth';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  shadows,
  spacing,
} from '@/theme';

interface PendingImage {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

interface MemoryGroup {
  key: string;
  eyebrow: string;
  title: string;
  memories: Memory[];
}

function formatDayDate(
  date: string,
): string {
  return formatCalendarDateForDisplay(
    date,
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    },
  );
}

function formatCapturedAt(
  value: string,
): string {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return 'Saved moment';
  }

  return date.toLocaleString(
    'en-GB',
    {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    },
  );
}

function memoryTitle(
  memory: Memory,
): string {
  return (
    memory.title?.trim() ||
    (memory.type === 'photo'
      ? 'Photo memory'
      : memory.type === 'video'
        ? 'Video memory'
        : 'Note')
  );
}

function memoryIcon(
  type: Memory['type'],
): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'photo':
      return 'image-outline';
    case 'video':
      return 'videocam-outline';
    default:
      return 'document-text-outline';
  }
}

function sortMemories(
  memories: Memory[],
): Memory[] {
  return [...memories].sort(
    (a, b) =>
      a.capturedAt.localeCompare(
        b.capturedAt,
      ),
  );
}

function buildGroups(
  memories: Memory[],
  days: TripDay[],
): MemoryGroup[] {
  const knownDayIds =
    new Set(
      days.map(
        (day) => day.id,
      ),
    );

  const dayGroups =
    [...days]
      .sort(
        (a, b) =>
          a.dayNumber -
          b.dayNumber,
      )
      .map((day) => ({
        key: day.id,
        eyebrow: `DAY ${day.dayNumber}`,
        title: formatDayDate(day.date),
        memories: sortMemories(
          memories.filter(
            (memory) =>
              memory.dayId === day.id,
          ),
        ),
      }))
      .filter(
        (group) =>
          group.memories.length > 0,
      );

  const unplaced =
    sortMemories(
      memories.filter(
        (memory) =>
          !memory.dayId ||
          !knownDayIds.has(
            memory.dayId,
          ),
      ),
    );

  if (unplaced.length > 0) {
    dayGroups.push({
      key: 'unplaced',
      eyebrow: 'UNPLACED',
      title: 'Other moments',
      memories: unplaced,
    });
  }

  return dayGroups;
}

export default function MemoriesScreen() {
  const router = useRouter();
  const {
    tripId,
    workspace,
  } = useTripWorkspace();

  useTripWorkspaceFocusRefresh();

  const [
    memories,
    setMemories,
  ] =
    useState<Memory[]>(
      workspace.memories,
    );

  const [
    modalVisible,
    setModalVisible,
  ] =
    useState(false);

  const [
    editing,
    setEditing,
  ] =
    useState<Memory | null>(
      null,
    );

  const [
    type,
    setType,
  ] =
    useState<EditableMemoryType>(
      'note',
    );

  const [
    title,
    setTitle,
  ] =
    useState('');

  const [
    caption,
    setCaption,
  ] =
    useState('');

  const [
    dayId,
    setDayId,
  ] =
    useState<string | undefined>(
      undefined,
    );

  const [
    stopId,
    setStopId,
  ] =
    useState<string | undefined>(
      undefined,
    );

  const [
    pendingImage,
    setPendingImage,
  ] =
    useState<PendingImage | null>(
      null,
    );

  const [
    removeExistingImage,
    setRemoveExistingImage,
  ] =
    useState(false);

  const [
    dayPickerOpen,
    setDayPickerOpen,
  ] =
    useState(false);

  const [
    stopPickerOpen,
    setStopPickerOpen,
  ] =
    useState(false);

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  useEffect(
    () => {
      setMemories(
        workspace.memories,
      );
    },
    [workspace.memories],
  );

  const groups =
    useMemo(
      () =>
        buildGroups(
          memories,
          workspace.days,
        ),
      [
        memories,
        workspace.days,
      ],
    );

  const photoCount =
    memories.filter(
      (memory) =>
        memory.type === 'photo',
    ).length;

  const noteCount =
    memories.filter(
      (memory) =>
        memory.type === 'note',
    ).length;

  const selectedDay =
    dayId
      ? workspace.days.find(
          (day) =>
            day.id === dayId,
        )
      : undefined;

  const selectedStop =
    stopId
      ? workspace.stops.find(
          (stop) =>
            stop.id === stopId,
        )
      : undefined;

  const visibleImageUri =
    type === 'photo'
      ? (
          pendingImage?.uri ??
          (
            !removeExistingImage
              ? editing?.mediaUri
              : undefined
          )
        )
      : undefined;

  const destinationLabel =
    tripDestinationLabel(
      workspace.trip.destinations,
    );

  const resetEditor = () => {
    setEditing(null);
    setType('note');
    setTitle('');
    setCaption('');
    setDayId(undefined);
    setStopId(undefined);
    setPendingImage(null);
    setRemoveExistingImage(false);
    setDayPickerOpen(false);
    setStopPickerOpen(false);
  };

  const closeEditor = () => {
    if (isSaving) {
      return;
    }

    setModalVisible(false);
    resetEditor();
  };

  const openCreate = (
    nextType:
      EditableMemoryType =
        'note',
  ) => {
    resetEditor();
    setType(nextType);
    setModalVisible(true);
  };

  const openEdit = (
    memory: Memory,
  ) => {
    if (
      memory.type === 'video'
    ) {
      Alert.alert(
        'Video memories',
        'Video editing is not part of Memories V1 yet.',
      );
      return;
    }

    setEditing(memory);
    setType(memory.type);
    setTitle(
      memory.title ?? '',
    );
    setCaption(
      memory.caption ?? '',
    );
    setDayId(memory.dayId);
    setStopId(memory.stopId);
    setPendingImage(null);
    setRemoveExistingImage(false);
    setDayPickerOpen(false);
    setStopPickerOpen(false);
    setModalVisible(true);
  };

  const chooseDay = (
    nextDayId?: string,
  ) => {
    setDayId(nextDayId);
    setDayPickerOpen(false);

    if (
      stopId &&
      workspace.stops.find(
        (stop) =>
          stop.id === stopId,
      )?.dayId !==
        nextDayId
    ) {
      setStopId(undefined);
    }
  };

  const chooseStop = (
    stop?: TripStop,
  ) => {
    if (!stop) {
      setStopId(undefined);
      setStopPickerOpen(false);
      return;
    }

    setStopId(stop.id);
    setDayId(stop.dayId);
    setStopPickerOpen(false);
  };

  const pickFromLibrary =
    async () => {
      try {
        const result =
          await ImagePicker.launchImageLibraryAsync(
            {
              mediaTypes: ['images'],
              allowsEditing: false,
              quality: 0.9,
            },
          );

        if (
          result.canceled ||
          !result.assets[0]
        ) {
          return;
        }

        const asset =
          result.assets[0];

        setPendingImage({
          uri: asset.uri,
          fileName:
            asset.fileName,
          mimeType:
            asset.mimeType,
        });
        setRemoveExistingImage(false);
      } catch (error) {
        console.error(
          '[Memories] Library picker failed:',
          error,
        );

        Alert.alert(
          'Could not open photos',
          'Please try again.',
        );
      }
    };

  const takePhoto =
    async () => {
      try {
        const permission =
          await ImagePicker.requestCameraPermissionsAsync();

        if (!permission.granted) {
          Alert.alert(
            'Camera permission needed',
            'Allow camera access to take a photo for this memory.',
          );
          return;
        }

        const result =
          await ImagePicker.launchCameraAsync(
            {
              mediaTypes: ['images'],
              allowsEditing: false,
              quality: 0.9,
            },
          );

        if (
          result.canceled ||
          !result.assets[0]
        ) {
          return;
        }

        const asset =
          result.assets[0];

        setPendingImage({
          uri: asset.uri,
          fileName:
            asset.fileName,
          mimeType:
            asset.mimeType,
        });
        setRemoveExistingImage(false);
      } catch (error) {
        console.error(
          '[Memories] Camera failed:',
          error,
        );

        Alert.alert(
          'Could not open camera',
          'Please try again.',
        );
      }
    };

  const clearPhoto = () => {
    setPendingImage(null);
    setRemoveExistingImage(true);
  };

  const saveMemory =
    async () => {
      let stagedMediaUri:
        string | undefined;

      try {
        setIsSaving(true);

        if (
          type === 'photo' &&
          pendingImage
        ) {
          stagedMediaUri =
            await persistMemoryImage(
              pendingImage,
            );
        }

        const nextMediaUri =
          type === 'photo'
            ? (
                stagedMediaUri ??
                (
                  !removeExistingImage
                    ? editing?.mediaUri
                    : undefined
                )
              )
            : undefined;

        const saved =
          editing
            ? await memoryService.updateMemory(
                editing.id,
                {
                  dayId,
                  stopId,
                  type,
                  title,
                  caption,
                  mediaUri:
                    nextMediaUri,
                },
              )
            : await memoryService.createMemory(
                {
                  tripId,
                  dayId,
                  stopId,
                  type,
                  title,
                  caption,
                  mediaUri:
                    nextMediaUri,
                },
              );

        if (
          editing?.mediaUri &&
          editing.mediaUri !==
            saved.mediaUri
        ) {
          try {
            await deleteManagedMemoryMedia(
              editing.mediaUri,
            );
          } catch (error) {
            console.warn(
              '[Memories] Old media cleanup failed:',
              error,
            );
          }
        }

        setMemories(
          (current) => {
            const exists =
              current.some(
                (memory) =>
                  memory.id ===
                  saved.id,
              );

            const next =
              exists
                ? current.map(
                    (memory) =>
                      memory.id ===
                      saved.id
                        ? saved
                        : memory,
                  )
                : [
                    ...current,
                    saved,
                  ];

            return sortMemories(
              next,
            );
          },
        );

        setModalVisible(false);
        resetEditor();
      } catch (error) {
        if (stagedMediaUri) {
          try {
            await deleteManagedMemoryMedia(
              stagedMediaUri,
            );
          } catch {
            // A failed cleanup must not hide the
            // original save error.
          }
        }

        console.error(
          '[Memories] Save failed:',
          error,
        );

        Alert.alert(
          'Could not save memory',
          error instanceof Error
            ? error.message
            : 'Please try again.',
        );
      } finally {
        setIsSaving(false);
      }
    };

  const deleteMemory = (
    memory: Memory,
  ) => {
    Alert.alert(
      'Delete memory?',
      `Remove "${memoryTitle(memory)}" from this trip?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress:
            async () => {
              try {
                const deleted =
                  await memoryService.deleteMemory(
                    memory.id,
                  );

                setMemories(
                  (current) =>
                    current.filter(
                      (item) =>
                        item.id !==
                        memory.id,
                    ),
                );

                if (
                  deleted?.mediaUri
                ) {
                  try {
                    await deleteManagedMemoryMedia(
                      deleted.mediaUri,
                    );
                  } catch (error) {
                    console.warn(
                      '[Memories] Media cleanup failed:',
                      error,
                    );
                  }
                }
              } catch (error) {
                console.error(
                  '[Memories] Delete failed:',
                  error,
                );

                Alert.alert(
                  'Could not delete memory',
                  'Please try again.',
                );
              }
            },
        },
      ],
    );
  };

  return (
    <>
      <Screen scroll>
        <UtilityScreenHeader
          eyebrow={destinationLabel.toUpperCase()}
          title="Memories"
          subtitle="Keep the small moments that made this journey yours."
          leading={(
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to More"
              style={styles.headerButton}
              onPress={() =>
                router.back()
              }
            >
              <Ionicons
                name="arrow-back"
                size={21}
                color={colors.textPrimary}
              />
            </Pressable>
          )}
          action={(
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add memory"
              style={styles.addButton}
              onPress={() =>
                openCreate()
              }
            >
              <Ionicons
                name="add"
                size={24}
                color={colors.textInverse}
              />
            </Pressable>
          )}
        />

        <CompactSummaryStrip
          accessibilityLabel={`${memories.length} memories, ${photoCount} photos, ${noteCount} notes`}
          items={[
            {
              value:
                memories.length,
              label:
                memories.length === 1
                  ? 'memory'
                  : 'memories',
            },
            {
              value:
                photoCount,
              label:
                photoCount === 1
                  ? 'photo'
                  : 'photos',
            },
            {
              value:
                noteCount,
              label:
                noteCount === 1
                  ? 'note'
                  : 'notes',
            },
          ]}
        />

        <View style={styles.quickCapture}>
          <View style={styles.quickCaptureCopy}>
            <Text style={styles.quickEyebrow}>
              CAPTURE A MOMENT
            </Text>
            <Text style={styles.quickTitle}>
              Save it before it slips away.
            </Text>
            <Text style={styles.quickBody}>
              Add a thought or keep a photo, then connect it to the day or place it belongs to.
            </Text>
          </View>

          <View style={styles.quickActions}>
            <Pressable
              accessibilityRole="button"
              style={styles.quickAction}
              onPress={() =>
                openCreate('note')
              }
            >
              <Ionicons
                name="document-text-outline"
                size={18}
                color={colors.brand}
              />
              <Text style={styles.quickActionText}>
                Note
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={styles.quickAction}
              onPress={() =>
                openCreate('photo')
              }
            >
              <Ionicons
                name="camera-outline"
                size={18}
                color={colors.brand}
              />
              <Text style={styles.quickActionText}>
                Photo
              </Text>
            </Pressable>
          </View>
        </View>

        {memories.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="images-outline"
                size={30}
                color={colors.brand}
              />
            </View>
            <Text style={styles.emptyTitle}>
              Your travel story starts here.
            </Text>
            <Text style={styles.emptyBody}>
              Keep a note, a photo, or a small detail you want to remember later.
            </Text>
            <Pressable
              accessibilityRole="button"
              style={styles.primaryButton}
              onPress={() =>
                openCreate()
              }
            >
              <Ionicons
                name="add"
                size={19}
                color={colors.textInverse}
              />
              <Text style={styles.primaryButtonText}>
                Add first memory
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.timeline}>
            {groups.map(
              (group) => (
                <View
                  key={group.key}
                  style={styles.group}
                >
                  <Text style={styles.groupEyebrow}>
                    {group.eyebrow}
                  </Text>
                  <Text style={styles.groupTitle}>
                    {group.title}
                  </Text>

                  <View style={styles.memoryList}>
                    {group.memories.map(
                      (memory) => (
                        <MemoryCard
                          key={memory.id}
                          memory={memory}
                          day={
                            memory.dayId
                              ? workspace.days.find(
                                  (item) =>
                                    item.id ===
                                    memory.dayId,
                                )
                              : undefined
                          }
                          stop={
                            memory.stopId
                              ? workspace.stops.find(
                                  (item) =>
                                    item.id ===
                                    memory.stopId,
                                )
                              : undefined
                          }
                          onPress={() =>
                            openEdit(
                              memory,
                            )
                          }
                          onDelete={() =>
                            deleteMemory(
                              memory,
                            )
                          }
                        />
                      ),
                    )}
                  </View>
                </View>
              ),
            )}
          </View>
        )}

        <View style={styles.localNote}>
          <Ionicons
            name="phone-portrait-outline"
            size={18}
            color={colors.brass}
          />
          <Text style={styles.localNoteText}>
            Memories and their saved photos stay in TravelOS app storage on this device.
          </Text>
        </View>

        <View style={styles.bottomSpace} />
      </Screen>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeEditor}
      >
        <View style={styles.modalRoot}>
          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderCopy}>
                <Text style={styles.modalEyebrow}>
                  {editing
                    ? 'EDIT MOMENT'
                    : 'NEW MOMENT'}
                </Text>
                <Text style={styles.modalTitle}>
                  {editing
                    ? 'Memory details'
                    : 'Keep this moment'}
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close memory editor"
                style={styles.closeButton}
                onPress={closeEditor}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={colors.textPrimary}
                />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>
              TYPE
            </Text>

            <View style={styles.typeGrid}>
              <TypeChoice
                type="note"
                selected={
                  type === 'note'
                }
                onPress={() =>
                  setType('note')
                }
              />
              <TypeChoice
                type="photo"
                selected={
                  type === 'photo'
                }
                onPress={() =>
                  setType('photo')
                }
              />
            </View>

            {type === 'photo' && (
              <View style={styles.photoSection}>
                {visibleImageUri ? (
                  <Image
                    source={{
                      uri:
                        visibleImageUri,
                    }}
                    resizeMode="cover"
                    style={styles.photoPreview}
                  />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons
                      name="image-outline"
                      size={30}
                      color={colors.textMuted}
                    />
                    <Text style={styles.photoPlaceholderTitle}>
                      Add a photo
                    </Text>
                    <Text style={styles.photoPlaceholderBody}>
                      Take one now or choose one you already have.
                    </Text>
                  </View>
                )}

                <View style={styles.photoActions}>
                  <Pressable
                    accessibilityRole="button"
                    style={styles.photoAction}
                    onPress={() =>
                      void takePhoto()
                    }
                  >
                    <Ionicons
                      name="camera-outline"
                      size={18}
                      color={colors.brand}
                    />
                    <Text style={styles.photoActionText}>
                      Camera
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    style={styles.photoAction}
                    onPress={() =>
                      void pickFromLibrary()
                    }
                  >
                    <Ionicons
                      name="images-outline"
                      size={18}
                      color={colors.brand}
                    />
                    <Text style={styles.photoActionText}>
                      Library
                    </Text>
                  </Pressable>

                  {visibleImageUri && (
                    <Pressable
                      accessibilityRole="button"
                      style={styles.photoRemoveAction}
                      onPress={clearPhoto}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={colors.coral}
                      />
                    </Pressable>
                  )}
                </View>
              </View>
            )}

            <Field
              label="TITLE"
              value={title}
              onChangeText={setTitle}
              placeholder={
                type === 'photo'
                  ? 'Sunset in Oia'
                  : 'A small thing worth remembering'
              }
            />

            <Field
              label={
                type === 'photo'
                  ? 'CAPTION'
                  : 'NOTE'
              }
              value={caption}
              onChangeText={setCaption}
              placeholder={
                type === 'photo'
                  ? 'What made this moment special?'
                  : 'Write what you want to remember…'
              }
              multiline
            />

            <Text style={styles.fieldLabel}>
              TRIP DAY
            </Text>

            <PickerSummary
              icon="calendar-outline"
              label={
                selectedDay
                  ? `Day ${selectedDay.dayNumber} · ${formatDayDate(selectedDay.date)}`
                  : 'No day selected'
              }
              expanded={dayPickerOpen}
              onPress={() =>
                setDayPickerOpen(
                  (current) =>
                    !current,
                )
              }
            />

            {dayPickerOpen && (
              <View style={styles.choiceList}>
                <ChoiceRow
                  title="No trip day"
                  selected={
                    !dayId
                  }
                  onPress={() =>
                    chooseDay(
                      undefined,
                    )
                  }
                />

                {workspace.days
                  .slice()
                  .sort(
                    (a, b) =>
                      a.dayNumber -
                      b.dayNumber,
                  )
                  .map(
                    (day) => (
                      <ChoiceRow
                        key={day.id}
                        title={`Day ${day.dayNumber}`}
                        meta={formatDayDate(day.date)}
                        selected={
                          dayId ===
                          day.id
                        }
                        onPress={() =>
                          chooseDay(
                            day.id,
                          )
                        }
                      />
                    ),
                  )}
              </View>
            )}

            <Text style={styles.fieldLabel}>
              PLACE / MOMENT
            </Text>

            <PickerSummary
              icon="location-outline"
              label={
                selectedStop
                  ? selectedStop.title
                  : 'No itinerary stop'
              }
              meta={
                selectedStop
                  ? dayForStopLabel(
                      selectedStop,
                      workspace.days,
                    )
                  : 'Optional'
              }
              expanded={stopPickerOpen}
              onPress={() =>
                setStopPickerOpen(
                  (current) =>
                    !current,
                )
              }
            />

            {stopPickerOpen && (
              <View style={styles.choiceList}>
                <ChoiceRow
                  title="No itinerary stop"
                  selected={
                    !stopId
                  }
                  onPress={() =>
                    chooseStop(
                      undefined,
                    )
                  }
                />

                {workspace.stops
                  .slice()
                  .sort(
                    (a, b) => {
                      const dayA =
                        workspace.days.find(
                          (day) =>
                            day.id ===
                            a.dayId,
                        )
                          ?.dayNumber ??
                        Number.MAX_SAFE_INTEGER;
                      const dayB =
                        workspace.days.find(
                          (day) =>
                            day.id ===
                            b.dayId,
                        )
                          ?.dayNumber ??
                        Number.MAX_SAFE_INTEGER;

                      if (
                        dayA !== dayB
                      ) {
                        return (
                          dayA -
                          dayB
                        );
                      }

                      return (
                        a.order -
                        b.order
                      );
                    },
                  )
                  .map(
                    (stop) => (
                      <ChoiceRow
                        key={stop.id}
                        title={stop.title}
                        meta={dayForStopLabel(
                          stop,
                          workspace.days,
                        )}
                        selected={
                          stopId ===
                          stop.id
                        }
                        onPress={() =>
                          chooseStop(
                            stop,
                          )
                        }
                      />
                    ),
                  )}
              </View>
            )}

            <View style={styles.captureTruth}>
              <Ionicons
                name="time-outline"
                size={18}
                color={colors.brass}
              />
              <Text style={styles.captureTruthText}>
                New memories are timestamped when you save them. Day and stop links keep them in the right place in your journey.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              style={[
                styles.saveButton,
                isSaving &&
                  styles.disabled,
              ]}
              onPress={() =>
                void saveMemory()
              }
            >
              <Text style={styles.saveButtonText}>
                {isSaving
                  ? 'Saving…'
                  : editing
                    ? 'Save changes'
                    : 'Save memory'}
              </Text>
            </Pressable>

            <View style={styles.modalBottomSpace} />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function MemoryCard({
  memory,
  day,
  stop,
  onPress,
  onDelete,
}: {
  memory: Memory;
  day?: TripDay;
  stop?: TripStop;
  onPress(): void;
  onDelete(): void;
}) {
  return (
    <View style={styles.memoryCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${memoryTitle(memory)}`}
        style={({ pressed }) => [
          styles.memoryPressable,
          pressed &&
            styles.pressed,
        ]}
        onPress={onPress}
      >
        {memory.type === 'photo' &&
        memory.mediaUri ? (
          <Image
            source={{
              uri: memory.mediaUri,
            }}
            resizeMode="cover"
            style={styles.memoryImage}
          />
        ) : (
          <View style={styles.memoryIconPanel}>
            <Ionicons
              name={memoryIcon(
                memory.type,
              )}
              size={25}
              color={colors.brand}
            />
          </View>
        )}

        <View style={styles.memoryCopy}>
          <View style={styles.memoryMetaRow}>
            <Text style={styles.memoryType}>
              {memory.type.toUpperCase()}
            </Text>
            <Text style={styles.memoryTime}>
              {formatCapturedAt(
                memory.capturedAt,
              )}
            </Text>
          </View>

          <Text style={styles.memoryTitle}>
            {memoryTitle(memory)}
          </Text>

          {memory.caption && (
            <Text
              numberOfLines={3}
              style={styles.memoryCaption}
            >
              {memory.caption}
            </Text>
          )}

          {(day || stop) && (
            <View style={styles.contextRow}>
              <Ionicons
                name="location-outline"
                size={14}
                color={colors.teal}
              />
              <Text
                numberOfLines={1}
                style={styles.contextText}
              >
                {day
                  ? `Day ${day.dayNumber}`
                  : ''}
                {day && stop
                  ? ' · '
                  : ''}
                {stop?.title ?? ''}
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${memoryTitle(memory)}`}
        hitSlop={10}
        style={styles.deleteButton}
        onPress={onDelete}
      >
        <Ionicons
          name="trash-outline"
          size={17}
          color={colors.textMuted}
        />
      </Pressable>
    </View>
  );
}

function TypeChoice({
  type,
  selected,
  onPress,
}: {
  type: EditableMemoryType;
  selected: boolean;
  onPress(): void;
}) {
  const photo =
    type === 'photo';

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{
        checked: selected,
      }}
      style={[
        styles.typeChoice,
        selected &&
          styles.typeChoiceSelected,
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={
          photo
            ? 'camera-outline'
            : 'document-text-outline'
        }
        size={19}
        color={
          selected
            ? colors.textInverse
            : colors.teal
        }
      />
      <Text
        style={[
          styles.typeChoiceText,
          selected &&
            styles.typeChoiceTextSelected,
        ]}
      >
        {photo
          ? 'Photo'
          : 'Note'}
      </Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText(
    value: string,
  ): void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={
          colors.textMuted
        }
        multiline={multiline}
        textAlignVertical={
          multiline
            ? 'top'
            : 'center'
        }
        style={[
          styles.input,
          multiline &&
            styles.inputMultiline,
        ]}
      />
    </View>
  );
}

function PickerSummary({
  icon,
  label,
  meta,
  expanded,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  meta?: string;
  expanded: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        expanded,
      }}
      style={styles.pickerSummary}
      onPress={onPress}
    >
      <View style={styles.pickerIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={colors.teal}
        />
      </View>

      <View style={styles.pickerCopy}>
        <Text
          numberOfLines={1}
          style={styles.pickerTitle}
        >
          {label}
        </Text>
        {meta && (
          <Text style={styles.pickerMeta}>
            {meta}
          </Text>
        )}
      </View>

      <Ionicons
        name={
          expanded
            ? 'chevron-up'
            : 'chevron-down'
        }
        size={18}
        color={colors.textMuted}
      />
    </Pressable>
  );
}

function ChoiceRow({
  title,
  meta,
  selected,
  onPress,
}: {
  title: string;
  meta?: string;
  selected: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{
        checked: selected,
      }}
      style={[
        styles.choiceRow,
        selected &&
          styles.choiceRowSelected,
      ]}
      onPress={onPress}
    >
      <View style={styles.choiceCopy}>
        <Text style={styles.choiceTitle}>
          {title}
        </Text>
        {meta && (
          <Text style={styles.choiceMeta}>
            {meta}
          </Text>
        )}
      </View>

      {selected && (
        <Ionicons
          name="checkmark-circle"
          size={20}
          color={colors.teal}
        />
      )}
    </Pressable>
  );
}

function dayForStopLabel(
  stop: TripStop,
  days: TripDay[],
): string {
  const day =
    days.find(
      (item) =>
        item.id === stop.dayId,
    );

  if (!day) {
    return 'Trip moment';
  }

  return `Day ${day.dayNumber} · ${formatDayDate(day.date)}`;
}

const styles = StyleSheet.create({
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  addButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    ...shadows.subtle,
  },
  quickCapture: {
    marginTop: spacing[5],
    padding: spacing[5],
    borderRadius: radius.xl,
    backgroundColor: colors.brand,
    ...shadows.card,
  },
  quickCaptureCopy: {
    maxWidth: 360,
  },
  quickEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.5,
    color: '#D4C29F',
  },
  quickTitle: {
    marginTop: spacing[2],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textInverse,
  },
  quickBody: {
    marginTop: spacing[2],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: '#DCE7E3',
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[4],
  },
  quickAction: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  quickActionText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.brand,
  },
  emptyCard: {
    marginTop: spacing[6],
    alignItems: 'center',
    padding: spacing[6],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
  },
  emptyTitle: {
    marginTop: spacing[4],
    textAlign: 'center',
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    color: colors.textPrimary,
  },
  emptyBody: {
    marginTop: spacing[2],
    maxWidth: 330,
    textAlign: 'center',
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
  },
  primaryButton: {
    minHeight: 48,
    marginTop: spacing[5],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[5],
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
  },
  primaryButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textInverse,
  },
  timeline: {
    marginTop: spacing[7],
    gap: spacing[8],
  },
  group: {
    gap: spacing[2],
  },
  groupEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.5,
    color: colors.brass,
  },
  groupTitle: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    color: colors.textPrimary,
  },
  memoryList: {
    gap: spacing[3],
    marginTop: spacing[2],
  },
  memoryCard: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadows.subtle,
  },
  memoryPressable: {
    flexDirection: 'row',
    minHeight: 118,
  },
  memoryImage: {
    width: 116,
    alignSelf: 'stretch',
    backgroundColor: colors.backgroundSoft,
  },
  memoryIconPanel: {
    width: 84,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandSoft,
  },
  memoryCopy: {
    flex: 1,
    padding: spacing[4],
    paddingRight: spacing[8],
  },
  memoryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  memoryType: {
    fontFamily: fontFamily.sansBold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: colors.brass,
  },
  memoryTime: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.micro,
    color: colors.textMuted,
  },
  memoryTitle: {
    marginTop: spacing[2],
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  memoryCaption: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[3],
  },
  contextText: {
    flex: 1,
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.micro,
    color: colors.teal,
  },
  deleteButton: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceWarm,
  },
  localNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginTop: spacing[7],
    padding: spacing[4],
    borderRadius: radius.md,
    backgroundColor: colors.brassSoft,
  },
  localNoteText: {
    flex: 1,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalContent: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  modalHeaderCopy: {
    flex: 1,
  },
  modalEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.5,
    color: colors.brass,
  },
  modalTitle: {
    marginTop: spacing[1],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.title,
    color: colors.textPrimary,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  field: {
    marginTop: spacing[5],
  },
  fieldLabel: {
    marginTop: spacing[5],
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
    backgroundColor: colors.surface,
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  inputMultiline: {
    minHeight: 118,
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
  },
  typeGrid: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  typeChoice: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  typeChoiceSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  typeChoiceText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  typeChoiceTextSelected: {
    color: colors.textInverse,
  },
  photoSection: {
    marginTop: spacing[4],
  },
  photoPreview: {
    width: '100%',
    height: 230,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundSoft,
  },
  photoPlaceholder: {
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[5],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceWarm,
  },
  photoPlaceholderTitle: {
    marginTop: spacing[3],
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  photoPlaceholderBody: {
    marginTop: spacing[1],
    textAlign: 'center',
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  photoAction: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  photoActionText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.caption,
    color: colors.brand,
  },
  photoRemoveAction: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  pickerSummary: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  pickerIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.tealSoft,
  },
  pickerCopy: {
    flex: 1,
  },
  pickerTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  pickerMeta: {
    marginTop: 2,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.micro,
    color: colors.textMuted,
  },
  choiceList: {
    overflow: 'hidden',
    marginTop: spacing[2],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  choiceRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  choiceRowSelected: {
    backgroundColor: colors.tealSoft,
  },
  choiceCopy: {
    flex: 1,
  },
  choiceTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  choiceMeta: {
    marginTop: 2,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.micro,
    color: colors.textMuted,
  },
  captureTruth: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginTop: spacing[6],
    padding: spacing[4],
    borderRadius: radius.md,
    backgroundColor: colors.brassSoft,
  },
  captureTruthText: {
    flex: 1,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  saveButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[5],
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
  },
  saveButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
    color: colors.textInverse,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.72,
  },
  bottomSpace: {
    height: spacing[16],
  },
  modalBottomSpace: {
    height: spacing[10],
  },
});
