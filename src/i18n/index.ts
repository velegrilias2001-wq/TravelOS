import { el } from './el';

/**
 * The active copy catalogue.
 *
 * Read strings as typed properties (`strings.trips.title`) rather than by
 * string key, so a missing or renamed entry is a typecheck failure instead of
 * an empty label at runtime.
 */
export const strings = el;

export type Strings = typeof el;
