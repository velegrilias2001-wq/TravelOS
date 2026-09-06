/**
 * TravelOS AI endpoint contract.
 *
 * The native client talks only to the TravelOS AI proxy
 * (`/ai/*`, `/geo/*`, `/import/*`). Provider keys stay on
 * the server. Suggestions never mutate SQLite.
 */

export const AI_LOCAL_DEV_CONTRACT = {
  /** Production path is the server openai_compatible provider. */
  productionProvider: 'openai_compatible',
  /** Client may use loopback or an HTTPS TravelOS AI proxy URL. */
  shipping: 'proxy-gated',
  canMutateSqlite: false,
  canWriteBookings: false,
  cloudRetention: 'none',
  billedCost: 'none',
  unreachableFallback: 'degrade',
} as const;

export const LOCAL_DEV_AI_FALLBACK_URL =
  'http://127.0.0.1:8789';

const LOOPBACK_HOSTS = new Set([
  '127.0.0.1',
  'localhost',
  '::1',
]);

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function parseAiBaseUrl(
  value: string | null | undefined,
): URL | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed);
  } catch {
    return null;
  }
}

function hostOf(parsed: URL): string {
  return parsed.hostname
    .replace(/^\[|\]$/g, '')
    .toLowerCase();
}

export function isLocalDevAiBaseUrl(
  value: string | null | undefined,
): boolean {
  const parsed = parseAiBaseUrl(value);

  if (!parsed) {
    return false;
  }

  if (
    parsed.protocol !== 'http:' &&
    parsed.protocol !== 'https:'
  ) {
    return false;
  }

  if (parsed.username || parsed.password) {
    return false;
  }

  return LOOPBACK_HOSTS.has(hostOf(parsed));
}

/**
 * Allowed AI proxy URLs:
 * - loopback http/https (local-dev + adb reverse)
 * - https remote hosts (preview/production TravelOS AI proxy)
 * - http non-loopback only when
 *   EXPO_PUBLIC_TRAVELOS_AI_ALLOW_CLEARTEXT=true (LAN preview)
 *
 * Credentials in the URL are always rejected.
 */
export function isAllowedAiBaseUrl(
  value: string | null | undefined,
  options?: {
    allowCleartextRemote?: boolean;
  },
): boolean {
  const parsed = parseAiBaseUrl(value);

  if (!parsed) {
    return false;
  }

  if (parsed.username || parsed.password) {
    return false;
  }

  const host = hostOf(parsed);

  if (LOOPBACK_HOSTS.has(host)) {
    return (
      parsed.protocol === 'http:' ||
      parsed.protocol === 'https:'
    );
  }

  if (parsed.protocol === 'https:') {
    return true;
  }

  if (
    parsed.protocol === 'http:' &&
    (options?.allowCleartextRemote === true ||
      process.env.EXPO_PUBLIC_TRAVELOS_AI_ALLOW_CLEARTEXT ===
        'true')
  ) {
    return true;
  }

  return false;
}

export function resolveTravelOsAiBaseUrl(
  configured: string | null | undefined,
  fallback: string = LOCAL_DEV_AI_FALLBACK_URL,
  options?: {
    allowCleartextRemote?: boolean;
  },
): string {
  const trimmed = configured?.trim();

  if (trimmed && isAllowedAiBaseUrl(trimmed, options)) {
    return stripTrailingSlash(trimmed);
  }

  if (isAllowedAiBaseUrl(fallback, options)) {
    return stripTrailingSlash(fallback);
  }

  return LOCAL_DEV_AI_FALLBACK_URL;
}

/** @deprecated Prefer resolveTravelOsAiBaseUrl — kept for call-site compatibility. */
export function resolveLocalDevAiBaseUrl(
  configured: string | null | undefined,
  fallback: string = LOCAL_DEV_AI_FALLBACK_URL,
): string {
  return resolveTravelOsAiBaseUrl(configured, fallback);
}
