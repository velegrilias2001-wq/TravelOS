const ICS_ERROR =
  'Import only accepts an iCalendar (.ics) calendar.';

export type ImportCalendarWrapper = 'none' | 'email';

export interface ExtractedImportCalendar {
  text: string;
  wrapper: ImportCalendarWrapper;
}

export function bytesFromBase64(base64: string): Uint8Array {
  const clean = base64.replace(/\s/g, '');
  const binary = globalThis.atob(clean);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export function decodeImportCalendarBytes(
  bytes: Uint8Array,
): string {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes);
  }

  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes);
  }

  return new TextDecoder('utf-8').decode(bytes);
}

export function extractImportCalendarText(
  rawText: string,
): ExtractedImportCalendar {
  const text = rawText.replace(/\r\n/g, '\n').trim();

  if (!text) {
    throw new Error(ICS_ERROR);
  }

  const mimeCalendar = extractMimeCalendarPart(text);

  if (mimeCalendar) {
    return {
      text: mimeCalendar,
      wrapper: 'email',
    };
  }

  const sliced = sliceVcalendar(text);

  if (sliced) {
    return {
      text: sliced,
      wrapper: looksLikeEmail(text) ? 'email' : 'none',
    };
  }

  throw new Error(ICS_ERROR);
}

export function mergeExtractedImportCalendars(
  calendars: string[],
): string {
  const first = calendars[0];

  if (calendars.length === 1 && first) {
    return first;
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

function looksLikeEmail(text: string): boolean {
  const head = text.slice(0, 800);

  return (
    /^[A-Za-z-]+:\s.+/m.test(head) &&
    /^(From|Subject|MIME-Version|Content-Type|Received):/im.test(
      head,
    )
  );
}

function sliceVcalendar(text: string): string | null {
  const start = text.indexOf('BEGIN:VCALENDAR');

  if (start < 0) {
    return null;
  }

  const endToken = 'END:VCALENDAR';
  const end = text.indexOf(endToken, start);

  if (end < 0) {
    return null;
  }

  return text.slice(start, end + endToken.length);
}

function extractMimeCalendarPart(text: string): string | null {
  if (!/^content-type:/im.test(text.slice(0, 4000))) {
    return null;
  }

  return walkMimeParts(text, 0);
}

function walkMimeParts(raw: string, depth: number): string | null {
  if (depth > 4) {
    return null;
  }

  const { headers, body } = splitHeaders(raw);
  const contentType = headerValue(headers, 'content-type') ?? '';
  const encoding = (
    headerValue(headers, 'content-transfer-encoding') ??
    '7bit'
  ).toLowerCase();
  const boundary = mimeBoundary(contentType);

  if (isCalendarContentType(contentType)) {
    const decoded = decodeMimeBody(body, encoding);

    return sliceVcalendar(decoded) ?? decoded;
  }

  if (!boundary) {
    return null;
  }

  const parts = splitMultipart(body, boundary);

  for (const part of parts) {
    const found = walkMimeParts(part, depth + 1);

    if (found) {
      return found;
    }
  }

  return null;
}

function splitHeaders(raw: string): {
  headers: string;
  body: string;
} {
  const normalized = raw.replace(/\r\n/g, '\n');
  const gap = normalized.indexOf('\n\n');

  if (gap < 0) {
    return {
      headers: normalized,
      body: '',
    };
  }

  return {
    headers: normalized.slice(0, gap),
    body: normalized.slice(gap + 2),
  };
}

function headerValue(
  headers: string,
  name: string,
): string | null {
  const unfolded = headers.replace(/\n[ \t]+/g, ' ');
  const match = unfolded.match(
    new RegExp(`^${name}:\\s*(.+)$`, 'im'),
  );

  return match ? match[1].trim() : null;
}

function mimeBoundary(contentType: string): string | null {
  const match = contentType.match(/boundary="?([^";]+)"?/i);

  return match ? match[1].trim() : null;
}

function isCalendarContentType(contentType: string): boolean {
  const lowered = contentType.toLowerCase();

  return (
    lowered.includes('text/calendar') ||
    lowered.includes('application/ics')
  );
}

function splitMultipart(
  body: string,
  boundary: string,
): string[] {
  const token = `--${boundary}`;
  const chunks = body.split(token).slice(1);
  const parts: string[] = [];

  for (const chunk of chunks) {
    if (chunk.startsWith('--')) {
      break;
    }

    parts.push(chunk.replace(/^\n/, '').replace(/\n$/, ''));
  }

  return parts;
}

function decodeMimeBody(
  body: string,
  encoding: string,
): string {
  const trimmed = body.replace(/^\n+/, '').replace(/\n+$/, '');
  let decoded = trimmed;

  if (encoding === 'base64') {
    decoded = decodeImportCalendarBytes(bytesFromBase64(trimmed));
  } else if (
    encoding === 'quoted-printable' ||
    encoding === 'quotedprintable'
  ) {
    decoded = decodeQuotedPrintable(trimmed);
  }

  return decoded.replace(/\r\n/g, '\n').trim();
}

function decodeQuotedPrintable(input: string): string {
  const joined = input.replace(/=\n/g, '');
  let text = '';

  for (let index = 0; index < joined.length; index += 1) {
    if (
      joined[index] === '=' &&
      index + 2 < joined.length &&
      /[0-9A-Fa-f]{2}/.test(joined.slice(index + 1, index + 3))
    ) {
      text += String.fromCharCode(
        parseInt(joined.slice(index + 1, index + 3), 16),
      );
      index += 2;
      continue;
    }

    text += joined[index];
  }

  return text;
}
