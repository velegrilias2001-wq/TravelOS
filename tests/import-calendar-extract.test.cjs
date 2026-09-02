const assert = require('node:assert/strict');
const test = require('node:test');

const {
  decodeImportCalendarBytes,
  extractImportCalendarText,
} = require('../.test-build/src/services/import-calendar-extract.js');

const {
  parseImportCalendar,
} = require('../.test-build/src/services/import-ics.js');

const {
  ImportReviewService,
} = require('../.test-build/src/services/import-review-service.js');

const ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:email-ferry
DTSTART:20260920T090000
DTEND:20260920T160000
SUMMARY:Ferry to Split
LOCATION:Port of Split
END:VEVENT
END:VCALENDAR`;

test('plain iCalendar text is extracted without a wrapper', () => {
  const extracted = extractImportCalendarText(`\n${ICS}\n`);

  assert.equal(extracted.wrapper, 'none');
  assert.equal(parseImportCalendar(extracted.text).events[0].title, 'Ferry to Split');
});

test('utf-16 little-endian calendars decode without inventing events', () => {
  const utf16 = decodeImportCalendarBytes(
    Buffer.from(`\uFEFF${ICS}`, 'utf16le'),
  );
  const extracted = extractImportCalendarText(utf16);

  assert.equal(
    parseImportCalendar(extracted.text).events[0].title,
    'Ferry to Split',
  );
});

test('an email with an inline calendar is extracted as a wrapped claim', () => {
  const extracted = extractImportCalendarText(`From: bookings@example.com
Subject: Your ferry
MIME-Version: 1.0
Content-Type: text/plain; charset=UTF-8

Hello,

${ICS}
`);

  assert.equal(extracted.wrapper, 'email');
  assert.equal(parseImportCalendar(extracted.text).events.length, 1);
});

test('a multipart email calendar attachment is decoded from base64', () => {
  const encoded = Buffer.from(ICS, 'utf8').toString('base64');
  const extracted = extractImportCalendarText(`From: bookings@example.com
Subject: Attachment
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="BOUND"

--BOUND
Content-Type: text/plain

See attached calendar.
--BOUND
Content-Type: text/calendar; charset=UTF-8
Content-Transfer-Encoding: base64

${encoded}
--BOUND--
`);

  assert.equal(extracted.wrapper, 'email');
  assert.equal(
    parseImportCalendar(extracted.text).events[0].title,
    'Ferry to Split',
  );
});

test('quoted-printable calendar parts are decoded before review', () => {
  const extracted = extractImportCalendarText(`From: bookings@example.com
Subject: QP calendar
MIME-Version: 1.0
Content-Type: text/calendar; charset=UTF-8
Content-Transfer-Encoding: quoted-printable

BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Ferry to Split
DTSTART:20260920T090000
DTEND:20260920T160000
END:VEVENT
END:VCALENDAR
`);

  assert.equal(extracted.wrapper, 'email');
  assert.equal(parseImportCalendar(extracted.text).events[0].title, 'Ferry to Split');
});

test('non-calendar files still fail closed', () => {
  assert.throws(
    () => extractImportCalendarText('this is a pdf dump'),
    /iCalendar/i,
  );
});

test('ingesting a wrapped email keeps claims off the trip graph', async () => {
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

  const email = `From: bookings@example.com
Subject: Your ferry
MIME-Version: 1.0
Content-Type: text/plain

${ICS}
`;
  const wrapped = await service.ingestIcs({ text: email });
  const plain = await service.ingestIcs({ text: ICS });

  assert.equal(wrapped.sourceLabel, 'Pasted email');
  assert.equal(wrapped.id, plain.id);
  assert.equal((await service.listClaimReviews(wrapped.id)).listings[0].claim.status, 'pending');
});
