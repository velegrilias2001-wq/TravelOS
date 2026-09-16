const fs = require('fs');
const path = require('path');

/**
 * Load uncommitted .env.local into process.env without printing values.
 * Expo/EAS config evaluation does not always load that file automatically.
 */
function loadEnvLocal() {
  // Match Expo CLI's explicit opt-out, including secret-free verification runs.
  if (process.env.EXPO_NO_DOTENV === '1') {
    return;
  }
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

/**
 * Resolve one platform's Maps key.
 *
 * Google Maps restrictions are per-platform: an Android key is restricted to a
 * package name plus signing SHA-1, an iOS key to a bundle identifier. A single
 * key cannot carry both restrictions, so each platform gets its own variable.
 * The legacy shared GOOGLE_MAPS_API_KEY is still accepted so existing local and
 * EAS setups keep building, but it is the weaker configuration.
 */
function resolveMapsKey(platformVariable) {
  return (
    process.env[platformVariable] ??
    process.env.GOOGLE_MAPS_API_KEY
  );
}

module.exports = ({ config }) => {
  const androidGoogleMapsApiKey =
    resolveMapsKey(
      'GOOGLE_MAPS_ANDROID_API_KEY',
    );

  const iosGoogleMapsApiKey =
    resolveMapsKey(
      'GOOGLE_MAPS_IOS_API_KEY',
    );

  if (!androidGoogleMapsApiKey) {
    throw new Error(
      'GOOGLE_MAPS_ANDROID_API_KEY is missing. Add it to .env.local',
    );
  }

  if (!iosGoogleMapsApiKey) {
    throw new Error(
      'GOOGLE_MAPS_IOS_API_KEY is missing. Add it to .env.local',
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
          androidGoogleMapsApiKey,
          iosGoogleMapsApiKey,
        },
      ],
    ],
  };
};
