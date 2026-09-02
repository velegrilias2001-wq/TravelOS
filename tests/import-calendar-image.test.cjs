const assert = require('node:assert/strict');
const test = require('node:test');
const { zlibSync, strToU8 } = require('fflate');

const {
  extractImportCalendarFromImage,
  isImageBytes,
} = require('../.test-build/src/services/import-calendar-image.js');

const {
  decodePickedImportCalendarBytes,
} = require('../.test-build/src/services/import-calendar-zip.js');

const {
  parseImportCalendar,
} = require('../.test-build/src/services/import-ics.js');

const {
  ImportReviewService,
} = require('../.test-build/src/services/import-review-service.js');

const ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:image-ferry
DTSTART:20260925T080000
DTEND:20260925T120000
SUMMARY:Image Ferry
LOCATION:Korcula quay
END:VEVENT
END:VCALENDAR`;

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const bytes = new Uint8Array(total);
  let offset = 0;

  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }

  return bytes;
}

function u32be(value) {
  return Uint8Array.of(
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  );
}

function u32le(value) {
  return Uint8Array.of(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  );
}

function pngChunk(type, data) {
  return concatBytes([
    u32be(data.length),
    Buffer.from(type, 'latin1'),
    data,
    u32be(0),
  ]);
}

function pngWithChunks(chunks) {
  return concatBytes([
    Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
    pngChunk('IHDR', new Uint8Array(13)),
    ...chunks,
    pngChunk('IEND', new Uint8Array(0)),
  ]);
}

function pngText(keyword, text) {
  return pngChunk(
    'tEXt',
    Buffer.from(`${keyword}\0${text}`, 'latin1'),
  );
}

function jpegWithComments(comments) {
  const segments = comments.map((comment) => {
    const payload = Buffer.from(comment, 'latin1');
    const length = payload.length + 2;

    return concatBytes([
      Uint8Array.of(0xff, 0xfe, (length >> 8) & 0xff, length & 0xff),
      payload,
    ]);
  });

  return concatBytes([
    Uint8Array.of(0xff, 0xd8),
    ...segments,
    Uint8Array.of(0xff, 0xd9),
  ]);
}

function webpWithXmp(text) {
  const payload = Buffer.from(text, 'latin1');
  const pad = payload.length % 2 === 1 ? Uint8Array.of(0) : new Uint8Array(0);
  const riffSize = 4 + 8 + payload.length + pad.length;

  return concatBytes([
    Buffer.from('RIFF', 'latin1'),
    u32le(riffSize),
    Buffer.from('WEBP', 'latin1'),
    Buffer.from('XMP ', 'latin1'),
    u32le(payload.length),
    payload,
    pad,
  ]);
}

function gifWithComment(text) {
  const payload = Buffer.from(text, 'latin1');
  const blocks = [];

  for (let index = 0; index < payload.length; index += 255) {
    const slice = payload.subarray(index, index + 255);
    blocks.push(Uint8Array.of(slice.length), slice);
  }

  return concatBytes([
    Buffer.from('GIF89a', 'latin1'),
    new Uint8Array(7),
    Uint8Array.of(0x21, 0xfe),
    ...blocks,
    Uint8Array.of(0x00, 0x3b),
  ]);
}

function createService() {
  const batches = new Map();
  const claims = new Map();
  let nextId = 1;

  return new ImportReviewService(
    {
      imports: {
        async listBatches() {
          return [...batches.values()];
        },
        async getBatch(id) {
          return batches.get(id) ?? null;
        },
        async getBatchByContentHash(contentHash) {
          return (
            [...batches.values()].find(
              (batch) => batch.contentHash === contentHash,
            ) ?? null
          );
        },
        async listClaims(batchId) {
          return [...claims.values()].filter(
            (claim) => claim.batchId === batchId,
          );
        },
        async getClaim(id) {
          return claims.get(id) ?? null;
        },
        async saveBatch(batch, nextClaims) {
          batches.set(batch.id, batch);
          for (const claim of nextClaims) {
            claims.set(claim.id, claim);
          }
        },
        async saveClaim(claim) {
          claims.set(claim.id, claim);
        },
        async acceptClaim() {
          throw new Error('unused');
        },
      },
      trips: {
        async getAll() {
          return [];
        },
        async getById() {
          return null;
        },
      },
      bookings: {
        async getByTripId() {
          return [];
        },
      },
    },
    () => `id-${nextId++}`,
    () => '2026-09-02T12:00:00.000Z',
  );
}

test('image magic bytes are detected without treating calendars as images', () => {
  const png = pngWithChunks([pngText('Comment', ICS)]);

  assert.equal(isImageBytes(png), true);
  assert.equal(isImageBytes(jpegWithComments([ICS])), true);
  assert.equal(isImageBytes(strToU8(ICS)), false);
});

test('a png text-chunk calendar extracts without inventing events', () => {
  const extracted = extractImportCalendarFromImage(
    pngWithChunks([pngText('Comment', ICS)]),
  );

  assert.equal(extracted.wrapper, 'none');
  assert.equal(
    parseImportCalendar(extracted.text).events[0].title,
    'Image Ferry',
  );
});

test('a compressed png ztxt calendar is inflated before review', () => {
  const compressed = zlibSync(strToU8(ICS));
  const ztxt = pngChunk(
    'zTXt',
    concatBytes([Buffer.from('Comment\0\0', 'latin1'), compressed]),
  );
  const extracted = extractImportCalendarFromImage(pngWithChunks([ztxt]));

  assert.equal(
    parseImportCalendar(extracted.text).events[0].title,
    'Image Ferry',
  );
});

test('png text split across chunks still extracts one calendar', () => {
  const extracted = extractImportCalendarFromImage(
    pngWithChunks([
      pngText('Comment', 'BEGIN:'),
      pngText('Description', ICS.slice('BEGIN:'.length)),
    ]),
  );

  assert.equal(
    parseImportCalendar(extracted.text).events[0].title,
    'Image Ferry',
  );
});

test('jpeg comment, gif comment, and webp xmp calendars extract', () => {
  assert.equal(
    parseImportCalendar(
      extractImportCalendarFromImage(jpegWithComments([ICS])).text,
    ).events[0].title,
    'Image Ferry',
  );
  assert.equal(
    parseImportCalendar(
      extractImportCalendarFromImage(gifWithComment(ICS)).text,
    ).events[0].title,
    'Image Ferry',
  );
  assert.equal(
    parseImportCalendar(
      extractImportCalendarFromImage(webpWithXmp(ICS)).text,
    ).events[0].title,
    'Image Ferry',
  );
});

test('the same calendar stays one batch whether it arrived raw or inside an image', async () => {
  const service = createService();
  const fromImage = await service.ingestIcs({
    text: decodePickedImportCalendarBytes(
      pngWithChunks([pngText('Comment', ICS)]),
    ),
    sourceLabel: 'ferry.png',
  });
  const fromPlain = await service.ingestIcs({ text: ICS });

  assert.equal(fromImage.sourceLabel, 'ferry.png');
  assert.equal(fromImage.id, fromPlain.id);
  assert.equal(
    (await service.listClaimReviews(fromImage.id)).listings[0].claim.status,
    'pending',
  );
});

test('an image without a calendar fails closed', () => {
  assert.throws(
    () =>
      extractImportCalendarFromImage(
        pngWithChunks([pngText('Comment', 'Invoice 1048 amount due')]),
      ),
    /image does not contain an iCalendar/i,
  );
  assert.throws(
    () => decodePickedImportCalendarBytes(jpegWithComments(['boarding pass'])),
    /image does not contain an iCalendar/i,
  );
});
