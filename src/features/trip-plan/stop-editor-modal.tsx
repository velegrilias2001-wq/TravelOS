import { Ionicons } from '@expo/vector-icons';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { LocalTimeField } from '@/components/ui/native-date-time-fields';
import type {
  TripDay,
  TripStop,
  TripStopType,
} from '@/domain/entities';
import { styles } from '@/features/trip-plan/plan-styles';
import {
  STOP_TYPES,
  hasCoordinates,
  type StopLocation,
} from '@/features/trip-plan/stop-types';
import { LocationSearchNotice } from '@/features/destinations/location-search-notice';
import type { LocationSelectionOutcome } from '@/services/location-selection';
import { planStopLivedBadge } from '@/services/stop-lived-progress';
import { colors } from '@/theme';

type StopEditorModalProps = {
  selectedDay: TripDay | null;
  editingStop: TripStop | null;
  title: string;
  setTitle: (value: string) => void;
  time: string;
  setTime: (value: string) => void;
  setTimeEdited: (value: boolean) => void;
  endTime: string;
  setEndTime: (value: string) => void;
  setEndTimeEdited: (value: boolean) => void;
  type: TripStopType;
  setType: (value: TripStopType) => void;
  pickedLocation: StopLocation | null;
  isPickingLocation: boolean;
  isSaving: boolean;
  chooseLocation: () => void;
  removeLocation: () => void;
  saveStop: () => void;
  closeModal: () => void;
  livedByStopId: Parameters<typeof planStopLivedBadge>[1];
  pendingImportClaimId: string | null;
  locationNotice:
    | {
        status: Exclude<LocationSelectionOutcome['status'], 'selected'>;
        reason?: string;
      }
    | null;
  onDismissLocationNotice: () => void;
};

/**
 * The Plan stop editor sheet.
 *
 * Extracted verbatim from plan.tsx. PlanScreen still owns the draft state and
 * the close guard, so this component stays presentational: it renders the
 * sheet and calls back. No field behaviour or copy was changed.
 */
export function StopEditorModal({
  selectedDay,
  editingStop,
  title,
  setTitle,
  time,
  setTime,
  setTimeEdited,
  endTime,
  setEndTime,
  setEndTimeEdited,
  type,
  setType,
  pickedLocation,
  isPickingLocation,
  isSaving,
  chooseLocation,
  removeLocation,
  saveStop,
  closeModal,
  livedByStopId,
  pendingImportClaimId,
  locationNotice,
  onDismissLocationNotice,
}: StopEditorModalProps) {
  return (
  <Modal
    visible={
      selectedDay !== null
    }
    transparent
    animationType="slide"
    onRequestClose={
      closeModal
    }
  >
    <View
      style={
        styles.modalBackdrop
      }
    >
      <View
        style={
          styles.sheet
        }
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
                styles.sheetEyebrow
              }
            >
              {selectedDay
                ? `DAY ${selectedDay.dayNumber}`
                : ''}
            </Text>

            <Text
              style={
                styles.sheetTitle
              }
            >
              {editingStop
                ? 'Edit moment'
                : pendingImportClaimId
                  ? 'Add imported moment'
                  : 'Add a moment'}
            </Text>
            {!editingStop &&
              pendingImportClaimId ? (
                <Text
                  style={
                    styles.sheetLivedNote
                  }
                >
                  Prefill from import. Nothing is saved until you confirm.
                </Text>
              ) : null}
            {editingStop &&
              planStopLivedBadge(
                editingStop.id,
                livedByStopId,
              ) === 'done' && (
                <Text
                  style={
                    styles.sheetLivedNote
                  }
                >
                  Marked done in Companion. Changing the time still edits the saved plan, not that mark.
                </Text>
              )}
            {editingStop &&
              planStopLivedBadge(
                editingStop.id,
                livedByStopId,
              ) === 'skipped' && (
                <Text
                  style={
                    styles.sheetLivedNote
                  }
                >
                  Marked skipped in Companion. Changing the time still edits the saved plan, not that mark.
                </Text>
              )}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close moment editor"
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
              styles.typeRow
            }
          >
            {STOP_TYPES.map(
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
                    onPress={() =>
                      setType(
                        item.value,
                      )
                    }
                  >
                    <Ionicons
                      name={
                        item.icon
                      }
                      size={18}
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

          <View
            style={
              styles.field
            }
          >
            <Text
              style={
                styles.fieldLabel
              }
            >
              NAME
            </Text>

            <TextInput
              value={title}
              onChangeText={
                setTitle
              }
              placeholder="Museum, dinner, temple…"
              placeholderTextColor={
                colors.textMuted
              }
              style={
                styles.input
              }
            />
          </View>

          <View
            style={
              styles.field
            }
          >
            <View
              style={
                styles.locationLabelRow
              }
            >
              <Text
                style={
                  styles.fieldLabel
                }
              >
                LOCATION
              </Text>

              {hasCoordinates(
                pickedLocation,
              ) && (
                <Text
                  style={
                    styles.locationReady
                  }
                >
                  MAPPED
                </Text>
              )}
            </View>

            {pickedLocation ? (
              <View
                style={
                  styles.locationCard
                }
              >
                <View
                  style={
                    styles.locationIcon
                  }
                >
                  <Ionicons
                    name="location"
                    size={21}
                    color={
                      colors.teal
                    }
                  />
                </View>

                <View
                  style={
                    styles.locationCopy
                  }
                >
                  <Text
                    numberOfLines={
                      1
                    }
                    style={
                      styles.locationName
                    }
                  >
                    {
                      pickedLocation.name
                    }
                  </Text>

                  {pickedLocation.address && (
                    <Text
                      numberOfLines={
                        2
                      }
                      style={
                        styles.locationAddress
                      }
                    >
                      {
                        pickedLocation.address
                      }
                    </Text>
                  )}

                </View>

                {hasCoordinates(
                  pickedLocation,
                ) && (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={
                      colors.teal
                    }
                  />
                )}
              </View>
            ) : (
              <View
                style={
                  styles.locationEmpty
                }
              >
                <Ionicons
                  name="map-outline"
                  size={22}
                  color={
                    colors.textMuted
                  }
                />

                <View
                  style={
                    styles.locationEmptyCopy
                  }
                >
                  <Text
                    style={
                      styles.locationEmptyTitle
                    }
                  >
                    Add a location
                  </Text>

                  <Text
                    style={
                      styles.locationEmptyBody
                    }
                  >
                    Show this moment on your trip map.
                  </Text>
                </View>
              </View>
            )}

            <View
              style={
                styles.locationActions
              }
            >
              <Pressable
                disabled={
                  isPickingLocation
                }
                style={[
                  styles.locationButton,

                  isPickingLocation &&
                    styles.disabled,
                ]}
                onPress={
                  chooseLocation
                }
              >
                <Ionicons
                  name={
                    pickedLocation
                      ? 'map-outline'
                      : 'search-outline'
                  }
                  size={18}
                  color={
                    colors.textInverse
                  }
                />

                <Text
                  style={
                    styles.locationButtonText
                  }
                >
                  {isPickingLocation
                    ? 'Opening map…'
                    : pickedLocation
                      ? 'Change location'
                      : 'Choose location'}
                </Text>
              </Pressable>

              <LocationSearchNotice
                status={locationNotice?.status ?? null}
                reason={locationNotice?.reason}
                onRetry={chooseLocation}
                onDismiss={onDismissLocationNotice}
              />

              {pickedLocation && (
                <Pressable
                  style={
                    styles.removeLocationButton
                  }
                  onPress={
                    removeLocation
                  }
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color={
                      colors.danger
                    }
                  />
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.timeSection}>
            <Text
              style={
                styles.fieldLabel
              }
            >
              TIME · OPTIONAL
            </Text>

            <View style={styles.timeRow}>
              <View style={styles.timeColumn}>
                <LocalTimeField
                  compact
                  label="START TIME"
                  value={time}
                  onChange={(value) => {
                    setTime(value);
                    setTimeEdited(true);
                  }}
                  onClear={() => {
                    setTime('');
                    setTimeEdited(true);
                  }}
                />
              </View>

              <View style={styles.timeColumn}>
                <LocalTimeField
                  compact
                  label="END TIME"
                  value={endTime}
                  onChange={(value) => {
                    setEndTime(value);
                    setEndTimeEdited(true);
                  }}
                  onClear={() => {
                    setEndTime('');
                    setEndTimeEdited(true);
                  }}
                />
              </View>
            </View>

            <Text style={styles.timeHelp}>
              Add an end time when you know it. TravelOS can use real gaps between moments as flexible time.
            </Text>
          </View>

          <Pressable
            disabled={
              isSaving ||
              isPickingLocation
            }
            style={[
              styles.saveButton,

              (isSaving ||
                isPickingLocation) &&
                styles.disabled,
            ]}
            onPress={
              saveStop
            }
          >
            <Text
              style={
                styles.saveButtonText
              }
            >
              {isSaving
                ? 'Saving…'
                : editingStop
                  ? 'Save changes'
                  : 'Add moment'}
            </Text>

            {!isSaving &&
              !isPickingLocation && (
                <Ionicons
                  name="arrow-forward"
                  size={19}
                  color={
                    colors.textInverse
                  }
                />
              )}
          </Pressable>

          <View
            style={
              styles.sheetBottomSpace
            }
          />
        </ScrollView>
      </View>
    </View>
  </Modal>
  );
}
