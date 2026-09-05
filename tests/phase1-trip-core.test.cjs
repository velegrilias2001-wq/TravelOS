const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DATABASE_VERSION,
  migrateDatabase,
} = require(
  '../.test-build/src/data/database/migrations.js',
);
const {
  upsertTripFxRate,
  loadTripFxRates,
} = require(
  '../.test-build/src/data/repositories/fx-rate-persistence-operations.js',
);
const {
  createTravelerForTrip,
  setTripOwner,
} = require(
  '../.test-build/src/data/repositories/traveler-persistence-operations.js',
);
const {
  saveCanonicalTrip,
} = require(
  '../.test-build/src/data/repositories/trip-persistence-operations.js',
);
const {
  calculateBudgetSummary,
} = require(
  '../.test-build/src/services/budget-calculations.js',
);
const {
  resolveBookingCurrencyCode,
  validateBookingFinance,
} = require(
  '../.test-build/src/services/booking-finance.js',
);
const {
  mergeDestinationReplacement,
} = require(
  '../.test-build/src/services/destination-authoring.js',
);
const {
  NodeSQLiteDatabase,
} = require('./support/node-sqlite-database.cjs');

const TIMESTAMP = '2026-09-03T08:00:00.000Z';

test('migration v16 installs destination provenance, FX rates and traveler roles', async () => {
  const database = new NodeSQLiteDatabase();

  try {
    await migrateDatabase(database);
    const version = await database.queryFirst(
      'PRAGMA user_version;',
    );
    assert.equal(version.user_version, DATABASE_VERSION);
    assert.equal(DATABASE_VERSION, 18);

    const destinationColumns = await database.query(
      'PRAGMA table_info(trip_destinations);',
    );
    assert.ok(
      destinationColumns.some((column) => column.name === 'place_id'),
    );
    assert.ok(
      destinationColumns.some(
        (column) => column.name === 'timezone_source',
      ),
    );

    const travelerColumns = await database.query(
      'PRAGMA table_info(trip_travelers);',
    );
    assert.ok(
      travelerColumns.some((column) => column.name === 'role'),
    );

    const fxTable = await database.queryFirst(
      `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = 'trip_fx_rates';
      `,
    );
    assert.equal(fxTable.name, 'trip_fx_rates');
  } finally {
    database.close();
  }
});

test('map replacement keeps a traveler timezone and does not invent a place id', () => {
  const merged = mergeDestinationReplacement(
    {
      id: 'lisbon',
      name: 'Lisbon, Portugal',
      latitude: 38.7223,
      longitude: -9.1393,
      timezone: 'Europe/Lisbon',
      timezoneSource: 'traveler',
    },
    {
      name: 'Lisbon, Portugal',
      latitude: 38.7169,
      longitude: -9.1399,
    },
  );

  assert.equal(merged.timezone, 'Europe/Lisbon');
  assert.equal(merged.timezoneSource, 'traveler');
  assert.equal(merged.placeId, undefined);
});

test('cancelled bookings cannot be marked paid and amounts need a currency', () => {
  assert.throws(
    () =>
      validateBookingFinance({
        id: 'booking-1',
        tripId: 'trip-1',
        type: 'ferry',
        status: 'cancelled',
        title: 'Ferry',
        isPaid: true,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      }),
    /cancelled booking cannot be marked paid/i,
  );

  assert.throws(
    () =>
      validateBookingFinance({
        id: 'booking-1',
        tripId: 'trip-1',
        type: 'ferry',
        status: 'confirmed',
        title: 'Ferry',
        amount: 40,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      }),
    /amount and currency must be saved together/i,
  );
});

test('booking saves omit currency when amount is omitted', () => {
  assert.equal(
    resolveBookingCurrencyCode(
      undefined,
      'EUR',
      'USD',
    ),
    undefined,
  );

  assert.equal(
    resolveBookingCurrencyCode(
      120,
      '',
      'USD',
    ),
    'USD',
  );

  assert.equal(
    resolveBookingCurrencyCode(
      120,
      'gbp',
      'USD',
    ),
    'GBP',
  );
});

test('explicit traveler FX rates can enter accounting totals with provenance', () => {
  const summary = calculateBudgetSummary(
    {
      id: 'budget-1',
      tripId: 'trip-1',
      currencyCode: 'EUR',
      plannedAmount: 100,
      items: [
        {
          id: 'yen',
          budgetId: 'budget-1',
          tripId: 'trip-1',
          title: 'Lunch',
          category: 'food',
          status: 'paid',
          amount: 1000,
          currencyCode: 'JPY',
          date: '2026-09-03',
          createdAt: TIMESTAMP,
          updatedAt: TIMESTAMP,
        },
      ],
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
    'EUR',
    [
      {
        id: 'rate-1',
        tripId: 'trip-1',
        fromCurrency: 'JPY',
        toCurrency: 'EUR',
        rate: 0.006,
        asOf: '2026-09-01',
        source: 'traveler',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
  );

  assert.equal(summary.spentAmount, 6);
  assert.equal(summary.foreignCurrencyTotals.length, 0);
  assert.equal(summary.convertedCurrencyTotals[0].asOf, '2026-09-01');
  assert.equal(summary.convertedCurrencyTotals[0].source, 'traveler');
});

test('a trip can have at most one owner and planning trips may have none', async () => {
  const database = new NodeSQLiteDatabase();

  try {
    await migrateDatabase(database);
    await saveCanonicalTrip(database, {
      id: 'trip-owner',
      title: 'Owner trip',
      status: 'planned',
      destinations: [
        {
          id: 'dest-1',
          name: 'Lisbon',
          latitude: 38.72,
          longitude: -9.14,
        },
      ],
      startDate: '2026-09-10',
      endDate: '2026-09-12',
      travelerIds: [],
      accountingCurrency: 'EUR',
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    });

    await createTravelerForTrip(database, 'trip-owner', {
      id: 'traveler-a',
      firstName: 'Ana',
      type: 'adult',
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    });
    await createTravelerForTrip(database, 'trip-owner', {
      id: 'traveler-b',
      firstName: 'Bruno',
      type: 'adult',
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    });

    await setTripOwner(database, 'trip-owner', 'traveler-a');
    await setTripOwner(database, 'trip-owner', 'traveler-b');

    const owners = await database.query(
      `
        SELECT traveler_id, role
        FROM trip_travelers
        WHERE trip_id = 'trip-owner'
        ORDER BY traveler_id ASC;
      `,
    );

    assert.equal(owners[0].traveler_id, 'traveler-a');
    assert.equal(owners[0].role, 'member');
    assert.equal(owners[1].traveler_id, 'traveler-b');
    assert.equal(owners[1].role, 'owner');

    await upsertTripFxRate(database, {
      id: 'fx-1',
      tripId: 'trip-owner',
      fromCurrency: 'USD',
      toCurrency: 'EUR',
      rate: 0.92,
      asOf: '2026-09-01',
      source: 'traveler',
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    });

    const rates = await loadTripFxRates(database, 'trip-owner');
    assert.equal(rates.length, 1);
    assert.equal(rates[0].source, 'traveler');
  } finally {
    database.close();
  }
});
