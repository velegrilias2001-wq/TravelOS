const assert = require('node:assert/strict');
const test = require('node:test');

const {
  instantAtLocalDateTime,
  planStopStartReminders,
  resolveDayNotificationTimeZone,
  stopReminderIdentifier,
} = require(
  '../.test-build/src/services/trip-notifications.js',
);

test(
  'instantAtLocalDateTime resolves Tokyo wall time without inventing a zone',
  () => {
    const instant = instantAtLocalDateTime(
      '2026-09-10',
      '09:00',
      'Asia/Tokyo',
    );

    assert.ok(instant);
    assert.equal(
      instant.toISOString(),
      '2026-09-10T00:00:00.000Z',
    );
  },
);

test(
  'instantAtLocalDateTime fails closed on invalid IANA',
  () => {
    assert.equal(
      instantAtLocalDateTime(
        '2026-09-10',
        '09:00',
        'Not/AZone',
      ),
      null,
    );
  },
);

test(
  'resolveDayNotificationTimeZone prefers assigned city then shared trip TZ',
  () => {
    const destinations = [
      {
        id: 'tokyo',
        name: 'Tokyo',
        latitude: 35.67,
        longitude: 139.65,
        timezone: 'Asia/Tokyo',
        timezoneSource: 'provider',
      },
      {
        id: 'osaka',
        name: 'Osaka',
        latitude: 34.69,
        longitude: 135.5,
        timezone: 'Asia/Tokyo',
        timezoneSource: 'provider',
      },
    ];

    assert.equal(
      resolveDayNotificationTimeZone(
        {
          id: 'day-1',
          tripId: 'trip-1',
          date: '2026-09-10',
          destinationId: 'tokyo',
        },
        destinations,
      ),
      'Asia/Tokyo',
    );

    assert.equal(
      resolveDayNotificationTimeZone(
        {
          id: 'day-1',
          tripId: 'trip-1',
          date: '2026-09-10',
        },
        destinations,
      ),
      'Asia/Tokyo',
    );

    assert.equal(
      resolveDayNotificationTimeZone(
        {
          id: 'day-1',
          tripId: 'trip-1',
          date: '2026-09-10',
        },
        [
          destinations[0],
          {
            ...destinations[1],
            timezone: 'Europe/Athens',
          },
        ],
      ),
      null,
    );
  },
);

test(
  'planStopStartReminders schedules lead-before start when timezone is canonical',
  () => {
    const now = new Date('2026-09-09T12:00:00.000Z');
    const planned = planStopStartReminders({
      trip: {
        id: 'trip-1',
        title: 'Japan',
        status: 'planned',
        startDate: '2026-09-10',
        endDate: '2026-09-12',
        destinations: [
          {
            id: 'tokyo',
            name: 'Tokyo',
            latitude: 35.67,
            longitude: 139.65,
            timezone: 'Asia/Tokyo',
            timezoneSource: 'provider',
          },
        ],
      },
      days: [
        {
          id: 'day-1',
          tripId: 'trip-1',
          date: '2026-09-10',
          destinationId: 'tokyo',
        },
      ],
      destinations: [
        {
          id: 'tokyo',
          name: 'Tokyo',
          latitude: 35.67,
          longitude: 139.65,
          timezone: 'Asia/Tokyo',
          timezoneSource: 'provider',
        },
      ],
      stops: [
        {
          id: 'stop-1',
          tripId: 'trip-1',
          dayId: 'day-1',
          title: 'Temple walk',
          startTime: '09:00',
          sortOrder: 0,
        },
      ],
      now,
      leadMinutes: 15,
    });

    assert.equal(planned.length, 1);
    assert.equal(
      planned[0].identifier,
      stopReminderIdentifier('stop-1'),
    );
    assert.equal(
      planned[0].fireAt.toISOString(),
      '2026-09-09T23:45:00.000Z',
    );
    assert.match(planned[0].body, /09:00/);
  },
);

test(
  'planStopStartReminders skips untimed, settled, past, and timezone-less stops',
  () => {
    const now = new Date('2026-09-10T01:00:00.000Z');
    const planned = planStopStartReminders({
      trip: {
        id: 'trip-1',
        title: 'Japan',
        status: 'planned',
        startDate: '2026-09-10',
        endDate: '2026-09-10',
        destinations: [
          {
            id: 'tokyo',
            name: 'Tokyo',
            latitude: 35.67,
            longitude: 139.65,
          },
        ],
      },
      days: [
        {
          id: 'day-1',
          tripId: 'trip-1',
          date: '2026-09-10',
          destinationId: 'tokyo',
        },
      ],
      destinations: [
        {
          id: 'tokyo',
          name: 'Tokyo',
          latitude: 35.67,
          longitude: 139.65,
        },
      ],
      stops: [
        {
          id: 'untimed',
          tripId: 'trip-1',
          dayId: 'day-1',
          title: 'Untimed',
          sortOrder: 0,
        },
        {
          id: 'timed',
          tripId: 'trip-1',
          dayId: 'day-1',
          title: 'Timed',
          startTime: '12:00',
          sortOrder: 1,
        },
      ],
      livedStates: [
        {
          tripId: 'trip-1',
          stopId: 'timed',
          phase: 'done',
          updatedAt: now.toISOString(),
        },
      ],
      now,
    });

    assert.deepEqual(planned, []);
  },
);

test(
  'planStopStartReminders ignores completed trips',
  () => {
    const planned = planStopStartReminders({
      trip: {
        id: 'trip-1',
        title: 'Done',
        status: 'completed',
        startDate: '2026-09-10',
        endDate: '2026-09-10',
        destinations: [
          {
            id: 'tokyo',
            name: 'Tokyo',
            timezone: 'Asia/Tokyo',
          },
        ],
      },
      days: [
        {
          id: 'day-1',
          tripId: 'trip-1',
          date: '2026-09-10',
        },
      ],
      destinations: [
        {
          id: 'tokyo',
          name: 'Tokyo',
          timezone: 'Asia/Tokyo',
        },
      ],
      stops: [
        {
          id: 'stop-1',
          tripId: 'trip-1',
          dayId: 'day-1',
          title: 'Cafe',
          startTime: '10:00',
          sortOrder: 0,
        },
      ],
      now: new Date('2026-09-01T00:00:00.000Z'),
    });

    assert.deepEqual(planned, []);
  },
);

test(
  'planStopStartReminders accepts planned trips',
  () => {
    const now = new Date('2026-09-09T12:00:00.000Z');
    const planned = planStopStartReminders({
      trip: {
        id: 'trip-1',
        title: 'Japan',
        status: 'planned',
        startDate: '2026-09-10',
        endDate: '2026-09-12',
        destinations: [
          {
            id: 'tokyo',
            name: 'Tokyo',
            timezone: 'Asia/Tokyo',
            timezoneSource: 'provider',
          },
        ],
      },
      days: [
        {
          id: 'day-1',
          tripId: 'trip-1',
          date: '2026-09-10',
          destinationId: 'tokyo',
        },
      ],
      destinations: [
        {
          id: 'tokyo',
          name: 'Tokyo',
          timezone: 'Asia/Tokyo',
          timezoneSource: 'provider',
        },
      ],
      stops: [
        {
          id: 'stop-1',
          tripId: 'trip-1',
          dayId: 'day-1',
          title: 'Temple walk',
          startTime: '09:00',
          sortOrder: 0,
        },
      ],
      now,
      leadMinutes: 15,
    });

    assert.equal(planned.length, 1);
  },
);
