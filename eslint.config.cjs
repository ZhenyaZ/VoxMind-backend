const js = require('@eslint/js');
const prettier = require('eslint-config-prettier');
const typescript = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const unusedImports = require('eslint-plugin-unused-imports');
const prettierPlugin = require('eslint-plugin-prettier');

module.exports = [
  js.configs.recommended,
  prettier,

  {
    files: ['**/*.{ts,js}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    ignores: ['dist/', 'node_modules/', '.e2e-spec.ts'],
    plugins: {
      '@typescript-eslint': typescript,
      'unused-imports': unusedImports,
      prettier: prettierPlugin,
      'simple-import-sort': require('eslint-plugin-simple-import-sort'),
    },
    rules: {
      'prettier/prettier': 'error',
      'eslint-disable-next-line prettier/prettier': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'no-undef': 'off',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
];
