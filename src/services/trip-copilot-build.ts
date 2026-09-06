import type { TripCopilotProposal } from './trip-copilot';

/**
 * At most three next Accept/open actions for Copilot Build mode.
 * Readiness and packing first, then plan assist / import / free time.
 */
export function selectTripCopilotBuildQueue(
  proposals: readonly TripCopilotProposal[],
  limit = 3,
): TripCopilotProposal[] {
  const readiness = proposals.filter(
    (item) => item.kind === 'readiness',
  );
  const packing = proposals.filter(
    (item) => item.kind === 'packing',
  );
  const planAssist = proposals.filter(
    (item) => item.kind === 'plan_assist',
  );
  const importReview = proposals.filter(
    (item) => item.kind === 'import_review',
  );
  const freeTime = proposals.filter(
    (item) => item.kind === 'free_time',
  );

  return [
    ...readiness,
    ...packing,
    ...planAssist,
    ...importReview,
    ...freeTime,
  ].slice(0, Math.max(0, limit));
}
