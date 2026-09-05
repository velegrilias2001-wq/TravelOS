/**
 * Shared motion timing for TravelOS elevation.
 * Prefer short, purposeful motion. Always respect Reduce Motion callers.
 */
export const motion = {
  /** Micro feedback (press, tab icon). */
  instantMs: 90,
  /** Enter/exit of small UI facts. */
  quickMs: 180,
  /** Screen section stagger. */
  sectionMs: 280,
  /** Hero / primary composition. */
  heroMs: 420,
  /** Stagger delay between sibling enters. */
  staggerMs: 48,
  /** Soft spring for translate+fade (Reanimated damping/stiffness). */
  softSpring: {
    damping: 22,
    stiffness: 210,
    mass: 0.85,
  },
} as const;
