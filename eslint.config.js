import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'node_modules', 'shots', 'test-results', 'deploy'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.ts'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  },
  { files: ['scripts/**/*.mjs'], languageOptions: { globals: globals.node } },
  {
    // the engine stays pure: no UI, storage or browser imports
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['react', 'react-dom', 'dexie', 'zustand', '../storage/*', '../state/*', '../ui/*', '../platform/*'] }
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'indexedDB', 'navigator']
    }
  },
  prettier
);
