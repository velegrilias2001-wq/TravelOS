const assert = require('node:assert/strict');
const test = require('node:test');

const {
  extractImportOcrClaims,
} = require('../.test-build/src/services/import-ocr-extract.js');

const {
  parseOcrExtractResponse,
  extractOcrTextFromImage,
} = require('../.test-build/src/services/import-ocr.js');

test('extractImportOcrClaims builds pending booking claim from confirmation text', () => {
  const result = extractImportOcrClaims(
    [
      'Booking confirmation ABC12345',
      'Hotel Rivoli Athens',
      '2026-09-20',
      '2026-09-22',
    ].join('\n'),
  );

  assert.ok(result.claims.length >= 1);
  assert.equal(result.claims[0].kind, 'booking');
  assert.match(result.claims[0].title, /Stay|Confirmation|Rivoli/i);
  assert.equal(result.claims[0].startAt, '2026-09-20');
  assert.equal(result.claims[0].endAt, '2026-09-22');
  assert.equal(result.claims[0].evidence.icsUid, 'ocr:ABC12345');
  assert.ok(
    result.claims[0].evidence.fieldsPresent.includes('ocr_text'),
  );
});

test('extractImportOcrClaims fails closed without confirmation signals', () => {
  assert.throws(
    () => extractImportOcrClaims('blurry photo of a cat'),
    /No confirmation details/,
  );
});

test('parseOcrExtractResponse accepts provider text only', () => {
  assert.deepEqual(
    parseOcrExtractResponse({
      ok: true,
      source: 'provider',
      text: 'Confirmation XYZ',
    }),
    {
      text: 'Confirmation XYZ',
      source: 'provider',
    },
  );

  assert.equal(
    parseOcrExtractResponse({
      ok: true,
      source: 'guess',
      text: 'Confirmation XYZ',
    }),
    null,
  );
});

test('extractOcrTextFromImage fails closed on network errors', async () => {
  assert.equal(
    await extractOcrTextFromImage({
      imageBase64: 'a'.repeat(40),
      baseUrl: 'http://127.0.0.1:8789',
      fetchImpl: async () => {
        throw new Error('offline');
      },
    }),
    null,
  );
});
