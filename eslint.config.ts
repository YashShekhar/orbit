import js from '@eslint/js';
import css from '@eslint/css';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import unusedImports from 'eslint-plugin-unused-imports';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['node_modules/**', 'dist/**', 'data/**', 'artifacts/**', 'coverage/**', 'test-results/**', '.husky/_/**'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: { ...globals.node, ...globals.browser }, parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    plugins: { 'unused-imports': unusedImports },
    rules: {
      'unused-imports/no-unused-imports': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-duplicate-imports': ['error', { allowSeparateTypeImports: true }],
      eqeqeq: ['error', 'always'],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'no-restricted-imports': ['error', { patterns: [{ group: ['**/server/**', 'node:*'], message: 'Browser code must use the HTTP API and shared contracts.' }] }],
    },
  },
  { files: ['server/**/*.ts'], rules: { 'no-restricted-imports': ['error', { patterns: [{ group: ['**/src/**'], message: 'The server must not import UI code.' }] }] } },
  { files: ['shared/**/*.ts'], rules: { 'no-restricted-imports': ['error', { patterns: [{ group: ['**/server/**', '**/src/**'], message: 'Shared contracts must remain independent of both applications.' }] }] } },
  { files: ['src/**/*.css'], plugins: { css }, language: 'css/css', rules: css.configs.recommended.rules },
  prettier,
);
