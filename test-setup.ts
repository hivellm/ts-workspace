/**
 * @fileoverview Global test setup for Vitest
 * @author CMMV-Hive Team
 */

import { vi } from 'vitest';

// Mock console methods for cleaner test output
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Global test utilities
global.testUtils = {
  // Helper to create mock dates
  createMockDate: (dateString: string): Date => new Date(dateString),

  // Helper to create test timeouts
  delay: (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper for async testing
  waitFor: async (condition: () => boolean, timeout = 5000): Promise<void> => {
    const start = Date.now();
    while (!condition() && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (!condition()) {
      throw new Error(`Condition not met within ${timeout}ms`);
    }
  },
};

// Mock crypto for consistent testing
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: vi.fn((arr: Uint8Array) => {
      // Use deterministic values for testing
      for (let i = 0; i < arr.length; i++) {
        arr[i] = (i * 17 + 42) % 256;
      }
      return arr;
    }),
    randomUUID: vi.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
    subtle: {
      digest: vi.fn(async (algorithm: string, data: ArrayBuffer) => {
        // Mock hash function for testing
        const hash = new Uint8Array(32);
        const view = new Uint8Array(data);
        for (let i = 0; i < hash.length; i++) {
          hash[i] = (view[i % view.length] + i) % 256;
        }
        return hash.buffer;
      }),
    },
  },
});

// Environment variables for testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Increase timeout for async operations
vi.setConfig({ testTimeout: 10000 });

// Global beforeEach hook
beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();

  // Reset mock timers if used
  vi.clearAllTimers();
});

// Global afterEach hook
afterEach(() => {
  // Clean up any pending async operations
  vi.clearAllTimers();
});

// Type declarations for global test utilities
declare global {
  interface GlobalTestUtils {
    createMockDate: (dateString: string) => Date;
    delay: (ms: number) => Promise<void>;
    waitFor: (condition: () => boolean, timeout?: number) => Promise<void>;
  }

  var testUtils: GlobalTestUtils;
}
