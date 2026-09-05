import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import {
  assertImportCalendarFileSize,
  importCalendarFileLabel,
  prepareImportCalendarFile,
} from './import-calendar-file';
import { bytesFromBase64 } from './import-calendar-extract';
import { decodePickedImportCalendarBytes } from './import-calendar-zip';
import { extractDocumentTextFromBytes } from './import-document-text';

export type PickedImportMaterial =
  | {
      mode: 'ics';
      text: string;
      sourceLabel: string;
    }
  | {
      mode: 'seed';
      text: string;
      sourceLabel: string;
    };

/**
 * Pick a calendar (ICS-embedded) or a prose document for seed review.
 */
export async function pickImportMaterialFile(): Promise<PickedImportMaterial | null> {
  let result: DocumentPicker.DocumentPickerResult;

  try {
    result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });
  } catch {
    throw new Error(
      'This development build cannot open the file picker yet. Paste notes or an .ics calendar instead.',
    );
  }

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  assertImportCalendarFileSize(asset.size);

  const base64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = bytesFromBase64(base64);
  const sourceLabel = importCalendarFileLabel(asset.name);

  try {
    const text = decodePickedImportCalendarBytes(bytes);
    return {
      mode: 'ics',
      ...prepareImportCalendarFile({
        name: asset.name,
        size: asset.size,
        text,
      }),
    };
  } catch (calendarError) {
    try {
      const text = extractDocumentTextFromBytes(bytes);
      return {
        mode: 'seed',
        text,
        sourceLabel,
      };
    } catch {
      if (
        calendarError instanceof Error &&
        isImportPickerError(calendarError)
      ) {
        throw calendarError;
      }

      throw new Error(
        'This file could not be read as a calendar or trip notes.',
      );
    }
  }
}

/** @deprecated Prefer pickImportMaterialFile */
export async function pickImportCalendarFile(): Promise<{
  text: string;
  sourceLabel: string;
} | null> {
  const picked = await pickImportMaterialFile();
  if (!picked) {
    return null;
  }

  if (picked.mode !== 'ics') {
    throw new Error(
      'This file is trip notes, not an iCalendar. Use Seed from notes.',
    );
  }

  return {
    text: picked.text,
    sourceLabel: picked.sourceLabel,
  };
}

function isImportPickerError(error: Error): boolean {
  return (
    error.message ===
      'This calendar file is too large to import.' ||
    /iCalendar|This zip|This PDF|This Office|This image|from images|No calendar events|readable text|trip notes/i.test(
      error.message,
    )
  );
}
