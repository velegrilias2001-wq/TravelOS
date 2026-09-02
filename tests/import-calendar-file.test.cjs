const assert = require('node:assert/strict');
const test = require('node:test');

const {
  IMPORT_CALENDAR_MAX_BYTES,
  importCalendarFileLabel,
  prepareImportCalendarFile,
} = require('../.test-build/src/services/import-calendar-file.js');

const {
  ImportReviewService,
} = require('../.test-build/src/services/import-review-service.js');

const ICS = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Ferry to Split
DTSTART:20260920T090000
DTEND:20260920T160000
END:VEVENT
END:VCALENDAR`;

test('file labels keep the basename and ignore empty names', () => {
  assert.equal(
    importCalendarFileLabel('booking.ics'),
    'booking.ics',
  );
  assert.equal(
    importCalendarFileLabel('C:\\\\Downloads\\\\trip.ics'),
    'trip.ics',
  );
  assert.equal(
    importCalendarFileLabel('  '),
    'Calendar file',
  );
});

test('oversized calendar files fail closed before ingest', () => {
  assert.throws(
    () =>
      prepareImportCalendarFile({
        name: 'huge.ics',
        size: IMPORT_CALENDAR_MAX_BYTES + 1,
        text: ICS,
      }),
    /too large/,
  );

  assert.throws(
    () =>
      prepareImportCalendarFile({
        name: 'huge.ics',
        text: 'x'.repeat(IMPORT_CALENDAR_MAX_BYTES + 1),
      }),
    /too large/,
  );
});

test('a chosen calendar file keeps its name as the review source label', async () => {
  const batches = new Map();
  const claims = new Map();
  let nextId = 1;
  const service = new ImportReviewService(
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

  const prepared = prepareImportCalendarFile({
    name: 'split-ferry.ics',
    size: ICS.length,
    text: ICS,
  });
  const batch = await service.ingestIcs(prepared);

  assert.equal(batch.sourceKind, 'ics');
  assert.equal(batch.sourceLabel, 'split-ferry.ics');
  assert.equal((await service.listClaimReviews(batch.id)).listings.length, 1);
});
