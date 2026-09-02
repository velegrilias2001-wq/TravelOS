const assert = require('node:assert/strict');
const test = require('node:test');
const { zipSync, strToU8 } = require('fflate');

const {
  decodePickedImportCalendarBytes,
  extractImportCalendarFromZip,
  isZipBytes,
} = require('../.test-build/src/services/import-calendar-zip.js');

const {
  parseImportCalendar,
} = require('../.test-build/src/services/import-ics.js');

const {
  ImportReviewService,
} = require('../.test-build/src/services/import-review-service.js');

const FERRY = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:zip-ferry
DTSTART:20260920T090000
DTEND:20260920T160000
SUMMARY:Zip Ferry to Split
LOCATION:Port of Split
END:VEVENT
END:VCALENDAR`;

const CATAMARAN = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:zip-catamaran
DTSTART:20260921T110000
DTEND:20260921T150000
SUMMARY:Zip Catamaran
LOCATION:Hvar harbour
END:VEVENT
END:VCALENDAR`;

function zipBytes(files) {
  const entries = {};

  for (const [name, text] of Object.entries(files)) {
    entries[name] = strToU8(text);
  }

  return zipSync(entries);
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

test('zip magic bytes are detected without treating calendars as archives', () => {
  const zipped = zipBytes({ 'ferry.ics': FERRY });

  assert.equal(isZipBytes(zipped), true);
  assert.equal(isZipBytes(strToU8(FERRY)), false);
});

test('a zip of one calendar extracts the same events as the raw file', () => {
  const extracted = extractImportCalendarFromZip(
    zipBytes({
      'readme.txt': 'not a calendar',
      'ferry.ics': FERRY,
    }),
  );

  assert.equal(extracted.wrapper, 'none');
  assert.equal(
    parseImportCalendar(extracted.text).events[0].title,
    'Zip Ferry to Split',
  );
});

test('multiple calendars in one zip become one review batch of claims', async () => {
  const service = createService();
  const bytes = zipBytes({
    'b-catamaran.ics': CATAMARAN,
    'a-ferry.ics': FERRY,
  });
  const text = decodePickedImportCalendarBytes(bytes);
  const batch = await service.ingestIcs({
    text,
    sourceLabel: 'trip.zip',
  });
  const listings = (await service.listClaimReviews(batch.id)).listings;

  assert.equal(batch.sourceLabel, 'trip.zip');
  assert.equal(listings.length, 2);
  assert.deepEqual(
    listings.map((listing) => listing.claim.title).sort(),
    ['Zip Catamaran', 'Zip Ferry to Split'],
  );
  assert.equal(listings[0].claim.status, 'pending');
});

test('the same calendar stays one batch whether it arrived raw or inside a zip', async () => {
  const service = createService();
  const fromZip = await service.ingestIcs({
    text: decodePickedImportCalendarBytes(zipBytes({ 'ferry.ics': FERRY })),
    sourceLabel: 'ferry.zip',
  });
  const fromPlain = await service.ingestIcs({ text: FERRY });

  assert.equal(fromZip.id, fromPlain.id);
});

test('a zip without calendars fails closed', () => {
  assert.throws(
    () =>
      extractImportCalendarFromZip(
        zipBytes({ 'notes.txt': 'this is a pdf dump' }),
      ),
    /zip does not contain an iCalendar/i,
  );
});

test('nested zip members are skipped instead of unpacked', () => {
  const inner = zipBytes({ 'ferry.ics': FERRY });
  const outer = zipSync({
    'nested.zip': inner,
    'notes.txt': strToU8('still not a calendar'),
  });

  assert.throws(
    () => extractImportCalendarFromZip(outer),
    /zip does not contain an iCalendar/i,
  );
});
