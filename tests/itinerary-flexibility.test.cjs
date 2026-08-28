const assert =
  require('node:assert/strict');

const test =
  require('node:test');

const {
  deriveDayFreeTimeGaps,
  deriveDayTimeConflicts,
  totalKnownFreeMinutes,
} = require(
  '../.test-build/src/services/itinerary-flexibility.js',
);

const DAY = {
  id: 'day-1',
};

function stop(overrides = {}) {
  return {
    id: 'stop',
    tripId: 'trip-1',
    dayId: 'day-1',
    title: 'Moment',
    type: 'place',
    order: 1,
    createdAt:
      '2026-08-28T06:00:00.000Z',
    updatedAt:
      '2026-08-28T06:00:00.000Z',
    ...overrides,
  };
}

test(
  'derives a free-time gap only between consecutive moments with a known end and next start',
  () => {
    const gaps =
      deriveDayFreeTimeGaps(
        DAY,
        [
          stop({
            id: 'breakfast',
            order: 1,
            startTime: '09:00',
            endTime: '10:00',
          }),
          stop({
            id: 'museum',
            order: 2,
            startTime: '11:30',
            endTime: '13:00',
          }),
        ],
      );

    assert.deepEqual(
      gaps,
      [
        {
          dayId: 'day-1',
          afterStopId: 'breakfast',
          beforeStopId: 'museum',
          startTime: '10:00',
          endTime: '11:30',
          durationMinutes: 90,
        },
      ],
    );
  },
);

test(
  'uses itinerary order instead of input array order',
  () => {
    const gaps =
      deriveDayFreeTimeGaps(
        DAY,
        [
          stop({
            id: 'second',
            order: 2,
            startTime: '12:00',
          }),
          stop({
            id: 'first',
            order: 1,
            endTime: '10:30',
          }),
        ],
      );

    assert.equal(gaps.length, 1);
    assert.equal(
      gaps[0].durationMinutes,
      90,
    );
  },
);

test(
  'does not invent free time before the first moment or after the last moment',
  () => {
    assert.deepEqual(
      deriveDayFreeTimeGaps(
        DAY,
        [
          stop({
            id: 'only',
            order: 1,
            startTime: '12:00',
            endTime: '13:00',
          }),
        ],
      ),
      [],
    );
  },
);

test(
  'does not derive a gap across an untimed or partially timed moment',
  () => {
    assert.deepEqual(
      deriveDayFreeTimeGaps(
        DAY,
        [
          stop({
            id: 'first',
            order: 1,
            endTime: '10:00',
          }),
          stop({
            id: 'middle',
            order: 2,
          }),
          stop({
            id: 'last',
            order: 3,
            startTime: '14:00',
          }),
        ],
      ),
      [],
    );
  },
);

test(
  'ignores invalid, equal or reversed free-time relationships',
  () => {
    assert.deepEqual(
      deriveDayFreeTimeGaps(
        DAY,
        [
          stop({
            id: 'first',
            order: 1,
            endTime: '12:00',
          }),
          stop({
            id: 'second',
            order: 2,
            startTime: '11:00',
            endTime: 'morning',
          }),
          stop({
            id: 'third',
            order: 3,
            startTime: '14:00',
          }),
        ],
      ),
      [],
    );
  },
);

test(
  'only considers stops belonging to the requested day',
  () => {
    assert.deepEqual(
      deriveDayFreeTimeGaps(
        DAY,
        [
          stop({
            id: 'day-one-first',
            order: 1,
            endTime: '10:00',
          }),
          stop({
            id: 'other-day',
            dayId: 'day-2',
            order: 2,
            startTime: '10:30',
            endTime: '11:00',
          }),
          stop({
            id: 'day-one-second',
            order: 3,
            startTime: '12:00',
          }),
        ],
      ),
      [
        {
          dayId: 'day-1',
          afterStopId:
            'day-one-first',
          beforeStopId:
            'day-one-second',
          startTime: '10:00',
          endTime: '12:00',
          durationMinutes: 120,
        },
      ],
    );
  },
);

test(
  'detects known overlaps between fully timed moments',
  () => {
    assert.deepEqual(
      deriveDayTimeConflicts(
        DAY,
        [
          stop({
            id: 'museum',
            order: 1,
            startTime: '10:00',
            endTime: '12:00',
          }),
          stop({
            id: 'lunch',
            order: 2,
            startTime: '11:30',
            endTime: '13:00',
          }),
        ],
      ),
      [
        {
          dayId: 'day-1',
          firstStopId: 'museum',
          secondStopId: 'lunch',
          startTime: '11:30',
          endTime: '12:00',
          durationMinutes: 30,
        },
      ],
    );
  },
);

test(
  'touching time ranges do not conflict',
  () => {
    assert.deepEqual(
      deriveDayTimeConflicts(
        DAY,
        [
          stop({
            id: 'first',
            order: 1,
            startTime: '10:00',
            endTime: '11:00',
          }),
          stop({
            id: 'second',
            order: 2,
            startTime: '11:00',
            endTime: '12:00',
          }),
        ],
      ),
      [],
    );
  },
);

test(
  'conflict detection ignores partial, invalid and other-day ranges',
  () => {
    assert.deepEqual(
      deriveDayTimeConflicts(
        DAY,
        [
          stop({
            id: 'valid',
            order: 1,
            startTime: '09:00',
            endTime: '10:00',
          }),
          stop({
            id: 'partial',
            order: 2,
            startTime: '09:30',
          }),
          stop({
            id: 'legacy',
            order: 3,
            startTime: 'morning',
            endTime: 'noon',
          }),
          stop({
            id: 'other-day',
            dayId: 'day-2',
            order: 4,
            startTime: '09:15',
            endTime: '09:45',
          }),
        ],
      ),
      [],
    );
  },
);

test(
  'detects every known overlap in a day',
  () => {
    const conflicts =
      deriveDayTimeConflicts(
        DAY,
        [
          stop({
            id: 'a',
            order: 1,
            startTime: '09:00',
            endTime: '12:00',
          }),
          stop({
            id: 'b',
            order: 2,
            startTime: '10:00',
            endTime: '11:00',
          }),
          stop({
            id: 'c',
            order: 3,
            startTime: '10:30',
            endTime: '13:00',
          }),
        ],
      );

    assert.equal(
      conflicts.length,
      3,
    );
  },
);

test(
  'totals only known derived free time',
  () => {
    assert.equal(
      totalKnownFreeMinutes([
        {
          dayId: 'day-1',
          afterStopId: 'a',
          beforeStopId: 'b',
          startTime: '10:00',
          endTime: '10:45',
          durationMinutes: 45,
        },
        {
          dayId: 'day-1',
          afterStopId: 'b',
          beforeStopId: 'c',
          startTime: '12:00',
          endTime: '13:30',
          durationMinutes: 90,
        },
      ]),
      135,
    );
  },
);
