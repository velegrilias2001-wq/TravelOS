const assert = require('node:assert/strict');
const test = require('node:test');

const {
  homeFeaturedPlaceLabel,
  selectHomeRuntimeSummary,
} = require('../.test-build/src/services/home-runtime.js');

const TIMESTAMP = '2026-08-23T12:00:00.000Z';

function makeTrip(overrides = {}) {
  return {
    id: 'trip-home-1',
    title: 'Lisbon and Tokyo',
    status: 'planned',
    destinations: [
      {
        id: 'destination-lisbon',
        name: 'Lisbon',
        timezone: 'Europe/Lisbon',
      },
      {
        id: 'destination-tokyo',
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

function makeDays(trip, destinationId) {
  return [
    {
      id: 'day-1',
      tripId: trip.id,
      date: '2026-08-23',
      dayNumber: 1,
      destinationId,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
  ];
}

function fixedClock(instant, deviceTimeZone = 'America/Los_Angeles') {
  const now = new Date(instant);

  return {
    now: () => new Date(now.getTime()),
    deviceTimeZone: () => deviceTimeZone,
  };
}

test('Home uses an assigned city clock when choosing the featured trip', () => {
  const trip = makeTrip();
  const clock = fixedClock('2026-08-22T23:30:00.000Z');

  const withoutDays = selectHomeRuntimeSummary(
    [trip],
    [],
    clock,
  );
  assert.equal(withoutDays.featured.runtime.phase, 'upcoming');

  const withDayClock = selectHomeRuntimeSummary(
    [trip],
    makeDays(trip, 'destination-lisbon'),
    clock,
  );
  assert.equal(withDayClock.featured.runtime.phase, 'active');
  assert.equal(
    withDayClock.featured.runtime.timeZone.reason,
    'assigned-destination',
  );
  assert.equal(
    homeFeaturedPlaceLabel(
      withDayClock.featured.trip,
      withDayClock.featured.runtime,
    ),
    'Lisbon',
  );
});

test('Home does not invent a city from destination order', () => {
  const trip = makeTrip();
  const clock = fixedClock('2026-08-22T23:30:00.000Z');
  const summary = selectHomeRuntimeSummary(
    [trip],
    makeDays(trip),
    clock,
  );

  assert.equal(summary.featured.runtime.phase, 'upcoming');
  assert.equal(
    homeFeaturedPlaceLabel(
      summary.featured.trip,
      summary.featured.runtime,
    ),
    'Lisbon · Tokyo',
  );
});

test('archived trips stay out of the Home featured choice', () => {
  const archived = makeTrip({
    id: 'trip-archived',
    status: 'archived',
  });
  const upcoming = makeTrip({
    id: 'trip-next',
    startDate: '2026-09-01',
    endDate: '2026-09-03',
  });
  const summary = selectHomeRuntimeSummary(
    [archived, upcoming],
    [],
    fixedClock('2026-08-22T12:00:00.000Z', 'UTC'),
  );

  assert.equal(summary.featured.trip.id, 'trip-next');
  assert.equal(summary.completedCount, 0);
});
