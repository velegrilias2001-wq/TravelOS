const assert = require('node:assert/strict');
const test = require('node:test');

const {
  parseImportCalendar,
} = require('../.test-build/src/services/import-ics.js');

const FLIGHT = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TravelOS//Import V1//EN
BEGIN:VEVENT
UID:tap-lisbon
DTSTART:20260915T080000
DTEND:20260915T103000
SUMMARY:TAP to Lisbon
LOCATION:Porto Airport
END:VEVENT
END:VCALENDAR`;

test('ics import extracts grounded event fields without inventing midnight', () => {
  const parsed = parseImportCalendar(FLIGHT);

  assert.equal(parsed.events.length, 1);
  assert.equal(parsed.skippedCount, 0);
  assert.equal(parsed.events[0].title, 'TAP to Lisbon');
  assert.equal(parsed.events[0].startAt, '2026-09-15T08:00:00');
  assert.equal(parsed.events[0].endAt, '2026-09-15T10:30:00');
  assert.equal(parsed.events[0].locationText, 'Porto Airport');
  assert.equal(parsed.events[0].icsUid, 'tap-lisbon');
  assert.equal(parsed.events[0].confidence, 'high');
  assert.equal(parsed.events[0].startAt.includes('Z'), false);
});

test('ics import keeps UTC instants and named timezones as provenance', () => {
  const parsed = parseImportCalendar(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:utc-flight
DTSTART:20260915T080000Z
DTEND:20260915T103000Z
SUMMARY:UTC flight
END:VEVENT
BEGIN:VEVENT
UID:lisbon-lunch
DTSTART;TZID=Europe/Lisbon:20260915T130000
DTEND;TZID=Europe/Lisbon:20260915T150000
SUMMARY:Lunch in Lisbon
END:VEVENT
END:VCALENDAR`);

  assert.equal(parsed.events[0].startAt, '2026-09-15T08:00:00Z');
  assert.equal(parsed.events[1].startAt, '2026-09-15T13:00:00');
  assert.equal(parsed.events[1].evidence.tzid, 'Europe/Lisbon');
});

test('ics import leaves date-only events without invented times', () => {
  const parsed = parseImportCalendar(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:museum-day
DTSTART;VALUE=DATE:20260916
SUMMARY:Museum day
END:VEVENT
END:VCALENDAR`);

  assert.equal(parsed.events[0].startAt, undefined);
  assert.equal(parsed.events[0].endAt, undefined);
  assert.equal(parsed.events[0].confidence, 'low');
  assert.equal(parsed.events[0].evidence.calendarDate, '2026-09-16');
});

test('ics import unfolds wrapped summary lines', () => {
  const parsed = parseImportCalendar(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:folded
DTSTART:20260915T080000
SUMMARY:TAP to 
 Lisbon
END:VEVENT
END:VCALENDAR`);

  assert.equal(parsed.events[0].title, 'TAP to Lisbon');
});

test('ics import skips untitled events and fails closed without a calendar', () => {
  const parsed = parseImportCalendar(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:no-title
DTSTART:20260915T080000
END:VEVENT
BEGIN:VEVENT
UID:kept
DTSTART:20260915T090000
SUMMARY:Kept
END:VEVENT
END:VCALENDAR`);

  assert.equal(parsed.events.length, 1);
  assert.equal(parsed.skippedCount, 1);
  assert.equal(parsed.events[0].title, 'Kept');

  assert.throws(
    () => parseImportCalendar('this is a pdf dump'),
    /iCalendar/i,
  );

  assert.throws(
    () => parseImportCalendar('BEGIN:VCALENDAR\nEND:VCALENDAR'),
    /No calendar events/i,
  );
});
