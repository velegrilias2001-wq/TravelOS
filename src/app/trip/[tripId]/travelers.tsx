import { Ionicons } from '@expo/vector-icons';
import {
  useFocusEffect,
} from 'expo-router';
import {
  useCallback,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
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
  Traveler,
  TravelerType,
} from '@/domain/entities';
import {
  useTripWorkspace,
  useTripWorkspaceFocusRefresh,
} from '@/features/trip-workspace/trip-workspace-context';
import {
  tripDestinationLabel,
} from '@/services/destination-authoring';
import {
  TRAVELER_TYPES,
  travelerDisplayName,
  travelerInitials,
  type TravelerInput,
} from '@/services/traveler-details';
import {
  travelerService,
} from '@/services/traveler-service';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  shadows,
  spacing,
} from '@/theme';

type EditorMode =
  | 'choose'
  | 'create'
  | 'edit';

type LibraryStatus =
  | 'loading'
  | 'ready'
  | 'error';

const TYPE_DETAILS: Record<
  TravelerType,
  {
    label: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  adult: {
    label: 'Adult',
    description: 'Adult traveler',
    icon: 'person-outline',
  },
  child: {
    label: 'Child',
    description: 'Child traveler',
    icon: 'happy-outline',
  },
  infant: {
    label: 'Infant',
    description: 'Infant traveler',
    icon: 'heart-outline',
  },
};

export default function TravelersScreen() {
  const { workspace, actions } =
    useTripWorkspace();

  useTripWorkspaceFocusRefresh();

  const [library, setLibrary] = useState<
    Traveler[]
  >([]);
  const [libraryStatus, setLibraryStatus] =
    useState<LibraryStatus>('loading');
  const [modalVisible, setModalVisible] =
    useState(false);
  const [editorMode, setEditorMode] =
    useState<EditorMode>('choose');
  const [editing, setEditing] =
    useState<Traveler | null>(null);
  const [firstName, setFirstName] =
    useState('');
  const [lastName, setLastName] =
    useState('');
  const [type, setType] =
    useState<TravelerType>('adult');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] =
    useState(false);

  const loadLibrary = useCallback(
    async () => {
      try {
        setLibraryStatus('loading');
        setLibrary(
          await travelerService.listTravelers(),
        );
        setLibraryStatus('ready');
      } catch (error) {
        console.error(
          '[Travelers] Library load failed:',
          error,
        );
        setLibraryStatus('error');
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void loadLibrary();
    }, [loadLibrary]),
  );

  const memberIds = new Set(
    workspace.travelers.map(
      (traveler) => traveler.id,
    ),
  );
  const availableTravelers = library.filter(
    (traveler) => !memberIds.has(traveler.id),
  );

  const resetForm = () => {
    setEditing(null);
    setFirstName('');
    setLastName('');
    setType('adult');
    setEmail('');
    setPhone('');
  };

  const openAdd = () => {
    resetForm();
    setEditorMode('choose');
    setModalVisible(true);
  };

  const openCreate = () => {
    resetForm();
    setEditorMode('create');
  };

  const openEdit = (traveler: Traveler) => {
    setEditing(traveler);
    setFirstName(traveler.firstName);
    setLastName(traveler.lastName ?? '');
    setType(traveler.type);
    setEmail(traveler.email ?? '');
    setPhone(traveler.phone ?? '');
    setEditorMode('edit');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    resetForm();
    setEditorMode('choose');
  };

  const buildInput = (): TravelerInput => ({
    firstName,
    lastName,
    type,
    email,
    phone,
  });

  const saveTraveler = async () => {
    try {
      setIsSaving(true);

      if (editing) {
        await actions.updateTraveler(
          editing.id,
          buildInput(),
        );
      } else {
        await actions.createTraveler(
          buildInput(),
        );
      }

      await loadLibrary();
      closeModal();
    } catch (error) {
      Alert.alert(
        editing
          ? 'Could not update traveler'
          : 'Could not create traveler',
        error instanceof Error
          ? error.message
          : 'Your saved data has not changed. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const addExisting = async (
    traveler: Traveler,
  ) => {
    try {
      setIsSaving(true);
      await actions.addExistingTraveler(
        traveler.id,
      );
      await loadLibrary();
      closeModal();
    } catch (error) {
      Alert.alert(
        'Could not add traveler',
        error instanceof Error
          ? error.message
          : 'Your saved data has not changed. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const removeTraveler = (
    traveler: Traveler,
  ) => {
    Alert.alert(
      'Remove from this trip?',
      `${travelerDisplayName(traveler)} will be removed from this trip. They will remain available in your other trips.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          onPress: async () => {
            try {
              await actions.removeTraveler(
                traveler.id,
              );
              await loadLibrary();
            } catch (error) {
              console.error(
                '[Travelers] Remove failed:',
                error,
              );
              Alert.alert(
                'Could not remove traveler',
                'Nothing changed. Please try again.',
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
          eyebrow={tripDestinationLabel(
            workspace.trip.destinations,
          ).toUpperCase()}
          title="Travelers"
          subtitle="The people joining this trip."
          action={(
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add traveler"
              style={styles.addButton}
              onPress={openAdd}
            >
              <Ionicons
                name="person-add-outline"
                size={22}
                color={colors.textInverse}
              />
            </Pressable>
          )}
        />

        {workspace.travelers.length > 0 ? (
          <CompactSummaryStrip
            accessibilityLabel={`${workspace.travelers.length} ${workspace.travelers.length === 1 ? 'traveler' : 'travelers'} in this trip`}
            items={[
              {
                value: workspace.travelers.length,
                label:
                  workspace.travelers.length === 1
                    ? 'traveler'
                    : 'travelers',
              },
            ]}
          />
        ) : null}

        {workspace.travelers.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="people-outline"
                size={29}
                color={colors.brand}
              />
            </View>
            <Text style={styles.emptyTitle}>
              Who is taking this trip?
            </Text>
            <Text style={styles.emptyBody}>
              Add someone new or choose a traveler you have saved before.
            </Text>
            <Pressable
              accessibilityRole="button"
              style={styles.primaryButton}
              onPress={openAdd}
            >
              <Text style={styles.primaryButtonText}>
                Add traveler
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {workspace.travelers.map(
              (traveler) => {
                const details =
                  TYPE_DETAILS[traveler.type] ??
                  TYPE_DETAILS.adult;

                return (
                  <View
                    key={traveler.id}
                    style={styles.travelerCard}
                  >
                    <View style={styles.travelerTop}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {travelerInitials(traveler) || 'T'}
                        </Text>
                      </View>
                      <View style={styles.travelerCopy}>
                        <Text style={styles.typeLabel}>
                          {details.label.toUpperCase()}
                        </Text>
                        <Text style={styles.travelerName}>
                          {travelerDisplayName(traveler)}
                        </Text>
                      </View>
                      <View style={styles.memberBadge}>
                        <Ionicons
                          name="checkmark"
                          size={13}
                          color={colors.teal}
                        />
                        <Text style={styles.memberBadgeText}>
                          IN TRIP
                        </Text>
                      </View>
                    </View>

                    {(traveler.email || traveler.phone) && (
                      <View style={styles.contactBlock}>
                        {traveler.email && (
                          <ContactRow
                            icon="mail-outline"
                            value={traveler.email}
                          />
                        )}
                        {traveler.phone && (
                          <ContactRow
                            icon="call-outline"
                            value={traveler.phone}
                          />
                        )}
                      </View>
                    )}

                    <View style={styles.cardActions}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${travelerDisplayName(traveler)}`}
                        style={styles.editAction}
                        onPress={() => openEdit(traveler)}
                      >
                        <Ionicons
                          name="create-outline"
                          size={17}
                          color={colors.brand}
                        />
                        <Text style={styles.editActionText}>
                          Edit
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${travelerDisplayName(traveler)} from this trip`}
                        style={styles.removeAction}
                        onPress={() =>
                          removeTraveler(traveler)
                        }
                      >
                        <Ionicons
                          name="unlink-outline"
                          size={17}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.removeActionText}>
                          Remove from trip
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              },
            )}
          </View>
        )}

        <View style={styles.privacyNote}>
          <Ionicons
            name="shield-checkmark-outline"
            size={17}
            color={colors.textMuted}
          />
          <Text style={styles.privacyNoteText}>
            Keep passport and health information out of traveler profiles.
          </Text>
        </View>
        <View style={styles.bottomSpace} />
      </Screen>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <View style={styles.modalRoot}>
          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderCopy}>
                <Text style={styles.modalEyebrow}>
                  {editorMode === 'choose'
                    ? 'ADD TO THIS TRIP'
                    : 'TRAVELER'}
                </Text>
                <Text style={styles.modalTitle}>
                  {editorMode === 'choose'
                    ? 'Add traveler'
                    : editorMode === 'edit'
                      ? 'Edit traveler'
                      : 'New traveler'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close traveler editor"
                style={styles.closeButton}
                onPress={closeModal}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={colors.textPrimary}
                />
              </Pressable>
            </View>

            {editorMode === 'choose' ? (
              <TravelerChooser
                travelers={availableTravelers}
                status={libraryStatus}
                disabled={isSaving}
                onCreate={openCreate}
                onAdd={(traveler) =>
                  void addExisting(traveler)
                }
                onRetry={() => void loadLibrary()}
              />
            ) : (
              <>
                {editorMode === 'edit' && (
                  <View style={styles.sharedTruthNote}>
                    <Ionicons
                      name="git-network-outline"
                      size={19}
                      color={colors.teal}
                    />
                    <Text style={styles.sharedTruthText}>
                      Changes to this traveler will appear in their other trips too.
                    </Text>
                  </View>
                )}

                <Text style={styles.fieldLabel}>
                  TRAVELER TYPE
                </Text>
                <View style={styles.typeGrid}>
                  {TRAVELER_TYPES.map((item) => {
                    const selected = type === item;
                    const details = TYPE_DETAILS[item];

                    return (
                      <Pressable
                        key={item}
                        accessibilityRole="radio"
                        accessibilityState={{
                          checked: selected,
                        }}
                        style={[
                          styles.typeChoice,
                          selected &&
                            styles.typeChoiceSelected,
                        ]}
                        onPress={() => setType(item)}
                      >
                        <Ionicons
                          name={details.icon}
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
                          {details.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Field
                  label="FIRST NAME"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Required"
                  autoCapitalize="words"
                  textContentType="givenName"
                />
                <Field
                  label="LAST NAME"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Optional"
                  autoCapitalize="words"
                  textContentType="familyName"
                />
                <Field
                  label="EMAIL"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Optional"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />
                <Field
                  label="PHONE"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Optional"
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                />

                <View style={styles.dataBoundary}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={colors.brass}
                  />
                  <Text style={styles.dataBoundaryText}>
                    Only add the contact details you need for the trip.
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  disabled={isSaving}
                  style={[
                    styles.saveButton,
                    isSaving && styles.disabled,
                  ]}
                  onPress={() => void saveTraveler()}
                >
                  <Text style={styles.saveButtonText}>
                    {isSaving
                      ? 'Saving…'
                      : editorMode === 'edit'
                        ? 'Save changes'
                        : 'Create and add to trip'}
                  </Text>
                  {!isSaving && (
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={colors.textInverse}
                    />
                  )}
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function TravelerChooser({
  travelers,
  status,
  disabled,
  onCreate,
  onAdd,
  onRetry,
}: {
  travelers: Traveler[];
  status: LibraryStatus;
  disabled: boolean;
  onCreate(): void;
  onAdd(traveler: Traveler): void;
  onRetry(): void;
}) {
  return (
    <>
      <Pressable
        accessibilityRole="button"
        style={styles.newTravelerChoice}
        onPress={onCreate}
      >
        <View style={styles.newTravelerIcon}>
          <Ionicons
            name="person-add-outline"
            size={21}
            color={colors.textInverse}
          />
        </View>
        <View style={styles.choiceCopy}>
          <Text style={styles.newTravelerTitle}>
            Create a new traveler
          </Text>
          <Text style={styles.newTravelerMeta}>
            Add someone new to this trip
          </Text>
        </View>
        <Ionicons
          name="arrow-forward"
          size={18}
          color={colors.brand}
        />
      </Pressable>

      <View style={styles.libraryHeader}>
        <Text style={styles.fieldLabel}>
          SAVED TRAVELERS
        </Text>
        <Text style={styles.libraryHint}>Choose someone you’ve added before</Text>
      </View>

      {status === 'loading' ? (
        <View style={styles.libraryState}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.libraryStateText}>
            Loading saved travelers…
          </Text>
        </View>
      ) : status === 'error' ? (
        <View style={styles.libraryState}>
          <Ionicons
            name="warning-outline"
            size={22}
            color={colors.brass}
          />
          <Text style={styles.libraryStateText}>
            Saved travelers could not be loaded. You can still create a new traveler.
          </Text>
          <Pressable
            accessibilityRole="button"
            style={styles.retryButton}
            onPress={onRetry}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : travelers.length === 0 ? (
        <View style={styles.libraryState}>
          <Ionicons
            name="albums-outline"
            size={22}
            color={colors.textMuted}
          />
          <Text style={styles.libraryStateText}>
            No other saved travelers are available.
          </Text>
        </View>
      ) : (
        <View style={styles.libraryList}>
          {travelers.map((traveler) => (
            <Pressable
              key={traveler.id}
              accessibilityRole="button"
              accessibilityLabel={`Add ${travelerDisplayName(traveler)} to this trip`}
              disabled={disabled}
              style={styles.libraryRow}
              onPress={() => onAdd(traveler)}
            >
              <View style={styles.libraryAvatar}>
                <Text style={styles.libraryAvatarText}>
                  {travelerInitials(traveler) || 'T'}
                </Text>
              </View>
              <View style={styles.choiceCopy}>
                <Text style={styles.libraryName}>
                  {travelerDisplayName(traveler)}
                </Text>
                <Text style={styles.libraryMeta}>
                  {TYPE_DETAILS[traveler.type]?.description ??
                    'Saved traveler'}
                </Text>
              </View>
              <View style={styles.addExistingBadge}>
                <Ionicons
                  name="add"
                  size={17}
                  color={colors.teal}
                />
              </View>
            </Pressable>
          ))}
        </View>
      )}

    </>
  );
}

function ContactRow({
  icon,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
}) {
  return (
    <View style={styles.contactRow}>
      <Ionicons
        name={icon}
        size={15}
        color={colors.textMuted}
      />
      <Text
        numberOfLines={1}
        style={styles.contactText}
      >
        {value}
      </Text>
    </View>
  );
}

function Field({
  label,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
    ...shadows.subtle,
  },
  emptyCard: {
    alignItems: 'flex-start',
    padding: spacing[5],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.subtle,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
  },
  emptyTitle: {
    marginTop: spacing[4],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    color: colors.textPrimary,
  },
  emptyBody: {
    marginTop: spacing[2],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
  },
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
    marginTop: spacing[4],
    borderRadius: radius.md,
    backgroundColor: colors.brand,
  },
  primaryButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textInverse,
  },
  list: {
    gap: spacing[4],
  },
  travelerCard: {
    padding: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  travelerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
  },
  avatarText: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    color: colors.textInverse,
  },
  travelerCopy: {
    flex: 1,
    marginLeft: spacing[4],
  },
  typeLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1,
    color: colors.brass,
  },
  travelerName: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  memberBadge: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing[2],
    borderRadius: radius.pill,
    backgroundColor: colors.tealSoft,
  },
  memberBadgeText: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    color: colors.teal,
  },
  contactBlock: {
    gap: spacing[2],
    marginTop: spacing[4],
    padding: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.surfaceWarm,
  },
  contactRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  contactText: {
    flex: 1,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  editAction: {
    minHeight: 46,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
  },
  editActionText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.caption,
    color: colors.brand,
  },
  removeAction: {
    minHeight: 46,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  removeActionText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginTop: spacing[5],
    paddingHorizontal: spacing[1],
  },
  privacyNoteText: {
    flex: 1,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
  },
  bottomSpace: {
    height: spacing[16],
  },
  modalRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalContent: {
    padding: spacing[6],
    paddingBottom: spacing[16],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing[8],
  },
  modalHeaderCopy: {
    flex: 1,
    paddingRight: spacing[4],
  },
  modalEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.5,
    color: colors.brass,
  },
  modalTitle: {
    marginTop: spacing[2],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.title,
    color: colors.textPrimary,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  newTravelerChoice: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  newTravelerIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.brand,
  },
  choiceCopy: {
    flex: 1,
  },
  newTravelerTitle: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  newTravelerMeta: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  libraryHeader: {
    gap: spacing[1],
    marginTop: spacing[8],
  },
  libraryHint: {
    marginBottom: spacing[3],
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  libraryState: {
    minHeight: 128,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    padding: spacing[5],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  libraryStateText: {
    maxWidth: 420,
    textAlign: 'center',
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  retryButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
  },
  retryText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.caption,
    color: colors.brand,
  },
  libraryList: {
    gap: spacing[2],
  },
  libraryRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  libraryAvatar: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.tealSoft,
  },
  libraryAvatarText: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.body,
    color: colors.teal,
  },
  libraryName: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  libraryMeta: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  addExistingBadge: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.tealSoft,
  },
  sharedTruthNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    padding: spacing[4],
    marginBottom: spacing[6],
    borderRadius: radius.md,
    backgroundColor: colors.tealSoft,
  },
  sharedTruthText: {
    flex: 1,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  field: {
    marginTop: spacing[5],
  },
  fieldLabel: {
    marginBottom: spacing[2],
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.2,
    color: colors.textMuted,
  },
  input: {
    minHeight: 54,
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  typeGrid: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  typeChoice: {
    minHeight: 76,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    padding: spacing[2],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeChoiceSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  typeChoiceText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.micro,
    color: colors.textSecondary,
  },
  typeChoiceTextSelected: {
    color: colors.textInverse,
  },
  dataBoundary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    marginTop: spacing[6],
    padding: spacing[4],
    borderRadius: radius.md,
    backgroundColor: colors.brassSoft,
  },
  dataBoundaryText: {
    flex: 1,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  saveButton: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    marginTop: spacing[7],
    borderRadius: radius.md,
    backgroundColor: colors.brand,
  },
  saveButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textInverse,
  },
  disabled: {
    opacity: 0.55,
  },
});
