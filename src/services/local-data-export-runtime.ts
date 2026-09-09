import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';

import { travelOSDatabase } from '@/data/database/expo-sqlite-database';
import { collectLocalDataExportSnapshotFromDatabase } from '@/data/repositories/local-data-export-persistence';
import {
  buildLocalDataExportDocument,
  type LocalDataExportDocument,
  type LocalDataExportSnapshot,
} from '@/services/local-data-export';
import { prepareLocalDataBackupText } from '@/services/local-data-backup-file';

export function resolveTravelOSAppVersion(): string {
  return (
    Constants.expoConfig?.version ??
    Constants.nativeAppVersion ??
    '1.0.0'
  );
}

export async function collectLocalDataExportSnapshot(): Promise<LocalDataExportSnapshot> {
  return collectLocalDataExportSnapshotFromDatabase(travelOSDatabase);
}

export async function writeLocalDataExportFile(
  document: LocalDataExportDocument,
): Promise<string> {
  const text = prepareLocalDataBackupText(document);
  if (!FileSystem.documentDirectory) {
    throw new Error(
      'Persistent app storage is unavailable.',
    );
  }

  const directory = `${FileSystem.documentDirectory}travelos/exports/`;
  await FileSystem.makeDirectoryAsync(directory, {
    intermediates: true,
  });

  // The filename is generated locally, never derived from imported metadata.
  const stamp = new Date().toISOString()
    .replace(/[:.]/g, '-')
    .replace(/Z$/, 'Z');
  const path = `${directory}travelos-export-${stamp}.json`;
  await FileSystem.writeAsStringAsync(
    path,
    text,
    { encoding: FileSystem.EncodingType.UTF8 },
  );

  return path;
}

export async function createLocalDataExportFile(): Promise<{
  path: string;
  document: LocalDataExportDocument;
}> {
  const snapshot = await collectLocalDataExportSnapshot();
  const document = buildLocalDataExportDocument({
    ...snapshot,
    appVersion: resolveTravelOSAppVersion(),
  });
  const path = await writeLocalDataExportFile(document);
  return { path, document };
}
