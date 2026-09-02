import { unzipSync } from 'fflate';

import { IMPORT_CALENDAR_MAX_BYTES } from './import-calendar-file';
import {
  decodeImportCalendarBytes,
  extractImportCalendarText,
  mergeExtractedImportCalendars,
  type ExtractedImportCalendar,
} from './import-calendar-extract';
import { extractImportCalendarFromPdf, isPdfBytes } from './import-calendar-pdf';
import {
  IMPORT_CALENDAR_IMAGE_ERROR,
  IMPORT_CALENDAR_OFFICE_EMPTY_ERROR,
  isImageBytes,
  isOfficeOpenXmlPackage,
  isPreferredOfficeMember,
  looksLikeXml,
  xmlVisibleText,
} from './import-calendar-office';

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

  if (isPdfBytes(bytes)) {
    return extractImportCalendarFromPdf(bytes).text;
  }

  if (isImageBytes(bytes)) {
    throw new Error(IMPORT_CALENDAR_IMAGE_ERROR);
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
        const size = file.originalSize ?? 0;
        const preferred = isPreferredOfficeMember(file.name);

        if (!preferred && accepted >= MAX_ZIP_ENTRIES) {
          return false;
        }

        if (!shouldConsiderZipMember(file.name, file.originalSize)) {
          return false;
        }

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
        caught.message === IMPORT_CALENDAR_ZIP_READ_ERROR ||
        caught.message === IMPORT_CALENDAR_OFFICE_EMPTY_ERROR)
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
      const text = decodeImportCalendarBytes(entries[name]);
      const extracted = extractCalendarFromZipMember(text);
      calendars.push(extracted);
    } catch {
      continue;
    }
  }

  if (calendars.length === 0) {
    throw new Error(
      isOfficeOpenXmlPackage(Object.keys(entries))
        ? IMPORT_CALENDAR_OFFICE_EMPTY_ERROR
        : IMPORT_CALENDAR_ZIP_EMPTY_ERROR,
    );
  }

  return {
    text: mergeExtractedImportCalendars(calendars),
    wrapper: 'none',
  };
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

function extractCalendarFromZipMember(text: string): string {
  try {
    return extractImportCalendarText(text).text;
  } catch (caught) {
    if (!looksLikeXml(text)) {
      throw caught;
    }

    return extractImportCalendarText(xmlVisibleText(text)).text;
  }
}
