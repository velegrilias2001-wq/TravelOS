const assert =
  require('node:assert/strict');
const test = require('node:test');

const {
  migrateDatabase,
} = require(
  '../.test-build/src/data/database/migrations.js',
);
const {
  deleteCanonicalBooking,
  getBookingById,
  getBookingsByStopId,
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
  bookingsLinkedToStop,
  buildItineraryStopContexts,
  validateBookingStopRelationship,
} = require(
  '../.test-build/src/services/booking-stop-relationship.js',
);
const {
  NodeSQLiteDatabase,
} = require(
  './support/node-sqlite-database.cjs',
);

const TIMESTAMP =
  '2026-08-23T12:00:00.000Z';

async function createRelationshipDatabase() {
  const database =
    new NodeSQLiteDatabase();

  await migrateDatabase(database);

  for (const [id, title] of [
    ['trip-1', 'Relationship Test'],
    ['trip-2', 'Other Trip'],
  ]) {
    await database.execute(
      `
        INSERT INTO trips (
          id,
          title,
          status,
          start_date,
          end_date,
          accounting_currency,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        id,
        title,
        'planned',
        '2026-09-01',
        '2026-09-02',
        'EUR',
        TIMESTAMP,
        TIMESTAMP,
      ],
    );

    await database.execute(
      `
        INSERT INTO trip_days (
          id,
          trip_id,
          date,
          day_number,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?);
      `,
      [
        `day-${id}`,
        id,
        '2026-09-01',
        1,
        TIMESTAMP,
        TIMESTAMP,
      ],
    );
  }

  for (const [id, tripId, position] of [
    ['stop-1', 'trip-1', 1],
    ['stop-2', 'trip-1', 2],
    ['stop-other', 'trip-2', 1],
  ]) {
    await database.execute(
      `
        INSERT INTO trip_stops (
          id,
          trip_id,
          day_id,
          title,
          type,
          position,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        id,
        tripId,
        `day-${tripId}`,
        id,
        'activity',
        position,
        TIMESTAMP,
        TIMESTAMP,
      ],
    );
  }

  return database;
}

function makeBooking(overrides = {}) {
  return {
    id: 'booking-1',
    tripId: 'trip-1',
    stopId: 'stop-1',
    type: 'activity',
    status: 'confirmed',
    title: 'Museum admission',
    provider: 'City museum',
    confirmationCode: 'REAL-123',
    startAt: '2026-09-01T09:00:00.000Z',
    endAt: '2026-09-01T11:00:00.000Z',
    amount: 25,
    currencyCode: 'EUR',
    isPaid: true,
    notes: 'Keep every field',
    externalUrl:
      'https://example.test/booking',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

test(
  'booking links persist, change and unlink without losing booking content',
  async () => {
    const database =
      await createRelationshipDatabase();

    try {
      const original = makeBooking();

      await saveCanonicalBooking(
        database,
        original,
      );

      assert.deepEqual(
        await getBookingById(
          database,
          original.id,
        ),
        original,
      );

      await saveCanonicalBooking(
        database,
        {
          ...original,
          stopId: 'stop-2',
          updatedAt:
            '2026-08-23T13:00:00.000Z',
        },
      );

      assert.equal(
        (
          await getBookingById(
            database,
            original.id,
          )
        ).stopId,
        'stop-2',
      );

      await saveCanonicalBooking(
        database,
        {
          ...original,
          stopId: undefined,
          updatedAt:
            '2026-08-23T14:00:00.000Z',
        },
      );

      const unlinked =
        await getBookingById(
          database,
          original.id,
        );

      assert.equal(
        unlinked.stopId,
        undefined,
      );
      assert.equal(
        unlinked.confirmationCode,
        'REAL-123',
      );
      assert.equal(
        unlinked.notes,
        'Keep every field',
      );
    } finally {
      database.close();
    }
  },
);

test(
  'multiple bookings may link to one stop and are found only by exact stop ID',
  async () => {
    const database =
      await createRelationshipDatabase();

    try {
      await saveCanonicalBooking(
        database,
        makeBooking(),
      );
      await saveCanonicalBooking(
        database,
        makeBooking({
          id: 'booking-2',
          title: 'Guided tour',
        }),
      );

      const linked =
        await getBookingsByStopId(
          database,
          'stop-1',
        );

      assert.deepEqual(
        linked.map(
          (booking) => booking.id,
        ),
        ['booking-1', 'booking-2'],
      );

      assert.deepEqual(
        bookingsLinkedToStop(
          linked,
          'stop-2',
        ),
        [],
      );
    } finally {
      database.close();
    }
  },
);

test(
  'cross-trip booking links are rejected by persistence and database invariants',
  async () => {
    const database =
      await createRelationshipDatabase();

    try {
      await assert.rejects(
        saveCanonicalBooking(
          database,
          makeBooking({
            stopId: 'stop-other',
          }),
        ),
        /same trip/,
      );

      await assert.rejects(
        database.execute(
          `
            INSERT INTO bookings (
              id,
              trip_id,
              stop_id,
              type,
              status,
              title,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
          `,
          [
            'booking-direct',
            'trip-1',
            'stop-other',
            'other',
            'planned',
            'Invalid direct link',
            TIMESTAMP,
            TIMESTAMP,
          ],
        ),
        /booking stop must belong/,
      );
    } finally {
      database.close();
    }
  },
);

test(
  'deleting a stop atomically preserves and unlinks every booking',
  async () => {
    const database =
      await createRelationshipDatabase();

    try {
      await saveCanonicalBooking(
        database,
        makeBooking(),
      );
      await saveCanonicalBooking(
        database,
        makeBooking({
          id: 'booking-2',
          title: 'Second ticket',
        }),
      );

      await deleteCanonicalTripStop(
        database,
        'stop-1',
      );

      const stop =
        await database.queryFirst(
          'SELECT id FROM trip_stops WHERE id = ?;',
          ['stop-1'],
        );
      const bookings =
        await database.query(
          `
            SELECT id, stop_id, title
            FROM bookings
            ORDER BY id ASC;
          `,
        );

      assert.equal(stop, null);
      assert.deepEqual(
        bookings.map((booking) => ({
          ...booking,
        })),
        [
          {
            id: 'booking-1',
            stop_id: null,
            title: 'Museum admission',
          },
          {
            id: 'booking-2',
            stop_id: null,
            title: 'Second ticket',
          },
        ],
      );
    } finally {
      database.close();
    }
  },
);

test(
  'deleting a booking never deletes its itinerary stop',
  async () => {
    const database =
      await createRelationshipDatabase();

    try {
      await saveCanonicalBooking(
        database,
        makeBooking(),
      );

      await deleteCanonicalBooking(
        database,
        'booking-1',
      );

      assert.equal(
        await getBookingById(
          database,
          'booking-1',
        ),
        null,
      );
      assert.ok(
        await database.queryFirst(
          'SELECT id FROM trip_stops WHERE id = ?;',
          ['stop-1'],
        ),
      );
    } finally {
      database.close();
    }
  },
);

test(
  'relationship helpers use canonical IDs and preserve itinerary order',
  () => {
    const days = [
      {
        id: 'day-2',
        tripId: 'trip-1',
        date: '2026-09-02',
        dayNumber: 2,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
      {
        id: 'day-1',
        tripId: 'trip-1',
        date: '2026-09-01',
        dayNumber: 1,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ];
    const stops = [
      {
        id: 'stop-2',
        tripId: 'trip-1',
        dayId: 'day-2',
        title: 'Same title',
        type: 'place',
        order: 1,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
      {
        id: 'stop-1',
        tripId: 'trip-1',
        dayId: 'day-1',
        title: 'Same title',
        type: 'place',
        order: 1,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ];
    const booking = makeBooking();

    assert.deepEqual(
      buildItineraryStopContexts(
        days,
        stops,
      ).map(
        (context) =>
          context.stop.id,
      ),
      ['stop-1', 'stop-2'],
    );
    assert.doesNotThrow(() =>
      validateBookingStopRelationship(
        booking,
        stops[1],
      ),
    );
    assert.throws(
      () =>
        validateBookingStopRelationship(
          booking,
          stops[0],
        ),
      /no longer exists/,
    );
    assert.throws(
      () =>
        validateBookingStopRelationship(
          booking,
          {
            ...stops[1],
            tripId: 'trip-2',
          },
        ),
      /another trip/,
    );
  },
);
