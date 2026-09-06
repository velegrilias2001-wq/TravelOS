/**
 * Sync in-memory TravelOS AI kill-switch cache.
 * Kept free of SQLite imports so Node unit tests can load AI clients.
 */

let cachedEnabled = true;

export function getCachedAiEnabled(): boolean {
  return cachedEnabled;
}

export function setCachedAiEnabled(enabled: boolean): void {
  cachedEnabled = enabled;
}

export async function assertAiEnabledForClient(): Promise<void> {
  if (!cachedEnabled) {
    throw new Error('ai_disabled_by_traveler');
  }
}
