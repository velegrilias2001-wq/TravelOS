/**
 * Apply a proposed rerank onto an already-retrieved grounded list.
 *
 * The model may only reorder identities that were already retrieved.
 * Invented identities fail closed. Missing identities keep their
 * original relative order at the end. Scores are never persisted.
 */
export function applyRerankedIdentities(
  originalIdentities: readonly string[],
  proposed: unknown,
): string[] {
  if (!Array.isArray(proposed)) {
    throw new Error(
      'Rerank response is not an identity list',
    );
  }

  const allowed = new Set(originalIdentities);
  const seen = new Set<string>();
  const head: string[] = [];

  for (const value of proposed) {
    if (typeof value !== 'string' || !value) {
      throw new Error(
        'Rerank response contains an invalid identity',
      );
    }

    if (!allowed.has(value)) {
      throw new Error(
        `Rerank invented grounded identity "${value}"`,
      );
    }

    if (seen.has(value)) {
      continue;
    }

    seen.add(value);
    head.push(value);
  }

  const tail = originalIdentities.filter(
    (identity) => !seen.has(identity),
  );

  return [...head, ...tail];
}

/**
 * Reorder semantic hits by a fail-closed identity list.
 * Unknown or partial responses leave the original order.
 */
export function reorderSemanticHitsByIdentities<
  T extends { identity: string },
>(
  hits: readonly T[],
  proposedIdentities: unknown,
): T[] {
  const originalIdentities = hits.map((hit) => hit.identity);

  try {
    const ordered = applyRerankedIdentities(
      originalIdentities,
      proposedIdentities,
    );
    const byIdentity = new Map(
      hits.map((hit) => [hit.identity, hit]),
    );

    return ordered
      .map((identity) => byIdentity.get(identity))
      .filter((hit): hit is T => hit != null);
  } catch {
    return [...hits];
  }
}
