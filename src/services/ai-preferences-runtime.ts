import {
  loadAiPreferences,
  saveAiPreferences,
  type AiPreferences,
} from '@/data/repositories/ai-preferences-persistence';
import {
  assertAiEnabledForClient,
  getCachedAiEnabled,
  setCachedAiEnabled,
} from './ai-preferences-cache';

export {
  assertAiEnabledForClient,
  getCachedAiEnabled,
  setCachedAiEnabled,
};

export async function refreshAiPreferencesCache(): Promise<AiPreferences> {
  const prefs = await loadAiPreferences();
  setCachedAiEnabled(prefs.enabled);
  return prefs;
}

export async function persistAiPreferences(input: {
  enabled: boolean;
}): Promise<AiPreferences> {
  const prefs = await saveAiPreferences(input);
  setCachedAiEnabled(prefs.enabled);
  return prefs;
}
