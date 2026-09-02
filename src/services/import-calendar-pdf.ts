import { decompressSync, inflateSync } from 'fflate';

import { IMPORT_CALENDAR_MAX_BYTES } from './import-calendar-file';
import {
  decodeImportCalendarBytes,
  extractImportCalendarText,
  mergeExtractedImportCalendars,
  type ExtractedImportCalendar,
} from './import-calendar-extract';

export const IMPORT_CALENDAR_PDF_EMPTY_ERROR =
  'This PDF does not contain an iCalendar (.ics) calendar.';

export const IMPORT_CALENDAR_PDF_READ_ERROR =
  'This PDF could not be read.';

const MAX_PDF_STREAMS = 32;

export function isPdfBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

export function extractImportCalendarFromPdf(
  bytes: Uint8Array,
): ExtractedImportCalendar {
  if (!isPdfBytes(bytes)) {
    throw new Error(IMPORT_CALENDAR_PDF_READ_ERROR);
  }

  const headerAndTrailer =
    decodeLatin1(bytes.slice(0, 2048)) +
    decodeLatin1(bytes.slice(Math.max(0, bytes.length - 4096)));

  if (/\/Encrypt(?:\s|\/|>)/.test(headerAndTrailer)) {
    throw new Error(IMPORT_CALENDAR_PDF_READ_ERROR);
  }

  const calendars: string[] = [];
  const seen = new Set<string>();
  let inflated = 0;

  const consider = (raw: string) => {
    try {
      const text = extractImportCalendarText(raw).text;

      if (!seen.has(text)) {
        seen.add(text);
        calendars.push(text);
      }
    } catch {
      // Member is not a calendar.
    }
  };

  consider(decodeImportCalendarBytes(bytes));

  for (const stream of pdfStreams(bytes)) {
    if (inflated + stream.length > IMPORT_CALENDAR_MAX_BYTES) {
      continue;
    }

    const decoded = tryInflatePdfStream(stream) ?? stream;

    if (decoded.length > IMPORT_CALENDAR_MAX_BYTES) {
      continue;
    }

    inflated += decoded.length;
    const text = decodeLatin1(decoded);
    consider(text);
    consider(pdfLiteralStrings(text));
  }

  if (calendars.length === 0) {
    throw new Error(IMPORT_CALENDAR_PDF_EMPTY_ERROR);
  }

  return {
    text: mergeExtractedImportCalendars(calendars),
    wrapper: 'none',
  };
}

function pdfStreams(bytes: Uint8Array): Uint8Array[] {
  const streams: Uint8Array[] = [];
  const startToken = latin1Bytes('stream');
  const endToken = latin1Bytes('endstream');
  let cursor = 0;

  while (
    streams.length < MAX_PDF_STREAMS &&
    cursor < bytes.length
  ) {
    const start = indexOfBytes(bytes, startToken, cursor);

    if (start < 0) {
      break;
    }

    let dataStart = start + startToken.length;

    if (
      bytes[dataStart] === 0x0d &&
      bytes[dataStart + 1] === 0x0a
    ) {
      dataStart += 2;
    } else if (
      bytes[dataStart] === 0x0a ||
      bytes[dataStart] === 0x0d
    ) {
      dataStart += 1;
    }

    const end = indexOfBytes(bytes, endToken, dataStart);

    if (end < 0) {
      break;
    }

    let dataEnd = end;

    if (bytes[dataEnd - 1] === 0x0a) {
      dataEnd -= 1;
    }

    if (bytes[dataEnd - 1] === 0x0d) {
      dataEnd -= 1;
    }

    if (dataEnd > dataStart) {
      streams.push(bytes.slice(dataStart, dataEnd));
    }

    cursor = end + endToken.length;
  }

  return streams;
}

function tryInflatePdfStream(data: Uint8Array): Uint8Array | null {
  try {
    return decompressSync(data);
  } catch {
    try {
      return inflateSync(data);
    } catch {
      return null;
    }
  }
}

function pdfLiteralStrings(text: string): string {
  const parts: string[] = [];
  const matches = text.matchAll(/\((?:\\.|[^\\)])*\)/g);

  for (const match of matches) {
    const inner = match[0].slice(1, -1);
    parts.push(
      inner
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\'),
    );
  }

  return parts.join('\n');
}

function decodeLatin1(bytes: Uint8Array): string {
  let text = '';

  for (let index = 0; index < bytes.length; index += 1) {
    text += String.fromCharCode(bytes[index] ?? 0);
  }

  return text;
}

function latin1Bytes(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);

  for (let index = 0; index < text.length; index += 1) {
    bytes[index] = text.charCodeAt(index);
  }

  return bytes;
}

function indexOfBytes(
  haystack: Uint8Array,
  needle: Uint8Array,
  from: number,
): number {
  outer: for (
    let index = from;
    index <= haystack.length - needle.length;
    index += 1
  ) {
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[index + offset] !== needle[offset]) {
        continue outer;
      }
    }

    return index;
  }

  return -1;
}
