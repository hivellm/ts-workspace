/**
 * @fileoverview Async testing helpers
 * @author CMMV-Hive Team
 */

/**
 * Wait for a condition to be true with timeout
 */
export const waitFor = async (
  condition: () => boolean | Promise<boolean>,
  timeout = 5000
): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await delay(50);
  }
  throw new Error(`Condition not met within ${timeout}ms`);
};

/**
 * Simple delay function
 */
export const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create a timeout promise
 */
export const timeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
