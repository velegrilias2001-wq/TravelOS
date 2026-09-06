const assert = require('node:assert/strict');
const test = require('node:test');
const { ZodError } = require('zod');

const {
  extractOcrText,
  isVisionEnabled,
  parseOcrExtractRequest,
  parseVisionAnnotateResponse,
  readVisionApiKey,
} = require('../ocr-extract');

test('parseOcrExtractRequest accepts base64 image payload', () => {
  const body = parseOcrExtractRequest({
    imageBase64: 'a'.repeat(40),
    mimeType: 'image/jpeg',
  });

  assert.equal(body.mimeType, 'image/jpeg');
  assert.equal(body.imageBase64.length, 40);
});

test('parseOcrExtractRequest rejects tiny payloads', () => {
  assert.throws(
    () => parseOcrExtractRequest({ imageBase64: 'short' }),
    ZodError,
  );
});

test('parseVisionAnnotateResponse reads fullTextAnnotation', () => {
  const parsed = parseVisionAnnotateResponse({
    responses: [
      {
        fullTextAnnotation: {
          text: 'CONFIRMATION ABC123\nHotel Rivoli',
        },
      },
    ],
  });

  assert.equal(parsed.source, 'provider');
  assert.match(parsed.text, /ABC123/);
});

test('parseVisionAnnotateResponse fails closed on empty text', () => {
  assert.equal(
    parseVisionAnnotateResponse({
      responses: [{ fullTextAnnotation: { text: '   ' } }],
    }),
    null,
  );
});

test('extractOcrText returns provider text on OK', async () => {
  const result = await extractOcrText({
    imageBase64: 'a'.repeat(40),
    apiKey: 'test-key',
    env: { AI_VISION_ENABLED: 'true' },
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        responses: [
          {
            fullTextAnnotation: {
              text: 'Booking confirmation XYZ',
            },
          },
        ],
      }),
    }),
  });

  assert.equal(result.source, 'provider');
  assert.match(result.text, /XYZ/);
});

test('extractOcrText fails closed without a key', async () => {
  await assert.rejects(
    () =>
      extractOcrText({
        imageBase64: 'a'.repeat(40),
        env: { AI_VISION_ENABLED: 'true' },
      }),
    (error) => error.code === 'ocr_api_key_missing',
  );
});

test('readVisionApiKey and isVisionEnabled fail closed by default', () => {
  assert.equal(readVisionApiKey({}), null);
  assert.equal(isVisionEnabled({}), false);
  assert.equal(
    isVisionEnabled({
      AI_VISION_ENABLED: 'true',
      GOOGLE_VISION_API_KEY: 'k',
    }),
    true,
  );
});
