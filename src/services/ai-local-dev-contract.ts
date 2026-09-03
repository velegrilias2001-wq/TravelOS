export const AI_LOCAL_DEV_CONTRACT = {
  productionProvider: 'none',
  shipping: 'local-dev-only',
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

export function isLocalDevAiBaseUrl(
  value: string | null | undefined,
): boolean {
  const trimmed = value?.trim();

  if (!trimmed) {
    return false;
  }

  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
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

  const host = parsed.hostname
    .replace(/^\[|\]$/g, '')
    .toLowerCase();

  return LOOPBACK_HOSTS.has(host);
}

export function resolveLocalDevAiBaseUrl(
  configured: string | null | undefined,
  fallback: string = LOCAL_DEV_AI_FALLBACK_URL,
): string {
  const trimmed = configured?.trim();

  if (trimmed && isLocalDevAiBaseUrl(trimmed)) {
    return stripTrailingSlash(trimmed);
  }

  if (!isLocalDevAiBaseUrl(fallback)) {
    return LOCAL_DEV_AI_FALLBACK_URL;
  }

  return stripTrailingSlash(fallback);
}
