/**
 * Google Cloud Vision OCR for confirmation photos.
 * Returns raw text only — never writes Trip/Booking truth.
 * Key lives only in server/.env — never reuse GOOGLE_MAPS_API_KEY.
 */

const { z } = require('zod');

const ocrExtractRequestSchema = z.object({
  imageBase64: z.string().trim().min(32).max(6_000_000),
  mimeType: z
    .enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
    .optional()
    .default('image/jpeg'),
});

function readVisionApiKey(env = process.env) {
  const key = (env.GOOGLE_VISION_API_KEY || '').trim();
  return key || null;
}

function isVisionEnabled(env = process.env) {
  const raw = (env.AI_VISION_ENABLED || '').trim().toLowerCase();
  if (!raw) {
    return Boolean(readVisionApiKey(env));
  }

  return ['1', 'true', 'yes', 'on'].includes(raw);
}

function parseOcrExtractRequest(body) {
  return ocrExtractRequestSchema.parse(body);
}

function stripDataUrlPrefix(value) {
  const match = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/s.exec(
    value,
  );
  return match ? match[1] : value;
}

function parseVisionAnnotateResponse(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const responses = Array.isArray(payload.responses)
    ? payload.responses
    : null;

  if (!responses || responses.length === 0) {
    return null;
  }

  const first = responses[0];

  if (!first || typeof first !== 'object') {
    return null;
  }

  if (first.error) {
    return null;
  }

  const fullText =
    first.fullTextAnnotation &&
    typeof first.fullTextAnnotation.text === 'string'
      ? first.fullTextAnnotation.text.trim()
      : '';

  const textAnnotations = Array.isArray(first.textAnnotations)
    ? first.textAnnotations
    : [];

  const annotationText =
    textAnnotations[0] &&
    typeof textAnnotations[0].description === 'string'
      ? textAnnotations[0].description.trim()
      : '';

  const text = fullText || annotationText;

  if (!text) {
    return null;
  }

  return {
    text,
    source: 'provider',
  };
}

async function extractOcrText(options) {
  const {
    imageBase64,
    fetchImpl = fetch,
    env = process.env,
  } = options;

  if (!isVisionEnabled(env)) {
    const error = new Error('ocr_vision_disabled');
    error.code = 'ocr_vision_disabled';
    throw error;
  }

  const apiKey =
    options.apiKey !== undefined
      ? options.apiKey
      : readVisionApiKey(env);

  if (!apiKey) {
    const error = new Error('ocr_api_key_missing');
    error.code = 'ocr_api_key_missing';
    throw error;
  }

  const content = stripDataUrlPrefix(imageBase64);

  let response;

  try {
    response = await fetchImpl(
      `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: { content },
              features: [
                { type: 'DOCUMENT_TEXT_DETECTION' },
              ],
            },
          ],
        }),
      },
    );
  } catch {
    const error = new Error('ocr_provider_unavailable');
    error.code = 'ocr_provider_unavailable';
    throw error;
  }

  let payload;

  try {
    payload = await response.json();
  } catch {
    const error = new Error('ocr_provider_unavailable');
    error.code = 'ocr_provider_unavailable';
    throw error;
  }

  if (!response.ok) {
    const error = new Error('ocr_provider_unavailable');
    error.code = 'ocr_provider_unavailable';
    throw error;
  }

  const parsed = parseVisionAnnotateResponse(payload);

  if (!parsed) {
    const error = new Error('ocr_extract_failed');
    error.code = 'ocr_extract_failed';
    throw error;
  }

  return parsed;
}

module.exports = {
  extractOcrText,
  isVisionEnabled,
  parseOcrExtractRequest,
  parseVisionAnnotateResponse,
  readVisionApiKey,
  stripDataUrlPrefix,
};
