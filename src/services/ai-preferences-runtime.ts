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
import { createAiPreferencesLifecycle } from './ai-preferences-lifecycle';

export {
  assertAiEnabledForClient,
  getCachedAiEnabled,
  setCachedAiEnabled,
};

const lifecycle = createAiPreferencesLifecycle({
  load: loadAiPreferences,
  save: saveAiPreferences,
  publishEnabled: setCachedAiEnabled,
});

export function refreshAiPreferencesCache(): Promise<AiPreferences> {
  return lifecycle.refresh();
}

export async function persistAiPreferences(input: {
  enabled: boolean;
}): Promise<AiPreferences> {
  return lifecycle.persist(input);
}
