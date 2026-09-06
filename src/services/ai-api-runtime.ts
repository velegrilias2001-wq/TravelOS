import {
  AIAPIClient,
} from './ai-api-client';
import {
  LOCAL_DEV_AI_FALLBACK_URL,
  resolveTravelOsAiBaseUrl,
} from './ai-local-dev-contract';
import {
  assertAiEnabledForClient,
} from './ai-preferences-cache';

/**
 * Android local-dev reaches a host AI proxy through:
 *   adb reverse tcp:8789 tcp:8789
 * Prefer http://127.0.0.1:8789.
 *
 * Preview/production may set EXPO_PUBLIC_TRAVELOS_AI_URL to an
 * HTTPS TravelOS AI proxy. Non-HTTPS remote hosts require
 * EXPO_PUBLIC_TRAVELOS_AI_ALLOW_CLEARTEXT=true. Provider API
 * keys never ship in the app — only the proxy base URL.
 */
export const aiAPIClient = new AIAPIClient(
  resolveTravelOsAiBaseUrl(
    process.env.EXPO_PUBLIC_TRAVELOS_AI_URL,
    LOCAL_DEV_AI_FALLBACK_URL,
  ),
  {
    beforeRequest: assertAiEnabledForClient,
  },
);
