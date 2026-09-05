import { inflateSync, unzipSync } from 'fflate';

import { IMPORT_CALENDAR_MAX_BYTES } from './import-calendar-file';
import {
  decodeImportCalendarBytes,
} from './import-calendar-extract';
import { isPdfBytes } from './import-calendar-pdf';
import {
  isOfficeOpenXmlPackage,
  isPreferredOfficeMember,
  looksLikeXml,
  xmlVisibleText,
} from './import-calendar-office';

/**
 * Plain document text for seed import.
 * Does not require an embedded iCalendar.
 */

export const IMPORT_DOCUMENT_TEXT_EMPTY_ERROR =
  'This file did not yield readable text to seed a trip.';

export function isZipBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  );
}

export function extractDocumentTextFromBytes(
  bytes: Uint8Array,
): string {
  if (bytes.length === 0) {
    throw new Error(IMPORT_DOCUMENT_TEXT_EMPTY_ERROR);
  }

  if (isPdfBytes(bytes)) {
    return finalizeText(extractPdfPlainText(bytes));
  }

  if (isZipBytes(bytes)) {
    return finalizeText(extractZipPlainText(bytes));
  }

  return finalizeText(decodeImportCalendarBytes(bytes));
}

function extractZipPlainText(bytes: Uint8Array): string {
  let entries: Record<string, Uint8Array>;

  try {
    entries = unzipSync(bytes, {
      filter(file) {
        const size = file.originalSize ?? 0;
        if (size > IMPORT_CALENDAR_MAX_BYTES) {
          return false;
        }

        return isPreferredOfficeMember(file.name);
      },
    });
  } catch {
    throw new Error(IMPORT_DOCUMENT_TEXT_EMPTY_ERROR);
  }

  const names = Object.keys(entries);
  if (!isOfficeOpenXmlPackage(names) && names.length === 0) {
    throw new Error(IMPORT_DOCUMENT_TEXT_EMPTY_ERROR);
  }

  const parts: string[] = [];

  for (const [name, content] of Object.entries(entries)) {
    const decoded = decodeImportCalendarBytes(content);
    if (looksLikeXml(decoded)) {
      const visible = xmlVisibleText(decoded);
      if (visible) {
        parts.push(visible);
      }
      continue;
    }

    if (decoded.trim()) {
      parts.push(decoded.trim());
    }

    void name;
  }

  return parts.join('\n');
}

function extractPdfPlainText(bytes: Uint8Array): string {
  const chunks: string[] = [];
  chunks.push(decodeLatin1(bytes.slice(0, 4096)));
  chunks.push(
    decodeLatin1(bytes.slice(Math.max(0, bytes.length - 8192))),
  );

  const startToken = latin1Bytes('stream');
  const endToken = latin1Bytes('endstream');
  let cursor = 0;
  let streams = 0;

  while (streams < 24 && cursor < bytes.length) {
    const start = indexOfBytes(bytes, startToken, cursor);
    if (start < 0) {
      break;
    }

    let dataStart = start + startToken.length;
    if (bytes[dataStart] === 0x0d) dataStart += 1;
    if (bytes[dataStart] === 0x0a) dataStart += 1;

    const end = indexOfBytes(bytes, endToken, dataStart);
    if (end < 0) {
      break;
    }

    const stream = bytes.slice(dataStart, end);
    cursor = end + endToken.length;
    streams += 1;

    if (stream.length > IMPORT_CALENDAR_MAX_BYTES) {
      continue;
    }

    try {
      chunks.push(decodeLatin1(inflateSync(stream)));
    } catch {
      chunks.push(decodeLatin1(stream));
    }
  }

  return chunks.join('\n');
}

function finalizeText(text: string): string {
  const cleaned = text
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (cleaned.length < 8) {
    throw new Error(IMPORT_DOCUMENT_TEXT_EMPTY_ERROR);
  }

  return cleaned.slice(0, IMPORT_CALENDAR_MAX_BYTES);
}

function decodeLatin1(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) {
    out += String.fromCharCode(bytes[i]!);
  }
  return out;
}

function latin1Bytes(value: string): Uint8Array {
  const out = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i += 1) {
    out[i] = value.charCodeAt(i) & 0xff;
  }
  return out;
}

function indexOfBytes(
  haystack: Uint8Array,
  needle: Uint8Array,
  from: number,
): number {
  outer: for (
    let i = from;
    i <= haystack.length - needle.length;
    i += 1
  ) {
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) {
        continue outer;
      }
    }
    return i;
  }
  return -1;
}
