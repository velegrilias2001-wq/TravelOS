import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { travelOSDatabase } from '@/data/database/expo-sqlite-database';
import { replaceLocalDataFromExport } from '@/data/repositories/local-data-restore-persistence';
import type { LocalDataExportDocument } from '@/services/local-data-export';
import {
  LocalDataRestoreError,
  parseLocalDataExportDocument,
  summarizeLocalDataExport,
  type LocalDataRestoreSummary,
} from '@/services/local-data-restore';
import { useTripStore } from '@/store/trip-store';

const MAX_RESTORE_BYTES = 8 * 1024 * 1024;

export async function pickLocalDataExportDocument(): Promise<{
  document: LocalDataExportDocument;
  summary: LocalDataRestoreSummary;
  sourceLabel: string;
} | null> {
  let result: DocumentPicker.DocumentPickerResult;

  try {
    result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ['application/json', 'text/plain', '*/*'],
    });
  } catch {
    throw new Error(
      'This development build cannot open the file picker yet.',
    );
  }

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];

  if (
    typeof asset.size === 'number' &&
    asset.size > MAX_RESTORE_BYTES
  ) {
    throw new Error(
      'This backup file is too large to restore.',
    );
  }

  const text = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new LocalDataRestoreError(
      'invalid_document',
      'This file is not valid JSON.',
    );
  }

  const document = parseLocalDataExportDocument(parsed);

  return {
    document,
    summary: summarizeLocalDataExport(document),
    sourceLabel: asset.name || 'TravelOS backup',
  };
}

export async function restoreLocalDataExportDocument(
  document: LocalDataExportDocument,
): Promise<LocalDataRestoreSummary> {
  await replaceLocalDataFromExport(
    travelOSDatabase,
    document,
  );
  await useTripStore.getState().loadTrips();
  return summarizeLocalDataExport(document);
}
