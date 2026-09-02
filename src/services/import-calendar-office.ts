export const IMPORT_CALENDAR_OFFICE_EMPTY_ERROR =
  'This Office document does not contain an iCalendar (.ics) calendar.';

export const IMPORT_CALENDAR_IMAGE_ERROR =
  'Import does not extract calendars from images.';

export function isImageBytes(bytes: Uint8Array): boolean {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return true;
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return true;
  }

  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return true;
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return true;
  }

  return false;
}

export function isOfficeOpenXmlPackage(names: string[]): boolean {
  return names.some((name) => {
    const normalized = name.replace(/\\/g, '/').toLowerCase();

    return (
      normalized === '[content_types].xml' ||
      normalized.startsWith('word/') ||
      normalized.startsWith('xl/') ||
      normalized.startsWith('ppt/')
    );
  });
}

export function isPreferredOfficeMember(name: string): boolean {
  const normalized = name.replace(/\\/g, '/').toLowerCase();

  return (
    normalized === 'word/document.xml' ||
    normalized === 'xl/sharedstrings.xml' ||
    normalized.startsWith('xl/worksheets/') ||
    normalized.startsWith('ppt/slides/') ||
    normalized.endsWith('.ics') ||
    normalized.endsWith('.eml')
  );
}

export function looksLikeXml(text: string): boolean {
  const trimmed = text.trimStart();

  return trimmed.startsWith('<?xml') || trimmed.startsWith('<');
}

export function xmlVisibleText(xml: string): string {
  return xml
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#10;/g, '\n')
    .replace(/&#13;/g, '\r')
    .replace(/&amp;/g, '&')
    .trim();
}
