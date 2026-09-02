const assert = require('node:assert/strict');
const test = require('node:test');
const { zlibSync, strToU8 } = require('fflate');

const {
  extractImportCalendarFromPdf,
  isPdfBytes,
} = require('../.test-build/src/services/import-calendar-pdf.js');

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
UID:pdf-ferry
DTSTART:20260922T080000
DTEND:20260922T120000
SUMMARY:Pdf Ferry
LOCATION:Korcula quay
END:VEVENT
END:VCALENDAR`;

function uncompressedPdf(body) {
  const payload = body.replace(/\n/g, '\r\n');
  const text = `%PDF-1.1
1 0 obj
<< /Length ${payload.length} >>
stream
${payload}
endstream
endobj
%%EOF
`;
  return new Uint8Array(Buffer.from(text, 'latin1'));
}

function flatePdf(body) {
  const compressed = zlibSync(strToU8(body));
  const header = Buffer.from(
    `%PDF-1.1
1 0 obj
<< /Filter /FlateDecode /Length ${compressed.length} >>
stream
`,
    'latin1',
  );
  const footer = Buffer.from(
    `
endstream
endobj
%%EOF
`,
    'latin1',
  );
  return new Uint8Array(Buffer.concat([header, Buffer.from(compressed), footer]));
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

test('pdf magic bytes are detected without treating calendars as documents', () => {
  assert.equal(isPdfBytes(uncompressedPdf(ICS)), true);
  assert.equal(isPdfBytes(strToU8(ICS)), false);
});

test('an uncompressed pdf calendar extracts without inventing events', () => {
  const extracted = extractImportCalendarFromPdf(uncompressedPdf(ICS));

  assert.equal(extracted.wrapper, 'none');
  assert.equal(
    parseImportCalendar(extracted.text).events[0].title,
    'Pdf Ferry',
  );
});

test('a flate-compressed pdf calendar is inflated before review', () => {
  const extracted = extractImportCalendarFromPdf(flatePdf(ICS));

  assert.equal(
    parseImportCalendar(extracted.text).events[0].title,
    'Pdf Ferry',
  );
});

test('the same calendar stays one batch whether it arrived raw or inside a pdf', async () => {
  const service = createService();
  const fromPdf = await service.ingestIcs({
    text: decodePickedImportCalendarBytes(flatePdf(ICS)),
    sourceLabel: 'ferry.pdf',
  });
  const fromPlain = await service.ingestIcs({ text: ICS });

  assert.equal(fromPdf.sourceLabel, 'ferry.pdf');
  assert.equal(fromPdf.id, fromPlain.id);
  assert.equal(
    (await service.listClaimReviews(fromPdf.id)).listings[0].claim.status,
    'pending',
  );
});

test('a pdf without a calendar fails closed', () => {
  assert.throws(
    () =>
      extractImportCalendarFromPdf(
        uncompressedPdf('Invoice 1048\nAmount due 80 EUR'),
      ),
    /PDF does not contain an iCalendar/i,
  );
});
