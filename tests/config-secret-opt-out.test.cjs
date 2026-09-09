const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('Expo explicit dotenv opt-out prevents the custom config from accessing env files', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app.config.js'), 'utf8');
  let accesses = 0;
  const sandbox = {
    module: { exports: {} }, __dirname: '/test',
    process: { env: { EXPO_NO_DOTENV: '1', GOOGLE_MAPS_API_KEY: 'non-secret-test-value' } },
    require: name => name === 'path' ? path : {
      existsSync() { accesses++; throw Error('env access'); },
      readFileSync() { accesses++; throw Error('env access'); },
    },
  };
  vm.runInNewContext(source, sandbox);
  const config = sandbox.module.exports({ config: {} });
  assert.ok(config.plugins.length);
  assert.equal(accesses, 0);
});
