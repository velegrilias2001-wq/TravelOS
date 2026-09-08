import type { LocalDataExportDocument } from './local-data-export';
import { isCanonicalDateKey } from './time-truth';

type Row = Record<string, unknown>;
type Fail = (message: string) => never;

/** Validate the serialized graph without coercing values or touching SQLite. */
export function validateRestoreGraph(document: LocalDataExportDocument, fail: Fail): void {
  const globalIds = new Map<string, Set<string>>();
  let rows = 0;
  const object = (value: unknown): Row => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Invalid record.');
    if (++rows > 100_000) fail('Too many records.');
    return value as Row;
  };
  const string = (value: unknown): string => {
    if (typeof value !== 'string' || !value.trim() || value.length > 100_000) fail('Invalid text or ID.');
    return value as string;
  };
  const unique = (scope: string, value: unknown) => {
    const id = string(value);
    const seen = globalIds.get(scope) ?? new Set<string>();
    if (seen.has(id)) fail('Duplicate record or relationship identity.');
    seen.add(id);
    globalIds.set(scope, seen);
  };
  const list = (value: unknown): unknown[] => {
    if (!Array.isArray(value) || value.length > 100_000) fail('Invalid or oversized list.');
    return value as unknown[];
  };
  const number = (value: unknown, minimum = 0, integer = false) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum ||
        (integer && !Number.isSafeInteger(value))) fail('Invalid number.');
  };
  const bool = (value: unknown) => { if (typeof value !== 'boolean') fail('Invalid boolean.'); };
  const record = (value: unknown, scope: string, required: string[]) => {
    const row = object(value);
    unique(scope, row.id);
    for (const field of ['createdAt', 'updatedAt', ...required]) string(row[field]);
    return row;
  };
  const optionalText = ['notes', 'title', 'caption', 'summary', 'address', 'phone', 'website', 'email',
    'lastName', 'avatarUri', 'mediaUri', 'coverImageUri', 'confirmationCode', 'provider', 'externalUrl',
    'startTime', 'endTime', 'startAt', 'endAt', 'checkInAt', 'checkOutAt', 'date', 'asOf',
    'timezone', 'timezoneSource', 'countryCode', 'currencyCode', 'placeId', 'intent', 'pace', 'partyType',
    'themePackId', 'ownerTravelerId', 'destinationId', 'bookingId', 'stopId', 'dayId',
    'currentDayId', 'currentStopId', 'lastActivityAt', 'travelStyle', 'budgetStyle', 'dailyRhythm', 'typicalParty'];
  const facts = (row: Row) => {
    for (const key of optionalText) {
      if (row[key] !== undefined && typeof row[key] !== 'string') fail('Invalid optional text field.');
    }
    for (const key of ['latitude', 'longitude']) {
      if (row[key] !== undefined && (typeof row[key] !== 'number' || !Number.isFinite(row[key]))) fail('Invalid coordinate.');
    }
    if (typeof row.latitude === 'number' && Math.abs(row.latitude) > 90) fail('Invalid latitude.');
    if (typeof row.longitude === 'number' && Math.abs(row.longitude) > 180) fail('Invalid longitude.');
  };
  const idList = (value: unknown, scope: string) => {
    const values = list(value).map(string);
    for (const id of values) unique(scope, id);
    return values;
  };
  const link = (id: unknown, allowed: Set<string>, required = false) => {
    if (id === undefined && !required) return;
    if (!allowed.has(string(id))) fail('Missing or cross-trip relationship.');
  };
  const travelers = new Map<string, Row>();
  for (const value of document.travelers) {
    const row = record(value, 'traveler', ['firstName', 'type']); facts(row);
    travelers.set(row.id as string, row);
  }
  for (const value of document.savedPlaces) {
    const row = record(value, 'saved place', ['kind', 'source', 'groundedIdentity']);
    unique('saved grounded identity', row.groundedIdentity);
  }
  if (document.travelDNA !== null) {
    const row = record(document.travelDNA, 'Travel DNA', []); facts(row);
    idList(row.interests, 'DNA interest');
  }
  for (const bundle of document.trips) {
    const trip = record(bundle.trip, 'trip', ['title', 'status', 'startDate', 'endDate', 'accountingCurrency']);
    facts(trip);
    if (!isCanonicalDateKey(trip.startDate as string) || !isCanonicalDateKey(trip.endDate as string) ||
        (trip.endDate as string) < (trip.startDate as string)) fail('Invalid trip dates.');
    if (trip.partySize !== undefined) number(trip.partySize, 1, true);
    const tripId = string(trip.id);
    const memberships = new Set(idList(trip.travelerIds, `membership:${tripId}`));
    for (const id of memberships) if (!travelers.has(id)) fail('Missing canonical traveler.');
    link(trip.ownerTravelerId, memberships);
    const listedTravelers = new Set<string>();
    for (const value of bundle.travelers) {
      const row = object(value);
      const id = string(row.id);
      unique(`bundle traveler:${tripId}`, id);
      const canonical = travelers.get(id);
      if (!canonical || !memberships.has(id)) fail('Inconsistent traveler membership.');
      // Repeated traveler snapshots must agree, never last-write-wins.
      for (const key of new Set([...Object.keys(row), ...Object.keys(canonical!)])) {
        if (row[key] !== canonical![key]) fail('Conflicting copies of a traveler.');
      }
      listedTravelers.add(id);
    }
    if (listedTravelers.size !== memberships.size) fail('Incomplete traveler membership.');
    const destinations = new Set<string>();
    for (const value of list(trip.destinations)) {
      const row = object(value); unique('destination', row.id); string(row.name); facts(row);
      destinations.add(row.id as string);
    }
    if (trip.origin !== undefined) { const row = object(trip.origin); string(row.name); facts(row); }
    const own = (value: unknown, scope: string, required: string[]) => {
      const row = record(value, scope, required); facts(row);
      if (row.tripId !== tripId) fail('Record belongs to another trip.');
      return row;
    };
    const days = new Set<string>();
    for (const value of bundle.days) {
      const row = own(value, 'day', ['date']); number(row.dayNumber, 1, true);
      if (!isCanonicalDateKey(row.date as string)) fail('Invalid day date.');
      unique(`day date:${tripId}`, row.date); unique(`day number:${tripId}`, String(row.dayNumber));
      link(row.destinationId, destinations); days.add(row.id as string);
    }
    const stops = new Set<string>();
    for (const value of bundle.stops) {
      const row = own(value, 'stop', ['title', 'type']); number(row.order, 1, true);
      link(row.dayId, days, true); unique(`position:${String(row.dayId)}`, String(row.order));
      if (row.location !== undefined) { const location = object(row.location); string(location.name); facts(location); }
      stops.add(row.id as string);
    }
    const bookings = new Set<string>();
    for (const value of bundle.bookings) {
      const row = own(value, 'booking', ['title', 'type', 'status']); link(row.stopId, stops);
      if (row.stopId !== undefined) unique(`booking stop:${tripId}`, row.stopId);
      if (row.amount !== undefined) number(row.amount);
      if (row.isPaid !== undefined) bool(row.isPaid);
      bookings.add(row.id as string);
    }
    for (const value of bundle.accommodations) {
      const row = own(value, 'accommodation', ['name', 'type']);
      link(row.stopId, stops); link(row.bookingId, bookings);
    }
    if (bundle.budget !== null) {
      const budget = own(bundle.budget, 'budget', ['currencyCode']);
      if (budget.plannedAmount !== undefined) number(budget.plannedAmount);
      for (const value of list(budget.items)) {
        const row = own(value, 'budget item', ['title', 'category', 'status', 'currencyCode']);
        if (row.budgetId !== budget.id) fail('Wrong parent budget.');
        number(row.amount); link(row.stopId, stops); link(row.bookingId, bookings);
      }
    }
    for (const value of bundle.fxRates) {
      const row = own(value, 'FX rate', ['fromCurrency', 'toCurrency', 'source', 'asOf']);
      number(row.rate, Number.MIN_VALUE);
      unique(`FX pair:${tripId}`, JSON.stringify([row.fromCurrency, row.toCurrency]));
    }
    const memories = new Set<string>();
    for (const value of bundle.memories) {
      const row = own(value, 'memory', ['type', 'capturedAt']);
      link(row.dayId, days); link(row.stopId, stops); memories.add(row.id as string);
    }
    if (bundle.travelBook !== null) {
      const row = own(bundle.travelBook, 'travel book', ['title']); bool(row.isPublished);
      for (const id of idList(row.memoryIds, `book membership:${tripId}`)) link(id, memories, true);
    }
    for (const value of bundle.livedStates) {
      const row = object(value); string(row.phase); string(row.recordedAt);
      if (row.tripId !== tripId) fail('Wrong lived-state trip.');
      link(row.stopId, stops, true); unique('lived stop', row.stopId);
    }
    if (bundle.runtimeState !== null) {
      const row = object(bundle.runtimeState); string(row.phase); string(row.updatedAt); facts(row);
      bool(row.isCompanionActive);
      if (row.tripId !== tripId) fail('Wrong runtime trip.');
      link(row.currentDayId, days); link(row.currentStopId, stops);
    }
    for (const value of bundle.packingItems ?? []) {
      const row = own(value, 'packing item', ['title']); bool(row.packed); number(row.position, 0, true);
    }
  }
}
