import type { TripStop, TripStopLocation } from '../domain/entities/trip-stop';

/** Session-only editor values, never a second persistent TripStop. */
export type StopEditorDraft = Pick<TripStop, 'title' | 'type' | 'startTime' | 'endTime'> & {
  location?: TripStopLocation | null;
};

export function hasUnsavedStopDraft(
  draft: StopEditorDraft,
  saved?: StopEditorDraft | null,
): boolean {
  const baseline: StopEditorDraft = saved ?? { title: '', type: 'place' };
  if (
    draft.title !== baseline.title ||
    draft.type !== baseline.type ||
    (draft.startTime ?? '') !== (baseline.startTime ?? '') ||
    (draft.endTime ?? '') !== (baseline.endTime ?? '')
  ) return true;

  // Compare facts rather than object identity or property insertion order.
  // Clearing/replacing a pin matters even when its display name is unchanged.
  return (['name', 'address', 'latitude', 'longitude', 'placeId'] as const)
    .some((field) => draft.location?.[field] !== baseline.location?.[field]);
}
