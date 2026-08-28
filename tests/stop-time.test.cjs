const assert =
  require('node:assert/strict');

const test =
  require('node:test');

const {
  validateNewStopTimes,
  validateStopTimeUpdate,
} = require(
  '../.test-build/src/services/stop-time.js',
);

test(
  'new stop time ranges accept canonical same-day ranges',
  () => {
    assert.doesNotThrow(() =>
      validateNewStopTimes({
        startTime: '09:30',
        endTime: '11:00',
      }),
    );

    assert.doesNotThrow(() =>
      validateNewStopTimes({
        startTime: '09:30',
      }),
    );

    assert.doesNotThrow(() =>
      validateNewStopTimes({
        endTime: '11:00',
      }),
    );
  },
);

test(
  'new stop time ranges reject invalid, equal and reversed times',
  () => {
    assert.throws(
      () =>
        validateNewStopTimes({
          startTime: '9:30',
          endTime: '11:00',
        }),
      /HH:mm/i,
    );

    assert.throws(
      () =>
        validateNewStopTimes({
          startTime: '10:00',
          endTime: '10:00',
        }),
      /end time must be after stop start time/i,
    );

    assert.throws(
      () =>
        validateNewStopTimes({
          startTime: '11:00',
          endTime: '10:00',
        }),
      /end time must be after stop start time/i,
    );
  },
);

test(
  'stop time updates preserve untouched legacy values',
  () => {
    assert.doesNotThrow(() =>
      validateStopTimeUpdate(
        {
          startTime: 'morning',
          endTime: undefined,
        },
        {
          startTime: 'morning',
          endTime: undefined,
        },
      ),
    );
  },
);

test(
  'stop time updates validate changed canonical ranges',
  () => {
    assert.doesNotThrow(() =>
      validateStopTimeUpdate(
        {
          startTime: '09:00',
          endTime: '10:00',
        },
        {
          startTime: '09:30',
          endTime: '11:00',
        },
      ),
    );

    assert.throws(
      () =>
        validateStopTimeUpdate(
          {
            startTime: '09:00',
            endTime: '10:00',
          },
          {
            startTime: '11:00',
            endTime: '10:00',
          },
        ),
      /end time must be after stop start time/i,
    );
  },
);

test(
  'changing a range that still contains a legacy time requires review',
  () => {
    assert.throws(
      () =>
        validateStopTimeUpdate(
          {
            startTime: 'morning',
            endTime: undefined,
          },
          {
            startTime: 'morning',
            endTime: '12:00',
          },
        ),
      /saved stop time needs review/i,
    );
  },
);
