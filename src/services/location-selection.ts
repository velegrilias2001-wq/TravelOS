import type {
  PickLocationOptions,
  PickLocationResult,
} from 'expo-location-picker';
import { strings } from '../i18n';

/**
 * Explicit outcome of one native location-picker presentation.
 *
 * The picker module resolves with a result or `null`, and only throws when
 * presentation itself fails. A provider failure inside the picker — Places
 * blocked for this package, Places API not enabled, billing off — is logged
 * natively and rendered as an empty prediction list, so it reaches JavaScript
 * as an ordinary `null`. TravelOS therefore cannot claim a provider error
 * happened; it can only state that nothing was saved and say what that may
 * mean. Never turn `dismissed` into an invented error.
 */
export type LocationSelectionOutcome =
  | {
      status: 'selected';
      result: PickLocationResult;
    }
  | {
      status: 'dismissed';
    }
  | {
      status: 'unavailable';
      reason: string;
    };

export const LOCATION_PICKER_UNAVAILABLE_REASON =
  strings.locationNotice.pickerUnavailable;

type PickLocationFn = (
  options?: PickLocationOptions,
) => Promise<PickLocationResult | null>;

/**
 * Present the native picker and report a definite outcome.
 *
 * `pickLocation` is injectable so the outcome mapping can be tested without a
 * native module.
 */
export async function requestLocationSelection(
  pick: PickLocationFn,
  options?: PickLocationOptions,
): Promise<LocationSelectionOutcome> {
  try {
    const result = await pick(options);

    if (!result) {
      return { status: 'dismissed' };
    }

    return { status: 'selected', result };
  } catch {
    return {
      status: 'unavailable',
      reason: LOCATION_PICKER_UNAVAILABLE_REASON,
    };
  }
}
