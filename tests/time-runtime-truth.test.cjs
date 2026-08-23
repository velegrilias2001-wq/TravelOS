const assert = require('node:assert/strict');
const test = require('node:test');

const {
  migrateDatabase,
} = require(
  '../.test-build/src/data/database/migrations.js',
);
const {
  saveCanonicalTrip,
} = require(
  '../.test-build/src/data/repositories/trip-persistence-operations.js',
);
const {
  combineBookingLocalDateTime,
  parseBookingTemporalValue,
  validateBookingTimeUpdate,
  validateNewBookingTimes,
} = require(
  '../.test-build/src/services/booking-time.js',
);
const {
  validateNewStopTimes,
  validateStopTimeUpdate,
} = require(
  '../.test-build/src/services/stop-time.js',
);
const {
  addCalendarDays,
  calendarDateAtInstant,
  calendarDayDistance,
  isCanonicalDateKey,
  isCanonicalLocalTime,
  resolveTodayRuntimeContext,
  resolveTripRuntime,
  resolveTripTimeZone,
  validateCalendarDateRange,
} = require(
  '../.test-build/src/services/time-truth.js',
);
const {
  buildNewTrip,
} = require(
  '../.test-build/src/services/trip-creation.js',
);
const {
  NodeSQLiteDatabase,
} = require('./support/node-sqlite-database.cjs');

const TIMESTAMP = '2026-08-23T12:00:00.000Z';

function makeTrip(overrides = {}) {
  return {
    id: 'trip-time-1',
    title: 'Runtime truth',
    status: 'planned',
    destinations: [
      {
        id: 'destination-1',
        name: 'Tokyo',
        timezone: 'Asia/Tokyo',
      },
    ],
    startDate: '2026-08-23',
    endDate: '2026-08-25',
    travelerIds: [],
    accountingCurrency: 'EUR',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

function makeDays(trip = makeTrip()) {
  return [0, 1, 2].map((offset) => ({
    id: `day-${offset + 1}`,
    tripId: trip.id,
    date: addCalendarDays(trip.startDate, offset),
    dayNumber: offset + 1,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  }));
}

function fixedClock(
  instant,
  deviceTimeZone = 'Europe/Athens',
) {
  const now = new Date(instant);

  return {
    now: () => new Date(now.getTime()),
    deviceTimeZone: () => deviceTimeZone,
  };
}

test(
  'calendar dates and local wall-clock times are strict and timezone-free',
  () => {
    assert.equal(isCanonicalDateKey('2028-02-29'), true);
    assert.equal(isCanonicalDateKey('2027-02-29'), false);
    assert.equal(isCanonicalDateKey('2026-2-03'), false);
    assert.equal(calendarDayDistance('2028-02-28', '2028-03-01'), 2);
    assert.equal(addCalendarDays('2028-02-28', 1), '2028-02-29');

    assert.doesNotThrow(() =>
      validateCalendarDateRange('2026-08-23', '2026-08-23'),
    );
    assert.throws(
      () => validateCalendarDateRange('2026-08-24', '2026-08-23'),
      /start date cannot be after/i,
    );

    assert.equal(isCanonicalLocalTime('00:00'), true);
    assert.equal(isCanonicalLocalTime('23:59'), true);
    assert.equal(isCanonicalLocalTime('24:00'), false);
    assert.equal(isCanonicalLocalTime('9:30'), false);
  },
);

test(
  'timezone resolution uses only canonical unambiguous destination truth',
  () => {
    assert.deepEqual(
      resolveTripTimeZone(
        [{ id: 'a', name: 'A', timezone: 'Asia/Tokyo' }],
        'Europe/Athens',
      ),
      {
        source: 'destination',
        certainty: 'canonical',
        timeZone: 'Asia/Tokyo',
        reason: 'single-destination',
      },
    );

    const shared = resolveTripTimeZone(
      [
        { id: 'a', name: 'A', timezone: 'Asia/Tokyo' },
        { id: 'b', name: 'B', timezone: 'Asia/Tokyo' },
      ],
      'Europe/Athens',
    );
    assert.equal(shared.source, 'destination');
    assert.equal(shared.reason, 'shared-destination-timezone');

    const missing = resolveTripTimeZone(
      [
        { id: 'a', name: 'A', timezone: 'Asia/Tokyo' },
        { id: 'b', name: 'B' },
      ],
      'Europe/Athens',
    );
    assert.equal(missing.source, 'device');
    assert.equal(missing.certainty, 'fallback');
    assert.equal(missing.reason, 'missing-destination-timezone');

    const ambiguous = resolveTripTimeZone(
      [
        { id: 'a', name: 'A', timezone: 'Asia/Tokyo' },
        { id: 'b', name: 'B', timezone: 'Europe/London' },
      ],
      'Europe/Athens',
    );
    assert.equal(ambiguous.source, 'device');
    assert.equal(ambiguous.reason, 'ambiguous-destination-timezones');

    const invalid = resolveTripTimeZone(
      [{ id: 'a', name: 'A', timezone: 'Tokyo-ish' }],
      'UTC',
    );
    assert.equal(invalid.source, 'device');
    assert.equal(invalid.reason, 'invalid-destination-timezone');
  },
);

test(
  'runtime phase and exact day are deterministic at timezone boundaries',
  () => {
    const trip = makeTrip();
    const days = makeDays(trip);
    const boundaryClock = fixedClock(
      '2026-08-22T23:30:00.000Z',
      'America/Los_Angeles',
    );
    const active = resolveTripRuntime(
      trip,
      days,
      boundaryClock,
    );

    assert.equal(active.currentDate, '2026-08-23');
    assert.equal(active.phase, 'active');
    assert.equal(active.currentDay.id, 'day-1');
    assert.equal(active.timeZone.source, 'destination');

    const upcoming = resolveTripRuntime(
      trip,
      days,
      fixedClock('2026-08-22T00:00:00.000Z'),
    );
    assert.equal(upcoming.currentDate, '2026-08-22');
    assert.equal(upcoming.phase, 'upcoming');
    assert.equal(upcoming.currentDay, null);

    const completed = resolveTripRuntime(
      trip,
      days,
      fixedClock('2026-08-25T15:01:00.000Z'),
    );
    assert.equal(completed.currentDate, '2026-08-26');
    assert.equal(completed.phase, 'completed');
    assert.equal(completed.currentDay, null);

    const deviceFallbackTrip = makeTrip({
      destinations: [{ id: 'a', name: 'Unknown zone' }],
    });
    const fallback = resolveTripRuntime(
      deviceFallbackTrip,
      makeDays(deviceFallbackTrip),
      boundaryClock,
    );
    assert.equal(fallback.currentDate, '2026-08-22');
    assert.equal(fallback.phase, 'upcoming');
    assert.equal(fallback.timeZone.source, 'device');

    assert.equal(
      calendarDateAtInstant(
        new Date('2026-08-22T23:30:00.000Z'),
        resolveTripTimeZone(trip.destinations, 'UTC'),
      ),
      '2026-08-23',
    );
  },
);

test(
  'derived runtime stays separate from durable workflow status',
  () => {
    const trip = makeTrip({ status: 'completed' });
    const runtime = resolveTripRuntime(
      trip,
      makeDays(trip),
      fixedClock('2026-08-23T10:00:00.000Z'),
    );

    assert.equal(runtime.phase, 'active');
    assert.equal(runtime.persistedStatus, 'completed');
    assert.equal(runtime.statusConflict, true);
  },
);

test(
  'Today selects safe preview, exact active day, and completed history contexts',
  () => {
    const trip = makeTrip();
    const days = makeDays(trip);

    const upcoming = resolveTodayRuntimeContext(
      trip,
      days,
      fixedClock('2026-08-20T12:00:00.000Z'),
    );
    assert.equal(upcoming.kind, 'upcoming-preview');
    assert.equal(upcoming.displayDay.id, 'day-1');

    const active = resolveTodayRuntimeContext(
      trip,
      days,
      fixedClock('2026-08-24T12:00:00.000Z'),
    );
    assert.equal(active.kind, 'active-day');
    assert.equal(active.displayDay.id, 'day-2');

    const missing = resolveTodayRuntimeContext(
      trip,
      days.filter((day) => day.id !== 'day-2'),
      fixedClock('2026-08-24T12:00:00.000Z'),
    );
    assert.equal(missing.kind, 'active-missing-day');
    assert.equal(missing.displayDay, null);

    const completed = resolveTodayRuntimeContext(
      trip,
      days,
      fixedClock('2026-08-27T12:00:00.000Z'),
    );
    assert.equal(completed.kind, 'completed-history');
    assert.equal(completed.displayDay.id, 'day-3');
  },
);

test(
  'booking time compatibility preserves historical semantics and validates comparable ranges',
  () => {
    assert.equal(
      combineBookingLocalDateTime('2026-08-23', '09:30'),
      '2026-08-23T09:30:00',
    );
    assert.equal(
      parseBookingTemporalValue('2026-08-23T09:30:00').kind,
      'local-wall-time',
    );
    assert.equal(
      parseBookingTemporalValue('2026-08-23T09:30:00Z').kind,
      'absolute-instant',
    );

    assert.doesNotThrow(() =>
      validateNewBookingTimes({
        startAt: '2026-08-23T09:30:00',
        endAt: '2026-08-23T11:00:00',
      }),
    );
    assert.throws(
      () =>
        validateNewBookingTimes({
          startAt: '2026-08-23T12:00:00',
          endAt: '2026-08-23T11:00:00',
        }),
      /start cannot be after/i,
    );
    assert.throws(
      () =>
        validateNewBookingTimes({
          startAt: '2026-08-23T09:30:00',
          endAt: '2026-08-23T11:00:00Z',
        }),
      /different time semantics/i,
    );

    const historical = {
      startAt: 'legacy provider time',
      endAt: 'also legacy',
    };
    assert.doesNotThrow(() =>
      validateBookingTimeUpdate(historical, historical),
    );
    assert.throws(
      () =>
        validateBookingTimeUpdate(historical, {
          ...historical,
          startAt: 'still invalid but changed',
        }),
      /must be a valid date and time/i,
    );
  },
);

test(
  'stop time validation accepts canonical new values while preserving untouched legacy values',
  () => {
    assert.doesNotThrow(() =>
      validateNewStopTimes({ startTime: '07:05' }),
    );
    assert.throws(
      () => validateNewStopTimes({ startTime: '7:05' }),
      /HH:mm/,
    );

    assert.doesNotThrow(() =>
      validateStopTimeUpdate(
        { startTime: 'morning' },
        { startTime: 'morning' },
      ),
    );
    assert.throws(
      () =>
        validateStopTimeUpdate(
          { startTime: 'morning' },
          { startTime: 'later' },
        ),
      /HH:mm/,
    );
  },
);

test(
  'native trip creation input preserves selected calendar dates through SQLite persistence',
  async () => {
    const trip = buildNewTrip(
      {
        title: '  Native dates  ',
        destination: {
          name: '  Athens, Greece  ',
          countryCode: 'gr',
          latitude: 37.9838,
          longitude: 23.7275,
        },
        startDate: '2028-02-29',
        endDate: '2028-03-02',
        accountingCurrency: 'eur',
      },
      {
        tripId: () => 'created-trip',
        destinationId: () => 'created-destination',
      },
      TIMESTAMP,
    );

    assert.equal(trip.startDate, '2028-02-29');
    assert.equal(trip.endDate, '2028-03-02');
    assert.equal(trip.title, 'Native dates');
    assert.equal(trip.accountingCurrency, 'EUR');
    assert.deepEqual(trip.destinations, [
      {
        id: 'created-destination',
        name: 'Athens, Greece',
        countryCode: 'GR',
        latitude: 37.9838,
        longitude: 23.7275,
        timezone: undefined,
        currencyCode: undefined,
      },
    ]);

    const database = new NodeSQLiteDatabase();
    await migrateDatabase(database);
    await saveCanonicalTrip(database, trip);

    const row = await database.queryFirst(
      `SELECT start_date, end_date FROM trips WHERE id = ?;`,
      [trip.id],
    );
    assert.equal(row.start_date, '2028-02-29');
    assert.equal(row.end_date, '2028-03-02');
  },
);
