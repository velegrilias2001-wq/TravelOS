const assert =
  require('node:assert/strict');

const test =
  require('node:test');

const {
  migrateDatabase,
} = require(
  '../.test-build/src/data/database/migrations.js',
);

const {
  DATABASE_SCHEMA,
} = require(
  '../.test-build/src/data/database/schema.js',
);

const {
  ensureCanonicalTripDays,
  reorderTripStops,
} = require(
  '../.test-build/src/data/repositories/trip-persistence-operations.js',
);

const {
  buildCanonicalTripDays,
} = require(
  '../.test-build/src/services/trip-day-generation.js',
);

const {
  NodeSQLiteDatabase,
} = require(
  './support/node-sqlite-database.cjs',
);

const TIMESTAMP =
  '2026-08-23T12:00:00.000Z';

function makeTrip(
  overrides = {},
) {
  return {
    id: 'trip-1',
    title: 'Persistence Test',
    status: 'planned',
    destinations: [],
    startDate: '2026-09-01',
    endDate: '2026-09-03',
    travelerIds: [],
    accountingCurrency: 'EUR',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

function makeIdFactory(prefix) {
  let next = 0;

  return () => {
    next += 1;

    return prefix + next;
  };
}

async function createCurrentDatabase() {
  const database =
    new NodeSQLiteDatabase();

  await database.execAsync(
    DATABASE_SCHEMA,
  );

  await database.execAsync(
    'PRAGMA user_version = 2;',
  );

  await migrateDatabase(database);

  await database.runAsync(
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
      'trip-1',
      'Persistence Test',
      'planned',
      '2026-09-01',
      '2026-09-03',
      'EUR',
      TIMESTAMP,
      TIMESTAMP,
    ],
  );

  return database;
}

async function readDays(database) {
  return database.query(
    `
      SELECT
        id,
        date,
        day_number,
        title,
        notes
      FROM trip_days
      WHERE trip_id = ?
      ORDER BY day_number ASC;
    `,
    ['trip-1'],
  );
}

test(
  'generates a fresh canonical TripDay range',
  async () => {
    const database =
      await createCurrentDatabase();

    try {
      const days =
        buildCanonicalTripDays(
          makeTrip(),
          makeIdFactory('fresh-'),
          TIMESTAMP,
        );

      await ensureCanonicalTripDays(
        database,
        days,
      );

      const stored =
        await readDays(database);

      assert.deepEqual(
        stored.map(
          (day) => ({
            date: day.date,
            dayNumber:
              day.day_number,
          }),
        ),
        [
          {
            date: '2026-09-01',
            dayNumber: 1,
          },
          {
            date: '2026-09-02',
            dayNumber: 2,
          },
          {
            date: '2026-09-03',
            dayNumber: 3,
          },
        ],
      );
    } finally {
      database.close();
    }
  },
);

test(
  'repairs a partial TripDay range without replacing valid rows',
  async () => {
    const database =
      await createCurrentDatabase();

    try {
      await database.runAsync(
        `
          INSERT INTO trip_days (
            id,
            trip_id,
            date,
            day_number,
            title,
            notes,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          'existing-first',
          'trip-1',
          '2026-09-01',
          1,
          'Arrival',
          null,
          TIMESTAMP,
          TIMESTAMP,
        ],
      );

      await database.runAsync(
        `
          INSERT INTO trip_days (
            id,
            trip_id,
            date,
            day_number,
            title,
            notes,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          'existing-last',
          'trip-1',
          '2026-09-03',
          2,
          'Departure',
          'Keep this note',
          TIMESTAMP,
          TIMESTAMP,
        ],
      );

      const canonical =
        buildCanonicalTripDays(
          makeTrip(),
          makeIdFactory('repair-'),
          TIMESTAMP,
        );

      await ensureCanonicalTripDays(
        database,
        canonical,
      );

      const stored =
        await readDays(database);

      assert.equal(
        stored.length,
        3,
      );

      assert.equal(
        stored[0].id,
        'existing-first',
      );

      assert.equal(
        stored[2].id,
        'existing-last',
      );

      assert.equal(
        stored[2].day_number,
        3,
      );

      assert.equal(
        stored[2].title,
        'Departure',
      );

      assert.equal(
        stored[2].notes,
        'Keep this note',
      );
    } finally {
      database.close();
    }
  },
);

test(
  'TripDay generation is repeated-call and concurrent-call idempotent',
  async () => {
    const database =
      await createCurrentDatabase();

    try {
      const first =
        buildCanonicalTripDays(
          makeTrip(),
          makeIdFactory('first-'),
          TIMESTAMP,
        );

      await ensureCanonicalTripDays(
        database,
        first,
      );

      const originalIds =
        (
          await readDays(database)
        ).map((day) => day.id);

      const repeated =
        buildCanonicalTripDays(
          makeTrip(),
          makeIdFactory('repeat-'),
          TIMESTAMP,
        );

      const concurrent =
        buildCanonicalTripDays(
          makeTrip(),
          makeIdFactory('concurrent-'),
          TIMESTAMP,
        );

      await Promise.all([
        ensureCanonicalTripDays(
          database,
          repeated,
        ),
        ensureCanonicalTripDays(
          database,
          concurrent,
        ),
      ]);

      const stored =
        await readDays(database);

      assert.equal(
        stored.length,
        3,
      );

      assert.deepEqual(
        stored.map(
          (day) => day.id,
        ),
        originalIds,
      );

      assert.deepEqual(
        stored.map(
          (day) =>
            day.day_number,
        ),
        [1, 2, 3],
      );
    } finally {
      database.close();
    }
  },
);

function makeStop(
  id,
  order,
  title,
) {
  return {
    id,
    tripId: 'trip-1',
    dayId: 'day-1',
    title,
    type: 'place',
    order,
    location: {
      name: title + ' location',
      latitude: 37 + order,
      longitude: 23 + order,
    },
    notes: title + ' notes',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };
}

async function insertStop(
  database,
  stop,
) {
  await database.runAsync(
    `
      INSERT INTO trip_stops (
        id,
        trip_id,
        day_id,
        title,
        type,
        position,
        location_name,
        latitude,
        longitude,
        notes,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      stop.id,
      stop.tripId,
      stop.dayId,
      stop.title,
      stop.type,
      stop.order,
      stop.location.name,
      stop.location.latitude,
      stop.location.longitude,
      stop.notes,
      stop.createdAt,
      stop.updatedAt,
    ],
  );
}

async function readStops(database) {
  return database.query(
    `
      SELECT
        id,
        title,
        position,
        location_name,
        latitude,
        longitude,
        notes
      FROM trip_stops
      WHERE day_id = ?
      ORDER BY position ASC;
    `,
    ['day-1'],
  );
}

test(
  'stop reorder is atomic and preserves stop identity and content',
  async () => {
    const database =
      await createCurrentDatabase();

    try {
      await database.runAsync(
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
          'day-1',
          'trip-1',
          '2026-09-01',
          1,
          TIMESTAMP,
          TIMESTAMP,
        ],
      );

      const stops = [
        makeStop(
          'stop-1',
          1,
          'Museum',
        ),
        makeStop(
          'stop-2',
          2,
          'Lunch',
        ),
        makeStop(
          'stop-3',
          3,
          'Park',
        ),
      ];

      for (const stop of stops) {
        await insertStop(
          database,
          stop,
        );
      }

      const before =
        await readStops(database);

      const desired = [
        stops[2],
        stops[0],
        stops[1],
      ].map(
        (stop, index) => ({
          ...stop,
          order: index + 1,
          updatedAt:
            '2026-08-23T13:00:00.000Z',
        }),
      );

      await reorderTripStops(
        database,
        desired,
      );

      const reordered =
        await readStops(database);

      assert.deepEqual(
        reordered.map(
          (stop) => stop.id,
        ),
        [
          'stop-3',
          'stop-1',
          'stop-2',
        ],
      );

      for (const row of reordered) {
        const original =
          before.find(
            (stop) =>
              stop.id === row.id,
          );

        assert.ok(original);
        assert.equal(
          row.title,
          original.title,
        );
        assert.equal(
          row.location_name,
          original.location_name,
        );
        assert.equal(
          row.latitude,
          original.latitude,
        );
        assert.equal(
          row.longitude,
          original.longitude,
        );
        assert.equal(
          row.notes,
          original.notes,
        );
      }

      await database.execAsync(`
        CREATE TRIGGER fail_test_reorder
        BEFORE UPDATE OF position
        ON trip_stops
        WHEN
          NEW.id = 'stop-2' AND
          NEW.position > 0
        BEGIN
          SELECT RAISE(
            ABORT,
            'forced reorder failure'
          );
        END;
      `);

      const beforeFailure =
        await readStops(database);

      await assert.rejects(
        reorderTripStops(
          database,
          desired
            .slice()
            .reverse(),
        ),
        /forced reorder failure/,
      );

      const afterFailure =
        await readStops(database);

      assert.deepEqual(
        afterFailure,
        beforeFailure,
      );
    } finally {
      database.close();
    }
  },
);
