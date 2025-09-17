/**
 * Circuit Breaker Tests
 * BIP-03 Implementation - Core Infrastructure Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreaker, CircuitBreakerFactory } from '../../src/core/CircuitBreaker.js';
import { CircuitBreakerError, ResilienceError } from '../../src/types/index.js';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  const modelId = 'test-model';

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker(modelId, {
      failureThreshold: 3,
      recoveryTimeout: 1000, // 1 second for testing
      successThreshold: 2,
      timeout: 500,
    });
  });

  describe('initial state', () => {
    it('should start in closed state', () => {
      const status = circuitBreaker.getStatus();
      expect(status.state).toBe('closed');
      expect(status.failureCount).toBe(0);
      expect(status.successCount).toBe(0);
    });
  });

  describe('successful execution', () => {
    it('should execute function successfully', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');

      const result = await circuitBreaker.execute(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledOnce();

      const status = circuitBreaker.getStatus();
      expect(status.state).toBe('closed');
    });

    it('should reset failure count on success', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      // First failure
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('fail');
      expect(circuitBreaker.getStatus().failureCount).toBe(1);

      // Success should reduce failure count
      await circuitBreaker.execute(mockFn);
      expect(circuitBreaker.getStatus().failureCount).toBe(0);
    });
  });

  describe('failure handling', () => {
    it('should track failures', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('test error'));

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('test error');

      const status = circuitBreaker.getStatus();
      expect(status.failureCount).toBe(1);
      expect(status.lastFailureTime).toBeInstanceOf(Date);
    });

    it('should open circuit after failure threshold', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('test error'));

      // Fail 3 times to reach threshold
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('test error');
      }

      const status = circuitBreaker.getStatus();
      expect(status.state).toBe('open');
      expect(status.failureCount).toBe(3);
    });

    it('should reject requests when circuit is open', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('test error'));

      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('test error');
      }

      // Now it should reject with CircuitBreakerError
      await expect(circuitBreaker.execute(mockFn))
        .rejects.toThrow(CircuitBreakerError);

      // Original function should not be called
      expect(mockFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('recovery', () => {
    it('should transition to half-open after recovery timeout', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('test error'));

      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }

      expect(circuitBreaker.getStatus().state).toBe('open');

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Next execution should transition to half-open
      const successFn = vi.fn().mockResolvedValue('success');
      await circuitBreaker.execute(successFn);

      const status = circuitBreaker.getStatus();
      expect(status.state).toBe('half-open');
    });

    it('should close circuit after enough successes in half-open', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('test error'));

      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Execute successful operations to close circuit
      const successFn = vi.fn().mockResolvedValue('success');
      await circuitBreaker.execute(successFn); // half-open
      await circuitBreaker.execute(successFn); // still half-open, need 2 successes

      const status = circuitBreaker.getStatus();
      expect(status.state).toBe('closed');
      expect(status.successCount).toBe(0); // Reset on transition to closed
    });

    it('should open circuit immediately on failure in half-open state', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('test error'));

      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Execute one success to get to half-open
      const successFn = vi.fn().mockResolvedValue('success');
      await circuitBreaker.execute(successFn);
      expect(circuitBreaker.getStatus().state).toBe('half-open');

      // Fail in half-open state should immediately open circuit
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('test error');
      expect(circuitBreaker.getStatus().state).toBe('open');
    });
  });

  describe('timeout handling', () => {
    it('should timeout long-running operations', async () => {
      const slowFn = vi.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
      );

      await expect(circuitBreaker.execute(slowFn))
        .rejects.toThrow('Circuit breaker timeout');

      const status = circuitBreaker.getStatus();
      expect(status.failureCount).toBe(1);
    });
  });

  describe('manual control', () => {
    it('should allow manual reset', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('test error'));

      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }

      expect(circuitBreaker.getStatus().state).toBe('open');

      // Manual reset
      await circuitBreaker.reset();

      const status = circuitBreaker.getStatus();
      expect(status.state).toBe('closed');
      expect(status.failureCount).toBe(0);
      expect(status.successCount).toBe(0);
    });

    it('should allow manual trip', async () => {
      expect(circuitBreaker.getStatus().state).toBe('closed');

      await circuitBreaker.trip('Manual trip for testing');

      const status = circuitBreaker.getStatus();
      expect(status.state).toBe('open');
      expect(status.lastFailureTime).toBeInstanceOf(Date);
    });
  });

  describe('listeners', () => {
    it('should notify listeners of state changes', async () => {
      const listener = {
        onStateChange: vi.fn(),
        onExecution: vi.fn(),
      };

      circuitBreaker.addListener(listener);

      const mockFn = vi.fn().mockRejectedValue(new Error('test error'));

      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }

      // Should have notified state change to open
      expect(listener.onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          modelId,
          from: 'closed',
          to: 'open',
          trigger: 'failure_threshold_exceeded',
        })
      );

      // Should have notified executions
      expect(listener.onExecution).toHaveBeenCalledTimes(3);
    });
  });
});

describe('CircuitBreakerFactory', () => {
  beforeEach(() => {
    // Clear all instances before each test
    const instances = CircuitBreakerFactory.getAll();
    for (const modelId of instances.keys()) {
      CircuitBreakerFactory.remove(modelId);
    }
  });

  it('should create and cache circuit breakers', () => {
    const modelId = 'test-model';

    const cb1 = CircuitBreakerFactory.getOrCreate(modelId);
    const cb2 = CircuitBreakerFactory.getOrCreate(modelId);

    expect(cb1).toBe(cb2); // Should return same instance
    expect(CircuitBreakerFactory.getAll().size).toBe(1);
  });

  it('should create different instances for different models', () => {
    const cb1 = CircuitBreakerFactory.getOrCreate('model-1');
    const cb2 = CircuitBreakerFactory.getOrCreate('model-2');

    expect(cb1).not.toBe(cb2);
    expect(CircuitBreakerFactory.getAll().size).toBe(2);
  });

  it('should remove circuit breakers', () => {
    const modelId = 'test-model';
    CircuitBreakerFactory.getOrCreate(modelId);

    expect(CircuitBreakerFactory.getAll().size).toBe(1);

    const removed = CircuitBreakerFactory.remove(modelId);
    expect(removed).toBe(true);
    expect(CircuitBreakerFactory.getAll().size).toBe(0);
  });

  it('should reset all circuit breakers', async () => {
    const cb1 = CircuitBreakerFactory.getOrCreate('model-1');
    const cb2 = CircuitBreakerFactory.getOrCreate('model-2');

    // Trip both circuits
    await cb1.trip();
    await cb2.trip();

    expect(cb1.getStatus().state).toBe('open');
    expect(cb2.getStatus().state).toBe('open');

    // Reset all
    await CircuitBreakerFactory.resetAll();

    expect(cb1.getStatus().state).toBe('closed');
    expect(cb2.getStatus().state).toBe('closed');
  });

  it('should get status of all circuit breakers', async () => {
    const cb1 = CircuitBreakerFactory.getOrCreate('model-1');
    const cb2 = CircuitBreakerFactory.getOrCreate('model-2');

    await cb1.trip();

    const allStatus = CircuitBreakerFactory.getAllStatus();

    expect(allStatus['model-1'].state).toBe('open');
    expect(allStatus['model-2'].state).toBe('closed');
  });
});
