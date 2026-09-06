/**
 * Curated packing suggestion seeds.
 * Never written as truth until the traveler accepts each title.
 */
export const PACKING_TEMPLATE_SEEDS = [
  'Passport / ID',
  'Tickets & confirmations',
  'Phone charger',
  'Medications',
  'Toothbrush',
  'Comfortable shoes',
] as const;

export type PackingTemplateSeed =
  (typeof PACKING_TEMPLATE_SEEDS)[number];

export function packingTemplateSuggestions(input?: {
  alreadyTitles?: readonly string[];
  limit?: number;
}): string[] {
  const existing = new Set(
    (input?.alreadyTitles ?? []).map((title) =>
      title.trim().toLowerCase(),
    ),
  );
  const limit = input?.limit ?? PACKING_TEMPLATE_SEEDS.length;

  return PACKING_TEMPLATE_SEEDS.filter(
    (title) => !existing.has(title.toLowerCase()),
  ).slice(0, Math.max(0, limit));
}
