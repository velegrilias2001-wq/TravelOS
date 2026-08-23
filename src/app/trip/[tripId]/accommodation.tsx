import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';
import type {
  Accommodation,
  AccommodationType,
} from '@/domain/entities';
import {
  useTripWorkspace,
  useTripWorkspaceFocusRefresh,
} from '@/features/trip-workspace/trip-workspace-context';
import {
  ACCOMMODATION_TYPES,
  combineAccommodationDateTime,
  splitAccommodationDateTime,
  type AccommodationInput,
} from '@/services/accommodation-details';
import {
  buildItineraryStopContexts,
} from '@/services/booking-stop-relationship';
import {
  tripDestinationLabel,
} from '@/services/destination-authoring';
import {
  calendarDateFromPickerValue,
  formatCalendarDateForDisplay,
  localTimeFromPickerValue,
  pickerValueFromLocalDateTime,
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

type PickerTarget =
  | 'checkInDate'
  | 'checkInTime'
  | 'checkOutDate'
  | 'checkOutTime';

const TYPE_DETAILS: Record<
  AccommodationType,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  hotel: {
    label: 'Hotel',
    icon: 'business-outline',
  },
  apartment: {
    label: 'Apartment',
    icon: 'home-outline',
  },
  hostel: {
    label: 'Hostel',
    icon: 'bed-outline',
  },
  villa: {
    label: 'Villa',
    icon: 'sunny-outline',
  },
  resort: {
    label: 'Resort',
    icon: 'water-outline',
  },
  camping: {
    label: 'Camping',
    icon: 'bonfire-outline',
  },
  other: {
    label: 'Other',
    icon: 'key-outline',
  },
};

function formatDate(value: string): string {
  return formatCalendarDateForDisplay(value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatStayDateTime(
  value: string | undefined,
): string {
  const parts = splitAccommodationDateTime(value);

  return parts
    ? `${formatDate(parts.date)} · ${parts.time}`
    : 'Not set';
}

function formatStopDate(value: string): string {
  return formatDate(value).replace(
    / \d{4}$/,
    '',
  );
}

export default function AccommodationScreen() {
  const router = useRouter();
  const routeParams = useLocalSearchParams<{
    accommodationId?: string | string[];
  }>();
  const requestedAccommodationId = Array.isArray(
    routeParams.accommodationId,
  )
    ? routeParams.accommodationId[0]
    : routeParams.accommodationId;
  const handledAccommodationId =
    useRef<string | null>(null);
  const { workspace, actions } = useTripWorkspace();

  useTripWorkspaceFocusRefresh();

  const [modalVisible, setModalVisible] =
    useState(false);
  const [editing, setEditing] =
    useState<Accommodation | null>(null);
  const [name, setName] = useState('');
  const [type, setType] =
    useState<AccommodationType>('hotel');
  const [address, setAddress] = useState('');
  const [checkInDate, setCheckInDate] =
    useState('');
  const [checkInTime, setCheckInTime] =
    useState('');
  const [originalCheckInAt, setOriginalCheckInAt] =
    useState<string | undefined>();
  const [checkInEdited, setCheckInEdited] =
    useState(false);
  const [checkOutDate, setCheckOutDate] =
    useState('');
  const [checkOutTime, setCheckOutTime] =
    useState('');
  const [originalCheckOutAt, setOriginalCheckOutAt] =
    useState<string | undefined>();
  const [checkOutEdited, setCheckOutEdited] =
    useState(false);
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingId, setBookingId] =
    useState<string | undefined>();
  const [stopId, setStopId] =
    useState<string | undefined>();
  const [bookingPickerOpen, setBookingPickerOpen] =
    useState(false);
  const [stopPickerOpen, setStopPickerOpen] =
    useState(false);
  const [iosPickerTarget, setIOSPickerTarget] =
    useState<PickerTarget | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const stopContexts = buildItineraryStopContexts(
    workspace.days,
    workspace.stops,
  );
  const linkedBooking = bookingId
    ? workspace.bookings.find(
        (booking) => booking.id === bookingId,
      )
    : undefined;
  const linkedStopContext = stopId
    ? stopContexts.find(
        (context) => context.stop.id === stopId,
      )
    : undefined;
  const lodgingBookings = workspace.bookings.filter(
    (booking) =>
      booking.type === 'accommodation' ||
      booking.id === bookingId,
  );

  const resetForm = () => {
    setEditing(null);
    setName('');
    setType('hotel');
    setAddress('');
    setCheckInDate('');
    setCheckInTime('');
    setOriginalCheckInAt(undefined);
    setCheckInEdited(false);
    setCheckOutDate('');
    setCheckOutTime('');
    setOriginalCheckOutAt(undefined);
    setCheckOutEdited(false);
    setPhone('');
    setWebsite('');
    setNotes('');
    setBookingId(undefined);
    setStopId(undefined);
    setBookingPickerOpen(false);
    setStopPickerOpen(false);
    setIOSPickerTarget(null);
  };

  const openCreate = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEdit = (accommodation: Accommodation) => {
    const checkIn = splitAccommodationDateTime(
      accommodation.checkInAt,
    );
    const checkOut = splitAccommodationDateTime(
      accommodation.checkOutAt,
    );

    setEditing(accommodation);
    setName(accommodation.name);
    setType(accommodation.type);
    setAddress(accommodation.address ?? '');
    setCheckInDate(checkIn?.date ?? '');
    setCheckInTime(checkIn?.time ?? '');
    setOriginalCheckInAt(accommodation.checkInAt);
    setCheckInEdited(false);
    setCheckOutDate(checkOut?.date ?? '');
    setCheckOutTime(checkOut?.time ?? '');
    setOriginalCheckOutAt(accommodation.checkOutAt);
    setCheckOutEdited(false);
    setPhone(accommodation.phone ?? '');
    setWebsite(accommodation.website ?? '');
    setNotes(accommodation.notes ?? '');
    setBookingId(accommodation.bookingId);
    setStopId(accommodation.stopId);
    setBookingPickerOpen(false);
    setStopPickerOpen(false);
    setIOSPickerTarget(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    resetForm();

    if (requestedAccommodationId) {
      router.setParams({ accommodationId: '' });
    }

    handledAccommodationId.current = null;
  };

  useEffect(() => {
    if (
      !requestedAccommodationId ||
      handledAccommodationId.current ===
        requestedAccommodationId
    ) {
      return;
    }

    const accommodation =
      workspace.accommodations.find(
        (item) =>
          item.id === requestedAccommodationId,
      );

    if (!accommodation) {
      return;
    }

    handledAccommodationId.current =
      requestedAccommodationId;
    openEdit(accommodation);
  }, [requestedAccommodationId, workspace.accommodations]);

  const setPickerValue = (
    target: PickerTarget,
    value: Date,
  ) => {
    if (target === 'checkInDate') {
      setCheckInDate(calendarDateFromPickerValue(value));
      setCheckInEdited(true);
    } else if (target === 'checkInTime') {
      setCheckInTime(localTimeFromPickerValue(value));
      setCheckInEdited(true);
    } else if (target === 'checkOutDate') {
      setCheckOutDate(calendarDateFromPickerValue(value));
      setCheckOutEdited(true);
    } else {
      setCheckOutTime(localTimeFromPickerValue(value));
      setCheckOutEdited(true);
    }
  };

  const valueForPicker = (target: PickerTarget) =>
    target.startsWith('checkIn')
      ? pickerValueFromLocalDateTime(
          checkInDate,
          checkInTime,
          workspace.trip.startDate,
        )
      : pickerValueFromLocalDateTime(
          checkOutDate,
          checkOutTime,
          workspace.trip.endDate,
        );

  const openPicker = (target: PickerTarget) => {
    const mode = target.endsWith('Date')
      ? 'date'
      : 'time';

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: valueForPicker(target),
        mode,
        is24Hour: true,
        onChange: (
          event: DateTimePickerEvent,
          value?: Date,
        ) => {
          if (event.type === 'set' && value) {
            setPickerValue(target, value);
          }
        },
      });

      return;
    }

    setIOSPickerTarget(target);
  };

  const buildInput = (): AccommodationInput => {
    if (
      Boolean(checkInDate) !==
      Boolean(checkInTime)
    ) {
      throw new Error(
        'Choose both a check-in date and time, or clear both',
      );
    }

    if (
      Boolean(checkOutDate) !==
      Boolean(checkOutTime)
    ) {
      throw new Error(
        'Choose both a check-out date and time, or clear both',
      );
    }

    return {
      name,
      type,
      address,
      checkInAt:
        editing && !checkInEdited
          ? originalCheckInAt
          : checkInDate && checkInTime
          ? combineAccommodationDateTime(
              checkInDate,
              checkInTime,
            )
          : undefined,
      checkOutAt:
        editing && !checkOutEdited
          ? originalCheckOutAt
          : checkOutDate && checkOutTime
          ? combineAccommodationDateTime(
              checkOutDate,
              checkOutTime,
            )
          : undefined,
      phone,
      website,
      notes,
      bookingId,
      stopId,
    };
  };

  const saveAccommodation = async () => {
    try {
      setIsSaving(true);
      const input = buildInput();

      if (editing) {
        await actions.updateAccommodation(
          editing.id,
          input,
        );
      } else {
        await actions.addAccommodation(input);
      }

      closeModal();
    } catch (error) {
      Alert.alert(
        'Could not save accommodation',
        error instanceof Error
          ? error.message
          : 'Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAccommodation = (
    accommodation: Accommodation,
  ) => {
    Alert.alert(
      'Delete accommodation?',
      `Remove “${accommodation.name}”? Any linked booking and itinerary stop will stay saved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await actions.deleteAccommodation(
                accommodation.id,
              );

              if (editing?.id === accommodation.id) {
                closeModal();
              }
            } catch (error) {
              console.error(
                '[Accommodation] Delete error:',
                error,
              );
              Alert.alert(
                'Could not delete accommodation',
                'Your saved stay has not been changed. Please try again.',
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
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>
              {tripDestinationLabel(
                workspace.trip.destinations,
              ).toUpperCase()}
            </Text>
            <Text style={styles.title}>Accommodation</Text>
            <Text style={styles.subtitle}>
              Keep every stay connected to the trip without mixing reservation and itinerary truth.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add accommodation"
            style={styles.addButton}
            onPress={openCreate}
          >
            <Ionicons
              name="add"
              size={24}
              color={colors.textInverse}
            />
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <SummaryStat
            value={workspace.accommodations.length}
            label="STAYS"
          />
          <SummaryStat
            value={
              workspace.accommodations.filter(
                (item) => item.bookingId,
              ).length
            }
            label="BOOKED"
          />
          <SummaryStat
            value={
              workspace.accommodations.filter(
                (item) => item.stopId,
              ).length
            }
            label="IN PLAN"
          />
        </View>

        {workspace.accommodations.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="bed-outline"
                size={28}
                color={colors.brand}
              />
            </View>
            <Text style={styles.emptyTitle}>
              No stays saved yet
            </Text>
            <Text style={styles.emptyBody}>
              Add a hotel, rental or other real stay. Dates, booking links and itinerary context remain optional until you know them.
            </Text>
            <Pressable
              style={styles.primaryButton}
              onPress={openCreate}
            >
              <Text style={styles.primaryButtonText}>
                Add accommodation
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {workspace.accommodations.map(
              (accommodation) => {
                const booking = accommodation.bookingId
                  ? workspace.bookings.find(
                      (item) =>
                        item.id === accommodation.bookingId,
                    )
                  : undefined;
                const stopContext = accommodation.stopId
                  ? stopContexts.find(
                      (context) =>
                        context.stop.id ===
                        accommodation.stopId,
                    )
                  : undefined;
                const typeDetails =
                  TYPE_DETAILS[accommodation.type] ??
                  TYPE_DETAILS.other;

                return (
                  <Pressable
                    key={accommodation.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${accommodation.name}`}
                    style={({ pressed }) => [
                      styles.stayCard,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => openEdit(accommodation)}
                  >
                    <View style={styles.stayTop}>
                      <View style={styles.stayIcon}>
                        <Ionicons
                          name={typeDetails.icon}
                          size={22}
                          color={colors.teal}
                        />
                      </View>
                      <View style={styles.stayCopy}>
                        <Text style={styles.stayType}>
                          {typeDetails.label.toUpperCase()}
                        </Text>
                        <Text style={styles.stayName}>
                          {accommodation.name}
                        </Text>
                        {accommodation.address && (
                          <Text
                            numberOfLines={2}
                            style={styles.stayAddress}
                          >
                            {accommodation.address}
                          </Text>
                        )}
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.textMuted}
                      />
                    </View>

                    <View style={styles.dateBand}>
                      <StayDate
                        label="CHECK-IN"
                        value={formatStayDateTime(
                          accommodation.checkInAt,
                        )}
                      />
                      <View style={styles.dateDivider} />
                      <StayDate
                        label="CHECK-OUT"
                        value={formatStayDateTime(
                          accommodation.checkOutAt,
                        )}
                      />
                    </View>

                    {(booking || stopContext) && (
                      <View style={styles.relationships}>
                        {booking && (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Open booking ${booking.title}`}
                            style={styles.relationshipRow}
                            onPress={() =>
                              router.push({
                                pathname:
                                  '/trip/[tripId]/bookings',
                                params: {
                                  tripId: workspace.trip.id,
                                  bookingId: booking.id,
                                },
                              })
                            }
                          >
                            <Ionicons
                              name="ticket-outline"
                              size={16}
                              color={colors.brass}
                            />
                            <Text style={styles.relationshipText}>
                              {booking.title}
                            </Text>
                            <Ionicons
                              name="arrow-forward"
                              size={15}
                              color={colors.brass}
                            />
                          </Pressable>
                        )}
                        {stopContext && (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Open ${stopContext.stop.title} in Plan`}
                            style={styles.relationshipRow}
                            onPress={() =>
                              router.push({
                                pathname:
                                  '/trip/[tripId]/plan',
                                params: {
                                  tripId: workspace.trip.id,
                                  stopId: stopContext.stop.id,
                                },
                              })
                            }
                          >
                            <Ionicons
                              name="git-merge-outline"
                              size={16}
                              color={colors.teal}
                            />
                            <Text style={styles.stopRelationshipText}>
                              {stopContext.day
                                ? `Day ${stopContext.day.dayNumber} · `
                                : ''}
                              {stopContext.stop.title}
                            </Text>
                            <Ionicons
                              name="arrow-forward"
                              size={15}
                              color={colors.teal}
                            />
                          </Pressable>
                        )}
                      </View>
                    )}
                  </Pressable>
                );
              },
            )}
          </View>
        )}

        <View style={styles.truthNote}>
          <Ionicons
            name="time-outline"
            size={18}
            color={colors.brass}
          />
          <Text style={styles.truthNoteText}>
            Stay times remain exactly as entered for the destination. TravelOS does not shift them to another time zone.
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
              <View>
                <Text style={styles.modalEyebrow}>
                  CANONICAL STAY
                </Text>
                <Text style={styles.modalTitle}>
                  {editing ? 'Edit accommodation' : 'Add accommodation'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close accommodation editor"
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

            <Text style={styles.fieldLabel}>TYPE</Text>
            <View style={styles.typeGrid}>
              {ACCOMMODATION_TYPES.map((item) => {
                const selected = type === item;
                const details = TYPE_DETAILS[item];

                return (
                  <Pressable
                    key={item}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    style={[
                      styles.typeChoice,
                      selected && styles.typeChoiceSelected,
                    ]}
                    onPress={() => setType(item)}
                  >
                    <Ionicons
                      name={details.icon}
                      size={18}
                      color={selected ? colors.textInverse : colors.teal}
                    />
                    <Text
                      style={[
                        styles.typeChoiceText,
                        selected && styles.typeChoiceTextSelected,
                      ]}
                    >
                      {details.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Field
              label="NAME"
              value={name}
              onChangeText={setName}
              placeholder="Hotel, rental or stay name"
            />
            <Field
              label="ADDRESS / LOCATION"
              value={address}
              onChangeText={setAddress}
              placeholder="Only enter a known address"
            />

            <StayEditor
              label="CHECK-IN"
              date={checkInDate}
              time={checkInTime}
              onDatePress={() => openPicker('checkInDate')}
              onTimePress={() => openPicker('checkInTime')}
              onClear={() => {
                setCheckInDate('');
                setCheckInTime('');
                setCheckInEdited(true);
              }}
            />
            <StayEditor
              label="CHECK-OUT"
              date={checkOutDate}
              time={checkOutTime}
              onDatePress={() => openPicker('checkOutDate')}
              onTimePress={() => openPicker('checkOutTime')}
              onClear={() => {
                setCheckOutDate('');
                setCheckOutTime('');
                setCheckOutEdited(true);
              }}
            />

            <Text style={styles.fieldLabel}>BOOKING LINK</Text>
            <SelectorSummary
              icon="ticket-outline"
              label={linkedBooking ? 'LINKED BOOKING' : 'NOT LINKED'}
              title={
                linkedBooking?.title ??
                'Keep reservation details independent'
              }
              expanded={bookingPickerOpen}
              onPress={() =>
                setBookingPickerOpen((current) => !current)
              }
            />
            {bookingPickerOpen && (
              <View style={styles.choices}>
                <ChoiceRow
                  selected={!bookingId}
                  title="No booking"
                  meta="Leave this stay unlinked"
                  onPress={() => {
                    setBookingId(undefined);
                    setBookingPickerOpen(false);
                  }}
                />
                {lodgingBookings.map((booking) => (
                  <ChoiceRow
                    key={booking.id}
                    selected={booking.id === bookingId}
                    title={booking.title}
                    meta={`${booking.status}${
                      booking.provider
                        ? ` · ${booking.provider}`
                        : ''
                    }`}
                    onPress={() => {
                      setBookingId(booking.id);
                      setBookingPickerOpen(false);
                    }}
                  />
                ))}
                {lodgingBookings.length === 0 && (
                  <Text style={styles.choiceEmpty}>
                    Add a Hotel booking before linking reservation details.
                  </Text>
                )}
              </View>
            )}

            <Text style={styles.fieldLabel}>ITINERARY LINK</Text>
            <SelectorSummary
              icon="git-merge-outline"
              label={
                linkedStopContext?.day
                  ? `DAY ${linkedStopContext.day.dayNumber} · ${formatStopDate(linkedStopContext.day.date)}`
                  : linkedStopContext
                    ? 'ITINERARY STOP'
                    : 'NOT LINKED'
              }
              title={
                linkedStopContext?.stop.title ??
                'Keep this stay outside the itinerary'
              }
              expanded={stopPickerOpen}
              onPress={() =>
                setStopPickerOpen((current) => !current)
              }
            />
            {stopPickerOpen && (
              <View style={styles.choices}>
                <ChoiceRow
                  selected={!stopId}
                  title="No itinerary stop"
                  meta="Leave this stay unlinked"
                  onPress={() => {
                    setStopId(undefined);
                    setStopPickerOpen(false);
                  }}
                />
                {stopContexts.map((context) => (
                  <ChoiceRow
                    key={context.stop.id}
                    selected={context.stop.id === stopId}
                    title={context.stop.title}
                    meta={`${
                      context.day
                        ? `Day ${context.day.dayNumber} · ${formatStopDate(context.day.date)} · `
                        : ''
                    }${
                      context.stop.startTime
                        ? `${context.stop.startTime} · `
                        : ''
                    }${context.stop.type}`}
                    onPress={() => {
                      setStopId(context.stop.id);
                      setStopPickerOpen(false);
                    }}
                  />
                ))}
                {stopContexts.length === 0 && (
                  <Text style={styles.choiceEmpty}>
                    Add an itinerary stop in Plan before linking it.
                  </Text>
                )}
              </View>
            )}

            <Field
              label="PHONE"
              value={phone}
              onChangeText={setPhone}
              placeholder="Optional known contact number"
              keyboardType="phone-pad"
            />
            <Field
              label="WEBSITE"
              value={website}
              onChangeText={setWebsite}
              placeholder="Optional known website"
              autoCapitalize="none"
              keyboardType="url"
            />
            <Field
              label="NOTES"
              value={notes}
              onChangeText={setNotes}
              placeholder="Access, check-in or stay notes"
              multiline
            />

            <View style={styles.localTimeNote}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color={colors.brass}
              />
              <Text style={styles.localTimeNoteText}>
                Enter the time shown by the accommodation. TravelOS will keep it exactly as entered.
              </Text>
            </View>

            <Pressable
              disabled={isSaving}
              style={[
                styles.saveButton,
                isSaving && styles.disabled,
              ]}
              onPress={() => void saveAccommodation()}
            >
              <Text style={styles.saveButtonText}>
                {isSaving
                  ? 'Saving…'
                  : editing
                    ? 'Save changes'
                    : 'Add accommodation'}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={colors.textInverse}
              />
            </Pressable>

            {editing && (
              <Pressable
                style={styles.deleteButton}
                onPress={() => deleteAccommodation(editing)}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={colors.danger}
                />
                <Text style={styles.deleteButtonText}>
                  Delete accommodation
                </Text>
              </Pressable>
            )}
          </ScrollView>

          {iosPickerTarget && Platform.OS === 'ios' && (
            <View style={styles.iosPickerSheet}>
              <DateTimePicker
                value={valueForPicker(iosPickerTarget)}
                mode={
                  iosPickerTarget.endsWith('Date')
                    ? 'date'
                    : 'time'
                }
                display="spinner"
                onChange={(_, value) => {
                  if (value) {
                    setPickerValue(iosPickerTarget, value);
                  }
                }}
              />
              <Pressable
                style={styles.iosPickerDone}
                onPress={() => setIOSPickerTarget(null)}
              >
                <Text style={styles.iosPickerDoneText}>Done</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

function SummaryStat({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <View style={styles.summaryStat}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function StayDate({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.stayDate}>
      <Text style={styles.stayDateLabel}>{label}</Text>
      <Text style={styles.stayDateValue}>{value}</Text>
    </View>
  );
}

function StayEditor({
  label,
  date,
  time,
  onDatePress,
  onTimePress,
  onClear,
}: {
  label: string;
  date: string;
  time: string;
  onDatePress(): void;
  onTimePress(): void;
  onClear(): void;
}) {
  return (
    <View style={styles.stayEditor}>
      <View style={styles.stayEditorHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {(date || time) && (
          <Pressable onPress={onClear}>
            <Text style={styles.clearText}>CLEAR</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.stayEditorRow}>
        <DatePartButton
          icon="calendar-outline"
          value={date ? formatDate(date) : 'Choose date'}
          onPress={onDatePress}
        />
        <DatePartButton
          icon="time-outline"
          value={time || 'Choose time'}
          onPress={onTimePress}
        />
      </View>
    </View>
  );
}

function DatePartButton({
  icon,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onPress(): void;
}) {
  return (
    <Pressable
      style={styles.datePartButton}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={17}
        color={colors.teal}
      />
      <Text numberOfLines={1} style={styles.datePartText}>
        {value}
      </Text>
    </Pressable>
  );
}

function SelectorSummary({
  icon,
  label,
  title,
  expanded,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  title: string;
  expanded: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      style={styles.selectorSummary}
      onPress={onPress}
    >
      <View style={styles.selectorIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={colors.teal}
        />
      </View>
      <View style={styles.selectorCopy}>
        <Text style={styles.selectorLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.selectorTitle}>
          {title}
        </Text>
      </View>
      <Ionicons
        name={expanded ? 'chevron-up' : 'chevron-down'}
        size={18}
        color={colors.textMuted}
      />
    </Pressable>
  );
}

function ChoiceRow({
  selected,
  title,
  meta,
  onPress,
}: {
  selected: boolean;
  title: string;
  meta: string;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={[
        styles.choice,
        selected && styles.choiceSelected,
      ]}
      onPress={onPress}
    >
      <View style={styles.choiceCopy}>
        <Text style={styles.choiceTitle}>{title}</Text>
        <Text style={styles.choiceMeta}>{meta}</Text>
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

function Field({
  label,
  multiline = false,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          multiline && styles.multilineInput,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: spacing[6],
    paddingBottom: spacing[8],
  },
  headerCopy: { flex: 1, paddingRight: spacing[5] },
  eyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.8,
    color: colors.brass,
    marginBottom: spacing[2],
  },
  title: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.display,
    lineHeight: lineHeight.display,
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: spacing[3],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    color: colors.textSecondary,
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
    ...shadows.subtle,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  summaryStat: {
    flex: 1,
    minHeight: 92,
    padding: spacing[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  summaryValue: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.title,
    color: colors.textPrimary,
  },
  summaryLabel: {
    marginTop: spacing[2],
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1,
    color: colors.textMuted,
  },
  emptyCard: {
    alignItems: 'flex-start',
    padding: spacing[6],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.subtle,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
  },
  emptyTitle: {
    marginTop: spacing[6],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    color: colors.textPrimary,
  },
  emptyBody: {
    marginTop: spacing[3],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
  },
  primaryButton: {
    height: 52,
    marginTop: spacing[6],
    paddingHorizontal: spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.brand,
  },
  primaryButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textInverse,
  },
  list: { gap: spacing[4] },
  stayCard: {
    padding: spacing[5],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.subtle,
  },
  stayTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stayIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.tealSoft,
  },
  stayCopy: { flex: 1, marginLeft: spacing[3] },
  stayType: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1,
    color: colors.brass,
  },
  stayName: {
    marginTop: spacing[1],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    color: colors.textPrimary,
  },
  stayAddress: {
    marginTop: spacing[2],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  dateBand: {
    flexDirection: 'row',
    marginTop: spacing[5],
    padding: spacing[4],
    borderRadius: radius.md,
    backgroundColor: colors.surfaceWarm,
  },
  stayDate: { flex: 1 },
  stayDateLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1,
    color: colors.textMuted,
  },
  stayDateValue: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textPrimary,
  },
  dateDivider: {
    width: 1,
    marginHorizontal: spacing[4],
    backgroundColor: colors.border,
  },
  relationships: {
    marginTop: spacing[4],
    paddingTop: spacing[3],
    gap: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  relationshipRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  relationshipText: {
    flex: 1,
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.caption,
    color: colors.brass,
  },
  stopRelationshipText: {
    flex: 1,
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.caption,
    color: colors.teal,
  },
  truthNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    marginTop: spacing[6],
    padding: spacing[4],
    borderRadius: radius.md,
    backgroundColor: colors.brassSoft,
  },
  truthNoteText: {
    flex: 1,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  bottomSpace: { height: spacing[16] },
  pressed: { opacity: 0.82 },
  modalRoot: { flex: 1, backgroundColor: colors.background },
  modalContent: {
    padding: spacing[6],
    paddingBottom: spacing[16],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[8],
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
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  field: { marginTop: spacing[5] },
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
  multilineInput: {
    minHeight: 116,
    paddingTop: spacing[4],
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  typeChoice: {
    minWidth: '31%',
    minHeight: 72,
    flexGrow: 1,
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
  typeChoiceTextSelected: { color: colors.textInverse },
  stayEditor: { marginTop: spacing[5] },
  stayEditorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stayEditorRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  datePartButton: {
    flex: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  datePartText: {
    flex: 1,
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textPrimary,
  },
  clearText: {
    marginBottom: spacing[2],
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    color: colors.danger,
  },
  selectorSummary: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selectorIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.tealSoft,
  },
  selectorCopy: { flex: 1 },
  selectorLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 0.8,
    color: colors.brass,
  },
  selectorTitle: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  choices: {
    marginTop: spacing[2],
    padding: spacing[2],
    gap: spacing[1],
    borderRadius: radius.md,
    backgroundColor: colors.surfaceWarm,
  },
  choice: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  choiceSelected: {
    borderColor: colors.teal,
    backgroundColor: colors.surface,
  },
  choiceCopy: { flex: 1 },
  choiceTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  choiceMeta: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.micro,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  choiceEmpty: {
    padding: spacing[3],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
  },
  localTimeNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginTop: spacing[6],
    padding: spacing[4],
    borderRadius: radius.md,
    backgroundColor: colors.brassSoft,
  },
  localTimeNoteText: {
    flex: 1,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  saveButton: {
    minHeight: 56,
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
  disabled: { opacity: 0.55 },
  deleteButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  deleteButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.danger,
  },
  iosPickerSheet: {
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  iosPickerDone: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.brand,
  },
  iosPickerDoneText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textInverse,
  },
});
