export const IMPORT_CALENDAR_MAX_BYTES = 512 * 1024;

export function importCalendarFileLabel(
  name?: string | null,
): string {
  const base =
    (name ?? '')
      .trim()
      .replace(/\\/g, '/')
      .split('/')
      .pop()
      ?.trim() ?? '';

  const cleaned = base
    .replace(/[\u0000-\u001f<>:"|?*]/g, '')
    .trim();

  if (!cleaned) {
    return 'Calendar file';
  }

  return cleaned.slice(0, 80);
}

export function assertImportCalendarFileSize(
  size?: number | null,
): void {
  if (
    typeof size === 'number' &&
    size > IMPORT_CALENDAR_MAX_BYTES
  ) {
    throw new Error(
      'This calendar file is too large to import.',
    );
  }
}

export function prepareImportCalendarFile(input: {
  name?: string | null;
  size?: number | null;
  text: string;
}): {
  text: string;
  sourceLabel: string;
} {
  assertImportCalendarFileSize(input.size);

  if (input.text.length > IMPORT_CALENDAR_MAX_BYTES) {
    throw new Error(
      'This calendar file is too large to import.',
    );
  }

  return {
    text: input.text,
    sourceLabel: importCalendarFileLabel(input.name),
  };
}
