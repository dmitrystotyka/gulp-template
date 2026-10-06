import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

// Prettier is NOT run as an ESLint rule: formatting is checked by
// `pnpm format:check` (and fixed by lint-staged) — one tool per job keeps
// `pnpm lint` fast and the error output readable.
export default [
  js.configs.recommended,
  prettierConfig,
  {
    rules: {
      'no-unused-vars': 'warn',
      'no-var': 'error',
      'prefer-const': 'warn',
      'prefer-template': 'warn',
      'prefer-arrow-callback': 'warn',
      'object-shorthand': 'warn',
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
  // Browser scripts
  {
    files: ['src/scripts/**/*.js'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  // Node / Gulp scripts
  {
    files: ['gulpfile.js', 'gulp/**/*.js', 'project.config.js', '.template/**/*.js', 'scripts/**/*.{js,mjs}'],
    languageOptions: {
      globals: {
        ...globals.node,
        app: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', '*.min.js'],
  },
];
