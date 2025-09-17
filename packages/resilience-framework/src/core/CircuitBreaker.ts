/**
 * Circuit Breaker Implementation
 * BIP-03 Implementation - Core Infrastructure Phase 1
 *
 * @author Claude-4-Sonnet (Anthropic)
 * @version 1.0.0
 */

import {
  CircuitBreakerState,
  CircuitBreakerConfig,
  CircuitBreakerStatus,
  CircuitBreakerError,
  ResilienceError
} from '../types/index.js';

/**
 * Circuit breaker implementation for AI model resilience
 * Prevents cascade failures by temporarily blocking requests to failing models
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date | undefined;
  private nextRetryTime?: Date | undefined;
  private readonly listeners = new Set<CircuitBreakerListener>();

  constructor(
    private readonly modelId: string,
    private readonly config: CircuitBreakerConfig = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      successThreshold: 3,
      timeout: 30000, // 30 seconds
    }
  ) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check circuit breaker state
    await this.checkState();

    if (this.state === 'open') {
      throw new CircuitBreakerError(this.modelId, this.state);
    }

    const startTime = Date.now();
    let result: T;
    let error: Error | undefined;

    try {
      // Execute with timeout
      result = await Promise.race([
        fn(),
        this.createTimeoutPromise<T>()
      ]);

      // Record success
      await this.recordSuccess();
      return result;

    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));

      // Record failure
      await this.recordFailure(error);
      throw error;
    } finally {
      // Notify listeners of execution
      this.notifyExecution({
        modelId: this.modelId,
        success: !error,
        duration: Date.now() - startTime,
        error,
        circuitBreakerState: this.state,
      });
    }
  }

  /**
   * Get current circuit breaker status
   */
  getStatus(): CircuitBreakerStatus {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextRetryTime: this.nextRetryTime,
      successCount: this.successCount,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  async reset(): Promise<void> {
    const previousState = this.state;

    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.nextRetryTime = undefined;

    this.notifyStateChange(previousState, this.state, 'manual_reset');
  }

  /**
   * Manually trip the circuit breaker
   */
  async trip(reason?: string): Promise<void> {
    const previousState = this.state;

    this.state = 'open';
    this.lastFailureTime = new Date();
    this.nextRetryTime = new Date(Date.now() + this.config.recoveryTimeout);

    this.notifyStateChange(previousState, this.state, 'manual_trip', reason);
  }

  /**
   * Add circuit breaker listener
   */
  addListener(listener: CircuitBreakerListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove circuit breaker listener
   */
  removeListener(listener: CircuitBreakerListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Check and update circuit breaker state
   */
  private async checkState(): Promise<void> {
    const now = new Date();

    switch (this.state) {
      case 'open':
        // Check if recovery timeout has passed
        if (this.nextRetryTime && now >= this.nextRetryTime) {
          await this.transitionToHalfOpen();
        }
        break;

      case 'half-open':
        // No state check needed, will be handled by execution results
        break;

      case 'closed':
        // Check if failure threshold has been exceeded
        if (this.failureCount >= this.config.failureThreshold) {
          await this.transitionToOpen();
        }
        break;
    }
  }

  /**
   * Record successful execution
   */
  private async recordSuccess(): Promise<void> {
    this.successCount++;

    if (this.state === 'half-open') {
      // Check if we have enough successes to close the circuit
      if (this.successCount >= this.config.successThreshold) {
        await this.transitionToClosed();
      }
    } else if (this.state === 'closed') {
      // Reset failure count on success
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  /**
   * Record failed execution
   */
  private async recordFailure(_error: Error): Promise<void> {
    this.failureCount++;
    this.lastFailureTime = new Date();
    this.successCount = 0; // Reset success count on failure

    if (this.state === 'half-open') {
      // Any failure in half-open state should open the circuit
      await this.transitionToOpen();
    } else if (this.state === 'closed') {
      // Check if we should open the circuit
      if (this.failureCount >= this.config.failureThreshold) {
        await this.transitionToOpen();
      }
    }
  }

  /**
   * Transition to open state
   */
  private async transitionToOpen(): Promise<void> {
    const previousState = this.state;
    this.state = 'open';
    this.nextRetryTime = new Date(Date.now() + this.config.recoveryTimeout);

    this.notifyStateChange(previousState, this.state, 'failure_threshold_exceeded');
  }

  /**
   * Transition to half-open state
   */
  private async transitionToHalfOpen(): Promise<void> {
    const previousState = this.state;
    this.state = 'half-open';
    this.successCount = 0;
    this.nextRetryTime = undefined;

    this.notifyStateChange(previousState, this.state, 'recovery_timeout_elapsed');
  }

  /**
   * Transition to closed state
   */
  private async transitionToClosed(): Promise<void> {
    const previousState = this.state;
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.nextRetryTime = undefined;

    this.notifyStateChange(previousState, this.state, 'recovery_successful');
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise<T>(): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new ResilienceError(
          `Circuit breaker timeout for model ${this.modelId}`,
          'CIRCUIT_BREAKER_TIMEOUT',
          this.modelId,
          true
        ));
      }, this.config.timeout);
    });
  }

  /**
   * Notify listeners of state changes
   */
  private notifyStateChange(
    from: CircuitBreakerState,
    to: CircuitBreakerState,
    trigger: string,
    reason?: string
  ): void {
    const event: CircuitBreakerStateChangeEvent = {
      modelId: this.modelId,
      from,
      to,
      trigger,
      reason,
      timestamp: new Date(),
      status: this.getStatus(),
    };

    for (const listener of this.listeners) {
      try {
        listener.onStateChange?.(event);
      } catch (error) {
        console.error('Error notifying circuit breaker state change:', error);
      }
    }
  }

  /**
   * Notify listeners of executions
   */
  private notifyExecution(event: CircuitBreakerExecutionEvent): void {
    for (const listener of this.listeners) {
      try {
        listener.onExecution?.(event);
      } catch (error) {
        console.error('Error notifying circuit breaker execution:', error);
      }
    }
  }
}

/**
 * Circuit breaker event listener interface
 */
export interface CircuitBreakerListener {
  onStateChange?(event: CircuitBreakerStateChangeEvent): void;
  onExecution?(event: CircuitBreakerExecutionEvent): void;
}

/**
 * Circuit breaker state change event
 */
export interface CircuitBreakerStateChangeEvent {
  readonly modelId: string;
  readonly from: CircuitBreakerState;
  readonly to: CircuitBreakerState;
  readonly trigger: string;
  readonly reason?: string | undefined;
  readonly timestamp: Date;
  readonly status: CircuitBreakerStatus;
}

/**
 * Circuit breaker execution event
 */
export interface CircuitBreakerExecutionEvent {
  readonly modelId: string;
  readonly success: boolean;
  readonly duration: number;
  readonly error?: Error | undefined;
  readonly circuitBreakerState: CircuitBreakerState;
}

/**
 * Circuit breaker factory for creating configured instances
 */
export class CircuitBreakerFactory {
  private static readonly instances = new Map<string, CircuitBreaker>();

  /**
   * Get or create circuit breaker for a model
   */
  static getOrCreate(modelId: string, config?: CircuitBreakerConfig): CircuitBreaker {
    let circuitBreaker = this.instances.get(modelId);

    if (!circuitBreaker) {
      circuitBreaker = new CircuitBreaker(modelId, config);
      this.instances.set(modelId, circuitBreaker);
    }

    return circuitBreaker;
  }

  /**
   * Remove circuit breaker for a model
   */
  static remove(modelId: string): boolean {
    return this.instances.delete(modelId);
  }

  /**
   * Get all circuit breakers
   */
  static getAll(): Map<string, CircuitBreaker> {
    return new Map(this.instances);
  }

  /**
   * Reset all circuit breakers
   */
  static async resetAll(): Promise<void> {
    const promises = Array.from(this.instances.values()).map(cb => cb.reset());
    await Promise.all(promises);
  }

  /**
   * Get status of all circuit breakers
   */
  static getAllStatus(): Record<string, CircuitBreakerStatus> {
    const status: Record<string, CircuitBreakerStatus> = {};
    for (const [modelId, circuitBreaker] of this.instances) {
      status[modelId] = circuitBreaker.getStatus();
    }
    return status;
  }
}
