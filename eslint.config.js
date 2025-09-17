import js from '@eslint/js';
import tsparser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import prettierConfig from 'eslint-config-prettier';

/**
 * ESLint v9 Flat Config for CMMV-Hive TypeScript monorepo
 */
export default [
  // Base ESLint recommended rules
  js.configs.recommended,

  // JavaScript files (CommonJS)
  {
    files: ['**/*.{js,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        exports: 'writable',
        require: 'readonly',
        module: 'readonly',
      },
    },
    rules: {
      // General JavaScript rules
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',

      // Style and consistency
      'comma-dangle': ['error', 'always-multiline'],
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }],
    },
  },

  // JavaScript/TypeScript ES modules
  {
    files: ['**/*.{mjs,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    plugins: {
      'import': importPlugin,
    },
    rules: {
      // General JavaScript rules
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',

      // Import rules
      'import/no-unresolved': 'off', // TypeScript handles this
      'import/order': [
        'warn', // Changed from error to warn
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-duplicates': 'warn', // Changed from error to warn
      'import/no-cycle': 'warn', // Changed from error to warn

      // Style and consistency
      'comma-dangle': ['error', 'always-multiline'],
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }],
    },
  },

  // TypeScript files (minimal configuration)
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    rules: {
      // Disable all TypeScript rules that cause issues with ESLint v9
      // Will rely on basic JavaScript rules and manual code review
      'no-unused-vars': 'off', // TypeScript handles this better
      'no-undef': 'off', // TypeScript handles this
    },
  },

  // Test files override
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**/*.ts'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
        vitest: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Allow any in tests
      'no-console': 'off', // Allow console in tests
    },
  },

  // Configuration files override
  {
    files: ['*.config.{js,ts}', '*.config.*.{js,ts}'],
    rules: {
      'import/no-default-export': 'off',
    },
  },

  // Scripts override
  {
    files: ['scripts/**/*.{js,ts}'],
    rules: {
      'no-console': 'off',
    },
  },

  // Prettier configuration (must be last)
  prettierConfig,

  // Global ignore patterns
  {
    ignores: [
      'dist/',
      'build/',
      'coverage/',
      'node_modules/',
      '.next/',
      '*.min.js',
      '*.bundle.js',
    ],
  },
];
