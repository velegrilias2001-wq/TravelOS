import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  useLocalSearchParams,
  useRouter,
  type Href,
} from 'expo-router';

import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  CalendarDateField,
  LocalTimeField,
} from '@/components/ui/native-date-time-fields';
import { Screen } from '@/components/ui/screen';
import {
  CompactSummaryStrip,
  UtilityScreenHeader,
} from '@/components/ui/utility-screen';

import type {
  Booking,
  BookingStatus,
  BookingType,
} from '@/domain/entities';

import {
  useTripWorkspace,
  useTripWorkspaceFocusRefresh,
} from '@/features/trip-workspace/trip-workspace-context';
import {
  accommodationsLinkedToBooking,
} from '@/services/accommodation-details';
import { PressableScale } from '@/features/motion/pressable-scale';
import {
  resolveBookingCurrencyCode,
} from '@/services/booking-finance';
import {
  buildItineraryStopContexts,
} from '@/services/booking-stop-relationship';
import {
  combineBookingLocalDateTime,
  formatBookingTemporalValue,
  parseBookingTemporalValue,
} from '@/services/booking-time';
import {
  tripDestinationLabel,
} from '@/services/destination-authoring';
import { formatCalendarDateForDisplay } from '@/services/time-truth';

import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  shadows,
  spacing,
} from '@/theme';

const BOOKING_TYPES: {
  label: string;
  value: BookingType;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    label: 'Flight',
    value: 'flight',
    icon: 'airplane-outline',
  },
  {
    label: 'Train',
    value: 'train',
    icon: 'train-outline',
  },
  {
    label: 'Bus',
    value: 'bus',
    icon: 'bus-outline',
  },
  {
    label: 'Ferry',
    value: 'ferry',
    icon: 'boat-outline',
  },
  {
    label: 'Car',
    value: 'car',
    icon: 'car-outline',
  },
  {
    label: 'Hotel',
    value: 'accommodation',
    icon: 'bed-outline',
  },
  {
    label: 'Activity',
    value: 'activity',
    icon: 'sparkles-outline',
  },
  {
    label: 'Restaurant',
    value: 'restaurant',
    icon: 'restaurant-outline',
  },
  {
    label: 'Ticket',
    value: 'ticket',
    icon: 'ticket-outline',
  },
  {
    label: 'Other',
    value: 'other',
    icon: 'briefcase-outline',
  },
];

const BOOKING_STATUSES: {
  label: string;
  value: BookingStatus;
}[] = [
  {
    label: 'Planned',
    value: 'planned',
  },
  {
    label: 'Confirmed',
    value: 'confirmed',
  },
  {
    label: 'Completed',
    value: 'completed',
  },
  {
    label: 'Cancelled',
    value: 'cancelled',
  },
];

function getBookingIcon(
  type: BookingType,
): keyof typeof Ionicons.glyphMap {
  return (
    BOOKING_TYPES.find(
      (item) => item.value === type,
    )?.icon ?? 'briefcase-outline'
  );
}

function formatDateTime(
  value?: string,
): string | null {
  return formatBookingTemporalValue(value);
}

interface BookingTimeDraft {
  mode: 'local' | 'preserved';
  original?: string;
  date: string;
  time: string;
  edited: boolean;
  kind?: 'absolute-instant' | 'invalid';
}

function bookingTimeDraft(
  value?: string,
): BookingTimeDraft {
  if (!value) {
    return {
      mode: 'local',
      date: '',
      time: '',
      edited: false,
    };
  }

  const parsed = parseBookingTemporalValue(value);

  if (
    parsed.kind === 'local-wall-time' &&
    parsed.date &&
    parsed.time
  ) {
    return {
      mode: 'local',
      original: value,
      date: parsed.date,
      time: parsed.time,
      edited: false,
    };
  }

  return {
    mode: 'preserved',
    original: value,
    date: '',
    time: '',
    edited: false,
    kind:
      parsed.kind === 'absolute-instant'
        ? 'absolute-instant'
        : 'invalid',
  };
}

function bookingValueFromDraft(
  draft: BookingTimeDraft,
  label: string,
): string | undefined {
  if (draft.mode === 'preserved') {
    return draft.original;
  }

  if (!draft.edited && draft.original) {
    return draft.original;
  }

  if (!draft.date && !draft.time) {
    return undefined;
  }

  if (!draft.date || !draft.time) {
    throw new Error(
      `Choose both a ${label.toLowerCase()} date and time, or clear both`,
    );
  }

  return combineBookingLocalDateTime(
    draft.date,
    draft.time,
  );
}

function formatStopDate(
  value: string,
): string {
  return formatCalendarDateForDisplay(value, {
    day: 'numeric',
    month: 'short',
  });
}

export default function BookingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } =
    useWindowDimensions();
  const sheetScrollMaxHeight = Math.max(
    280,
    Math.round(windowHeight * 0.92) - 260,
  );
  const sheetBottomPad = Math.max(
    insets.bottom,
    12,
  ) + 16;
  const routeParams =
    useLocalSearchParams<{
      bookingId?: string | string[];
    }>();

  const {
    workspace,
    actions,
  } = useTripWorkspace();

  useTripWorkspaceFocusRefresh();

  const requestedBookingId =
    Array.isArray(routeParams.bookingId)
      ? routeParams.bookingId[0]
      : routeParams.bookingId;

  const handledBookingId =
    useRef<string | null>(null);

  const stopContexts =
    buildItineraryStopContexts(
      workspace.days,
      workspace.stops,
    );

  const [
    modalVisible,
    setModalVisible,
  ] =
    useState(false);

  const [
    editingBooking,
    setEditingBooking,
  ] =
    useState<Booking | null>(
      null,
    );

  const [
    type,
    setType,
  ] =
    useState<BookingType>(
      'flight',
    );

  const [
    status,
    setStatus,
  ] =
    useState<BookingStatus>(
      'confirmed',
    );

  const [
    title,
    setTitle,
  ] =
    useState('');

  const [
    provider,
    setProvider,
  ] =
    useState('');

  const [
    confirmationCode,
    setConfirmationCode,
  ] =
    useState('');

  const [
    stopId,
    setStopId,
  ] = useState<string | undefined>(
    undefined,
  );

  const [
    stopPickerOpen,
    setStopPickerOpen,
  ] = useState(false);

  const [startDraft, setStartDraft] =
    useState<BookingTimeDraft>(() =>
      bookingTimeDraft(),
    );

  const [endDraft, setEndDraft] =
    useState<BookingTimeDraft>(() =>
      bookingTimeDraft(),
    );

  const [
    amount,
    setAmount,
  ] =
    useState('');

  const [
    currency,
    setCurrency,
  ] =
    useState('EUR');

  const [
    isPaid,
    setIsPaid,
  ] =
    useState(false);

  const [
    notes,
    setNotes,
  ] =
    useState('');

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const selectedStopContext =
    stopId
      ? stopContexts.find(
          (context) =>
            context.stop.id === stopId,
        )
      : undefined;

  const resetForm = () => {
    setEditingBooking(null);

    setType('flight');
    setStatus('confirmed');

    setTitle('');
    setProvider('');
    setConfirmationCode('');
    setStopId(undefined);
    setStopPickerOpen(false);

    setStartDraft(bookingTimeDraft());
    setEndDraft(bookingTimeDraft());

    setAmount('');

    setCurrency(
      workspace?.trip
        .accountingCurrency ??
        'EUR',
    );

    setIsPaid(false);
    setNotes('');
  };

  const openCreate = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEdit = (
    booking: Booking,
  ) => {
    setEditingBooking(
      booking,
    );

    setType(
      booking.type,
    );

    setStatus(
      booking.status,
    );

    setTitle(
      booking.title,
    );

    setProvider(
      booking.provider ?? '',
    );

    setConfirmationCode(
      booking.confirmationCode ??
        '',
    );

    setStopId(booking.stopId);
    setStopPickerOpen(false);

    setStartDraft(
      bookingTimeDraft(booking.startAt),
    );

    setEndDraft(
      bookingTimeDraft(booking.endAt),
    );

    setAmount(
      booking.amount !==
      undefined
        ? String(
            booking.amount,
          )
        : '',
    );

    setCurrency(
      booking.currencyCode ??
        workspace?.trip
          .accountingCurrency ??
        'EUR',
    );

    setIsPaid(
      booking.isPaid ?? false,
    );

    setNotes(
      booking.notes ?? '',
    );

    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    resetForm();

    if (requestedBookingId) {
      router.setParams({
        bookingId: '',
      });
    }

    handledBookingId.current = null;
  };

  useEffect(() => {
    if (
      !requestedBookingId ||
      handledBookingId.current ===
        requestedBookingId
    ) {
      return;
    }

    const requestedBooking =
      workspace.bookings.find(
        (booking) =>
          booking.id ===
          requestedBookingId,
      );

    if (!requestedBooking) {
      return;
    }

    handledBookingId.current =
      requestedBookingId;
    openEdit(requestedBooking);
  }, [
    requestedBookingId,
    workspace.bookings,
  ]);

  const saveBooking =
    async () => {
      if (!workspace) {
        return;
      }

      const cleanTitle =
        title.trim();

      if (!cleanTitle) {
        Alert.alert(
          'Add a booking name',
          'Give this booking a clear name.',
        );

        return;
      }

      const parsedAmount =
        amount.trim() === ''
          ? undefined
          : Number(
              amount.replace(
                ',',
                '.',
              ),
            );

      if (
        parsedAmount !==
          undefined &&
        (
          Number.isNaN(
            parsedAmount,
          ) ||
          parsedAmount < 0
        )
      ) {
        Alert.alert(
          'Check the amount',
          'Enter a valid booking amount.',
        );

        return;
      }

      const now =
        new Date()
          .toISOString();

      try {
        setIsSaving(true);

        const startAt = bookingValueFromDraft(
          startDraft,
          'Booking start',
        );
        const endAt = bookingValueFromDraft(
          endDraft,
          'Booking end',
        );

        if (editingBooking) {
          await actions.updateBooking(
            {
              ...editingBooking,

              type,
              status,

              title:
                cleanTitle,

              provider:
                provider.trim() ||
                undefined,

              confirmationCode:
                confirmationCode.trim() ||
                undefined,

              stopId,

              startAt,

              endAt,

              amount:
                parsedAmount,

              currencyCode:
                resolveBookingCurrencyCode(
                  parsedAmount,
                  currency,
                  workspace.trip.accountingCurrency,
                ),

              isPaid,

              notes:
                notes.trim() ||
                undefined,
            },
          );
        } else {
          const booking:
            Booking = {
              id:
                Crypto.randomUUID(),

              tripId:
                workspace.trip.id,

              type,
              status,

              title:
                cleanTitle,

              provider:
                provider.trim() ||
                undefined,

              confirmationCode:
                confirmationCode.trim() ||
                undefined,

              stopId,

              startAt,

              endAt,

              amount:
                parsedAmount,

              currencyCode:
                resolveBookingCurrencyCode(
                  parsedAmount,
                  currency,
                  workspace.trip.accountingCurrency,
                ),

              isPaid,

              notes:
                notes.trim() ||
                undefined,

              createdAt:
                now,

              updatedAt:
                now,
            };

          await actions.addBooking(
            booking,
          );
        }

        closeModal();

      } catch (error) {
        console.error(
          '[Bookings] Save error:',
          error,
        );

        Alert.alert(
          'Could not save booking',
          error instanceof Error &&
          error.message.includes(
            'itinerary stop',
          )
            ? 'The selected moment is no longer available for this trip. Choose another moment or leave the booking out of your plan.'
            : error instanceof Error
              ? error.message
              : 'Please try again.',
        );
      } finally {
        setIsSaving(false);
      }
    };

  const deleteBooking = (
    booking: Booking,
  ) => {
    Alert.alert(
      'Delete booking?',
      `Remove "${booking.title}" from this trip? Linked stays keep their facts. This booking cannot be recovered after deletion.`,
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
                await actions.deleteBooking(
                  booking.id,
                );
              } catch (
                error
              ) {
                console.error(
                  '[Bookings] Delete error:',
                  error,
                );

                Alert.alert(
                  'Could not delete booking',
                  'Please try again.',
                );
              }
            },
        },
      ],
    );
  };

  const confirmedCount =
    workspace.bookings.filter(
      (booking) =>
        booking.status ===
        'confirmed',
    ).length;

  const paidCount =
    workspace.bookings.filter(
      (booking) =>
        booking.isPaid === true,
    ).length;

  return (
    <>
      <Screen scroll>
        <UtilityScreenHeader
          eyebrow={tripDestinationLabel(
            workspace.trip.destinations,
          ).toUpperCase()}
          title="Bookings"
          subtitle="Confirmations, reservations and payment details."
          action={(
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add booking"
              style={styles.addButton}
              onPress={openCreate}
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
          accessibilityLabel={`${workspace.bookings.length} bookings, ${confirmedCount} confirmed, ${paidCount} paid`}
          items={[
            {
              value: workspace.bookings.length,
              label:
                workspace.bookings.length === 1
                  ? 'booking'
                  : 'bookings',
            },
            { value: confirmedCount, label: 'confirmed' },
            { value: paidCount, label: 'paid' },
          ]}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Import a calendar"
          style={({ pressed }) => [
            styles.importLink,
            pressed && styles.pressed,
          ]}
          onPress={() =>
            router.push({
              pathname: '/import',
              params: {
                tripId: workspace.trip.id,
              },
            } as unknown as Href)
          }
        >
          <Ionicons
            name="download-outline"
            size={18}
            color={colors.brand}
          />

          <Text style={styles.importLinkText}>
            Import a calendar to review
          </Text>
        </Pressable>

        {workspace.bookings
          .length === 0 ? (
          <View
            style={styles.emptyCard}
          >
            <View
              style={styles.emptyIcon}
            >
              <Ionicons
                name="ticket-outline"
                size={28}
                color={colors.brand}
              />
            </View>

            <Text
              style={styles.emptyTitle}
            >
              Nothing to keep track of
              yet.
            </Text>

            <Text
              style={styles.emptyBody}
            >
              Add flights, hotels,
              transport, restaurants,
              activities and tickets.
            </Text>

            <Pressable
              style={
                styles.primaryButton
              }
              onPress={openCreate}
            >
              <Ionicons
                name="add"
                size={20}
                color={
                  colors.textInverse
                }
              />

              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Add booking
              </Text>
            </Pressable>
          </View>
        ) : (
          <View
            style={styles.bookingList}
          >
            {workspace.bookings.map(
              (booking) => {
                const dateLabel =
                  formatDateTime(
                    booking.startAt,
                  );

                const linkedStopContext =
                  booking.stopId
                    ? stopContexts.find(
                        (context) =>
                          context.stop.id ===
                          booking.stopId,
                      )
                    : undefined;
                const linkedAccommodations =
                  accommodationsLinkedToBooking(
                    workspace.accommodations,
                    booking.id,
                  );

                return (
                  <Pressable
                    key={booking.id}
                    style={({
                      pressed,
                    }) => [
                      styles.bookingCard,
                      booking.status ===
                        'confirmed' &&
                        styles.bookingCardConfirmed,
                      pressed &&
                        styles.pressed,
                    ]}
                    onPress={() =>
                      openEdit(
                        booking,
                      )
                    }
                  >
                    <View
                      style={
                        styles.bookingIcon
                      }
                    >
                      <Ionicons
                        name={getBookingIcon(
                          booking.type,
                        )}
                        size={22}
                        color={
                          colors.teal
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.bookingContent
                      }
                    >
                      <View
                        style={
                          styles.bookingTop
                        }
                      >
                        <Text
                          style={
                            styles.bookingTypeEyebrow
                          }
                        >
                          {BOOKING_TYPES.find(
                            (item) =>
                              item.value ===
                              booking.type,
                          )?.label ??
                            booking.type}
                        </Text>

                        <View
                          style={[
                            styles.statusPill,

                            booking.status ===
                              'cancelled' &&
                              styles.statusCancelled,

                            booking.status ===
                              'completed' &&
                              styles.statusCompleted,

                            booking.status ===
                              'confirmed' &&
                              styles.statusConfirmed,
                          ]}
                        >
                          <Text
                            style={
                              styles.statusText
                            }
                          >
                            {booking.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={
                          styles.bookingTitle
                        }
                      >
                        {booking.title}
                      </Text>

                      {(dateLabel ||
                        formatDateTime(
                          booking.endAt,
                        )) && (
                        <Text
                          style={
                            styles.bookingTemporal
                          }
                        >
                          {dateLabel &&
                          formatDateTime(
                            booking.endAt,
                          )
                            ? `${dateLabel} → ${formatDateTime(booking.endAt)}`
                            : dateLabel ||
                              formatDateTime(
                                booking.endAt,
                              )}
                        </Text>
                      )}

                      <Text
                        numberOfLines={1}
                        style={
                          styles.bookingMetaLine
                        }
                      >
                        {[
                          booking.provider,
                          booking.confirmationCode
                            ? `code ${booking.confirmationCode}`
                            : null,
                          booking.isPaid
                            ? 'paid'
                            : booking.isPaid ===
                                false
                              ? 'unpaid'
                              : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>

                      {linkedStopContext && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Open ${linkedStopContext.stop.title} in Plan`}
                          style={styles.linkedStopRow}
                          onPress={() =>
                            router.push({
                              pathname:
                                '/trip/[tripId]/plan',
                              params: {
                                tripId:
                                  workspace.trip.id,
                                stopId:
                                  linkedStopContext.stop.id,
                              },
                            })
                          }
                        >
                          <View
                            style={styles.linkedStopIcon}
                          >
                            <Ionicons
                              name="git-merge-outline"
                              size={15}
                              color={colors.teal}
                            />
                          </View>

                          <View
                            style={styles.linkedStopCopy}
                          >
                            <Text
                              style={styles.linkedStopLabel}
                            >
                              {linkedStopContext.day
                                ? `DAY ${linkedStopContext.day.dayNumber} · ${formatStopDate(linkedStopContext.day.date)}`
                                : 'PLAN MOMENT'}
                            </Text>
                            <Text
                              numberOfLines={1}
                              style={styles.linkedStopTitle}
                            >
                              {linkedStopContext.stop.title}
                            </Text>
                          </View>

                          <Ionicons
                            name="arrow-forward"
                            size={16}
                            color={colors.teal}
                          />
                        </Pressable>
                      )}

                      {linkedAccommodations.length > 0 && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Open linked accommodation"
                          style={styles.linkedAccommodationRow}
                          onPress={() =>
                            router.push({
                              pathname: '/trip/[tripId]/accommodation',
                              params: {
                                tripId: workspace.trip.id,
                                ...(linkedAccommodations.length === 1
                                  ? { accommodationId: linkedAccommodations[0].id }
                                  : {}),
                              },
                            })
                          }
                        >
                          <View style={styles.linkedAccommodationIcon}>
                            <Ionicons
                              name="bed-outline"
                              size={15}
                              color={colors.brand}
                            />
                          </View>
                          <View style={styles.linkedStopCopy}>
                            <Text style={styles.linkedAccommodationLabel}>
                              {linkedAccommodations.length === 1
                                ? 'LINKED STAY'
                                : `${linkedAccommodations.length} LINKED STAYS`}
                            </Text>
                            <Text numberOfLines={1} style={styles.linkedStopTitle}>
                              {linkedAccommodations.length === 1
                                ? linkedAccommodations[0].name
                                : 'Open accommodation'}
                            </Text>
                          </View>
                          <Ionicons
                            name="arrow-forward"
                            size={16}
                            color={colors.brand}
                          />
                        </Pressable>
                      )}

                      <View
                        style={
                          styles.bookingFooter
                        }
                      >
                        <View
                          style={
                            styles.priceWrap
                          }
                        >
                          {booking.amount !==
                            undefined && (
                            <Text
                              style={
                                styles.amount
                              }
                            >
                              {
                                booking.amount
                              }{' '}
                              {
                                booking.currencyCode ??
                                workspace.trip
                                  .accountingCurrency
                              }
                            </Text>
                          )}

                          <Text
                            style={[
                              styles.paymentStatus,

                              booking.isPaid &&
                                styles.paymentPaid,
                            ]}
                          >
                            {booking.isPaid
                              ? 'PAID'
                              : 'UNPAID'}
                          </Text>
                        </View>

                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Delete ${booking.title}`}
                          style={
                            styles.deleteButton
                          }
                          onPress={() =>
                            deleteBooking(
                              booking,
                            )
                          }
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color={colors.coral}
                          />
                        </Pressable>
                      </View>
                    </View>
                  </Pressable>
                );
              },
            )}
          </View>
        )}

        <View
          style={styles.bottomSpace}
        />
      </Screen>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          closeModal();
        }}
      >
        <View
          style={
            styles.modalBackdrop
          }
        >
          <KeyboardAvoidingView
            behavior={
              Platform.OS === 'ios'
                ? 'padding'
                : undefined
            }
            style={[
              styles.sheet,
              {
                paddingBottom:
                  sheetBottomPad,
              },
            ]}
          >
            <View
              style={
                styles.sheetHandle
              }
            />

            <View
              style={
                styles.sheetHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.sheetTitle
                  }
                >
                  {editingBooking
                    ? 'Edit booking'
                    : 'Add booking'}
                </Text>
              </View>

              <Pressable
                style={
                  styles.closeButton
                }
                onPress={
                  closeModal
                }
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={
                    colors.brand
                  }
                />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              keyboardShouldPersistTaps="handled"
              style={{
                maxHeight:
                  sheetScrollMaxHeight,
              }}
            >
              <Text
                style={
                  styles.fieldLabel
                }
              >
                TYPE
              </Text>

              <View
                style={
                  styles.typeGrid
                }
              >
                {BOOKING_TYPES.map(
                  (item) => {
                    const selected =
                      type ===
                      item.value;

                    return (
                      <Pressable
                        key={
                          item.value
                        }
                        style={[
                          styles.typeButton,

                          selected &&
                            styles.typeButtonSelected,
                        ]}
                        onPress={() => {
                          setType(
                            item.value,
                          );
                          setTitle(
                            (current) =>
                              current.trim()
                                ? current
                                : item.label,
                          );
                        }}
                      >
                        <Ionicons
                          name={
                            item.icon
                          }
                          size={19}
                          color={
                            selected
                              ? colors.textInverse
                              : colors.brand
                          }
                        />

                        <Text
                          style={[
                            styles.typeText,

                            selected &&
                              styles.typeTextSelected,
                          ]}
                        >
                          {
                            item.label
                          }
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </View>

              <Text
                style={
                  styles.fieldLabel
                }
              >
                STATUS
              </Text>

              <View
                style={
                  styles.statusSelector
                }
              >
                {BOOKING_STATUSES.map(
                  (item) => {
                    const selected =
                      status ===
                      item.value;

                    return (
                      <Pressable
                        key={
                          item.value
                        }
                        style={[
                          styles.statusOption,

                          selected &&
                            styles.statusOptionSelected,
                        ]}
                        onPress={() => {
                          setStatus(item.value);
                          if (item.value === 'cancelled') {
                            setIsPaid(false);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.statusOptionText,

                            selected &&
                              styles.statusOptionTextSelected,
                          ]}
                        >
                          {
                            item.label
                          }
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </View>

              <Field
                label="BOOKING NAME"
                placeholder="Flight to Tokyo"
                value={title}
                onChangeText={
                  setTitle
                }
              />

              <Field
                label="PROVIDER"
                placeholder="Emirates, Booking.com…"
                value={provider}
                onChangeText={
                  setProvider
                }
              />

              <Field
                label="CONFIRMATION CODE"
                placeholder="ABC123"
                value={
                  confirmationCode
                }
                onChangeText={
                  setConfirmationCode
                }
                autoCapitalize="characters"
              />

              <Text style={styles.fieldLabel}>
                ADD TO YOUR PLAN
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose plan moment"
                accessibilityState={{
                  expanded: stopPickerOpen,
                }}
                style={styles.stopPickerSummary}
                onPress={() =>
                  setStopPickerOpen(
                    (current) => !current,
                  )
                }
              >
                <View style={styles.stopPickerIcon}>
                  <Ionicons
                    name={
                      selectedStopContext
                        ? 'git-merge-outline'
                        : 'unlink-outline'
                    }
                    size={19}
                    color={colors.teal}
                  />
                </View>

                <View style={styles.stopPickerCopy}>
                  <Text
                    style={styles.stopPickerLabel}
                  >
                    {selectedStopContext?.day
                      ? `DAY ${selectedStopContext.day.dayNumber} · ${formatStopDate(selectedStopContext.day.date)}`
                      : selectedStopContext
                        ? 'PLAN MOMENT'
                        : 'NOT IN PLAN'}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={styles.stopPickerTitle}
                  >
                    {selectedStopContext?.stop.title ??
                      'Choose a moment from your plan'}
                  </Text>
                </View>

                <Ionicons
                  name={
                    stopPickerOpen
                      ? 'chevron-up'
                      : 'chevron-down'
                  }
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>

              {stopPickerOpen && (
                <View style={styles.stopChoices}>
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: stopId === undefined,
                    }}
                    style={[
                      styles.stopChoice,
                      stopId === undefined &&
                        styles.stopChoiceSelected,
                    ]}
                    onPress={() => {
                      setStopId(undefined);
                      setStopPickerOpen(false);
                    }}
                  >
                    <View style={styles.stopChoiceIcon}>
                      <Ionicons
                        name="unlink-outline"
                        size={17}
                        color={colors.teal}
                      />
                    </View>
                    <View style={styles.stopChoiceCopy}>
                      <Text style={styles.stopChoiceTitle}>
                        Not added to plan
                      </Text>
                      <Text style={styles.stopChoiceMeta}>
                        Keep this booking separate
                      </Text>
                    </View>
                    {stopId === undefined && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={colors.teal}
                      />
                    )}
                  </Pressable>

                  {stopContexts.map((context) => {
                    const selected =
                      stopId === context.stop.id;

                    return (
                      <Pressable
                        key={context.stop.id}
                        accessibilityRole="radio"
                        accessibilityState={{
                          checked: selected,
                        }}
                        style={[
                          styles.stopChoice,
                          selected &&
                            styles.stopChoiceSelected,
                        ]}
                        onPress={() => {
                          setStopId(context.stop.id);
                          setStopPickerOpen(false);
                        }}
                      >
                        <View style={styles.stopChoiceIcon}>
                          <Ionicons
                            name="location-outline"
                            size={17}
                            color={colors.teal}
                          />
                        </View>
                        <View style={styles.stopChoiceCopy}>
                          <Text
                            numberOfLines={1}
                            style={styles.stopChoiceTitle}
                          >
                            {context.stop.title}
                          </Text>
                          <Text style={styles.stopChoiceMeta}>
                            {context.day
                              ? `Day ${context.day.dayNumber} · ${formatStopDate(context.day.date)} · `
                              : ''}
                            {context.stop.startTime
                              ? `${context.stop.startTime} · `
                              : ''}
                            {context.stop.type}
                          </Text>
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
                  })}

                  {stopContexts.length === 0 && (
                    <Text style={styles.stopChoicesEmpty}>
                      Add moments in Plan before linking this booking.
                    </Text>
                  )}
                </View>
              )}

              <Text style={styles.relationshipHelp}>
                Link this booking to a moment so it appears with your plan.
              </Text>

              <BookingTimeEditor
                label="START"
                draft={startDraft}
                fallbackDate={workspace.trip.startDate}
                onChange={setStartDraft}
              />

              <BookingTimeEditor
                label="END"
                draft={endDraft}
                fallbackDate={workspace.trip.endDate}
                onChange={setEndDraft}
              />

              <View
                style={
                  styles.amountRow
                }
              >
                <View
                  style={
                    styles.amountField
                  }
                >
                  <Field
                    label="AMOUNT"
                    placeholder="450"
                    value={amount}
                    onChangeText={
                      setAmount
                    }
                    keyboardType="decimal-pad"
                  />
                </View>

                <View
                  style={
                    styles.currencyField
                  }
                >
                  <Field
                    label="CURRENCY"
                    placeholder="EUR"
                    value={currency}
                    onChangeText={
                      setCurrency
                    }
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <View
                style={
                  styles.paidRow
                }
              >
                <View
                  style={
                    styles.paidCopy
                  }
                >
                  <Text
                    style={
                      styles.paidTitle
                    }
                  >
                    Paid
                  </Text>

                  <Text
                    style={
                      styles.paidDescription
                    }
                  >
                    Mark this booking as
                    already paid.
                  </Text>
                </View>

                <Switch
                  value={isPaid}
                  disabled={status === 'cancelled'}
                  onValueChange={
                    setIsPaid
                  }
                  trackColor={{
                    false:
                      colors.borderStrong,

                    true:
                      colors.teal,
                  }}
                />
              </View>

              <Field
                label="NOTES"
                placeholder="Seat, terminal, check-in notes…"
                value={notes}
                onChangeText={
                  setNotes
                }
                multiline
              />

              <View
                style={
                  styles.sheetBottomSpace
                }
              />
            </ScrollView>

            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={
                editingBooking
                  ? 'Save booking changes'
                  : 'Save new booking'
              }
              disabled={isSaving}
              style={[
                styles.saveButton,

                isSaving &&
                  styles.disabled,
              ]}
              pressedStyle={styles.pressed}
              onPress={
                saveBooking
              }
            >
              <Text
                style={
                  styles.saveButtonText
                }
              >
                {isSaving
                  ? 'Saving…'
                  : editingBooking
                    ? 'Save changes'
                    : 'Add booking'}
              </Text>

              {!isSaving && (
                <Ionicons
                  name="arrow-forward"
                  size={19}
                  color={
                    colors.textInverse
                  }
                />
              )}
            </PressableScale>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

function BookingTimeEditor({
  label,
  draft,
  fallbackDate,
  onChange,
}: {
  label: string;
  draft: BookingTimeDraft;
  fallbackDate: string;
  onChange(value: BookingTimeDraft): void;
}) {
  if (draft.mode === 'preserved') {
    return (
      <View style={styles.temporalField}>
        <Text style={styles.temporalSectionLabel}>{label}</Text>
        <View style={styles.preservedTimeCard}>
          <View style={styles.preservedTimeHeader}>
            <Ionicons
              name={
                draft.kind === 'absolute-instant'
                  ? 'globe-outline'
                  : 'warning-outline'
              }
              size={20}
              color={
                draft.kind === 'absolute-instant'
                  ? colors.teal
                  : colors.warning
              }
            />
            <Text style={styles.preservedTimeTitle}>
              {draft.kind === 'absolute-instant'
                ? 'Saved absolute instant'
                : 'Saved time needs review'}
            </Text>
          </View>
          <Text style={styles.preservedTimeValue}>
            {draft.original}
          </Text>
          <Text style={styles.preservedTimeBody}>
            {draft.kind === 'absolute-instant'
              ? 'This saved time uses a different format. Replace or clear it to make changes.'
              : 'This saved time can’t be edited in its current format. Replace or clear it to make changes.'}
          </Text>
          <View style={styles.preservedTimeActions}>
            <Pressable
              accessibilityRole="button"
              style={styles.timeActionPrimary}
              onPress={() =>
                onChange({
                  mode: 'local',
                  date: '',
                  time: '',
                  edited: true,
                })
              }
            >
              <Text style={styles.timeActionPrimaryText}>
                Replace with local time
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.timeActionSecondary}
              onPress={() =>
                onChange({
                  mode: 'local',
                  date: '',
                  time: '',
                  edited: true,
                })
              }
            >
              <Text style={styles.timeActionSecondaryText}>
                Clear
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.temporalField}>
      <Text style={styles.temporalSectionLabel}>{label}</Text>

      <View style={styles.temporalRow}>
        <View style={styles.temporalHalf}>
          <CalendarDateField
            label="DATE"
            value={draft.date}
            fallbackDate={fallbackDate}
            compact
            onChange={(date) =>
              onChange({ ...draft, date, edited: true })
            }
          />
        </View>

        <View style={styles.temporalHalf}>
          <LocalTimeField
            label="TIME"
            value={draft.time}
            compact
            onChange={(time) =>
              onChange({ ...draft, time, edited: true })
            }
            onClear={() =>
              onChange({ ...draft, time: '', edited: true })
            }
          />
        </View>
      </View>

      {(draft.date || draft.time) && (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            onChange(bookingTimeDraft())
          }
        >
          <Text style={styles.clearTemporalValue}>
            CLEAR DATE AND TIME
          </Text>
        </Pressable>
      )}
    </View>
  );
}

interface FieldProps {
  label: string;
  placeholder: string;
  value: string;

  onChangeText(
    value: string,
  ): void;

  autoCapitalize?:
    | 'none'
    | 'sentences'
    | 'words'
    | 'characters';

  keyboardType?:
    | 'default'
    | 'decimal-pad'
    | 'numeric';

  multiline?: boolean;
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  autoCapitalize = 'sentences',
  keyboardType = 'default',
  multiline = false,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text
        style={styles.fieldLabel}
      >
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={
          onChangeText
        }
        placeholder={
          placeholder
        }
        placeholderTextColor={
          colors.textMuted
        }
        autoCapitalize={
          autoCapitalize
        }
        keyboardType={
          keyboardType
        }
        multiline={
          multiline
        }
        style={[
          styles.input,

          multiline &&
            styles.multilineInput,
        ]}
      />
    </View>
  );
}

const styles =
  StyleSheet.create({
    addButton: {
      width: 48,
      height: 48,

      borderRadius:
        radius.pill,

      backgroundColor:
        colors.brand,

      alignItems:
        'center',

      justifyContent:
        'center',

      ...shadows.subtle,
    },

    importLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      alignSelf: 'flex-start',
      marginTop: spacing[4],
      marginBottom: spacing[4],
    },

    importLinkText: {
      fontFamily: fontFamily.sansSemiBold,
      fontSize: fontSize.bodySmall,
      color: colors.brand,
    },

    emptyCard: {
      backgroundColor:
        colors.surfaceWarm,

      borderRadius:
        radius.xl,

      borderWidth: 1,

      borderColor:
        colors.border,

      padding:
        spacing[7],

      ...shadows.subtle,
    },

    emptyIcon: {
      width: 56,
      height: 56,

      borderRadius:
        radius.md,

      backgroundColor:
        colors.brandSoft,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginBottom:
        spacing[5],
    },

    emptyTitle: {
      fontFamily:
        fontFamily.serifSemiBold,

      fontSize:
        fontSize.title,

      lineHeight:
        lineHeight.title,

      color:
        colors.textPrimary,

      marginBottom:
        spacing[3],
    },

    emptyBody: {
      fontFamily:
        fontFamily.sansRegular,

      fontSize:
        fontSize.bodySmall,

      lineHeight:
        lineHeight.bodySmall,

      color:
        colors.textSecondary,

      marginBottom:
        spacing[6],
    },

    primaryButton: {
      height: 54,

      borderRadius:
        radius.md,

      backgroundColor:
        colors.brand,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        spacing[2],
    },

    primaryButtonText: {
      fontFamily:
        fontFamily.sansSemiBold,

      fontSize:
        fontSize.body,

      color:
        colors.textInverse,
    },

    bookingList: {
      gap:
        spacing[4],
    },

    bookingCard: {
      backgroundColor:
        colors.surface,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius:
        radius.lg,

      flexDirection:
        'row',

      padding:
        spacing[4],

      ...shadows.subtle,
    },

    bookingCardConfirmed: {
      borderLeftWidth: 3,
      borderLeftColor: colors.brand,
    },

    bookingIcon: {
      width: 46,
      height: 46,

      borderRadius:
        radius.md,

      backgroundColor:
        colors.tealSoft,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        spacing[4],
    },

    bookingContent: {
      flex: 1,
      gap: spacing[2],
    },

    bookingTop: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      alignItems: 'center',

      gap:
        spacing[3],
    },

    bookingTypeEyebrow: {
      fontFamily:
        fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 1.3,
      color: colors.brass,
      textTransform: 'uppercase',
    },

    bookingTitleWrap: {
      flex: 1,
    },

    bookingTitle: {
      fontFamily:
        fontFamily.serifSemiBold,

      fontSize:
        fontSize.titleSmall,

      lineHeight:
        lineHeight.titleSmall,

      color:
        colors.textPrimary,
    },

    bookingTemporal: {
      fontFamily:
        fontFamily.sansMedium,
      fontSize: fontSize.caption,
      color: colors.textSecondary,
    },

    bookingMetaLine: {
      fontFamily:
        fontFamily.sansRegular,
      fontSize: fontSize.caption,
      color: colors.textMuted,
      textTransform: 'capitalize',
      minHeight: 16,
    },

    provider: {
      fontFamily:
        fontFamily.sansRegular,

      fontSize:
        fontSize.caption,

      color:
        colors.textMuted,

      marginTop: 3,
    },

    statusPill: {
      alignSelf:
        'flex-start',

      backgroundColor:
        colors.tealSoft,

      borderRadius:
        radius.pill,

      paddingHorizontal:
        spacing[2],

      paddingVertical:
        spacing[1],
    },

    statusCancelled: {
      backgroundColor:
        colors.coralSoft,
    },

    statusCompleted: {
      backgroundColor:
        colors.brandSoft,
    },

    statusConfirmed: {
      backgroundColor:
        colors.brassSoft,
    },

    statusText: {
      fontFamily:
        fontFamily.sansBold,

      fontSize: 9,

      color:
        colors.textSecondary,

      letterSpacing: 0.6,
    },

    metaRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing[2],

      marginTop:
        spacing[3],
    },

    metaText: {
      fontFamily:
        fontFamily.sansRegular,

      fontSize:
        fontSize.caption,

      color:
        colors.textSecondary,
    },

    linkedStopRow: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      marginTop: spacing[4],
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radius.md,
      backgroundColor: colors.tealSoft,
    },

    linkedStopIcon: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },

    linkedStopCopy: {
      flex: 1,
    },

    linkedStopLabel: {
      fontFamily: fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 0.8,
      color: colors.teal,
    },

    linkedStopTitle: {
      marginTop: 2,
      fontFamily: fontFamily.sansMedium,
      fontSize: fontSize.caption,
      color: colors.textPrimary,
    },

    linkedAccommodationRow: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      marginTop: spacing[3],
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radius.md,
      backgroundColor: colors.brandSoft,
    },

    linkedAccommodationIcon: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },

    linkedAccommodationLabel: {
      fontFamily: fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 0.8,
      color: colors.brand,
    },

    bookingFooter: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      marginTop:
        spacing[4],

      paddingTop:
        spacing[4],

      borderTopWidth: 1,

      borderTopColor:
        colors.border,
    },

    priceWrap: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing[3],
    },

    amount: {
      fontFamily:
        fontFamily.sansSemiBold,

      fontSize:
        fontSize.bodySmall,

      color:
        colors.textPrimary,
    },

    paymentStatus: {
      fontFamily:
        fontFamily.sansBold,

      fontSize:
        fontSize.micro,

      color:
        colors.warning,

      letterSpacing: 0.8,
    },

    paymentPaid: {
      color:
        colors.success,
    },

    deleteButton: {
      width: 34,
      height: 34,

      borderRadius:
        radius.pill,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.coralSoft,
    },

    pressed: {
      opacity: 0.82,
    },

    modalBackdrop: {
      flex: 1,

      justifyContent:
        'flex-end',

      backgroundColor:
        colors.overlay,
    },

    sheet: {
      maxHeight: '92%',

      backgroundColor:
        colors.background,

      borderTopLeftRadius:
        radius.xxl,

      borderTopRightRadius:
        radius.xxl,

      paddingHorizontal:
        spacing[6],

      paddingBottom:
        spacing[8],
    },

    sheetHandle: {
      width: 42,
      height: 5,

      borderRadius:
        radius.pill,

      backgroundColor:
        colors.borderStrong,

      alignSelf:
        'center',

      marginTop:
        spacing[3],

      marginBottom:
        spacing[5],
    },

    sheetHeader: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      justifyContent:
        'space-between',

      marginBottom:
        spacing[6],
    },


    sheetTitle: {
      fontFamily:
        fontFamily.serifSemiBold,

      fontSize:
        fontSize.title,

      color:
        colors.textPrimary,

      marginTop: 0,
    },

    closeButton: {
      width: 40,
      height: 40,

      borderRadius:
        radius.pill,

      backgroundColor:
        colors.surface,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    field: {
      gap:
        spacing[2],

      marginBottom:
        spacing[4],
    },

    fieldLabel: {
      fontFamily:
        fontFamily.sansBold,

      fontSize:
        fontSize.micro,

      letterSpacing: 1.3,

      color:
        colors.brass,

      marginBottom:
        spacing[2],
    },

    stopPickerSummary: {
      minHeight: 66,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surface,
    },

    stopPickerIcon: {
      width: 38,
      height: 38,
      borderRadius: radius.sm,
      backgroundColor: colors.tealSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },

    stopPickerCopy: {
      flex: 1,
    },

    stopPickerLabel: {
      fontFamily: fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 0.8,
      color: colors.teal,
    },

    stopPickerTitle: {
      marginTop: 3,
      fontFamily: fontFamily.sansMedium,
      fontSize: fontSize.bodySmall,
      color: colors.textPrimary,
    },

    stopChoices: {
      gap: spacing[2],
      marginTop: spacing[2],
      padding: spacing[2],
      borderRadius: radius.md,
      backgroundColor: colors.backgroundSoft,
    },

    stopChoice: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: 'transparent',
      backgroundColor: colors.surface,
    },

    stopChoiceSelected: {
      borderColor: colors.teal,
      backgroundColor: colors.tealSoft,
    },

    stopChoiceIcon: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      backgroundColor: colors.backgroundSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },

    stopChoiceCopy: {
      flex: 1,
    },

    stopChoiceTitle: {
      fontFamily: fontFamily.sansSemiBold,
      fontSize: fontSize.bodySmall,
      color: colors.textPrimary,
    },

    stopChoiceMeta: {
      marginTop: 3,
      fontFamily: fontFamily.sansRegular,
      fontSize: fontSize.micro,
      color: colors.textMuted,
      textTransform: 'capitalize',
    },

    stopChoicesEmpty: {
      padding: spacing[4],
      fontFamily: fontFamily.sansRegular,
      fontSize: fontSize.caption,
      lineHeight: lineHeight.caption,
      color: colors.textSecondary,
    },

    relationshipHelp: {
      marginTop: spacing[2],
      marginBottom: spacing[5],
      fontFamily: fontFamily.sansRegular,
      fontSize: fontSize.caption,
      lineHeight: lineHeight.caption,
      color: colors.textMuted,
    },

    temporalField: {
      gap: spacing[3],
      marginBottom: spacing[5],
      padding: spacing[3],
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.backgroundSoft,
    },

    temporalSectionLabel: {
      fontFamily: fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 1.3,
      color: colors.brass,
    },

    temporalRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing[2],
    },

    temporalHalf: {
      flex: 1,
      minWidth: 0,
    },

    preservedTimeCard: {
      gap: spacing[3],
      padding: spacing[4],
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },

    preservedTimeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },

    preservedTimeTitle: {
      fontFamily: fontFamily.sansSemiBold,
      fontSize: fontSize.bodySmall,
      color: colors.textPrimary,
    },

    preservedTimeValue: {
      fontFamily: fontFamily.sansMedium,
      fontSize: fontSize.caption,
      color: colors.textPrimary,
    },

    preservedTimeBody: {
      fontFamily: fontFamily.sansRegular,
      fontSize: fontSize.caption,
      lineHeight: lineHeight.caption,
      color: colors.textSecondary,
    },

    preservedTimeActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing[2],
    },

    timeActionPrimary: {
      minHeight: 40,
      justifyContent: 'center',
      paddingHorizontal: spacing[3],
      borderRadius: radius.pill,
      backgroundColor: colors.brand,
    },

    timeActionPrimaryText: {
      fontFamily: fontFamily.sansSemiBold,
      fontSize: fontSize.caption,
      color: colors.textInverse,
    },

    timeActionSecondary: {
      minHeight: 40,
      justifyContent: 'center',
      paddingHorizontal: spacing[3],
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },

    timeActionSecondaryText: {
      fontFamily: fontFamily.sansSemiBold,
      fontSize: fontSize.caption,
      color: colors.textSecondary,
    },

    clearTemporalValue: {
      alignSelf: 'flex-end',
      fontFamily: fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 1,
      color: colors.brand,
    },

    input: {
      minHeight: 54,

      borderRadius:
        radius.md,

      backgroundColor:
        colors.surface,

      borderWidth: 1,

      borderColor:
        colors.border,

      paddingHorizontal:
        spacing[4],

      fontFamily:
        fontFamily.sansMedium,

      fontSize:
        fontSize.body,

      color:
        colors.textPrimary,
    },

    multilineInput: {
      minHeight: 96,

      paddingTop:
        spacing[4],

      textAlignVertical:
        'top',
    },

    typeGrid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      gap:
        spacing[2],

      marginBottom:
        spacing[5],
    },

    typeButton: {
      width: '22%',

      minHeight: 54,

      borderRadius:
        radius.md,

      borderWidth: 1,

      borderColor:
        colors.border,

      backgroundColor:
        colors.surface,

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 4,
    },

    typeButtonSelected: {
      backgroundColor:
        colors.brand,

      borderColor:
        colors.brand,
    },

    typeText: {
      fontFamily:
        fontFamily.sansMedium,

      fontSize:
        fontSize.micro,

      color:
        colors.textPrimary,
    },

    typeTextSelected: {
      color:
        colors.textInverse,
    },

    statusSelector: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      gap:
        spacing[2],

      marginBottom:
        spacing[6],
    },

    statusOption: {
      borderRadius:
        radius.pill,

      borderWidth: 1,

      borderColor:
        colors.border,

      backgroundColor:
        colors.surface,

      paddingHorizontal:
        spacing[3],

      paddingVertical:
        spacing[2],
    },

    statusOptionSelected: {
      backgroundColor:
        colors.brand,

      borderColor:
        colors.brand,
    },

    statusOptionText: {
      fontFamily:
        fontFamily.sansMedium,

      fontSize:
        fontSize.caption,

      color:
        colors.textSecondary,
    },

    statusOptionTextSelected: {
      color:
        colors.textInverse,
    },

    amountRow: {
      flexDirection:
        'row',

      gap:
        spacing[3],
    },

    amountField: {
      flex: 2,
    },

    currencyField: {
      flex: 1,
    },

    paidRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      backgroundColor:
        colors.surface,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius:
        radius.md,

      padding:
        spacing[4],

      marginBottom:
        spacing[5],
    },

    paidCopy: {
      flex: 1,

      paddingRight:
        spacing[4],
    },

    paidTitle: {
      fontFamily:
        fontFamily.sansSemiBold,

      fontSize:
        fontSize.body,

      color:
        colors.textPrimary,
    },

    paidDescription: {
      fontFamily:
        fontFamily.sansRegular,

      fontSize:
        fontSize.caption,

      color:
        colors.textMuted,

      marginTop: 3,
    },

    saveButton: {
      height: 56,

      borderRadius:
        radius.md,

      backgroundColor:
        colors.brand,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        spacing[3],

      marginTop:
        spacing[4],
    },

    saveButtonText: {
      fontFamily:
        fontFamily.sansSemiBold,

      fontSize:
        fontSize.body,

      color:
        colors.textInverse,
    },

    disabled: {
      opacity: 0.6,
    },

    bottomSpace: {
      height:
        spacing[12],
    },

    sheetBottomSpace: {
      height:
        spacing[10],
    },
  });
