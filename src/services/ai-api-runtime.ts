import {
  AIAPIClient,
} from './ai-api-client';

const configuredBaseUrl =
  process.env
    .EXPO_PUBLIC_TRAVELOS_AI_URL
    ?.trim();

/**
 * Local Android development reaches the Windows-hosted
 * backend through:
 *
 * adb reverse tcp:8789 tcp:8789
 *
 * Use the explicit IPv4 loopback address to avoid Android
 * localhost / IPv6 resolution differences.
 */
const localDevelopmentBaseUrl =
  'http://127.0.0.1:8789';

export const aiAPIClient =
  new AIAPIClient(
    configuredBaseUrl ||
      localDevelopmentBaseUrl,
  );