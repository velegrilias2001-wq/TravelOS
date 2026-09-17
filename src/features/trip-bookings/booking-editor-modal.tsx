import { Ionicons } from '@expo/vector-icons';
import type { Dispatch, SetStateAction } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';

import type {
  Booking,
  BookingStatus,
  BookingType,
} from '@/domain/entities';
import { PressableScale } from '@/features/motion/pressable-scale';
import { Field } from '@/features/trip-bookings/booking-field';
import {
  BOOKING_STATUSES,
  BOOKING_TYPES,
  type BookingTimeDraft,
  formatStopDate,
} from '@/features/trip-bookings/booking-form-model';
import { BookingTimeEditor } from '@/features/trip-bookings/booking-time-editor';
import { styles } from '@/features/trip-bookings/bookings-styles';
import type { TripWorkspace } from '@/services/trip-service';
import { buildItineraryStopContexts } from '@/services/booking-stop-relationship';
import { colors } from '@/theme';
import { strings } from '@/i18n';

type StopContext = ReturnType<typeof buildItineraryStopContexts>[number];

type BookingEditorModalProps = {
  modalVisible: boolean;
  editingBooking: Booking | null;
  workspace: TripWorkspace;
  sheetScrollMaxHeight: number;
  sheetBottomPad: number;

  type: BookingType;
  setType: Dispatch<SetStateAction<BookingType>>;
  status: BookingStatus;
  setStatus: Dispatch<SetStateAction<BookingStatus>>;
  title: string;
  setTitle: Dispatch<SetStateAction<string>>;
  provider: string;
  setProvider: Dispatch<SetStateAction<string>>;
  confirmationCode: string;
  setConfirmationCode: Dispatch<SetStateAction<string>>;
  externalUrl: string;
  setExternalUrl: Dispatch<SetStateAction<string>>;

  stopContexts: StopContext[];
  selectedStopContext: StopContext | undefined;
  stopId: string | undefined;
  setStopId: Dispatch<SetStateAction<string | undefined>>;
  stopPickerOpen: boolean;
  setStopPickerOpen: Dispatch<SetStateAction<boolean>>;

  startDraft: BookingTimeDraft;
  setStartDraft: Dispatch<SetStateAction<BookingTimeDraft>>;
  endDraft: BookingTimeDraft;
  setEndDraft: Dispatch<SetStateAction<BookingTimeDraft>>;

  amount: string;
  setAmount: Dispatch<SetStateAction<string>>;
  currency: string;
  setCurrency: Dispatch<SetStateAction<string>>;
  isPaid: boolean;
  setIsPaid: Dispatch<SetStateAction<boolean>>;
  notes: string;
  setNotes: Dispatch<SetStateAction<string>>;

  isSaving: boolean;
  saveBooking: () => void;
  requestCloseModal: () => void;
};

/**
 * The Bookings editor sheet.
 *
 * Extracted verbatim from bookings.tsx. BookingsScreen still owns the draft
 * state and the close guard, so this stays presentational. The wide prop list
 * is the honest shape of that coupling: the editor state wants its own hook,
 * which is tracked separately.
 */
export function BookingEditorModal({
  modalVisible,
  editingBooking,
  workspace,
  sheetScrollMaxHeight,
  sheetBottomPad,
  type,
  setType,
  status,
  setStatus,
  title,
  setTitle,
  provider,
  setProvider,
  confirmationCode,
  setConfirmationCode,
  externalUrl,
  setExternalUrl,
  stopContexts,
  selectedStopContext,
  stopId,
  setStopId,
  stopPickerOpen,
  setStopPickerOpen,
  startDraft,
  setStartDraft,
  endDraft,
  setEndDraft,
  amount,
  setAmount,
  currency,
  setCurrency,
  isPaid,
  setIsPaid,
  notes,
  setNotes,
  isSaving,
  saveBooking,
  requestCloseModal,
}: BookingEditorModalProps) {
  return (
  <Modal
    visible={modalVisible}
    transparent
    animationType="slide"
    onRequestClose={() => {
      Keyboard.dismiss();
      requestCloseModal();
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
                ? strings.bookings.editorEdit
                : strings.bookings.editorAdd}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.bookings.editorClose}
            style={
              styles.closeButton
            }
            onPress={
              requestCloseModal
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
            {strings.bookings.labelType}
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
            {strings.bookings.labelStatus}
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
            label={strings.bookings.labelName}
            placeholder={strings.bookings.placeholderName}
            value={title}
            onChangeText={
              setTitle
            }
          />

          <Field
            label={strings.bookings.labelProvider}
            placeholder={strings.bookings.placeholderProvider}
            value={provider}
            onChangeText={
              setProvider
            }
          />

          <Field
            label={strings.bookings.labelCode}
            placeholder="ABC123"
            value={
              confirmationCode
            }
            onChangeText={
              setConfirmationCode
            }
            autoCapitalize="characters"
          />

          <Field
            label={strings.bookings.labelLink}
            placeholder="https://…"
            value={externalUrl}
            onChangeText={setExternalUrl}
            autoCapitalize="none"
          />

          <Text style={styles.fieldLabel}>
            ADD TO YOUR PLAN
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.bookings.choosePlanMoment}
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
                  strings.bookings.chooseMomentFromPlan}
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
                    {strings.bookings.notAddedToPlan}
                  </Text>
                  <Text style={styles.stopChoiceMeta}>
                    {strings.bookings.keepSeparate}
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
                  {strings.bookings.addMomentsFirst}
                </Text>
              )}
            </View>
          )}

          <Text style={styles.relationshipHelp}>
            {strings.bookings.linkHelp}
          </Text>

          <BookingTimeEditor
            label={strings.bookings.labelStart}
            draft={startDraft}
            fallbackDate={workspace.trip.startDate}
            onChange={setStartDraft}
          />

          <BookingTimeEditor
            label={strings.bookings.labelEnd}
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
                label={strings.bookings.labelAmount}
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
                label={strings.bookings.labelCurrency}
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
                {strings.bookings.paid}
              </Text>

              <Text
                style={
                  styles.paidDescription
                }
              >
                {strings.bookings.paidHelp}
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
            label={strings.bookings.labelNotes}
            placeholder={strings.bookings.placeholderNotes}
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
              ? strings.bookings.saveBookingChanges
              : strings.bookings.saveNewBooking
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
              ? strings.bookings.saving
              : editingBooking
                ? strings.bookings.saveChanges
                : strings.bookings.editorAdd}
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
  );
}
