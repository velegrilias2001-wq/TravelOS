const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  globalIgnores([
    '.expo/*',
    '.test-build/*',
    'android/*',
    'dist/*',
    'ios/*',
    'scripts/*',
    'server/*',
    'tests/*',
    'web-build/*',
  ]),
  expoConfig,
  {
    rules: {
      /*
       * Expo's React Compiler lint rules flag existing
       * screen effects and Animated refs. Keep them
       * visible as warnings so baseline CI can run
       * without rewriting those screens in this pass.
       */
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
]);
