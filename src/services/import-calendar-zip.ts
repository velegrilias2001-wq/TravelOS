import { unzipSync } from 'fflate';

import { IMPORT_CALENDAR_MAX_BYTES } from './import-calendar-file';
import {
  decodeImportCalendarBytes,
  extractImportCalendarText,
  type ExtractedImportCalendar,
} from './import-calendar-extract';

export const IMPORT_CALENDAR_ZIP_EMPTY_ERROR =
  'This zip does not contain an iCalendar (.ics) calendar.';

export const IMPORT_CALENDAR_ZIP_READ_ERROR =
  'This zip could not be read.';

const MAX_ZIP_ENTRIES = 32;

export function isZipBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  );
}

export function decodePickedImportCalendarBytes(
  bytes: Uint8Array,
): string {
  if (isZipBytes(bytes)) {
    return extractImportCalendarFromZip(bytes).text;
  }

  return decodeImportCalendarBytes(bytes);
}

export function extractImportCalendarFromZip(
  bytes: Uint8Array,
): ExtractedImportCalendar {
  if (!isZipBytes(bytes)) {
    throw new Error(IMPORT_CALENDAR_ZIP_READ_ERROR);
  }

  let entries: Record<string, Uint8Array>;

  try {
    let accepted = 0;
    let uncompressed = 0;

    entries = unzipSync(bytes, {
      filter(file) {
        if (accepted >= MAX_ZIP_ENTRIES) {
          return false;
        }

        if (!shouldConsiderZipMember(file.name, file.originalSize)) {
          return false;
        }

        const size = file.originalSize ?? 0;

        if (uncompressed + size > IMPORT_CALENDAR_MAX_BYTES) {
          return false;
        }

        accepted += 1;
        uncompressed += size;
        return true;
      },
    });
  } catch (caught) {
    if (
      caught instanceof Error &&
      (caught.message === IMPORT_CALENDAR_ZIP_EMPTY_ERROR ||
        caught.message === IMPORT_CALENDAR_ZIP_READ_ERROR)
    ) {
      throw caught;
    }

    throw new Error(IMPORT_CALENDAR_ZIP_READ_ERROR);
  }

  const calendars: string[] = [];

  for (const name of Object.keys(entries).sort((left, right) =>
    left.localeCompare(right),
  )) {
    if (!shouldConsiderZipMember(name, entries[name]?.length)) {
      continue;
    }

    try {
      const extracted = extractImportCalendarText(
        decodeImportCalendarBytes(entries[name]),
      );
      calendars.push(extracted.text);
    } catch {
      continue;
    }
  }

  if (calendars.length === 0) {
    throw new Error(IMPORT_CALENDAR_ZIP_EMPTY_ERROR);
  }

  return {
    text: mergeExtractedCalendars(calendars),
    wrapper: 'none',
  };
}

function mergeExtractedCalendars(calendars: string[]): string {
  if (calendars.length === 1) {
    return calendars[0];
  }

  const bodies = calendars
    .map((calendar) => innerCalendarBody(calendar))
    .filter((body) => body.length > 0);

  return `BEGIN:VCALENDAR\n${bodies.join('\n')}\nEND:VCALENDAR`;
}

function innerCalendarBody(calendar: string): string {
  const startToken = 'BEGIN:VCALENDAR';
  const endToken = 'END:VCALENDAR';
  const start = calendar.indexOf(startToken);
  const end = calendar.indexOf(endToken);

  if (start < 0 || end < 0 || end <= start) {
    return calendar.trim();
  }

  return calendar.slice(start + startToken.length, end).trim();
}

function shouldConsiderZipMember(
  name: string,
  originalSize?: number,
): boolean {
  const normalized = name.replace(/\\/g, '/');
  const base = normalized.split('/').pop() ?? '';

  if (
    !base ||
    normalized.endsWith('/') ||
    normalized.startsWith('__MACOSX/') ||
    base.startsWith('.') ||
    base.toLowerCase().endsWith('.zip')
  ) {
    return false;
  }

  if (
    originalSize === undefined ||
    originalSize <= 0 ||
    originalSize > IMPORT_CALENDAR_MAX_BYTES
  ) {
    return false;
  }

  return true;
}
