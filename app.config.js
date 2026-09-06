const fs = require('fs');
const path = require('path');

/**
 * Load uncommitted .env.local into process.env without printing values.
 * Expo/EAS config evaluation does not always load that file automatically.
 */
function loadEnvLocal() {
  const envPath = path.join(__dirname, '.env.local');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const text = fs.readFileSync(envPath, 'utf8');

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = trimmed.match(
      /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/,
    );

    if (!match) {
      continue;
    }

    const key = match[1];
    let value = match[2].trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

module.exports = ({ config }) => {
  const googleMapsApiKey =
    process.env.GOOGLE_MAPS_API_KEY;

  if (!googleMapsApiKey) {
    throw new Error(
      'GOOGLE_MAPS_API_KEY is missing. Add it to .env.local',
    );
  }

  return {
    ...config,

    plugins: [
      ...(config.plugins ?? []),
      'expo-sharing',
      [
        'expo-image-picker',
        {
          photosPermission:
            'TravelOS uses your photo library only when you add a Memory photo.',
          cameraPermission:
            'TravelOS uses the camera only when you capture a Memory photo.',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/images/icon.png',
          color: '#1F4B45',
          defaultChannel: 'trip-reminders',
        },
      ],
      [
        'react-native-maps',
        {
          androidGoogleMapsApiKey:
            googleMapsApiKey,
          iosGoogleMapsApiKey:
            googleMapsApiKey,
        },
      ],
    ],
  };
};
