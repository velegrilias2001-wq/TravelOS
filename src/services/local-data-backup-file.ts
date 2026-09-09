import { serializeLocalDataExport, type LocalDataExportDocument } from './local-data-export';
import { assertRestoreTextSize, parseLocalDataExportDocument } from './local-data-restore';

/** Validate the exact bytes that will be written, including JSON whitespace.
 * Keep this before filesystem writes so rejection never leaves a partial backup.
 */
export function prepareLocalDataBackupText(document: LocalDataExportDocument): string {
  const text = serializeLocalDataExport(document);
  assertRestoreTextSize(text);
  parseLocalDataExportDocument(JSON.parse(text));
  return text;
}
