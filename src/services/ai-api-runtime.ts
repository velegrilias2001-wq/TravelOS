import {
  AIAPIClient,
} from './ai-api-client';
import {
  LOCAL_DEV_AI_FALLBACK_URL,
  resolveLocalDevAiBaseUrl,
} from './ai-local-dev-contract';

/**
 * Local Android development reaches the Windows-hosted
 * backend through:
 *
 * adb reverse tcp:8789 tcp:8789
 *
 * Use the explicit IPv4 loopback address to avoid Android
 * localhost / IPv6 resolution differences.
 *
 * A non-loopback EXPO_PUBLIC_TRAVELOS_AI_URL is ignored.
 * There is no production AI provider yet.
 */
export const aiAPIClient =
  new AIAPIClient(
    resolveLocalDevAiBaseUrl(
      process.env.EXPO_PUBLIC_TRAVELOS_AI_URL,
      LOCAL_DEV_AI_FALLBACK_URL,
    ),
  );