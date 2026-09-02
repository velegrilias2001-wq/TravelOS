const assert =
  require('node:assert/strict');
const test = require('node:test');

const {
  migrateDatabase,
} = require(
  '../.test-build/src/data/database/migrations.js',
);
const {
  deleteCanonicalTrip,
  saveCanonicalTrip,
} = require(
  '../.test-build/src/data/repositories/trip-persistence-operations.js',
);
const {
  buildUpdatedTrip,
  isCanonicalDateKey,
  validateTripDateRange,
} = require(
  '../.test-build/src/services/trip-details.js',
);
const {
  NodeSQLiteDatabase,
} = require(
  './support/node-sqlite-database.cjs',
);

const CREATED_AT =
  '2026-08-23T10:00:00.000Z';
const UPDATED_AT =
  '2026-08-23T12:00:00.000Z';

function makeTrip(overrides = {}) {
  return {
    id: 'trip-details-1',
    title: 'Original journey',
    status: 'planned',
    intent: 'relax',
    pace: 'slow',
    destinations: [
      {
        id: 'destination-1',
        name: 'Tokyo',
        countryCode: 'JP',
        latitude: 35.6762,
        longitude: 139.6503,
        timezone: 'Asia/Tokyo',
        currencyCode: 'JPY',
      },
      {
        id: 'destination-2',
        name: 'Kyoto',
      },
    ],
    startDate: '2026-09-01',
    endDate: '2026-09-10',
    travelerIds: ['traveler-1'],
    accountingCurrency: 'EUR',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  };
}

function makeInput(overrides = {}) {
  return {
    title: 'Edited journey',
    destinations: [
      {
        id: 'destination-1',
        name: 'Tokyo',
      },
      {
        id: 'destination-2',
        name: 'Kyoto & Nara',
      },
    ],
    startDate: '2026-09-02',
    endDate: '2026-09-12',
    accountingCurrency: 'usd',
    status: 'completed',
    intent: 'explore',
    pace: 'balanced',
    ...overrides,
  };
}

test(
  'trip detail validation accepts canonical dates and rejects invalid or reversed ranges',
  () => {
    assert.equal(
      isCanonicalDateKey('2028-02-29'),
      true,
    );
    assert.equal(
      isCanonicalDateKey('2026-02-29'),
      false,
    );
    assert.equal(
      isCanonicalDateKey('09/01/2026'),
      false,
    );

    assert.doesNotThrow(() =>
      validateTripDateRange(
        '2026-09-01',
        '2026-09-01',
      ),
    );
    assert.throws(
      () =>
        validateTripDateRange(
          '2026-09-10',
          '2026-09-01',
        ),
      /start date cannot be after/i,
    );
  },
);

test(
  'trip detail updates preserve canonical destination identity and enforce budget currency safety',
  () => {
    const trip = makeTrip();
    const updated = buildUpdatedTrip(
      trip,
      makeInput(),
      false,
      UPDATED_AT,
    );

    assert.equal(updated.title, 'Edited journey');
    assert.equal(updated.startDate, '2026-09-02');
    assert.equal(updated.endDate, '2026-09-12');
    assert.equal(updated.accountingCurrency, 'USD');
    assert.equal(updated.status, 'completed');
    assert.equal(updated.intent, 'explore');
    assert.equal(updated.pace, 'balanced');
    assert.equal(updated.updatedAt, UPDATED_AT);
    assert.deepEqual(
      updated.destinations.map(
        ({ id, name }) => ({ id, name }),
      ),
      [
        {
          id: 'destination-1',
          name: 'Tokyo',
        },
        {
          id: 'destination-2',
          name: 'Kyoto & Nara',
        },
      ],
    );
    assert.equal(
      updated.destinations[0].timezone,
      'Asia/Tokyo',
    );
    assert.equal(
      updated.destinations[0].latitude,
      35.6762,
    );

    assert.throws(
      () =>
        buildUpdatedTrip(
          trip,
          makeInput(),
          true,
          UPDATED_AT,
        ),
      /saved budget/i,
    );

    assert.doesNotThrow(() =>
      buildUpdatedTrip(
        trip,
        makeInput({
          accountingCurrency: 'eur',
        }),
        true,
        UPDATED_AT,
      ),
    );

    assert.throws(
      () =>
        buildUpdatedTrip(
          trip,
          makeInput({
            destinations: [
              {
                id: 'destination-1',
                name: 'Osaka',
              },
              {
                id: 'destination-2',
                name: 'Kyoto',
              },
            ],
          }),
          false,
          UPDATED_AT,
        ),
      /location-aware replacement/i,
    );
  },
);

test(
  'trip detail updates preserve, change and explicitly clear trip intent and pace',
  () => {
    const trip = makeTrip();

    const preserved = buildUpdatedTrip(
      trip,
      makeInput({
        accountingCurrency: 'EUR',
        intent: undefined,
        pace: undefined,
      }),
      false,
      UPDATED_AT,
    );

    assert.equal(preserved.intent, 'relax');
    assert.equal(preserved.pace, 'slow');

    const changed = buildUpdatedTrip(
      trip,
      makeInput({
        accountingCurrency: 'EUR',
        intent: 'nature',
        pace: 'full',
      }),
      false,
      UPDATED_AT,
    );

    assert.equal(changed.intent, 'nature');
    assert.equal(changed.pace, 'full');

    const cleared = buildUpdatedTrip(
      trip,
      makeInput({
        accountingCurrency: 'EUR',
        intent: null,
        pace: null,
      }),
      false,
      UPDATED_AT,
    );

    assert.equal(cleared.intent, undefined);
    assert.equal(cleared.pace, undefined);

    assert.throws(
      () =>
        buildUpdatedTrip(
          trip,
          makeInput({
            accountingCurrency: 'EUR',
            intent: 'impossible',
          }),
          false,
          UPDATED_AT,
        ),
      /trip intent is not supported/i,
    );

    assert.throws(
      () =>
        buildUpdatedTrip(
          trip,
          makeInput({
            accountingCurrency: 'EUR',
            pace: 'impossible',
          }),
          false,
          UPDATED_AT,
        ),
      /trip pace is not supported/i,
    );
  },
);

test(
  'location-aware replacement upgrades a legacy destination while preserving trip identity and unrelated facts',
  () => {
    const trip = makeTrip();
    const updated = buildUpdatedTrip(
      trip,
      makeInput({
        accountingCurrency: 'EUR',
        destinations: [
          {
            id: 'destination-1',
            name: 'Tokyo',
          },
          {
            id: 'destination-2',
            name: 'Athens, Greece',
            replacement: {
              name: 'Athens, Greece',
              countryCode: 'GR',
              latitude: 37.9838,
              longitude: 23.7275,
            },
          },
        ],
      }),
      false,
      UPDATED_AT,
    );

    assert.equal(updated.id, trip.id);
    assert.equal(updated.destinations[1].id, 'destination-2');
    assert.deepEqual(
      updated.destinations.map(({ id }) => id),
      ['destination-1', 'destination-2'],
    );
    assert.deepEqual(updated.destinations[1], {
      id: 'destination-2',
      name: 'Athens, Greece',
      countryCode: 'GR',
      latitude: 37.9838,
      longitude: 23.7275,
      timezone: undefined,
      currencyCode: undefined,
    });
    assert.deepEqual(updated.travelerIds, ['traveler-1']);
    assert.equal(updated.accountingCurrency, 'EUR');
    assert.equal(updated.createdAt, CREATED_AT);
  },
);

test(
  'trip detail updates can add, reorder and remove destinations without inventing places',
  () => {
    const trip = makeTrip();

    const reordered = buildUpdatedTrip(
      trip,
      makeInput({
        accountingCurrency: 'EUR',
        destinations: [
          {
            id: 'destination-2',
            name: 'Kyoto',
          },
          {
            id: 'destination-1',
            name: 'Tokyo',
          },
        ],
      }),
      false,
      UPDATED_AT,
    );

    assert.deepEqual(
      reordered.destinations.map(({ id, name, timezone }) => ({
        id,
        name,
        timezone,
      })),
      [
        {
          id: 'destination-2',
          name: 'Kyoto',
          timezone: undefined,
        },
        {
          id: 'destination-1',
          name: 'Tokyo',
          timezone: 'Asia/Tokyo',
        },
      ],
    );

    const added = buildUpdatedTrip(
      trip,
      makeInput({
        accountingCurrency: 'EUR',
        destinations: [
          {
            id: 'destination-1',
            name: 'Tokyo',
          },
          {
            id: 'destination-2',
            name: 'Kyoto',
          },
          {
            id: 'destination-3',
            name: 'Osaka, Japan',
            replacement: {
              name: 'Osaka, Japan',
              countryCode: 'JP',
              latitude: 34.6937,
              longitude: 135.5023,
            },
          },
        ],
      }),
      false,
      UPDATED_AT,
    );

    assert.equal(added.destinations.length, 3);
    assert.equal(added.destinations[2].id, 'destination-3');
    assert.equal(added.destinations[2].name, 'Osaka, Japan');
    assert.equal(added.destinations[2].latitude, 34.6937);

    const removed = buildUpdatedTrip(
      trip,
      makeInput({
        accountingCurrency: 'EUR',
        destinations: [
          {
            id: 'destination-1',
            name: 'Tokyo',
          },
        ],
      }),
      false,
      UPDATED_AT,
    );

    assert.deepEqual(
      removed.destinations.map(({ id }) => id),
      ['destination-1'],
    );

    assert.throws(
      () =>
        buildUpdatedTrip(
          trip,
          makeInput({
            accountingCurrency: 'EUR',
            destinations: [],
          }),
          false,
          UPDATED_AT,
        ),
      /at least one destination/i,
    );

    assert.throws(
      () =>
        buildUpdatedTrip(
          trip,
          makeInput({
            accountingCurrency: 'EUR',
            destinations: [
              {
                id: 'destination-1',
                name: 'Tokyo',
              },
              {
                id: 'destination-2',
                name: 'Kyoto',
              },
              {
                id: 'new-destination',
                name: 'Mystery city',
              },
            ],
          }),
          false,
          UPDATED_AT,
        ),
      /needs a map location/i,
    );
  },
);

test(
  'trip updates persist atomically while preserving destination metadata and traveler links',
  async () => {
    const database =
      new NodeSQLiteDatabase();

    try {
      await migrateDatabase(database);
      await database.execute(
        `
          INSERT INTO travelers (
            id, first_name, type,
            created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?);
        `,
        [
          'traveler-1',
          'Ari',
          'adult',
          CREATED_AT,
          CREATED_AT,
        ],
      );

      const original = makeTrip();
      await saveCanonicalTrip(
        database,
        original,
      );

      const updated = buildUpdatedTrip(
        original,
        makeInput({
          accountingCurrency: 'EUR',
        }),
        false,
        UPDATED_AT,
      );

      await saveCanonicalTrip(
        database,
        updated,
      );

      const row =
        await database.queryFirst(
          `
            SELECT
              title,
              status,
              intent,
              pace,
              start_date,
              end_date,
              accounting_currency,
              created_at,
              updated_at
            FROM trips
            WHERE id = ?;
          `,
          [original.id],
        );

      assert.deepEqual({ ...row }, {
        title: 'Edited journey',
        status: 'completed',
        intent: 'explore',
        pace: 'balanced',
        start_date: '2026-09-02',
        end_date: '2026-09-12',
        accounting_currency: 'EUR',
        created_at: CREATED_AT,
        updated_at: UPDATED_AT,
      });

      const destinationRows =
        await database.query(
          `
            SELECT
              id,
              name,
              country_code,
              latitude,
              longitude,
              timezone,
              currency_code,
              position
            FROM trip_destinations
            WHERE trip_id = ?
            ORDER BY position ASC;
          `,
          [original.id],
        );

      assert.deepEqual(
        destinationRows.map((entry) => ({
          ...entry,
        })),
        [
          {
            id: 'destination-1',
            name: 'Tokyo',
            country_code: 'JP',
            latitude: 35.6762,
            longitude: 139.6503,
            timezone: 'Asia/Tokyo',
            currency_code: 'JPY',
            position: 0,
          },
          {
            id: 'destination-2',
            name: 'Kyoto & Nara',
            country_code: null,
            latitude: null,
            longitude: null,
            timezone: null,
            currency_code: null,
            position: 1,
          },
        ],
      );

      const links = await database.query(
        `
          SELECT trip_id, traveler_id
          FROM trip_travelers;
        `,
      );

      assert.deepEqual(
        links.map((entry) => ({ ...entry })),
        [
          {
            trip_id: original.id,
            traveler_id: 'traveler-1',
          },
        ],
      );
    } finally {
      database.close();
    }
  },
);

test(
  'trip deletion cascades trip-owned data and preserves independent traveler records',
  async () => {
    const database =
      new NodeSQLiteDatabase();

    try {
      await migrateDatabase(database);
      await database.execute(
        `
          INSERT INTO travelers (
            id, first_name, type,
            created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?);
        `,
        [
          'traveler-1',
          'Ari',
          'adult',
          CREATED_AT,
          CREATED_AT,
        ],
      );
      await saveCanonicalTrip(
        database,
        makeTrip(),
      );

      await database.execute(
        `INSERT INTO trip_days (
          id, trip_id, date, day_number,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?);`,
        [
          'day-1',
          'trip-details-1',
          '2026-09-01',
          1,
          CREATED_AT,
          CREATED_AT,
        ],
      );
      await database.execute(
        `INSERT INTO trip_stops (
          id, trip_id, day_id, title, type,
          position, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          'stop-1',
          'trip-details-1',
          'day-1',
          'Museum',
          'activity',
          1,
          CREATED_AT,
          CREATED_AT,
        ],
      );
      await database.execute(
        `INSERT INTO bookings (
          id, trip_id, stop_id, type,
          status, title, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          'booking-1',
          'trip-details-1',
          'stop-1',
          'activity',
          'confirmed',
          'Museum ticket',
          CREATED_AT,
          CREATED_AT,
        ],
      );
      await database.execute(
        `INSERT INTO accommodations (
          id, trip_id, stop_id, booking_id,
          name, type, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          'accommodation-1',
          'trip-details-1',
          'stop-1',
          'booking-1',
          'Hotel',
          'hotel',
          CREATED_AT,
          CREATED_AT,
        ],
      );
      await database.execute(
        `INSERT INTO budgets (
          id, trip_id, currency_code,
          planned_amount, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?);`,
        [
          'budget-1',
          'trip-details-1',
          'EUR',
          1000,
          CREATED_AT,
          CREATED_AT,
        ],
      );
      await database.execute(
        `INSERT INTO budget_items (
          id, budget_id, trip_id, booking_id,
          stop_id, title, category, status,
          amount, currency_code, expense_date,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          'expense-1',
          'budget-1',
          'trip-details-1',
          'booking-1',
          'stop-1',
          'Museum',
          'activities',
          'paid',
          25,
          'EUR',
          '2026-09-01',
          CREATED_AT,
          CREATED_AT,
        ],
      );
      await database.execute(
        `INSERT INTO trip_runtime_states (
          trip_id, phase, current_day_id,
          current_stop_id, is_companion_active,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?);`,
        [
          'trip-details-1',
          'before_trip',
          'day-1',
          'stop-1',
          0,
          CREATED_AT,
        ],
      );
      await database.execute(
        `INSERT INTO memories (
          id, trip_id, day_id, stop_id, type,
          captured_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          'memory-1',
          'trip-details-1',
          'day-1',
          'stop-1',
          'note',
          CREATED_AT,
          CREATED_AT,
          CREATED_AT,
        ],
      );
      await database.execute(
        `INSERT INTO travel_books (
          id, trip_id, title, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?);`,
        [
          'book-1',
          'trip-details-1',
          'Japan book',
          CREATED_AT,
          CREATED_AT,
        ],
      );
      await database.execute(
        `INSERT INTO travel_book_memories (
          travel_book_id, memory_id, position
        ) VALUES (?, ?, ?);`,
        ['book-1', 'memory-1', 1],
      );

      await deleteCanonicalTrip(
        database,
        'trip-details-1',
      );

      const tripOwnedChecks = [
        ['trips', 'id'],
        ['trip_destinations', 'trip_id'],
        ['trip_days', 'trip_id'],
        ['trip_stops', 'trip_id'],
        ['trip_travelers', 'trip_id'],
        ['bookings', 'trip_id'],
        ['accommodations', 'trip_id'],
        ['budgets', 'trip_id'],
        ['budget_items', 'trip_id'],
        ['trip_runtime_states', 'trip_id'],
        ['memories', 'trip_id'],
        ['travel_books', 'trip_id'],
      ];

      for (const [table, column] of tripOwnedChecks) {
        const count =
          await database.queryFirst(
            `SELECT COUNT(*) AS count FROM ${table} WHERE ${column} = ?;`,
            ['trip-details-1'],
          );

        assert.equal(
          count.count,
          0,
          `${table} should not retain trip-owned rows`,
        );
      }

      const bookLinks =
        await database.queryFirst(
          `SELECT COUNT(*) AS count FROM travel_book_memories;`,
        );
      const travelers =
        await database.queryFirst(
          `SELECT COUNT(*) AS count FROM travelers WHERE id = ?;`,
          ['traveler-1'],
        );

      assert.equal(bookLinks.count, 0);
      assert.equal(travelers.count, 1);
    } finally {
      database.close();
    }
  },
);
