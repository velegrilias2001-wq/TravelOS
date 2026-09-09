import type { LocalDataExportDocument } from './local-data-export';
import { isCanonicalDateKey, parseCompatibleLocalDateTime } from './time-truth';

type Row = Record<string, unknown>;
type Fail = (message: string) => never;
const metadata = 'id createdAt updatedAt';
const owned = `${metadata} tripId`;
const place = 'name countryCode latitude longitude timezone timezoneSource placeId currencyCode';
const fields: Record<string, string> = {
  document: 'format exportedAt appVersion contract travelDNA savedPlaces travelers trips',
  bundle: 'trip days stops bookings accommodations budget fxRates memories travelBook runtimeState livedStates travelers packingItems',
  trip: `${metadata} title status intent pace partyType partySize origin destinations startDate endDate travelerIds ownerTravelerId accountingCurrency themePackId`,
  destination: `id ${place}`, origin: place,
  traveler: `${metadata} firstName lastName type email phone avatarUri`,
  dna: `${metadata} pace interests travelStyle budgetStyle dailyRhythm typicalParty`,
  saved: `${metadata} kind groundedIdentity source`,
  day: `${owned} date dayNumber title notes destinationId`,
  stop: `${owned} dayId title type order location startTime endTime notes`,
  location: 'name address latitude longitude placeId',
  booking: `${owned} stopId type status title provider confirmationCode startAt endAt amount currencyCode isPaid notes externalUrl`,
  accommodation: `${owned} stopId bookingId name type address latitude longitude checkInAt checkOutAt phone website notes`,
  budget: `${owned} currencyCode plannedAmount items`,
  item: `${owned} budgetId bookingId stopId title category status amount currencyCode date notes`,
  fx: `${owned} fromCurrency toCurrency rate asOf source`,
  memory: `${owned} dayId stopId type title caption mediaUri capturedAt`,
  book: `${owned} title coverImageUri memoryIds summary isPublished`,
  runtime: 'tripId phase currentDayId currentStopId lastActivityAt isCompanionActive updatedAt',
  lived: 'stopId tripId phase recordedAt',
  packing: `${owned} title packed position`,
};
const enums: Record<string, Record<string, string>> = {
  trip: { status: 'draft planned active completed archived', intent: 'relax explore food nature event social romantic family work_leisure other', pace: 'slow balanced full', partyType: 'solo couple friends family' },
  destination: { timezoneSource: 'provider catalogue traveler' }, origin: { timezoneSource: 'provider catalogue traveler' },
  traveler: { type: 'adult child infant' },
  dna: { pace: 'slow balanced full', travelStyle: 'local iconic mix', budgetStyle: 'value comfortable premium', dailyRhythm: 'morning flexible night', typicalParty: 'solo couple friends family' },
  saved: { kind: 'destination journey', source: 'provider curated' },
  stop: { type: 'place activity food transport accommodation other' },
  booking: { type: 'flight train bus ferry car accommodation activity restaurant ticket other', status: 'planned confirmed cancelled completed' },
  accommodation: { type: 'hotel apartment hostel villa resort camping other' },
  item: { category: 'transport accommodation food activities shopping insurance other', status: 'planned committed paid' },
  fx: { source: 'traveler' }, memory: { type: 'photo video note' },
  runtime: { phase: 'upcoming active completed' }, lived: { phase: 'done skipped' },
};

/** Called after structural/relationship preflight. Reject unsupported facts,
 * never silently drop future durable fields, coerce enums or convert legacy timestamps.
 * The historical contract metadata is descriptive, not persisted or authoritative.
 */
export function validateBackupSemantics(document: LocalDataExportDocument, fail: Fail): void {
  const check = (value: object, kind: string) => {
    const row = value as Row;
    const allowed = new Set(fields[kind].split(' '));
    if (Object.keys(row).some(key => !allowed.has(key))) fail('This backup contains unsupported fields. Use a compatible TravelOS version.');
    for (const [key, options] of Object.entries(enums[kind] ?? {})) {
      if (row[key] !== undefined && !options.split(' ').includes(row[key] as string)) fail('Unsupported category or state.');
    }
    for (const key of ['currencyCode', 'accountingCurrency', 'fromCurrency', 'toCurrency']) {
      if (row[key] !== undefined && !/^[A-Z]{3}$/.test(row[key] as string)) fail('Invalid currency code.');
    }
    for (const key of ['startTime', 'endTime']) {
      if (row[key] !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(row[key] as string)) fail('Invalid wall-clock time.');
    }
    for (const key of ['startAt', 'endAt', 'checkInAt', 'checkOutAt']) {
      if (row[key] !== undefined && !parseCompatibleLocalDateTime(row[key] as string)) fail('Invalid travel date-time.');
    }
    for (const key of ['date', 'asOf']) {
      if (row[key] !== undefined && !isCanonicalDateKey(row[key] as string) && !(key === 'asOf' && parseCompatibleLocalDateTime(row[key] as string))) fail('Invalid calendar date.');
    }
    for (const key of ['createdAt', 'updatedAt', 'capturedAt', 'recordedAt', 'lastActivityAt', 'exportedAt']) {
      if (row[key] !== undefined && (typeof row[key] !== 'string' || !parseCompatibleLocalDateTime(row[key] as string) || !/(Z|[+-]\d{2}:\d{2})$/.test(row[key] as string))) fail('Invalid recorded timestamp.');
    }
  };
  check(document, 'document');
  for (const row of document.travelers) check(row, 'traveler');
  for (const row of document.savedPlaces) check(row, 'saved');
  if (document.travelDNA) {
    check(document.travelDNA, 'dna');
    const interests = 'food culture nature beaches nightlife shopping wellness adventure'.split(' ');
    if (document.travelDNA.interests.some(value => !interests.includes(value))) fail('Unsupported Travel DNA interest.');
  }
  for (const bundle of document.trips) {
    check(bundle, 'bundle'); check(bundle.trip, 'trip');
    const stopDays = new Map(bundle.stops.map(stop => [stop.id, stop.dayId]));
    for (const row of bundle.travelers) check(row, 'traveler');
    for (const row of bundle.trip.destinations) check(row, 'destination');
    if (bundle.trip.origin) check(bundle.trip.origin, 'origin');
    for (const row of bundle.days) check(row, 'day');
    for (const row of bundle.stops) { check(row, 'stop'); if (row.location) check(row.location, 'location'); }
    for (const row of bundle.bookings) check(row, 'booking');
    for (const row of bundle.accommodations) check(row, 'accommodation');
    if (bundle.budget) { check(bundle.budget, 'budget'); for (const row of bundle.budget.items) check(row, 'item'); }
    for (const row of bundle.fxRates) check(row, 'fx');
    for (const row of bundle.memories) {
      check(row, 'memory');
      if (row.dayId && row.stopId && stopDays.get(row.stopId) !== row.dayId) fail('Memory day and stop disagree.');
    }
    if (bundle.travelBook) check(bundle.travelBook, 'book');
    if (bundle.runtimeState) {
      const row = bundle.runtimeState; check(row, 'runtime');
      if (row.currentDayId && row.currentStopId && stopDays.get(row.currentStopId) !== row.currentDayId) fail('Runtime day and stop disagree.');
    }
    for (const row of bundle.livedStates) check(row, 'lived');
    for (const row of bundle.packingItems ?? []) check(row, 'packing');
  }
}
