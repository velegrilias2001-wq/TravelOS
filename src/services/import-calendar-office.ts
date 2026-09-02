export const IMPORT_CALENDAR_OFFICE_EMPTY_ERROR =
  'This Office document does not contain an iCalendar (.ics) calendar.';

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
