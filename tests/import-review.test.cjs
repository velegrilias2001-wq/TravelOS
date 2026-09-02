const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ImportReviewService,
} = require('../.test-build/src/services/import-review-service.js');

const {
  acceptImportClaim,
  getImportBatch,
  getImportBatchByContentHash,
  getImportClaim,
  listImportBatches,
  listImportClaims,
  saveImportBatchWithClaims,
  saveImportClaim,
} = require('../.test-build/src/data/repositories/import-persistence-operations.js');

const {
  getBookingsByTripId,
} = require('../.test-build/src/data/repositories/booking-persistence-operations.js');

const {
  DATABASE_VERSION,
  migrateDatabase,
} = require('../.test-build/src/data/database/migrations.js');

const {
  NodeSQLiteDatabase,
} = require('./support/node-sqlite-database.cjs');

const FLIGHT = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:tap-lisbon
DTSTART:20260915T080000
DTEND:20260915T103000
SUMMARY:TAP to Lisbon
LOCATION:Porto Airport
END:VEVENT
BEGIN:VEVENT
UID:airport-taxi
DTSTART:20260915T090000
DTEND:20260915T093000
SUMMARY:Airport taxi
END:VEVENT
END:VCALENDAR`;

function createTrip(id = 'trip-1') {
  return {
    id,
    title: 'Lisbon',
    status: 'planned',
    destinations: [],
    startDate: '2026-09-14',
    endDate: '2026-09-18',
    travelerIds: [],
    accountingCurrency: 'EUR',
    createdAt: '2026-09-02T12:00:00.000Z',
    updatedAt: '2026-09-02T12:00:00.000Z',
  };
}

function createMemoryService(options = {}) {
  const trips = new Map(
    (options.trips ?? [createTrip()]).map((trip) => [trip.id, trip]),
  );
  const bookings = new Map();
  const batches = new Map();
  const claims = new Map();
  let nextId = 1;

  const repos = {
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
      async acceptClaim(claim, booking) {
        claims.set(claim.id, claim);
        bookings.set(booking.id, booking);
      },
    },
    trips: {
      async getAll() {
        return [...trips.values()];
      },
      async getById(id) {
        return trips.get(id) ?? null;
      },
    },
    bookings: {
      async getByTripId(tripId) {
        return [...bookings.values()].filter(
          (booking) => booking.tripId === tripId,
        );
      },
    },
  };

  return {
    service: new ImportReviewService(
      repos,
      () => `id-${nextId++}`,
      () => '2026-09-02T12:00:00.000Z',
    ),
    bookings,
  };
}

test('imported calendar events stay in a review queue until accepted', async () => {
  const { service, bookings } = createMemoryService();

  const batch = await service.ingestIcs({ text: FLIGHT });
  const review = await service.listClaimReviews(batch.id);

  assert.equal(review.listings.length, 2);
  assert.equal(
    review.listings.every((listing) => listing.claim.status === 'pending'),
    true,
  );
  assert.equal(bookings.size, 0);
  assert.match(review.listings[0].conflicts[0].kind, /needs-trip/);
});

test('accepting a claim writes a planned booking without inventing confirmation facts', async () => {
  const { service, bookings } = createMemoryService();

  const batch = await service.ingestIcs({ text: FLIGHT });
  const [flight] = (await service.listClaimReviews(batch.id)).listings;
  const accepted = await service.accept(flight.claim.id, 'trip-1');

  assert.equal(accepted.status, 'accepted');
  assert.equal(bookings.size, 1);

  const booking = [...bookings.values()][0];

  assert.equal(booking.type, 'other');
  assert.equal(booking.status, 'planned');
  assert.equal(booking.title, 'TAP to Lisbon');
  assert.equal(booking.startAt, '2026-09-15T08:00:00');
  assert.equal(booking.confirmationCode, undefined);
  assert.equal(booking.amount, undefined);
  assert.match(booking.notes, /Imported from calendar/);
  assert.match(booking.notes, /Porto Airport/);
  assert.equal('latitude' in booking, false);
});

test('the same calendar is ingested once and unknown trips fail closed', async () => {
  const { service } = createMemoryService();

  const first = await service.ingestIcs({ text: FLIGHT });
  const second = await service.ingestIcs({ text: FLIGHT });

  assert.equal(first.id, second.id);
  assert.equal((await service.listBatches()).length, 1);

  const [flight] = (await service.listClaimReviews(first.id)).listings;

  await assert.rejects(
    () => service.accept(flight.claim.id, 'missing-trip'),
    /Trip was not found/,
  );
});

test('overlaps are recorded against the selected trip and do not auto-write bookings', async () => {
  const { service, bookings } = createMemoryService();

  const batch = await service.ingestIcs({ text: FLIGHT });
  const listings = (await service.listClaimReviews(batch.id, 'trip-1'))
    .listings;
  const flight = listings.find(
    (listing) => listing.claim.title === 'TAP to Lisbon',
  );
  const taxi = listings.find(
    (listing) => listing.claim.title === 'Airport taxi',
  );

  await service.accept(flight.claim.id, 'trip-1');

  const after = await service.listClaimReviews(batch.id, 'trip-1');
  const taxiAfter = after.listings.find(
    (listing) => listing.claim.title === 'Airport taxi',
  );

  assert.equal(
    taxiAfter.conflicts.some((conflict) => conflict.kind === 'overlap'),
    true,
  );
  assert.equal(bookings.size, 1);

  await service.dismiss(taxi.claim.id);

  const dismissed = await service.listClaimReviews(batch.id, 'trip-1');
  const taxiDismissed = dismissed.listings.find(
    (listing) => listing.claim.title === 'Airport taxi',
  );

  assert.equal(taxiDismissed.claim.status, 'dismissed');
  assert.equal(bookings.size, 1);
});

test('sqlite import claims survive migration v11 and stay off the trip graph until accepted', async () => {
  const database = new NodeSQLiteDatabase();

  try {
    await migrateDatabase(database);

    const version = await database.queryFirst(
      'PRAGMA user_version;',
    );

    assert.equal(version.user_version, DATABASE_VERSION);
    assert.equal(DATABASE_VERSION, 13);

    await database.execute(
      `
        INSERT INTO trips (
          id, title, status, start_date, end_date,
          accounting_currency, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        'trip-1',
        'Lisbon',
        'planned',
        '2026-09-14',
        '2026-09-18',
        'EUR',
        '2026-09-02T12:00:00.000Z',
        '2026-09-02T12:00:00.000Z',
      ],
    );

    const trip = createTrip();
    let nextId = 0;
    const service = new ImportReviewService(
      {
        imports: {
          listBatches: () => listImportBatches(database),
          getBatch: (id) => getImportBatch(database, id),
          getBatchByContentHash: (hash) =>
            getImportBatchByContentHash(database, hash),
          listClaims: (batchId) => listImportClaims(database, batchId),
          getClaim: (id) => getImportClaim(database, id),
          saveBatch: (batch, claims) =>
            saveImportBatchWithClaims(database, batch, claims),
          saveClaim: (claim) => saveImportClaim(database, claim),
          acceptClaim: (claim, booking) =>
            acceptImportClaim(database, claim, booking),
        },
        trips: {
          async getAll() {
            return [trip];
          },
          async getById(id) {
            return id === trip.id ? trip : null;
          },
        },
        bookings: {
          getByTripId: (tripId) => getBookingsByTripId(database, tripId),
        },
      },
      () => {
        nextId += 1;
        return `sqlite-${nextId}`;
      },
      () => '2026-09-02T12:00:00.000Z',
    );

    const batch = await service.ingestIcs({ text: FLIGHT });
    const claims = await listImportClaims(database, batch.id);
    const bookingsBefore = await getBookingsByTripId(database, 'trip-1');

    assert.equal(claims.length, 2);
    assert.equal(bookingsBefore.length, 0);

    const flight = claims.find((claim) => claim.title === 'TAP to Lisbon');
    await service.accept(flight.id, 'trip-1');

    const bookingsAfter = await getBookingsByTripId(database, 'trip-1');
    const trips = await database.query('SELECT id FROM trips;');

    assert.equal(bookingsAfter.length, 1);
    assert.equal(bookingsAfter[0].status, 'planned');
    assert.deepEqual(
      trips.map((row) => row.id),
      ['trip-1'],
    );
  } finally {
    database.close();
  }
});
