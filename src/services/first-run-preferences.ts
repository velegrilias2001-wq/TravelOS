import * as FileSystem from 'expo-file-system/legacy';

type FirstRunPreferences = {
  completed: boolean;
  updatedAt: string;
};

const FILE_NAME = 'first-run-preferences.json';

function preferencesPath(): string | null {
  if (!FileSystem.documentDirectory) {
    return null;
  }

  return `${FileSystem.documentDirectory}travelos/${FILE_NAME}`;
}

export async function loadFirstRunCompleted(): Promise<boolean> {
  const path = preferencesPath();

  if (!path) {
    return false;
  }

  try {
    const info = await FileSystem.getInfoAsync(path);

    if (!info.exists) {
      return false;
    }

    const raw = await FileSystem.readAsStringAsync(path, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const parsed = JSON.parse(raw) as FirstRunPreferences;
    return parsed.completed === true;
  } catch {
    return false;
  }
}

export async function markFirstRunCompleted(): Promise<void> {
  const path = preferencesPath();

  if (!path || !FileSystem.documentDirectory) {
    return;
  }

  const directory = `${FileSystem.documentDirectory}travelos/`;
  await FileSystem.makeDirectoryAsync(directory, {
    intermediates: true,
  });

  const payload: FirstRunPreferences = {
    completed: true,
    updatedAt: new Date().toISOString(),
  };

  await FileSystem.writeAsStringAsync(
    path,
    `${JSON.stringify(payload, null, 2)}\n`,
    { encoding: FileSystem.EncodingType.UTF8 },
  );
}
