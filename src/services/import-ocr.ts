import {
  LOCAL_DEV_AI_FALLBACK_URL,
  resolveTravelOsAiBaseUrl,
} from './ai-local-dev-contract';
import { assertAiEnabledForClient } from './ai-preferences-cache';

export interface ImportOcrTextResult {
  text: string;
  source: 'provider';
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

export function resolveOcrBaseUrl(
  configured: string | null | undefined =
    process.env.EXPO_PUBLIC_TRAVELOS_AI_URL,
): string {
  return resolveTravelOsAiBaseUrl(
    configured,
    LOCAL_DEV_AI_FALLBACK_URL,
  );
}

export function parseOcrExtractResponse(
  payload: unknown,
): ImportOcrTextResult | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const body = payload as Record<string, unknown>;

  if (body.ok !== true || body.source !== 'provider') {
    return null;
  }

  if (typeof body.text !== 'string' || !body.text.trim()) {
    return null;
  }

  return {
    text: body.text.trim(),
    source: 'provider',
  };
}

/**
 * Ask the local-dev Vision proxy for OCR text.
 * Fail closed — never invent confirmation prose.
 */
export async function extractOcrTextFromImage(input: {
  imageBase64: string;
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  baseUrl?: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<ImportOcrTextResult | null> {
  const baseUrl = normalizeBaseUrl(
    input.baseUrl ?? resolveOcrBaseUrl(),
  );
  const fetchImpl = input.fetchImpl ?? fetch;

  try {
    await assertAiEnabledForClient();
  } catch {
    return null;
  }

  let response: Response;

  try {
    response = await fetchImpl(`${baseUrl}/import/ocr-extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        imageBase64: input.imageBase64,
        mimeType: input.mimeType ?? 'image/jpeg',
      }),
      signal: input.signal,
    });
  } catch {
    return null;
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  return parseOcrExtractResponse(payload);
}
