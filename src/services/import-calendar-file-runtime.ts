import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import {
  assertImportCalendarFileSize,
  prepareImportCalendarFile,
} from './import-calendar-file';
import { bytesFromBase64 } from './import-calendar-extract';
import { decodePickedImportCalendarBytes } from './import-calendar-zip';

export async function pickImportCalendarFile(): Promise<{
  text: string;
  sourceLabel: string;
} | null> {
  let result: DocumentPicker.DocumentPickerResult;

  try {
    result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });
  } catch {
    throw new Error(
      'This development build cannot open the file picker yet. Paste an .ics calendar instead.',
    );
  }

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];

  try {
    assertImportCalendarFileSize(asset.size);

    const base64 = await FileSystem.readAsStringAsync(
      asset.uri,
      {
        encoding: FileSystem.EncodingType.Base64,
      },
    );
    const text = decodePickedImportCalendarBytes(
      bytesFromBase64(base64),
    );

    return prepareImportCalendarFile({
      name: asset.name,
      size: asset.size,
      text,
    });
  } catch (caught) {
    if (caught instanceof Error && isImportPickerError(caught)) {
      throw caught;
    }

    throw new Error(
      'This calendar file could not be read.',
    );
  }
}

function isImportPickerError(error: Error): boolean {
  return (
    error.message === 'This calendar file is too large to import.' ||
    /iCalendar|This zip|This PDF|This Office|from images|No calendar events/i.test(
      error.message,
    )
  );
}
