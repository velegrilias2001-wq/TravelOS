import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';

export interface MemoryImageSource {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

const MEMORY_DIRECTORY_NAME =
  'travelos/memories/';

function documentDirectory(): string {
  if (!FileSystem.documentDirectory) {
    throw new Error(
      'Persistent app storage is unavailable.',
    );
  }

  return FileSystem.documentDirectory;
}

function memoryDirectory(): string {
  return (
    documentDirectory() +
    MEMORY_DIRECTORY_NAME
  );
}

function extensionFromMimeType(
  mimeType?: string | null,
): string | null {
  switch (
    mimeType
      ?.trim()
      .toLowerCase()
  ) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
      return 'heic';
    case 'image/heif':
      return 'heif';
    case 'image/avif':
      return 'avif';
    default:
      return null;
  }
}

function extensionFromName(
  value?: string | null,
): string | null {
  if (!value) {
    return null;
  }

  const clean =
    value
      .split('?')[0]
      .split('#')[0];

  const lastDot =
    clean.lastIndexOf('.');

  if (
    lastDot < 0 ||
    lastDot ===
      clean.length - 1
  ) {
    return null;
  }

  const candidate =
    clean
      .slice(lastDot + 1)
      .toLowerCase()
      .replace(
        /[^a-z0-9]/g,
        '',
      );

  if (
    !candidate ||
    candidate.length > 6
  ) {
    return null;
  }

  return candidate;
}

function imageExtension(
  source: MemoryImageSource,
): string {
  return (
    extensionFromMimeType(
      source.mimeType,
    ) ??
    extensionFromName(
      source.fileName,
    ) ??
    extensionFromName(
      source.uri,
    ) ??
    'jpg'
  );
}

async function ensureMemoryDirectory():
  Promise<string> {
  const directory =
    memoryDirectory();

  await FileSystem.makeDirectoryAsync(
    directory,
    {
      intermediates: true,
    },
  );

  return directory;
}

export async function persistMemoryImage(
  source: MemoryImageSource,
): Promise<string> {
  if (!source.uri.trim()) {
    throw new Error(
      'The selected photo is unavailable.',
    );
  }

  const directory =
    await ensureMemoryDirectory();

  const destination =
    `${directory}${Crypto.randomUUID()}.${imageExtension(source)}`;

  await FileSystem.copyAsync({
    from: source.uri,
    to: destination,
  });

  return destination;
}

export function isManagedMemoryMedia(
  uri?: string,
): boolean {
  if (
    !uri ||
    !FileSystem.documentDirectory
  ) {
    return false;
  }

  return uri.startsWith(
    memoryDirectory(),
  );
}

export async function deleteManagedMemoryMedia(
  uri?: string,
): Promise<void> {
  if (
    !uri ||
    !isManagedMemoryMedia(uri)
  ) {
    return;
  }

  await FileSystem.deleteAsync(
    uri,
    {
      idempotent: true,
    },
  );
}
