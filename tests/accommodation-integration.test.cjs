const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DATABASE_VERSION,
  migrateDatabase,
} = require(
  '../.test-build/src/data/database/migrations.js',
);
const {
  deleteCanonicalAccommodation,
  getAccommodationById,
  getAccommodationsByBookingId,
  getAccommodationsByStopId,
  getAccommodationsByTripId,
  saveCanonicalAccommodation,
} = require(
  '../.test-build/src/data/repositories/accommodation-persistence-operations.js',
);
const {
  deleteCanonicalBooking,
  saveCanonicalBooking,
} = require(
  '../.test-build/src/data/repositories/booking-persistence-operations.js',
);
const {
  deleteCanonicalTripStop,
} = require(
  '../.test-build/src/data/repositories/trip-persistence-operations.js',
);
const {
  accommodationContextsForDay,
  accommodationsLinkedToBooking,
  accommodationsLinkedToStop,
  cleanAccommodationInput,
  combineAccommodationDateTime,
  isCanonicalAccommodationDateTime,
  validateAccommodationRelationships,
} = require(
  '../.test-build/src/services/accommodation-details.js',
);
const {
  NodeSQLiteDatabase,
} = require('./support/node-sqlite-database.cjs');

const TIMESTAMP = '2026-08-23T12:00:00.000Z';

async function createAccommodationDatabase() {
  const database = new NodeSQLiteDatabase();
  await migrateDatabase(database);

  for (const tripId of ['trip-a', 'trip-b']) {
    await database.execute(
      `
        INSERT INTO trips (
          id, title, status, start_date, end_date,
          accounting_currency, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        tripId,
        tripId,
        'planned',
        '2026-09-01',
        '2026-09-04',
        'EUR',
        TIMESTAMP,
        TIMESTAMP,
      ],
    );
    await database.execute(
      `
        INSERT INTO trip_days (
          id, trip_id, date, day_number, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?);
      `,
      [
        `day-${tripId}`,
        tripId,
        '2026-09-01',
        1,
        TIMESTAMP,
        TIMESTAMP,
      ],
    );
    await database.execute(
      `
        INSERT INTO trip_stops (
          id, trip_id, day_id, title, type, position,
          location_name, latitude, longitude, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        `stop-${tripId}`,
        tripId,
        `day-${tripId}`,
        `Mapped stay ${tripId}`,
        'accommodation',
        1,
        `Known place ${tripId}`,
        tripId === 'trip-a' ? 37.98 : 48.85,
        tripId === 'trip-a' ? 23.72 : 2.35,
        TIMESTAMP,
        TIMESTAMP,
      ],
    );
    await saveCanonicalBooking(database, {
      id: `booking-${tripId}`,
      tripId,
      stopId: `stop-${tripId}`,
      type: 'accommodation',
      status: 'confirmed',
      title: `Reservation ${tripId}`,
      provider: 'Known provider',
      confirmationCode: `REAL-${tripId}`,
      isPaid: true,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    });
  }

  return database;
}

function makeAccommodation(overrides = {}) {
  return {
    id: 'stay-1',
    tripId: 'trip-a',
    bookingId: 'booking-trip-a',
    stopId: 'stop-trip-a',
    name: 'Known Hotel',
    type: 'hotel',
    address: '1 Real Street',
    latitude: 37.98,
    longitude: 23.72,
    checkInAt: '2026-09-01T15:00:00',
    checkOutAt: '2026-09-03T11:00:00',
    phone: '+30 210 000 0000',
    website: 'https://example.test/stay',
    notes: 'Preserve every stay fact',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

test(
  'accommodation persists, reloads, edits and unlinks without losing stay facts',
  async () => {
    const database = await createAccommodationDatabase();

    try {
      const stay = makeAccommodation();
      await saveCanonicalAccommodation(database, stay);

      assert.deepEqual(
        await getAccommodationById(database, stay.id),
        stay,
      );

      await saveCanonicalAccommodation(database, {
        ...stay,
        name: 'Known Hotel — updated',
        bookingId: undefined,
        stopId: undefined,
        updatedAt: '2026-08-23T13:00:00.000Z',
      });

      const reloaded = await getAccommodationById(
        database,
        stay.id,
      );

      assert.equal(reloaded.name, 'Known Hotel — updated');
      assert.equal(reloaded.bookingId, undefined);
      assert.equal(reloaded.stopId, undefined);
      assert.equal(reloaded.latitude, 37.98);
      assert.equal(reloaded.notes, 'Preserve every stay fact');
    } finally {
      database.close();
    }
  },
);

test(
  'multiple stays are sorted by check-in and exact reverse links allow intentional one-to-many relationships',
  async () => {
    const database = await createAccommodationDatabase();

    try {
      const late = makeAccommodation({
        id: 'stay-late',
        name: 'Second stay',
        checkInAt: '2026-09-03T15:00:00',
        checkOutAt: '2026-09-04T10:00:00',
      });
      const early = makeAccommodation({
        id: 'stay-early',
        name: 'First stay',
        checkInAt: '2026-09-01T15:00:00',
        checkOutAt: '2026-09-03T10:00:00',
      });

      await saveCanonicalAccommodation(database, late);
      await saveCanonicalAccommodation(database, early);

      assert.deepEqual(
        (await getAccommodationsByTripId(database, 'trip-a')).map(
          (stay) => stay.id,
        ),
        ['stay-early', 'stay-late'],
      );
      assert.deepEqual(
        (await getAccommodationsByBookingId(
          database,
          'booking-trip-a',
        )).map((stay) => stay.id),
        ['stay-early', 'stay-late'],
      );
      assert.deepEqual(
        (await getAccommodationsByStopId(
          database,
          'stop-trip-a',
        )).map((stay) => stay.id),
        ['stay-early', 'stay-late'],
      );

      assert.deepEqual(
        accommodationsLinkedToBooking(
          [early, late],
          'booking-trip-a',
        ).map((stay) => stay.id),
        ['stay-early', 'stay-late'],
      );
      assert.deepEqual(
        accommodationsLinkedToStop(
          [early, late],
          'stop-trip-a',
        ).map((stay) => stay.id),
        ['stay-early', 'stay-late'],
      );
    } finally {
      database.close();
    }
  },
);

test(
  'service and persistence validation reject missing or cross-trip links',
  async () => {
    const database = await createAccommodationDatabase();

    try {
      assert.throws(
        () =>
          validateAccommodationRelationships(
            'trip-a',
            { bookingId: 'booking-trip-b' },
            {
              id: 'booking-trip-b',
              tripId: 'trip-b',
            },
            null,
          ),
        /does not belong/,
      );

      await assert.rejects(
        saveCanonicalAccommodation(
          database,
          makeAccommodation({
            bookingId: 'booking-trip-b',
          }),
        ),
        /same trip/,
      );
      await assert.rejects(
        saveCanonicalAccommodation(
          database,
          makeAccommodation({
            stopId: 'stop-trip-b',
          }),
        ),
        /same trip/,
      );
      await assert.rejects(
        database.execute(
          `
            INSERT INTO accommodations (
              id, trip_id, booking_id, name, type,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?);
          `,
          [
            'direct-invalid',
            'trip-a',
            'booking-trip-b',
            'Invalid direct link',
            'hotel',
            TIMESTAMP,
            TIMESTAMP,
          ],
        ),
        /accommodation booking must belong/,
      );
    } finally {
      database.close();
    }
  },
);

test(
  'deleting a linked entity unlinks the stay, while deleting a stay preserves its booking and stop',
  async () => {
    const database = await createAccommodationDatabase();

    try {
      await saveCanonicalAccommodation(database, makeAccommodation());
      await deleteCanonicalBooking(database, 'booking-trip-a');

      let stay = await getAccommodationById(database, 'stay-1');
      assert.equal(stay.bookingId, undefined);
      assert.equal(stay.stopId, 'stop-trip-a');

      await deleteCanonicalTripStop(database, 'stop-trip-a');
      stay = await getAccommodationById(database, 'stay-1');
      assert.equal(stay.stopId, undefined);
      assert.equal(stay.name, 'Known Hotel');

      await saveCanonicalAccommodation(
        database,
        makeAccommodation({
          id: 'stay-2',
          tripId: 'trip-b',
          bookingId: 'booking-trip-b',
          stopId: 'stop-trip-b',
        }),
      );
      await deleteCanonicalAccommodation(database, 'stay-2');

      assert.equal(
        await database.queryFirst(
          'SELECT id FROM bookings WHERE id = ?;',
          ['booking-trip-b'],
        ).then(Boolean),
        true,
      );
      assert.equal(
        await database.queryFirst(
          'SELECT id FROM trip_stops WHERE id = ?;',
          ['stop-trip-b'],
        ).then(Boolean),
        true,
      );
    } finally {
      database.close();
    }
  },
);

test(
  'stay times validate as local wall times and drive conservative day context',
  () => {
    assert.equal(
      combineAccommodationDateTime('2026-09-01', '15:30'),
      '2026-09-01T15:30:00',
    );
    assert.equal(
      isCanonicalAccommodationDateTime('2026-09-01T15:30:00'),
      true,
    );
    assert.equal(
      isCanonicalAccommodationDateTime('2026-02-30T15:30:00'),
      false,
    );
    assert.throws(
      () =>
        cleanAccommodationInput({
          name: 'Impossible stay',
          type: 'hotel',
          checkInAt: '2026-09-03T12:00:00',
          checkOutAt: '2026-09-02T12:00:00',
        }),
      /cannot be after/,
    );

    const legacy = cleanAccommodationInput({
      name: 'Legacy stay',
      type: 'hotel',
      checkInAt: '2026-09-01T15:30:00.000Z',
    });
    assert.equal(legacy.checkInAt, '2026-09-01T15:30:00.000Z');

    const stay = makeAccommodation();
    assert.deepEqual(
      accommodationContextsForDay([stay], '2026-09-01').map(
        (context) => context.phase,
      ),
      ['check-in'],
    );
    assert.deepEqual(
      accommodationContextsForDay([stay], '2026-09-02').map(
        (context) => context.phase,
      ),
      ['stay'],
    );
    assert.deepEqual(
      accommodationContextsForDay([stay], '2026-09-03').map(
        (context) => context.phase,
      ),
      ['check-out'],
    );

    const dayStay = makeAccommodation({
      checkInAt: '2026-09-02T08:00:00',
      checkOutAt: '2026-09-02T20:00:00',
    });
    assert.deepEqual(
      accommodationContextsForDay([dayStay], '2026-09-02').map(
        (context) => context.phase,
      ),
      ['check-in', 'check-out'],
    );
  },
);

test(
  'migration v6 archives only invalid relationship IDs, preserves stay data and installs same-trip triggers',
  async () => {
    const database = new NodeSQLiteDatabase();

    try {
      await migrateDatabase(database);
      await database.execAsync('DROP TRIGGER validate_accommodation_booking_insert; DROP TRIGGER validate_accommodation_booking_update; DROP TRIGGER validate_accommodation_stop_insert; DROP TRIGGER validate_accommodation_stop_update; PRAGMA user_version = 5;');

      for (const tripId of ['migration-a', 'migration-b']) {
        await database.execute(
          `INSERT INTO trips (id, title, status, start_date, end_date, accounting_currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [tripId, tripId, 'planned', '2026-09-01', '2026-09-02', 'EUR', TIMESTAMP, TIMESTAMP],
        );
        await database.execute(
          `INSERT INTO trip_days (id, trip_id, date, day_number, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);`,
          [`day-${tripId}`, tripId, '2026-09-01', 1, TIMESTAMP, TIMESTAMP],
        );
        await database.execute(
          `INSERT INTO trip_stops (id, trip_id, day_id, title, type, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [`stop-${tripId}`, tripId, `day-${tripId}`, tripId, 'accommodation', 1, TIMESTAMP, TIMESTAMP],
        );
        await database.execute(
          `INSERT INTO bookings (id, trip_id, type, status, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [`booking-${tripId}`, tripId, 'accommodation', 'confirmed', tripId, TIMESTAMP, TIMESTAMP],
        );
      }

      await database.execute(
        `
          INSERT INTO accommodations (
            id, trip_id, booking_id, stop_id, name, type,
            address, check_in_at, check_out_at, notes,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          'legacy-invalid-stay',
          'migration-a',
          'booking-migration-b',
          'stop-migration-b',
          'Preserved legacy stay',
          'hotel',
          'Known address',
          '2026-09-01T15:00:00',
          '2026-09-02T11:00:00',
          'Keep this note',
          TIMESTAMP,
          TIMESTAMP,
        ],
      );

      await migrateDatabase(database);

      const version = await database.queryFirst('PRAGMA user_version;');
      const stay = await database.queryFirst(
        `SELECT booking_id, stop_id, name, address, check_in_at, check_out_at, notes FROM accommodations WHERE id = ?;`,
        ['legacy-invalid-stay'],
      );
      const archived = await database.queryFirst(
        `SELECT accommodation_trip_id, booking_id, booking_trip_id, stop_id, stop_trip_id FROM migration_v6_invalid_accommodation_links WHERE accommodation_id = ?;`,
        ['legacy-invalid-stay'],
      );
      const triggers = await database.query(
        `SELECT name FROM sqlite_master WHERE type = 'trigger' AND name LIKE 'validate_accommodation_%' ORDER BY name ASC;`,
      );

      assert.equal(version.user_version, DATABASE_VERSION);
      assert.deepEqual(
        { ...stay },
        {
          booking_id: null,
          stop_id: null,
          name: 'Preserved legacy stay',
          address: 'Known address',
          check_in_at: '2026-09-01T15:00:00',
          check_out_at: '2026-09-02T11:00:00',
          notes: 'Keep this note',
        },
      );
      assert.deepEqual(
        { ...archived },
        {
          accommodation_trip_id: 'migration-a',
          booking_id: 'booking-migration-b',
          booking_trip_id: 'migration-b',
          stop_id: 'stop-migration-b',
          stop_trip_id: 'migration-b',
        },
      );
      assert.deepEqual(
        triggers.map((trigger) => trigger.name),
        [
          'validate_accommodation_booking_insert',
          'validate_accommodation_booking_update',
          'validate_accommodation_stop_insert',
          'validate_accommodation_stop_update',
        ],
      );

      await assert.rejects(
        database.execute(
          `UPDATE accommodations SET booking_id = ? WHERE id = ?;`,
          ['booking-migration-b', 'legacy-invalid-stay'],
        ),
        /accommodation booking must belong/,
      );
      await database.execute(
        `UPDATE accommodations SET booking_id = ?, stop_id = ? WHERE id = ?;`,
        [
          'booking-migration-a',
          'stop-migration-a',
          'legacy-invalid-stay',
        ],
      );
      await migrateDatabase(database);
      const afterRepeat = await database.queryFirst(
        `SELECT booking_id, stop_id, name FROM accommodations WHERE id = ?;`,
        ['legacy-invalid-stay'],
      );
      assert.deepEqual(
        { ...afterRepeat },
        {
          booking_id: 'booking-migration-a',
          stop_id: 'stop-migration-a',
          name: 'Preserved legacy stay',
        },
      );
    } finally {
      database.close();
    }
  },
);
