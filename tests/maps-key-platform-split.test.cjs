const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '../app.config.js'),
  'utf8',
);

/**
 * Evaluate app.config.js with an explicit env, never touching real env files.
 * All key values here are non-secret test placeholders.
 */
function evaluateConfig(env, options = {}) {
  // allowDotenvLookup models a developer machine with no .env.local: the config
  // is allowed to look, finds nothing, and must then fail closed.
  const { allowDotenvLookup = false } = options;
  const baseEnv = allowDotenvLookup ? {} : { EXPO_NO_DOTENV: '1' };

  const sandbox = {
    module: { exports: {} },
    __dirname: '/test',
    process: { env: { ...baseEnv, ...env } },
    require: name =>
      name === 'path'
        ? path
        : {
            existsSync() {
              if (allowDotenvLookup) return false;
              throw Error('env access');
            },
            readFileSync() {
              throw Error('env access');
            },
          },
  };

  vm.runInNewContext(source, sandbox);

  return sandbox.module.exports({ config: {} });
}

function readMapsPlugin(config) {
  const entry = config.plugins.find(
    plugin =>
      Array.isArray(plugin) && plugin[0] === 'react-native-maps',
  );

  assert.ok(entry, 'react-native-maps plugin is configured');

  return entry[1];
}

test('each platform receives its own restricted Maps key', () => {
  const maps = readMapsPlugin(
    evaluateConfig({
      GOOGLE_MAPS_ANDROID_API_KEY: 'android-test-value',
      GOOGLE_MAPS_IOS_API_KEY: 'ios-test-value',
    }),
  );

  assert.equal(maps.androidGoogleMapsApiKey, 'android-test-value');
  assert.equal(maps.iosGoogleMapsApiKey, 'ios-test-value');
});

test('the legacy shared key still configures both platforms', () => {
  const maps = readMapsPlugin(
    evaluateConfig({ GOOGLE_MAPS_API_KEY: 'legacy-test-value' }),
  );

  assert.equal(maps.androidGoogleMapsApiKey, 'legacy-test-value');
  assert.equal(maps.iosGoogleMapsApiKey, 'legacy-test-value');
});

test('a platform key overrides the legacy shared key for that platform only', () => {
  const maps = readMapsPlugin(
    evaluateConfig({
      GOOGLE_MAPS_API_KEY: 'legacy-test-value',
      GOOGLE_MAPS_IOS_API_KEY: 'ios-test-value',
    }),
  );

  assert.equal(maps.androidGoogleMapsApiKey, 'legacy-test-value');
  assert.equal(maps.iosGoogleMapsApiKey, 'ios-test-value');
});

test('a local run with no .env.local fails closed instead of shipping an unconfigured map', () => {
  assert.throws(
    () => evaluateConfig({}, { allowDotenvLookup: true }),
    /GOOGLE_MAPS_ANDROID_API_KEY is missing/,
  );
});

test('metadata-only evaluation does not throw, so EAS env commands can run', () => {
  // eas env:set evaluates this config with EXPO_NO_DOTENV=1 and before any EAS
  // variables are injected. Throwing there deadlocked the command.
  const maps = readMapsPlugin(
    evaluateConfig({ EXPO_NO_DOTENV: '1' }),
  );

  assert.ok(maps.androidGoogleMapsApiKey);
  assert.ok(maps.iosGoogleMapsApiKey);
});

test('a real EAS build still fails closed when a key is missing', () => {
  assert.throws(
    () => evaluateConfig({ EXPO_NO_DOTENV: '1', EAS_BUILD: 'true' }),
    /GOOGLE_MAPS_ANDROID_API_KEY is missing/,
  );
});

test('a real EAS build accepts the keys it is given', () => {
  const maps = readMapsPlugin(
    evaluateConfig({
      EXPO_NO_DOTENV: '1',
      EAS_BUILD: 'true',
      GOOGLE_MAPS_ANDROID_API_KEY: 'android-test-value',
      GOOGLE_MAPS_IOS_API_KEY: 'ios-test-value',
    }),
  );

  assert.equal(maps.androidGoogleMapsApiKey, 'android-test-value');
  assert.equal(maps.iosGoogleMapsApiKey, 'ios-test-value');
});

test('the metadata placeholder never stands in for a build key', () => {
  const metadata = readMapsPlugin(
    evaluateConfig({ EXPO_NO_DOTENV: '1' }),
  );
  const build = readMapsPlugin(
    evaluateConfig({
      EXPO_NO_DOTENV: '1',
      EAS_BUILD: 'true',
      GOOGLE_MAPS_ANDROID_API_KEY: 'android-test-value',
      GOOGLE_MAPS_IOS_API_KEY: 'ios-test-value',
    }),
  );

  assert.notEqual(build.androidGoogleMapsApiKey, metadata.androidGoogleMapsApiKey);
});
