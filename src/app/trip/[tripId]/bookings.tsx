import { useEditorCloseGuard } from '@/features/forms/use-editor-close-guard';
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
  Linking,
  Pressable,
  Share,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

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
import {
  resolveBookingCurrencyCode,
} from '@/services/booking-finance';
import {
  listBookingQuickActions,
} from '@/services/booking-actions';
import {
  buildItineraryStopContexts,
} from '@/services/booking-stop-relationship';
import {
  tripDestinationLabel,
} from '@/services/destination-authoring';

import { colors } from '@/theme';
import { styles } from '@/features/trip-bookings/bookings-styles';
import { BookingEditorModal } from '@/features/trip-bookings/booking-editor-modal';
import {
  BOOKING_TYPES,
  type BookingTimeDraft,
  bookingTimeDraft,
  bookingValueFromDraft,
  formatDateTime,
  formatStopDate,
  getBookingIcon,
} from '@/features/trip-bookings/booking-form-model';

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
    externalUrl,
    setExternalUrl,
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
    setExternalUrl('');
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

    setExternalUrl(
      booking.externalUrl ?? '',
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

  const requestCloseModal = useEditorCloseGuard(modalVisible, { type, status, title, provider, confirmationCode, externalUrl, stopId, startDraft, endDraft, amount, currency, isPaid, notes }, isSaving, closeModal);

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

              externalUrl:
                externalUrl.trim() ||
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

              externalUrl:
                externalUrl.trim() ||
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
      <Screen scroll clearTabBar>
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

                      {listBookingQuickActions(
                        booking,
                      ).length > 0 && (
                        <View style={styles.quickActions}>
                          {listBookingQuickActions(
                            booking,
                          ).map((action) => (
                            <Pressable
                              key={action.id}
                              accessibilityRole="button"
                              accessibilityLabel={
                                action.accessibilityLabel
                              }
                              style={({ pressed }) => [
                                styles.quickAction,
                                pressed && styles.pressed,
                              ]}
                              onPress={() => {
                                void (async () => {
                                  try {
                                    if (
                                      action.id ===
                                      'open_url'
                                    ) {
                                      const can =
                                        await Linking.canOpenURL(
                                          action.value,
                                        );

                                      if (!can) {
                                        Alert.alert(
                                          'Link unavailable',
                                          'This saved booking link could not be opened.',
                                        );
                                        return;
                                      }

                                      await Linking.openURL(
                                        action.value,
                                      );
                                      return;
                                    }

                                    await Share.share({
                                      message:
                                        action.value,
                                    });
                                  } catch (error) {
                                    console.error(
                                      '[Bookings] Quick action failed:',
                                      error,
                                    );
                                    Alert.alert(
                                      'Action failed',
                                      'Nothing was changed in this booking.',
                                    );
                                  }
                                })();
                              }}
                            >
                              <Text
                                style={
                                  styles.quickActionText
                                }
                              >
                                {action.label}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      )}

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

      <BookingEditorModal
        modalVisible={modalVisible}
        editingBooking={editingBooking}
        workspace={workspace}
        sheetScrollMaxHeight={sheetScrollMaxHeight}
        sheetBottomPad={sheetBottomPad}
        type={type}
        setType={setType}
        status={status}
        setStatus={setStatus}
        title={title}
        setTitle={setTitle}
        provider={provider}
        setProvider={setProvider}
        confirmationCode={confirmationCode}
        setConfirmationCode={setConfirmationCode}
        externalUrl={externalUrl}
        setExternalUrl={setExternalUrl}
        stopContexts={stopContexts}
        selectedStopContext={selectedStopContext}
        stopId={stopId}
        setStopId={setStopId}
        stopPickerOpen={stopPickerOpen}
        setStopPickerOpen={setStopPickerOpen}
        startDraft={startDraft}
        setStartDraft={setStartDraft}
        endDraft={endDraft}
        setEndDraft={setEndDraft}
        amount={amount}
        setAmount={setAmount}
        currency={currency}
        setCurrency={setCurrency}
        isPaid={isPaid}
        setIsPaid={setIsPaid}
        notes={notes}
        setNotes={setNotes}
        isSaving={isSaving}
        saveBooking={saveBooking}
        requestCloseModal={requestCloseModal}
      />
    </>
  );
}
