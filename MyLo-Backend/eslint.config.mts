import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs ,ts,mts,cts}'],
    languageOptions: { globals: globals.browser },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'warn',
      eqeqeq: 'error',
      curly: 'error',
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'arrow-body-style': ['error', 'as-needed'],
      'no-multi-spaces': 'error',
      'comma-dangle': ['error', 'always-multiline'],
      'no-debugger': 'error',
    },
  },
  {
    files: ['**/*.{ts,mts,cts}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'warn',
      eqeqeq: 'error',
      curly: 'error',
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'arrow-body-style': ['error', 'as-needed'],
      'no-multi-spaces': 'error',
      'comma-dangle': ['error', 'always-multiline'],
      'no-debugger': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    ignores: ['./src/database/migrations', './src/database/seeders', './.history'],
  },
);
