import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test-setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['packages/**/*.ts', 'apps/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.config.ts',
        '**/index.ts', // Usually just re-exports
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // Higher thresholds for critical packages
        'packages/crypto-utils/**': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
        'packages/governance-core/**': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
    reporters: ['verbose', 'json', 'html'],
    outputFile: {
      json: './test-results.json',
      html: './test-results.html',
    },
    testTimeout: 10000, // 10 seconds
    hookTimeout: 10000, // 10 seconds
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1,
      },
    },
  },
  resolve: {
    alias: {
      '@cmmv-hive/shared-types': resolve(__dirname, './packages/shared-types/src'),
      '@cmmv-hive/crypto-utils': resolve(__dirname, './packages/crypto-utils/src'),
      '@cmmv-hive/governance-core': resolve(__dirname, './packages/governance-core/src'),
      '@cmmv-hive/ui-components': resolve(__dirname, './packages/ui-components/src'),
      '@cmmv-hive/testing-utils': resolve(__dirname, './packages/testing-utils/src'),
    },
  },
  esbuild: {
    target: 'node18',
  },
});

