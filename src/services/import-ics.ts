import {
  combineLocalDateTime,
  parseCompatibleLocalDateTime,
} from './time-truth';

import type {
  ImportClaimConfidence,
  ImportClaimEvidence,
} from '@/domain/entities/import-claim';

export interface ParsedImportEvent {
  title: string;
  startAt?: string;
  endAt?: string;
  locationText?: string;
  icsUid?: string;
  confidence: ImportClaimConfidence;
  evidence: ImportClaimEvidence;
}

export interface ParsedImportCalendar {
  events: ParsedImportEvent[];
  skippedCount: number;
  contentHash: string;
}

interface CalendarProperty {
  name: string;
  params: Record<string, string>;
  value: string;
}

export function hashImportText(text: string): string {
  const normalized = normalizeCalendarText(text);
  let hash = 2166136261;

  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function parseImportCalendar(
  rawText: string,
): ParsedImportCalendar {
  const text = normalizeCalendarText(rawText);

  if (!text.includes('BEGIN:VCALENDAR')) {
    throw new Error(
      'Import only accepts an iCalendar (.ics) calendar.',
    );
  }

  const contentHash = hashImportText(text);
  const events: ParsedImportEvent[] = [];
  let skippedCount = 0;

  for (const block of extractEventBlocks(text)) {
    const parsed = parseEventBlock(block);

    if (!parsed) {
      skippedCount += 1;
      continue;
    }

    events.push(parsed);
  }

  if (events.length === 0) {
    throw new Error(
      'No calendar events could be imported.',
    );
  }

  return {
    events,
    skippedCount,
    contentHash,
  };
}

function normalizeCalendarText(rawText: string): string {
  return rawText.replace(/\r\n/g, '\n').trim();
}

function unfoldLines(text: string): string[] {
  const rawLines = text.split('\n');
  const lines: string[] = [];

  for (const rawLine of rawLines) {
    if (
      (rawLine.startsWith(' ') || rawLine.startsWith('\t')) &&
      lines.length > 0
    ) {
      lines[lines.length - 1] += rawLine.slice(1);
      continue;
    }

    lines.push(rawLine);
  }

  return lines;
}

function extractEventBlocks(text: string): string[] {
  const lines = unfoldLines(text);
  const blocks: string[] = [];
  let capturing = false;
  let current: string[] = [];

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      capturing = true;
      current = [];
      continue;
    }

    if (line === 'END:VEVENT') {
      if (capturing) {
        blocks.push(current.join('\n'));
      }

      capturing = false;
      current = [];
      continue;
    }

    if (capturing) {
      current.push(line);
    }
  }

  return blocks;
}

function parseProperty(line: string): CalendarProperty | null {
  const colonIndex = line.indexOf(':');

  if (colonIndex <= 0) {
    return null;
  }

  const spec = line.slice(0, colonIndex);
  const value = unescapeIcsValue(line.slice(colonIndex + 1));
  const [name, ...paramParts] = spec.split(';');
  const params: Record<string, string> = {};

  for (const part of paramParts) {
    const equalsIndex = part.indexOf('=');

    if (equalsIndex <= 0) {
      continue;
    }

    params[part.slice(0, equalsIndex).toUpperCase()] =
      part.slice(equalsIndex + 1);
  }

  return {
    name: name.toUpperCase(),
    params,
    value,
  };
}

function unescapeIcsValue(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

function parseEventBlock(
  block: string,
): ParsedImportEvent | null {
  const properties = unfoldLines(block)
    .map(parseProperty)
    .filter((property): property is CalendarProperty =>
      property !== null,
    );

  const summary = findProperty(properties, 'SUMMARY')?.value;
  const uid = findProperty(properties, 'UID')?.value;
  const location = findProperty(properties, 'LOCATION')?.value;
  const startProperty = findProperty(properties, 'DTSTART');
  const endProperty = findProperty(properties, 'DTEND');
  const duration = findProperty(properties, 'DURATION');

  if (!summary) {
    return null;
  }

  const start = startProperty
    ? parseIcsDateTime(startProperty)
    : null;
  const end = endProperty
    ? parseIcsDateTime(endProperty)
    : null;

  if (start?.kind === 'invalid' || end?.kind === 'invalid') {
    return null;
  }

  const fieldsPresent = properties.map(
    (property) => property.name,
  );
  const evidence: ImportClaimEvidence = {
    fieldsPresent,
  };

  if (uid) {
    evidence.icsUid = uid;
  }

  if (start?.tzid) {
    evidence.tzid = start.tzid;
  } else if (end?.tzid) {
    evidence.tzid = end.tzid;
  }

  if (start?.calendarDate && !start.startAt) {
    evidence.calendarDate = start.calendarDate;
  }

  if (duration && !end) {
    evidence.skippedDuration = true;
  }

  const startAt = start?.startAt;
  const endAt = end?.startAt;

  if (
    startAt &&
    endAt &&
    !areComparableBookingTimes(startAt, endAt)
  ) {
    return null;
  }

  return {
    title: summary,
    startAt,
    endAt,
    locationText: location || undefined,
    icsUid: uid || undefined,
    confidence: confidenceFor({
      uid,
      startAt,
    }),
    evidence,
  };
}

function findProperty(
  properties: CalendarProperty[],
  name: string,
): CalendarProperty | undefined {
  return properties.find(
    (property) => property.name === name,
  );
}

function confidenceFor(input: {
  uid?: string;
  startAt?: string;
}): ImportClaimConfidence {
  if (input.uid && input.startAt) {
    return 'high';
  }

  if (input.startAt) {
    return 'medium';
  }

  return 'low';
}

interface ParsedIcsDateTime {
  kind: 'datetime' | 'date-only' | 'invalid';
  startAt?: string;
  calendarDate?: string;
  tzid?: string;
}

function parseIcsDateTime(
  property: CalendarProperty,
): ParsedIcsDateTime {
  const tzid = property.params.TZID;
  const valueType = (property.params.VALUE ?? '').toUpperCase();
  const raw = property.value.trim();

  if (valueType === 'DATE' || /^\d{8}$/.test(raw)) {
    const calendarDate = formatIcsDate(raw);

    if (!calendarDate) {
      return { kind: 'invalid' };
    }

    return {
      kind: 'date-only',
      calendarDate,
      tzid,
    };
  }

  const match =
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/.exec(
      raw,
    );

  if (!match) {
    return { kind: 'invalid' };
  }

  const date = `${match[1]}-${match[2]}-${match[3]}`;
  const time = `${match[4]}:${match[5]}`;
  const utc = match[7] === 'Z';

  try {
    const local = combineLocalDateTime(date, time);
    const startAt = utc ? `${local}Z` : local;

    if (!parseCompatibleLocalDateTime(startAt)) {
      return { kind: 'invalid' };
    }

    return {
      kind: 'datetime',
      startAt,
      tzid,
    };
  } catch {
    return { kind: 'invalid' };
  }
}

function formatIcsDate(value: string): string | null {
  const match = /^(\d{4})(\d{2})(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function areComparableBookingTimes(
  startAt: string,
  endAt: string,
): boolean {
  const start = parseCompatibleLocalDateTime(startAt);
  const end = parseCompatibleLocalDateTime(endAt);

  if (!start || !end) {
    return false;
  }

  const startUtc = Boolean(start.zoneSuffix);
  const endUtc = Boolean(end.zoneSuffix);

  return startUtc === endUtc;
}
