import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import {
  assertImportCalendarFileSize,
  prepareImportCalendarFile,
} from './import-calendar-file';

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

    const text = await FileSystem.readAsStringAsync(
      asset.uri,
      {
        encoding: FileSystem.EncodingType.UTF8,
      },
    );

    return prepareImportCalendarFile({
      name: asset.name,
      size: asset.size,
      text,
    });
  } catch (caught) {
    if (
      caught instanceof Error &&
      caught.message ===
        'This calendar file is too large to import.'
    ) {
      throw caught;
    }

    throw new Error(
      'This calendar file could not be read.',
    );
  }
}
