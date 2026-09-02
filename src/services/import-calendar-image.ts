import { decompressSync, inflateSync } from 'fflate';

import { IMPORT_CALENDAR_MAX_BYTES } from './import-calendar-file';
import {
  decodeImportCalendarBytes,
  extractImportCalendarText,
  mergeExtractedImportCalendars,
  type ExtractedImportCalendar,
} from './import-calendar-extract';

export const IMPORT_CALENDAR_IMAGE_EMPTY_ERROR =
  'This image does not contain an iCalendar (.ics) calendar.';

export const IMPORT_CALENDAR_IMAGE_READ_ERROR =
  'This image could not be read.';

export function isImageBytes(bytes: Uint8Array): boolean {
  return (
    isJpegBytes(bytes) ||
    isPngBytes(bytes) ||
    isGifBytes(bytes) ||
    isWebpBytes(bytes)
  );
}

export function extractImportCalendarFromImage(
  bytes: Uint8Array,
): ExtractedImportCalendar {
  if (!isImageBytes(bytes)) {
    throw new Error(IMPORT_CALENDAR_IMAGE_READ_ERROR);
  }

  const calendars: string[] = [];
  const seen = new Set<string>();

  const consider = (raw: string) => {
    if (!raw || raw.length > IMPORT_CALENDAR_MAX_BYTES) {
      return;
    }

    try {
      const text = extractImportCalendarText(raw).text;

      if (!seen.has(text)) {
        seen.add(text);
        calendars.push(text);
      }
    } catch {
      // Payload is not a calendar.
    }
  };

  const payloads = imageTextPayloads(bytes);

  for (const payload of payloads) {
    consider(payload);
  }

  consider(payloads.join(''));
  consider(decodeImportCalendarBytes(bytes));
  consider(decodeLatin1(bytes));

  if (calendars.length === 0) {
    throw new Error(IMPORT_CALENDAR_IMAGE_EMPTY_ERROR);
  }

  return {
    text: mergeExtractedImportCalendars(calendars),
    wrapper: 'none',
  };
}

function imageTextPayloads(bytes: Uint8Array): string[] {
  if (isJpegBytes(bytes)) {
    return jpegTextPayloads(bytes);
  }

  if (isPngBytes(bytes)) {
    return pngTextPayloads(bytes);
  }

  if (isGifBytes(bytes)) {
    return gifCommentPayloads(bytes);
  }

  if (isWebpBytes(bytes)) {
    return webpTextPayloads(bytes);
  }

  return [];
}

function isJpegBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  );
}

function isPngBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  );
}

function isGifBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  );
}

function isWebpBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

function jpegTextPayloads(bytes: Uint8Array): string[] {
  const payloads: string[] = [];
  let cursor = 2;

  while (cursor + 1 < bytes.length) {
    if (bytes[cursor] !== 0xff) {
      cursor += 1;
      continue;
    }

    while (cursor < bytes.length && bytes[cursor] === 0xff) {
      cursor += 1;
    }

    if (cursor >= bytes.length) {
      break;
    }

    const marker = bytes[cursor] ?? 0;
    cursor += 1;

    if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }

    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    if (cursor + 1 >= bytes.length) {
      break;
    }

    const length = ((bytes[cursor] ?? 0) << 8) | (bytes[cursor + 1] ?? 0);

    if (length < 2 || cursor + length > bytes.length) {
      break;
    }

    const payload = bytes.slice(cursor + 2, cursor + length);
    cursor += length;

    if (marker === 0xfe || (marker >= 0xe0 && marker <= 0xef)) {
      payloads.push(decodeLatin1(payload));
    }
  }

  return payloads;
}

function pngTextPayloads(bytes: Uint8Array): string[] {
  const payloads: string[] = [];
  let cursor = 8;
  let inflated = 0;

  while (cursor + 12 <= bytes.length && payloads.length < 32) {
    const length = readUint32Be(bytes, cursor);
    const type = decodeLatin1(bytes.slice(cursor + 4, cursor + 8));
    const dataStart = cursor + 8;
    const dataEnd = dataStart + length;

    if (length < 0 || dataEnd + 4 > bytes.length) {
      break;
    }

    const data = bytes.slice(dataStart, dataEnd);
    cursor = dataEnd + 4;

    if (type === 'IEND') {
      break;
    }

    if (type === 'tEXt') {
      payloads.push(pngKeywordPayload(data));
      continue;
    }

    if (type === 'zTXt') {
      const inflatedText = pngZtxtPayload(data);

      if (
        inflatedText &&
        inflated + inflatedText.length <= IMPORT_CALENDAR_MAX_BYTES
      ) {
        inflated += inflatedText.length;
        payloads.push(inflatedText);
      }

      continue;
    }

    if (type === 'iTXt') {
      const inflatedText = pngItxtPayload(data);

      if (
        inflatedText &&
        inflated + inflatedText.length <= IMPORT_CALENDAR_MAX_BYTES
      ) {
        inflated += inflatedText.length;
        payloads.push(inflatedText);
      }
    }
  }

  return payloads;
}

function pngKeywordPayload(data: Uint8Array): string {
  const nul = indexOfByte(data, 0, 0);

  if (nul < 0) {
    return decodeLatin1(data);
  }

  return decodeLatin1(data.slice(nul + 1));
}

function pngZtxtPayload(data: Uint8Array): string | null {
  const nul = indexOfByte(data, 0, 0);

  if (nul < 0 || nul + 2 > data.length || data[nul + 1] !== 0) {
    return null;
  }

  const inflated = tryInflate(data.slice(nul + 2));

  return inflated ? decodeLatin1(inflated) : null;
}

function pngItxtPayload(data: Uint8Array): string | null {
  const keywordEnd = indexOfByte(data, 0, 0);

  if (keywordEnd < 0 || keywordEnd + 3 > data.length) {
    return null;
  }

  const compressed = data[keywordEnd + 1] ?? 0;
  const method = data[keywordEnd + 2] ?? 0;
  let cursor = keywordEnd + 3;
  const languageEnd = indexOfByte(data, 0, cursor);

  if (languageEnd < 0) {
    return null;
  }

  const translatedEnd = indexOfByte(data, 0, languageEnd + 1);

  if (translatedEnd < 0) {
    return null;
  }

  const textBytes = data.slice(translatedEnd + 1);

  if (compressed === 1) {
    if (method !== 0) {
      return null;
    }

    const inflated = tryInflate(textBytes);

    return inflated ? decodeLatin1(inflated) : null;
  }

  return decodeLatin1(textBytes);
}

function gifCommentPayloads(bytes: Uint8Array): string[] {
  const payloads: string[] = [];
  let cursor = 0;

  while (cursor + 2 < bytes.length && payloads.length < 32) {
    if (bytes[cursor] === 0x21 && bytes[cursor + 1] === 0xfe) {
      cursor += 2;
      const parts: Uint8Array[] = [];

      while (cursor < bytes.length) {
        const size = bytes[cursor] ?? 0;
        cursor += 1;

        if (size === 0) {
          break;
        }

        if (cursor + size > bytes.length) {
          return payloads;
        }

        parts.push(bytes.slice(cursor, cursor + size));
        cursor += size;
      }

      payloads.push(decodeLatin1(concatBytes(parts)));
      continue;
    }

    cursor += 1;
  }

  return payloads;
}

function webpTextPayloads(bytes: Uint8Array): string[] {
  const payloads: string[] = [];
  let cursor = 12;

  while (cursor + 8 <= bytes.length && payloads.length < 32) {
    const type = decodeLatin1(bytes.slice(cursor, cursor + 4));
    const size = readUint32Le(bytes, cursor + 4);
    const dataStart = cursor + 8;
    const dataEnd = dataStart + size;

    if (size < 0 || dataEnd > bytes.length) {
      break;
    }

    if (type === 'EXIF' || type === 'XMP ') {
      payloads.push(decodeLatin1(bytes.slice(dataStart, dataEnd)));
    }

    cursor = dataEnd + (size % 2);
  }

  return payloads;
}

function tryInflate(data: Uint8Array): Uint8Array | null {
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

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const bytes = new Uint8Array(total);
  let offset = 0;

  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }

  return bytes;
}

function readUint32Be(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) << 24) |
    ((bytes[offset + 1] ?? 0) << 16) |
    ((bytes[offset + 2] ?? 0) << 8) |
    (bytes[offset + 3] ?? 0)
  ) >>> 0;
}

function readUint32Le(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] ?? 0) |
    ((bytes[offset + 1] ?? 0) << 8) |
    ((bytes[offset + 2] ?? 0) << 16) |
    ((bytes[offset + 3] ?? 0) << 24)
  ) >>> 0;
}

function indexOfByte(
  bytes: Uint8Array,
  value: number,
  from: number,
): number {
  for (let index = from; index < bytes.length; index += 1) {
    if (bytes[index] === value) {
      return index;
    }
  }

  return -1;
}

function decodeLatin1(bytes: Uint8Array): string {
  let text = '';

  for (let index = 0; index < bytes.length; index += 1) {
    text += String.fromCharCode(bytes[index] ?? 0);
  }

  return text;
}
