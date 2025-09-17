/**
 * Retry Manager Implementation
 * BIP-03 Implementation - Core Infrastructure Phase 1
 *
 * @author Claude-4-Sonnet (Anthropic)
 * @version 1.0.0
 */

import {
  RetryOptions,
  ResilienceError
} from '../types/index.js';

/**
 * Retry manager with exponential backoff and jitter
 */
export class RetryManager {
  constructor(
    private readonly defaultOptions: RetryOptions = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      backoffMultiplier: 2,
      jitter: true,
      retryableErrors: ['ECONNRESET', 'ENOTFOUND', 'TIMEOUT', 'MODEL_UNAVAILABLE'],
    }
  ) {}

  /**
   * Execute function with retry logic
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    options?: Partial<RetryOptions>
  ): Promise<T> {
    const config = { ...this.defaultOptions, ...options };
    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt <= config.maxRetries) {
      try {
        const result = await fn();

        // Log successful execution after retries
        if (attempt > 0) {
          console.log(`Retry successful after ${attempt} attempts`);
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        if (!this.isRetryableError(lastError, config)) {
          throw lastError;
        }

        // Check if we've exhausted retries
        if (attempt >= config.maxRetries) {
          break;
        }

        // Calculate delay and wait
        const delay = this.calculateDelay(attempt, config);
        console.log(`Retry attempt ${attempt + 1}/${config.maxRetries} after ${delay}ms delay`);

        await this.delay(delay);
        attempt++;
      }
    }

    // All retries exhausted
    throw new RetryExhaustedError(
      config.maxRetries,
      lastError || new Error('Unknown error')
    );
  }

  /**
   * Execute function with timeout and retry
   */
  async executeWithTimeoutAndRetry<T>(
    fn: () => Promise<T>,
    timeout: number,
    options?: Partial<RetryOptions>
  ): Promise<T> {
    return this.executeWithRetry(async () => {
      return Promise.race([
        fn(),
        this.createTimeoutPromise<T>(timeout)
      ]);
    }, options);
  }

  /**
   * Create a batch retry executor for multiple operations
   */
  createBatchExecutor<T>(options?: Partial<RetryOptions>) {
    return new BatchRetryExecutor<T>(this, options);
  }

  /**
   * Calculate delay for next retry attempt
   */
  private calculateDelay(attempt: number, options: RetryOptions): number {
    // Calculate exponential backoff
    let delay = options.baseDelay * Math.pow(options.backoffMultiplier, attempt);

    // Apply maximum delay limit
    delay = Math.min(delay, options.maxDelay);

    // Add jitter if enabled
    if (options.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      const jitter = (Math.random() - 0.5) * 2 * jitterAmount;
      delay += jitter;
    }

    return Math.max(0, Math.round(delay));
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error, options: RetryOptions): boolean {
    // Check specific error codes
    if (options.retryableErrors) {
      const errorCode = this.getErrorCode(error);
      if (options.retryableErrors.includes(errorCode)) {
        return true;
      }
    }

    // Check if it's a ResilienceError with recoverable flag
    if (error instanceof ResilienceError) {
      return error.recoverable;
    }

    // Check common network errors
    const networkErrors = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'EHOSTUNREACH',
      'ENETDOWN',
      'ENETUNREACH',
    ];

    const errorCode = this.getErrorCode(error);
    return networkErrors.includes(errorCode);
  }

  /**
   * Extract error code from error
   */
  private getErrorCode(error: Error): string {
    // Check ResilienceError code
    if (error instanceof ResilienceError) {
      return error.code;
    }

    // Check Node.js error codes
    if ('code' in error && typeof error.code === 'string') {
      return error.code;
    }

    // Check error name
    if (error.name) {
      return error.name;
    }

    // Fallback to error message analysis
    const message = error.message.toLowerCase();
    if (message.includes('timeout')) return 'TIMEOUT';
    if (message.includes('network')) return 'NETWORK_ERROR';
    if (message.includes('connection')) return 'CONNECTION_ERROR';
    if (message.includes('unavailable')) return 'MODEL_UNAVAILABLE';

    return 'UNKNOWN_ERROR';
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise<T>(timeout: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new ResilienceError(
          `Operation timed out after ${timeout}ms`,
          'TIMEOUT',
          undefined,
          true
        ));
      }, timeout);
    });
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Batch retry executor for multiple operations
 */
export class BatchRetryExecutor<T> {
  private readonly operations: Array<{
    fn: () => Promise<T>;
    options?: Partial<RetryOptions>;
  }> = [];

  constructor(
    private readonly retryManager: RetryManager,
    private readonly defaultOptions?: Partial<RetryOptions>
  ) {}

  /**
   * Add operation to batch
   */
  add(fn: () => Promise<T>, options?: Partial<RetryOptions>): this {
    this.operations.push({
      fn,
      options: { ...this.defaultOptions, ...options }
    });
    return this;
  }

  /**
   * Execute all operations with retries
   */
  async executeAll(): Promise<T[]> {
    const promises = this.operations.map(({ fn, options }) =>
      this.retryManager.executeWithRetry(fn, options)
    );

    return Promise.all(promises);
  }

  /**
   * Execute all operations, but succeed if any operation succeeds
   */
  async executeAny(): Promise<T> {
    const promises = this.operations.map(({ fn, options }) =>
      this.retryManager.executeWithRetry(fn, options)
    );

    return Promise.any(promises);
  }

  /**
   * Execute all operations with settled results
   */
  async executeAllSettled(): Promise<PromiseSettledResult<T>[]> {
    const promises = this.operations.map(({ fn, options }) =>
      this.retryManager.executeWithRetry(fn, options)
    );

    return Promise.allSettled(promises);
  }

  /**
   * Clear all operations
   */
  clear(): this {
    this.operations.length = 0;
    return this;
  }

  /**
   * Get number of operations
   */
  size(): number {
    return this.operations.length;
  }
}

/**
 * Retry exhausted error
 */
export class RetryExhaustedError extends ResilienceError {
  constructor(
    public readonly maxRetries: number,
    public readonly lastError: Error
  ) {
    super(
      `All ${maxRetries} retry attempts failed. Last error: ${lastError.message}`,
      'RETRY_EXHAUSTED',
      undefined,
      false
    );
    this.name = 'RetryExhaustedError';
    this.cause = lastError;
  }
}

/**
 * Retry statistics for monitoring
 */
export interface RetryStatistics {
  readonly totalAttempts: number;
  readonly successfulAttempts: number;
  readonly failedAttempts: number;
  readonly averageRetries: number;
  readonly maxRetries: number;
  readonly totalDelay: number;
  readonly averageDelay: number;
}

/**
 * Retry statistics collector
 */
export class RetryStatisticsCollector {
  private attempts: Array<{
    retries: number;
    success: boolean;
    totalDelay: number;
    timestamp: Date;
  }> = [];

  /**
   * Record retry attempt
   */
  recordAttempt(retries: number, success: boolean, totalDelay: number): void {
    this.attempts.push({
      retries,
      success,
      totalDelay,
      timestamp: new Date(),
    });

    // Keep only recent attempts (last 1000)
    if (this.attempts.length > 1000) {
      this.attempts = this.attempts.slice(-1000);
    }
  }

  /**
   * Get retry statistics
   */
  getStatistics(): RetryStatistics {
    if (this.attempts.length === 0) {
      return {
        totalAttempts: 0,
        successfulAttempts: 0,
        failedAttempts: 0,
        averageRetries: 0,
        maxRetries: 0,
        totalDelay: 0,
        averageDelay: 0,
      };
    }

    const totalAttempts = this.attempts.length;
    const successfulAttempts = this.attempts.filter(a => a.success).length;
    const failedAttempts = totalAttempts - successfulAttempts;
    const totalRetries = this.attempts.reduce((sum, a) => sum + a.retries, 0);
    const totalDelay = this.attempts.reduce((sum, a) => sum + a.totalDelay, 0);
    const maxRetries = Math.max(...this.attempts.map(a => a.retries));

    return {
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      averageRetries: totalRetries / totalAttempts,
      maxRetries,
      totalDelay,
      averageDelay: totalDelay / totalAttempts,
    };
  }

  /**
   * Reset statistics
   */
  reset(): void {
    this.attempts = [];
  }

  /**
   * Get statistics for a time window
   */
  getStatisticsForWindow(windowMs: number): RetryStatistics {
    const cutoff = new Date(Date.now() - windowMs);
    const windowAttempts = this.attempts.filter(a => a.timestamp >= cutoff);

    if (windowAttempts.length === 0) {
      return {
        totalAttempts: 0,
        successfulAttempts: 0,
        failedAttempts: 0,
        averageRetries: 0,
        maxRetries: 0,
        totalDelay: 0,
        averageDelay: 0,
      };
    }

    const totalAttempts = windowAttempts.length;
    const successfulAttempts = windowAttempts.filter(a => a.success).length;
    const failedAttempts = totalAttempts - successfulAttempts;
    const totalRetries = windowAttempts.reduce((sum, a) => sum + a.retries, 0);
    const totalDelay = windowAttempts.reduce((sum, a) => sum + a.totalDelay, 0);
    const maxRetries = Math.max(...windowAttempts.map(a => a.retries));

    return {
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      averageRetries: totalRetries / totalAttempts,
      maxRetries,
      totalDelay,
      averageDelay: totalDelay / totalAttempts,
    };
  }
}


