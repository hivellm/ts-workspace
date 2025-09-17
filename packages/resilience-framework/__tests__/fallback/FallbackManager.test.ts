/**
 * Fallback Manager Tests
 * BIP-03 Implementation - Phase 2 Testing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  FallbackManager,
  ModelExecutor,
  DefaultModelExecutor,
  type PerformanceMetrics,
  type RoutingConfig
} from '../../src/fallback/FallbackManager.js';
import {
  ModelIdentity,
  AITask,
  AIResponse,
  FallbackConfig
} from '../../src/types/index.js';

describe('FallbackManager', () => {
  let fallbackManager: FallbackManager;
  let mockExecutor: MockModelExecutor;

  const primaryModel: ModelIdentity = {
    id: 'claude-4-sonnet',
    name: 'Claude 4 Sonnet',
    provider: 'Anthropic',
  };

  const fallbackModels: ModelIdentity[] = [
    {
      id: 'gpt-5',
      name: 'GPT-5',
      provider: 'OpenAI',
    },
    {
      id: 'deepseek-v3',
      name: 'DeepSeek V3',
      provider: 'DeepSeek',
    },
  ];

  const testTask: AITask = {
    id: 'test-task-1',
    type: 'completion',
    payload: { prompt: 'Test prompt' },
    priority: 'normal',
  };

  beforeEach(() => {
    mockExecutor = new MockModelExecutor();
    fallbackManager = new FallbackManager(mockExecutor);
  });

  describe('Sequential Fallback', () => {
    it('should succeed with primary model', async () => {
      const config: FallbackConfig = {
        primary: primaryModel,
        fallbacks: fallbackModels,
        strategy: 'sequential',
        timeout: 5000,
      };

      mockExecutor.setResponse(primaryModel.id, 'Primary response');

      const result = await fallbackManager.executeWithFallback(testTask, config);

      expect(result.success).toBe(true);
      expect(result.modelUsed).toBe(primaryModel.id);
      expect(result.fallbackUsed).toBe(false);
      expect(result.result).toBe('Primary response');
    });

    it('should fallback to secondary model when primary fails', async () => {
      const config: FallbackConfig = {
        primary: primaryModel,
        fallbacks: fallbackModels,
        strategy: 'sequential',
        timeout: 5000,
      };

      mockExecutor.setFailure(primaryModel.id, new Error('Primary failed'));
      mockExecutor.setResponse(fallbackModels[0].id, 'Fallback response');

      const result = await fallbackManager.executeWithFallback(testTask, config);

      expect(result.success).toBe(true);
      expect(result.modelUsed).toBe(fallbackModels[0].id);
      expect(result.fallbackUsed).toBe(true);
      expect(result.result).toBe('Fallback response');
    });

    it('should try all models in sequence until success', async () => {
      const config: FallbackConfig = {
        primary: primaryModel,
        fallbacks: fallbackModels,
        strategy: 'sequential',
        timeout: 5000,
      };

      mockExecutor.setFailure(primaryModel.id, new Error('Primary failed'));
      mockExecutor.setFailure(fallbackModels[0].id, new Error('First fallback failed'));
      mockExecutor.setResponse(fallbackModels[1].id, 'Second fallback response');

      const result = await fallbackManager.executeWithFallback(testTask, config);

      expect(result.success).toBe(true);
      expect(result.modelUsed).toBe(fallbackModels[1].id);
      expect(result.fallbackUsed).toBe(true);
      expect(result.result).toBe('Second fallback response');
    });

    it('should fail when all models fail', async () => {
      const config: FallbackConfig = {
        primary: primaryModel,
        fallbacks: fallbackModels,
        strategy: 'sequential',
        timeout: 5000,
      };

      mockExecutor.setFailure(primaryModel.id, new Error('Primary failed'));
      mockExecutor.setFailure(fallbackModels[0].id, new Error('First fallback failed'));
      mockExecutor.setFailure(fallbackModels[1].id, new Error('Second fallback failed'));

      const result = await fallbackManager.executeWithFallback(testTask, config);

      expect(result.success).toBe(false);
      expect(result.modelUsed).toBe('none');
      expect(result.fallbackUsed).toBe(true);
      expect(result.error?.name).toBe('AllModelsFailedError');
    });
  });

  describe('Parallel Fallback', () => {
    it('should return fastest successful response', async () => {
      const config: FallbackConfig = {
        primary: primaryModel,
        fallbacks: fallbackModels,
        strategy: 'parallel',
        timeout: 5000,
        maxConcurrent: 3,
      };

      // Make the fallback model faster than primary
      mockExecutor.setResponse(primaryModel.id, 'Primary response', 200);
      mockExecutor.setResponse(fallbackModels[0].id, 'Fast fallback response', 50);
      mockExecutor.setResponse(fallbackModels[1].id, 'Slow fallback response', 300);

      const result = await fallbackManager.executeWithFallback(testTask, config);

      expect(result.success).toBe(true);
      expect(result.modelUsed).toBe(fallbackModels[0].id);
      expect(result.result).toBe('Fast fallback response');
    });

    it('should handle mixed success/failure in parallel execution', async () => {
      const config: FallbackConfig = {
        primary: primaryModel,
        fallbacks: fallbackModels,
        strategy: 'parallel',
        timeout: 5000,
        maxConcurrent: 3,
      };

      mockExecutor.setFailure(primaryModel.id, new Error('Primary failed'));
      mockExecutor.setResponse(fallbackModels[0].id, 'Success response', 100);
      mockExecutor.setFailure(fallbackModels[1].id, new Error('Second fallback failed'));

      const result = await fallbackManager.executeWithFallback(testTask, config);

      expect(result.success).toBe(true);
      expect(result.modelUsed).toBe(fallbackModels[0].id);
      expect(result.result).toBe('Success response');
    });

    it('should respect maxConcurrent limit', async () => {
      const config: FallbackConfig = {
        primary: primaryModel,
        fallbacks: fallbackModels,
        strategy: 'parallel',
        timeout: 5000,
        maxConcurrent: 2, // Limit to 2 concurrent
      };

      mockExecutor.setResponse(primaryModel.id, 'Primary response');
      mockExecutor.setResponse(fallbackModels[0].id, 'First fallback response');

      const result = await fallbackManager.executeWithFallback(testTask, config);

      expect(result.success).toBe(true);
      // Should only attempt 2 models due to maxConcurrent limit
      expect(result.metadata?.attemptedModels).toHaveLength(2);
    });
  });

  describe('Weighted Fallback', () => {
    beforeEach(async () => {
      // Set up performance metrics to influence weights
      const highPerformanceMetrics: PerformanceMetrics = {
        modelId: fallbackModels[0].id,
        averageResponseTime: 100,
        successRate: 0.95,
        lastUpdated: new Date(),
        requestCount: 100,
      };

      const lowPerformanceMetrics: PerformanceMetrics = {
        modelId: primaryModel.id,
        averageResponseTime: 500,
        successRate: 0.7,
        lastUpdated: new Date(),
        requestCount: 50,
      };

      await fallbackManager.updateModelWeights(highPerformanceMetrics);
      await fallbackManager.updateModelWeights(lowPerformanceMetrics);
    });

    it('should prioritize high-performance models', async () => {
      const config: FallbackConfig = {
        primary: primaryModel,
        fallbacks: fallbackModels,
        strategy: 'weighted',
        timeout: 5000,
      };

      mockExecutor.setResponse(fallbackModels[0].id, 'High performance response');
      mockExecutor.setResponse(primaryModel.id, 'Primary response');

      const result = await fallbackManager.executeWithFallback(testTask, config);

      expect(result.success).toBe(true);
      expect(result.modelUsed).toBe(fallbackModels[0].id); // Should use high-performance model first
      expect(result.metadata?.strategy).toBe('weighted');
    });
  });

  describe('Random Fallback', () => {
    it('should execute models in random order', async () => {
      const config: FallbackConfig = {
        primary: primaryModel,
        fallbacks: fallbackModels,
        strategy: 'random',
        timeout: 5000,
      };

      // Set up all models to succeed
      mockExecutor.setResponse(primaryModel.id, 'Primary response');
      mockExecutor.setResponse(fallbackModels[0].id, 'First fallback response');
      mockExecutor.setResponse(fallbackModels[1].id, 'Second fallback response');

      const result = await fallbackManager.executeWithFallback(testTask, config);

      expect(result.success).toBe(true);
      expect(result.metadata?.strategy).toBe('random');
      expect(result.metadata?.randomOrder).toBeDefined();
      expect(result.metadata?.randomOrder).toHaveLength(3);
    });
  });

  describe('Performance Metrics and Weights', () => {
    it('should update performance metrics after execution', async () => {
      const config: FallbackConfig = {
        primary: primaryModel,
        fallbacks: [],
        strategy: 'sequential',
        timeout: 5000,
      };

      mockExecutor.setResponse(primaryModel.id, 'Success response');

      await fallbackManager.executeWithFallback(testTask, config);

      const metrics = fallbackManager.getPerformanceMetrics();
      expect(metrics.has(primaryModel.id)).toBe(true);

      const modelMetrics = metrics.get(primaryModel.id)!;
      expect(modelMetrics.successRate).toBe(1);
      expect(modelMetrics.requestCount).toBe(1);
    });

    it('should calculate weights based on performance metrics', async () => {
      const excellentMetrics: PerformanceMetrics = {
        modelId: 'excellent-model',
        averageResponseTime: 100, // Fast
        successRate: 1.0, // Perfect success rate
        lastUpdated: new Date(),
        requestCount: 100,
      };

      const poorMetrics: PerformanceMetrics = {
        modelId: 'poor-model',
        averageResponseTime: 5000, // Slow
        successRate: 0.5, // Low success rate
        lastUpdated: new Date(),
        requestCount: 50,
      };

      await fallbackManager.updateModelWeights(excellentMetrics);
      await fallbackManager.updateModelWeights(poorMetrics);

      const config = fallbackManager.getRoutingConfig();

      expect(config.modelWeights['excellent-model']).toBeGreaterThan(
        config.modelWeights['poor-model']
      );
    });
  });

  describe('Configuration Management', () => {
    it('should allow routing configuration updates', () => {
      const newConfig: Partial<RoutingConfig> = {
        defaultStrategy: 'parallel',
        maxConcurrency: 5,
        timeoutMs: 60000,
      };

      fallbackManager.configureRouting(newConfig);

      const config = fallbackManager.getRoutingConfig();
      expect(config.defaultStrategy).toBe('parallel');
      expect(config.maxConcurrency).toBe(5);
      expect(config.timeoutMs).toBe(60000);
    });
  });
});

/**
 * Mock model executor for testing
 */
class MockModelExecutor implements ModelExecutor {
  private responses = new Map<string, { response?: string; error?: Error; delay?: number }>();

  setResponse(modelId: string, response: string, delay: number = 0): void {
    this.responses.set(modelId, { response, delay });
  }

  setFailure(modelId: string, error: Error): void {
    this.responses.set(modelId, { error });
  }

  async execute(model: ModelIdentity, task: AITask): Promise<AIResponse> {
    const config = this.responses.get(model.id);

    if (!config) {
      throw new Error(`No mock configuration for model ${model.id}`);
    }

    if (config.delay) {
      await this.delay(config.delay);
    }

    if (config.error) {
      throw config.error;
    }

    const startTime = Date.now();
    return {
      taskId: task.id,
      modelId: model.id,
      result: config.response || 'Default response',
      success: true,
      responseTime: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
