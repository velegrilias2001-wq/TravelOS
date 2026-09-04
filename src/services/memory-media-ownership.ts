export const MEMORY_DIRECTORY_NAME =
  'travelos/memories/';

export const MEMORY_MEDIA_CONTRACT = {
  owner: 'app-document-copy',
  keepsGalleryOriginal: true,
  backup: 'none',
  exportAvailable: false,
  offline: 'local-copy',
  videoAuthoring: false,
} as const;

export function ownedMemoryMediaPrefix(
  documentDirectory: string,
): string {
  const base = documentDirectory.endsWith('/')
    ? documentDirectory
    : `${documentDirectory}/`;

  return `${base}${MEMORY_DIRECTORY_NAME}`;
}

export function isOwnedMemoryMediaUri(
  uri: string | undefined,
  documentDirectory: string | null | undefined,
): boolean {
  if (!uri?.trim() || !documentDirectory?.trim()) {
    return false;
  }

  const prefix = ownedMemoryMediaPrefix(
    documentDirectory,
  );

  if (!uri.startsWith(prefix)) {
    return false;
  }

  const rest = uri.slice(prefix.length);

  return (
    rest.length > 0 &&
    !rest.includes('..') &&
    !rest.includes('/') &&
    !rest.includes('\\')
  );
}

export function collectOwnedMemoryUris(
  uris: readonly (string | undefined)[],
  documentDirectory: string | null | undefined,
): string[] {
  const owned: string[] = [];
  const seen = new Set<string>();

  for (const uri of uris) {
    if (
      !uri ||
      seen.has(uri) ||
      !isOwnedMemoryMediaUri(uri, documentDirectory)
    ) {
      continue;
    }

    seen.add(uri);
    owned.push(uri);
  }

  return owned;
}

export function collectOwnedMemoryUrisFromRecords(
  records: readonly { mediaUri?: string }[],
  documentDirectory: string | null | undefined,
): string[] {
  return collectOwnedMemoryUris(
    records.map((record) => record.mediaUri),
    documentDirectory,
  );
}

export function replacedOwnedMemoryUri(
  previousUri: string | undefined,
  nextUri: string | undefined,
  documentDirectory: string | null | undefined,
): string | undefined {
  if (
    !previousUri ||
    previousUri === nextUri ||
    !isOwnedMemoryMediaUri(
      previousUri,
      documentDirectory,
    )
  ) {
    return undefined;
  }

  return previousUri;
}

export function memoryMediaExportRefusal(): {
  available: false;
  reason: string;
} {
  return {
    available: false,
    reason:
      'TravelOS does not export or back up memory photo files yet. Structured trip JSON export is separate and still omits photo bytes. Copies stay on this device and remain available offline.',
  };
}
