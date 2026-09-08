import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';

import { travelOSDatabase } from '@/data/database/expo-sqlite-database';
import { collectLocalDataExportSnapshotFromDatabase } from '@/data/repositories/local-data-export-persistence';
import {
  buildLocalDataExportDocument,
  serializeLocalDataExport,
  type LocalDataExportDocument,
  type LocalDataExportSnapshot,
} from '@/services/local-data-export';

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
  if (!FileSystem.documentDirectory) {
    throw new Error(
      'Persistent app storage is unavailable.',
    );
  }

  const directory = `${FileSystem.documentDirectory}travelos/exports/`;
  await FileSystem.makeDirectoryAsync(directory, {
    intermediates: true,
  });

  const stamp = document.exportedAt
    .replace(/[:.]/g, '-')
    .replace(/Z$/, 'Z');
  const path = `${directory}travelos-export-${stamp}.json`;
  await FileSystem.writeAsStringAsync(
    path,
    serializeLocalDataExport(document),
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
