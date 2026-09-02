const assert = require('node:assert/strict');
const test = require('node:test');
const { zipSync, strToU8 } = require('fflate');

const {
  xmlVisibleText,
} = require('../.test-build/src/services/import-calendar-office.js');

const {
  decodePickedImportCalendarBytes,
  extractImportCalendarFromZip,
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
UID:office-ferry
DTSTART:20260924T080000
DTEND:20260924T120000
SUMMARY:Office Ferry
LOCATION:Korcula quay
END:VEVENT
END:VCALENDAR`;

function docxWith(bodyText) {
  const document = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t>BEGIN:</w:t></w:r><w:r><w:t>${bodyText.slice('BEGIN:'.length)}</w:t></w:r></w:p></w:body>
</w:document>`;

  return zipSync({
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>',
    ),
    'word/document.xml': strToU8(document),
  });
}

function xlsxWith(ics) {
  return zipSync({
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>',
    ),
    'xl/workbook.xml': strToU8(
      '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"></workbook>',
    ),
    'xl/sharedStrings.xml': strToU8(
      `<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>${ics}</t></si></sst>`,
    ),
  });
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

test('xml visible text concatenates split Office runs without inventing events', () => {
  assert.match(
    xmlVisibleText('<w:t>BEGIN:</w:t><w:t>VCALENDAR</w:t>'),
    /BEGIN:VCALENDAR/,
  );
});

test('a Word document with a split calendar extracts the same events as the raw file', () => {
  const extracted = extractImportCalendarFromZip(docxWith(ICS));

  assert.equal(
    parseImportCalendar(extracted.text).events[0].title,
    'Office Ferry',
  );
});

test('an Excel shared-string calendar stays off the trip graph until accepted', async () => {
  const service = createService();
  const fromOffice = await service.ingestIcs({
    text: decodePickedImportCalendarBytes(xlsxWith(ICS)),
    sourceLabel: 'ferry.xlsx',
  });
  const fromPlain = await service.ingestIcs({ text: ICS });

  assert.equal(fromOffice.sourceLabel, 'ferry.xlsx');
  assert.equal(fromOffice.id, fromPlain.id);
  assert.equal(
    (await service.listClaimReviews(fromOffice.id)).listings[0].claim.status,
    'pending',
  );
});

test('an Office document without a calendar fails closed', () => {
  assert.throws(
    () => extractImportCalendarFromZip(docxWith('Invoice 1048 amount due')),
    /Office document does not contain an iCalendar/i,
  );
});
