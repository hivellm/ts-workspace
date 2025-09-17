/**
 * Fallback Manager
 * BIP-03 Implementation - Phase 2: Fallback Strategies
 *
 * @author Claude-4-Sonnet (Anthropic)
 * @version 1.0.0
 */

import {
  AITask,
  AIResponse,
  FallbackConfig,
  FallbackStrategy,
  ModelIdentity,
  ResilienceExecutionResult,
  ResilienceError,
  AllModelsFailedError
} from '../types/index.js';

import { CircuitBreakerFactory } from '../core/CircuitBreaker.js';
import { RetryManager } from '../core/RetryManager.js';

/**
 * Performance metrics for model routing decisions
 */
export interface PerformanceMetrics {
  readonly modelId: string;
  readonly averageResponseTime: number;
  readonly successRate: number;
  readonly lastUpdated: Date;
  readonly requestCount: number;
  readonly errorRate?: number;
  readonly throughputRps?: number;
  readonly resourceUsage?: {
    cpu: number;
    memory: number;
    network: number;
  };
}

/**
 * Routing configuration for fallback strategies
 */
export interface RoutingConfig {
  readonly defaultStrategy: FallbackStrategy;
  readonly modelWeights: Record<string, number>;
  readonly maxConcurrency: number;
  readonly timeoutMs: number;
  readonly retryOnFailure: boolean;
}

/**
 * Fallback execution context
 */
interface FallbackExecutionContext {
  readonly task: AITask;
  readonly config: FallbackConfig;
  readonly startTime: Date;
  readonly attemptedModels: string[];
  readonly errors: Map<string, Error>;
}

/**
 * Main fallback manager that orchestrates different fallback strategies
 */
export class FallbackManager {
  private readonly performanceMetrics = new Map<string, PerformanceMetrics>();
  private readonly retryManager = new RetryManager();
  private routingConfig: RoutingConfig = {
    defaultStrategy: 'sequential',
    modelWeights: {},
    maxConcurrency: 3,
    timeoutMs: 30000,
    retryOnFailure: true,
  };

  constructor(
    private readonly modelExecutor: ModelExecutor = new DefaultModelExecutor()
  ) {}

  /**
   * Execute AI task with fallback strategy
   */
  async executeWithFallback<T>(
    task: AITask,
    config: FallbackConfig
  ): Promise<ResilienceExecutionResult<T>> {
    const context: FallbackExecutionContext = {
      task,
      config,
      startTime: new Date(),
      attemptedModels: [],
      errors: new Map(),
    };

    try {
      const result = await this.executeStrategy<T>(context);

      // Update performance metrics
      await this.updatePerformanceMetrics(result);

      return result;
    } catch (error) {
      // All models failed
      const allModelsError = new AllModelsFailedError(
        context.attemptedModels,
        error instanceof Error ? error : new Error(String(error))
      );

      return {
        result: undefined as T,
        success: false,
        modelUsed: 'none',
        executionTime: Date.now() - context.startTime.getTime(),
        fallbackUsed: true,
        retryCount: 0,
        circuitBreakerTriggered: false,
        error: allModelsError,
        metadata: {
          attemptedModels: context.attemptedModels,
          errors: Object.fromEntries(context.errors),
          strategy: config.strategy,
        },
      };
    }
  }

  /**
   * Update model performance metrics
   */
  async updateModelWeights(metrics: PerformanceMetrics): Promise<void> {
    this.performanceMetrics.set(metrics.modelId, metrics);

    // Update routing weights based on performance
    const weight = this.calculateModelWeight(metrics);
    this.routingConfig = {
      ...this.routingConfig,
      modelWeights: {
        ...this.routingConfig.modelWeights,
        [metrics.modelId]: weight,
      },
    };
  }

  /**
   * Configure routing behavior
   */
  configureRouting(config: Partial<RoutingConfig>): void {
    this.routingConfig = { ...this.routingConfig, ...config };
  }

  /**
   * Get current performance metrics for all models
   */
  getPerformanceMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.performanceMetrics);
  }

  /**
   * Get current routing configuration
   */
  getRoutingConfig(): RoutingConfig {
    return { ...this.routingConfig };
  }

  /**
   * Execute the appropriate fallback strategy
   */
  private async executeStrategy<T>(
    context: FallbackExecutionContext
  ): Promise<ResilienceExecutionResult<T>> {
    const { config } = context;
    const strategy = config.strategy || this.routingConfig.defaultStrategy;

    switch (strategy) {
      case 'sequential':
        return this.executeSequentialFallback<T>(context);

      case 'parallel':
        return this.executeParallelFallback<T>(context);

      case 'weighted':
        return this.executeWeightedFallback<T>(context);

      case 'random':
        return this.executeRandomFallback<T>(context);

      default:
        throw new ResilienceError(
          `Unknown fallback strategy: ${strategy}`,
          'INVALID_STRATEGY',
          undefined,
          false
        );
    }
  }

  /**
   * Execute sequential fallback strategy
   */
  private async executeSequentialFallback<T>(
    context: FallbackExecutionContext
  ): Promise<ResilienceExecutionResult<T>> {
    const { config, task } = context;
    const models = [config.primary, ...config.fallbacks];

    for (const model of models) {
      try {
        context.attemptedModels.push(model.id);

        const result = await this.executeOnModel<T>(model, task, context);

        return {
          ...result,
          fallbackUsed: model.id !== config.primary.id,
          metadata: {
            strategy: 'sequential',
            attemptedModels: context.attemptedModels,
            primaryModel: config.primary.id,
          },
        };
      } catch (error) {
        context.errors.set(model.id, error instanceof Error ? error : new Error(String(error)));
        continue; // Try next model
      }
    }

    throw new AllModelsFailedError(context.attemptedModels);
  }

  /**
   * Execute parallel fallback strategy
   */
  private async executeParallelFallback<T>(
    context: FallbackExecutionContext
  ): Promise<ResilienceExecutionResult<T>> {
    const { config, task } = context;
    const models = [config.primary, ...config.fallbacks];
    const maxConcurrent = config.maxConcurrent || this.routingConfig.maxConcurrency;

    // Limit concurrency
    const modelsToTry = models.slice(0, maxConcurrent);
    context.attemptedModels.push(...modelsToTry.map(m => m.id));

    const promises = modelsToTry.map(model =>
      this.executeOnModel<T>(model, task, context)
        .catch(error => ({ error, modelId: model.id }))
    );

    try {
      const result = await Promise.any(
        promises.map(async (promise) => {
          const result = await promise;
          if ('error' in result && 'modelId' in result) {
            context.errors.set(result.modelId, result.error);
            throw result.error;
          }
          return result as ResilienceExecutionResult<T>;
        })
      );

      return {
        ...result,
        fallbackUsed: result.modelUsed !== config.primary.id,
        metadata: {
          strategy: 'parallel',
          attemptedModels: context.attemptedModels,
          primaryModel: config.primary.id,
          concurrency: modelsToTry.length,
        },
      };
    } catch (error) {
      throw new AllModelsFailedError(context.attemptedModels, error instanceof Error ? error : undefined);
    }
  }

  /**
   * Execute weighted fallback strategy
   */
  private async executeWeightedFallback<T>(
    context: FallbackExecutionContext
  ): Promise<ResilienceExecutionResult<T>> {
    const { config, task } = context;
    const models = [config.primary, ...config.fallbacks];

    // Sort models by weight (performance)
    const sortedModels = this.sortModelsByWeight(models);

    // Use sequential fallback with weighted order
    if (sortedModels.length === 0) {
      throw new AllModelsFailedError(context.attemptedModels);
    }

    const weightedContext: FallbackExecutionContext = {
      ...context,
      config: {
        ...config,
        primary: sortedModels[0]!,
        fallbacks: sortedModels.slice(1),
        strategy: 'sequential',
      },
    };

    const result = await this.executeSequentialFallback<T>(weightedContext);

    return {
      ...result,
      metadata: {
        ...result.metadata,
        strategy: 'weighted',
        modelWeights: this.getModelWeights(models),
        sortedOrder: sortedModels.map(m => m.id),
      },
    };
  }

  /**
   * Execute random fallback strategy
   */
  private async executeRandomFallback<T>(
    context: FallbackExecutionContext
  ): Promise<ResilienceExecutionResult<T>> {
    const { config, task } = context;
    const models = [config.primary, ...config.fallbacks];

    // Shuffle models randomly
    const shuffledModels = [...models].sort(() => Math.random() - 0.5);

    if (shuffledModels.length === 0) {
      throw new AllModelsFailedError(context.attemptedModels);
    }

    const randomContext: FallbackExecutionContext = {
      ...context,
      config: {
        ...config,
        primary: shuffledModels[0]!,
        fallbacks: shuffledModels.slice(1),
        strategy: 'sequential',
      },
    };

    const result = await this.executeSequentialFallback<T>(randomContext);

    return {
      ...result,
      metadata: {
        ...result.metadata,
        strategy: 'random',
        randomOrder: shuffledModels.map(m => m.id),
      },
    };
  }

  /**
   * Execute task on a specific model with circuit breaker and retry
   */
  private async executeOnModel<T>(
    model: ModelIdentity,
    task: AITask,
    context: FallbackExecutionContext
  ): Promise<ResilienceExecutionResult<T>> {
    const startTime = Date.now();
    const circuitBreaker = CircuitBreakerFactory.getOrCreate(model.id);

    let retryCount = 0;
    let circuitBreakerTriggered = false;

    try {
      const executeWithRetry = async (): Promise<T> => {
        return circuitBreaker.execute(async () => {
          const response = await this.modelExecutor.execute(model, task);
          return response.result as T;
        });
      };

      const result = this.routingConfig.retryOnFailure
        ? await this.retryManager.executeWithRetry(executeWithRetry)
        : await executeWithRetry();

      return {
        result,
        success: true,
        modelUsed: model.id,
        executionTime: Date.now() - startTime,
        fallbackUsed: false, // Will be set by calling strategy
        retryCount,
        circuitBreakerTriggered,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'CircuitBreakerError') {
        circuitBreakerTriggered = true;
      }

      throw error;
    }
  }

  /**
   * Sort models by their performance weights
   */
  private sortModelsByWeight(models: ModelIdentity[]): ModelIdentity[] {
    return [...models].sort((a, b) => {
      const weightA = this.routingConfig.modelWeights[a.id] || 0.5;
      const weightB = this.routingConfig.modelWeights[b.id] || 0.5;
      return weightB - weightA; // Higher weight first
    });
  }

  /**
   * Get weights for a list of models
   */
  private getModelWeights(models: ModelIdentity[]): Record<string, number> {
    const weights: Record<string, number> = {};
    for (const model of models) {
      weights[model.id] = this.routingConfig.modelWeights[model.id] || 0.5;
    }
    return weights;
  }

  /**
   * Calculate model weight based on performance metrics
   */
  private calculateModelWeight(metrics: PerformanceMetrics): number {
    // Simple algorithm: combine success rate and response time
    const successWeight = metrics.successRate; // 0-1
    const responseTimeWeight = Math.max(0, 1 - (metrics.averageResponseTime / 10000)); // Penalize >10s

    // Weighted average (success rate is more important)
    return (successWeight * 0.7) + (responseTimeWeight * 0.3);
  }

  /**
   * Update performance metrics after execution
   */
  private async updatePerformanceMetrics<T>(
    result: ResilienceExecutionResult<T>
  ): Promise<void> {
    if (result.modelUsed === 'none') return;

    const existing = this.performanceMetrics.get(result.modelUsed);
    const now = new Date();

    if (existing) {
      // Update existing metrics using exponential moving average
      const alpha = 0.1; // smoothing factor
      const newSuccessRate = existing.successRate * (1 - alpha) + (result.success ? 1 : 0) * alpha;
      const newAvgResponseTime = existing.averageResponseTime * (1 - alpha) + result.executionTime * alpha;

      const updatedMetrics: PerformanceMetrics = {
        modelId: result.modelUsed,
        averageResponseTime: newAvgResponseTime,
        successRate: newSuccessRate,
        lastUpdated: now,
        requestCount: existing.requestCount + 1,
      };

      await this.updateModelWeights(updatedMetrics);
    } else {
      // Create new metrics entry
      const newMetrics: PerformanceMetrics = {
        modelId: result.modelUsed,
        averageResponseTime: result.executionTime,
        successRate: result.success ? 1 : 0,
        lastUpdated: now,
        requestCount: 1,
      };

      await this.updateModelWeights(newMetrics);
    }
  }
}

/**
 * Model executor interface for abstracting AI model execution
 */
export interface ModelExecutor {
  execute(model: ModelIdentity, task: AITask): Promise<AIResponse>;
}

/**
 * Default model executor implementation
 */
export class DefaultModelExecutor implements ModelExecutor {
  async execute(model: ModelIdentity, task: AITask): Promise<AIResponse> {
    // Placeholder implementation - in real usage, this would call actual AI models
    const startTime = Date.now();

    // Simulate API call delay
    await this.delay(Math.random() * 1000 + 500);

    // Simulate occasional failures
    if (Math.random() < 0.1) { // 10% failure rate
      throw new ResilienceError(
        `Model ${model.id} failed to process task`,
        'MODEL_EXECUTION_FAILED',
        model.id,
        true
      );
    }

    return {
      taskId: task.id,
      modelId: model.id,
      result: `Response from ${model.name} for task ${task.id}`,
      success: true,
      responseTime: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
