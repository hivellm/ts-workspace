/**
 * BIP System Resilience Adapter
 * BIP-03 Implementation - Phase 5: Integration
 *
 * @author Claude-4-Sonnet (Anthropic)
 * @version 1.0.0
 */

import {
  HealthChecker,
  CircuitBreakerFactory,
  RetryManager,
  FallbackManager,
  MetricsCollector,
  AlertManager,
  AutoRecovery,
  LoadBalancer,
  DegradationController,
  ModelIdentity,
  AITask,
  AIResponse,
  FallbackStrategy,
  type ResilienceFrameworkConfig
} from '@cmmv-hive/resilience-framework';

/**
 * BIP operation types that need resilience
 */
export type BIPOperationType =
  | 'validation'
  | 'voting'
  | 'consensus'
  | 'implementation'
  | 'review'
  | 'analysis';

/**
 * BIP-specific resilience configuration
 */
export interface BIPResilienceConfig extends ResilienceFrameworkConfig {
  readonly bipOperations: {
    readonly [K in BIPOperationType]: {
      readonly priority: number;
      readonly timeout: number;
      readonly maxRetries: number;
      readonly fallbackStrategy: FallbackStrategy;
      readonly requiresConsensus: boolean;
    };
  };
  readonly governanceSettings: {
    readonly minimumActiveModels: number;
    readonly consensusThreshold: number;
    readonly emergencyMode: boolean;
  };
}

/**
 * BIP operation with resilience metadata
 */
export interface ResilientBIPOperation {
  readonly operationType: BIPOperationType;
  readonly bipId: string;
  readonly modelId: string;
  readonly task: AITask;
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly requiresConsensus: boolean;
  readonly timeout: number;
}

/**
 * BIP operation result with resilience information
 */
export interface BIPOperationResult {
  readonly success: boolean;
  readonly response?: AIResponse;
  readonly fallbackUsed: boolean;
  readonly recoveryActions: string[];
  readonly performanceMetrics: {
    readonly responseTime: number;
    readonly retryCount: number;
    readonly circuitBreakerTripped: boolean;
  };
  readonly error?: Error;
}

/**
 * Adapter class that integrates resilience framework with BIP system
 */
export class BIPResilienceAdapter {
  private readonly healthChecker: HealthChecker;
  private readonly retryManager: RetryManager;
  private readonly fallbackManager: FallbackManager;
  private readonly metricsCollector: MetricsCollector;
  private readonly alertManager: AlertManager;
  private readonly autoRecovery: AutoRecovery;
  private readonly loadBalancer: LoadBalancer;
  private readonly degradationController: DegradationController;
  private readonly config: BIPResilienceConfig;
  private readonly registeredModels: Map<string, ModelIdentity> = new Map();

  constructor(config: BIPResilienceConfig) {
    this.config = config;

    // Initialize resilience components
    this.healthChecker = new HealthChecker(config.healthCheck);
    this.retryManager = new RetryManager();
    this.fallbackManager = new FallbackManager(config.fallback);
    this.metricsCollector = new MetricsCollector();
    this.alertManager = new AlertManager();
    this.autoRecovery = new AutoRecovery();
    this.loadBalancer = new LoadBalancer();
    this.degradationController = new DegradationController();
  }

  /**
   * Register AI model for BIP operations
   */
  async registerBIPModel(model: ModelIdentity): Promise<void> {
    this.registeredModels.set(model.id, model);

    // Register with all resilience components
    await this.healthChecker.registerModel(model);
    await this.fallbackManager.registerModel(model);
    await this.loadBalancer.registerModel(model);

    console.log(`🤖 Registered BIP model: ${model.id} (${model.provider})`);
  }

  /**
   * Execute BIP operation with full resilience protection
   */
  async executeBIPOperation(operation: ResilientBIPOperation): Promise<BIPOperationResult> {
    const startTime = Date.now();
    let fallbackUsed = false;
    const recoveryActions: string[] = [];
    let retryCount = 0;
    let circuitBreakerTripped = false;

    try {
      // Get operation-specific configuration
      const opConfig = this.config.bipOperations[operation.operationType];

      // Select best model for this operation
      const selectedModel = await this.selectOptimalModel(operation);

      // Create circuit breaker for this model
      const circuitBreaker = CircuitBreakerFactory.getOrCreate(selectedModel.id);

      // Execute with full resilience stack
      const result = await this.retryManager.executeWithRetry(
        async () => {
          // Check if we're in degraded mode
          if (this.isDegradedMode() && operation.priority !== 'critical') {
            throw new Error('System in degraded mode - only critical operations allowed');
          }

          // Execute through circuit breaker
          return await circuitBreaker.execute(async () => {
            const response = await this.executeModelTask(selectedModel, operation.task);

            // Record success metrics
            this.recordOperationMetrics(operation, selectedModel, response, startTime);

            return response;
          });
        },
        {
          maxRetries: opConfig.maxRetries,
          timeout: operation.timeout,
          backoffStrategy: 'exponential',
          onRetry: (attempt, error) => {
            retryCount = attempt;
            recoveryActions.push(`Retry attempt ${attempt}: ${error.message}`);
          }
        }
      );

      return {
        success: true,
        response: result,
        fallbackUsed,
        recoveryActions,
        performanceMetrics: {
          responseTime: Date.now() - startTime,
          retryCount,
          circuitBreakerTripped
        }
      };

    } catch (primaryError) {
      // Try fallback if available
      if (operation.requiresConsensus) {
        const fallbackResult = await this.executeFallbackStrategy(operation, primaryError);
        if (fallbackResult.success) {
          fallbackUsed = true;
          recoveryActions.push('Fallback strategy succeeded');
          return {
            ...fallbackResult,
            fallbackUsed,
            recoveryActions,
            performanceMetrics: {
              responseTime: Date.now() - startTime,
              retryCount,
              circuitBreakerTripped
            }
          };
        }
      }

      // Record failure and trigger recovery
      await this.handleOperationFailure(operation, primaryError);

      return {
        success: false,
        fallbackUsed,
        recoveryActions,
        performanceMetrics: {
          responseTime: Date.now() - startTime,
          retryCount,
          circuitBreakerTripped
        },
        error: primaryError
      };
    }
  }

  /**
   * Execute BIP consensus operation with multiple models
   */
  async executeBIPConsensus(
    operation: ResilientBIPOperation,
    requiredAgreement: number = 0.7
  ): Promise<BIPOperationResult & { consensus: boolean; responses: AIResponse[] }> {
    const availableModels = await this.getHealthyModels();
    const minModels = this.config.governanceSettings.minimumActiveModels;

    if (availableModels.length < minModels) {
      throw new Error(`Insufficient healthy models: ${availableModels.length} < ${minModels}`);
    }

    // Execute on multiple models in parallel
    const responses: AIResponse[] = [];
    const results = await Promise.allSettled(
      availableModels.slice(0, 5).map(async (model) => {
        const modelOperation = { ...operation, modelId: model.id };
        const result = await this.executeBIPOperation(modelOperation);
        if (result.success && result.response) {
          responses.push(result.response);
        }
        return result;
      })
    );

    // Analyze consensus
    const successfulResults = results
      .filter(r => r.status === 'fulfilled' && r.value.success)
      .map(r => (r as PromiseFulfilledResult<BIPOperationResult>).value);

    const consensus = this.analyzeConsensus(responses, requiredAgreement);

    // Return best result with consensus information
    const bestResult = successfulResults[0] || {
      success: false,
      fallbackUsed: false,
      recoveryActions: ['No successful responses from any model'],
      performanceMetrics: {
        responseTime: 0,
        retryCount: 0,
        circuitBreakerTripped: false
      },
      error: new Error('All models failed consensus operation')
    };

    return {
      ...bestResult,
      consensus: consensus.achieved,
      responses
    };
  }

  /**
   * Get current system resilience status for BIP operations
   */
  async getBIPResilienceStatus(): Promise<{
    systemHealth: 'healthy' | 'degraded' | 'critical';
    activeModels: number;
    healthyModels: number;
    degradationLevel: string;
    openCircuitBreakers: number;
    averageResponseTime: number;
    successRate: number;
    readyForOperations: boolean;
  }> {
    const healthyModels = await this.getHealthyModels();
    const systemMetrics = this.metricsCollector.getSystemMetrics();
    const degradationStatus = this.degradationController.getCurrentStatus();

    const systemHealth = healthyModels.length >= this.config.governanceSettings.minimumActiveModels
      ? (degradationStatus.level === 'none' ? 'healthy' : 'degraded')
      : 'critical';

    return {
      systemHealth,
      activeModels: this.registeredModels.size,
      healthyModels: healthyModels.length,
      degradationLevel: degradationStatus.level,
      openCircuitBreakers: systemMetrics.circuitBreakersOpen,
      averageResponseTime: systemMetrics.averageResponseTime,
      successRate: systemMetrics.successfulRequests / systemMetrics.totalRequests,
      readyForOperations: systemHealth !== 'critical'
    };
  }

  /**
   * Emergency procedures for critical BIP operations
   */
  async executeCriticalBIPOperation(operation: ResilientBIPOperation): Promise<BIPOperationResult> {
    // Override degradation restrictions for critical operations
    const originalOperation = { ...operation, priority: 'critical' as const };

    // Use emergency configuration
    const emergencyConfig = {
      ...this.config.bipOperations[operation.operationType],
      maxRetries: 5,
      timeout: operation.timeout * 2
    };

    // Force enable all available models
    await this.degradationController.temporaryOverride('emergency_mode');

    try {
      return await this.executeBIPOperation(originalOperation);
    } finally {
      // Restore normal degradation state
      await this.degradationController.clearOverride();
    }
  }

  /**
   * Start monitoring for BIP operations
   */
  async startBIPMonitoring(): Promise<void> {
    // Start all resilience components
    await this.healthChecker.startMonitoring();
    await this.metricsCollector.start();
    await this.autoRecovery.startMonitoring();
    await this.loadBalancer.start();
    await this.degradationController.startMonitoring();

    // Set up BIP-specific alerts
    this.alertManager.addConfiguration({
      id: 'bip-critical-failure',
      name: 'BIP Critical Operation Failure',
      condition: {
        metric: 'bip.critical.failure.rate',
        operator: 'greater_than',
        threshold: 0.1
      },
      severity: 'critical',
      channels: ['slack', 'email'],
      cooldown: 300000 // 5 minutes
    });

    console.log('🛡️ BIP Resilience monitoring started');
  }

  /**
   * Stop all BIP monitoring
   */
  async stopBIPMonitoring(): Promise<void> {
    await this.healthChecker.stopMonitoring();
    await this.metricsCollector.stop();
    await this.autoRecovery.stopMonitoring();
    await this.loadBalancer.stop();
    await this.degradationController.stopMonitoring();

    console.log('🛡️ BIP Resilience monitoring stopped');
  }

  /**
   * Private helper methods
   */

  private async selectOptimalModel(operation: ResilientBIPOperation): Promise<ModelIdentity> {
    // Use load balancer to select best model
    const decision = await this.loadBalancer.selectModel({
      operation: operation.operationType,
      priority: operation.priority,
      timeout: operation.timeout
    });

    const model = this.registeredModels.get(decision.selectedModelId);
    if (!model) {
      throw new Error(`Selected model not found: ${decision.selectedModelId}`);
    }

    return model;
  }

  private async executeModelTask(model: ModelIdentity, task: AITask): Promise<AIResponse> {
    // This would integrate with actual model execution
    // For now, return mock response
    return {
      content: `Response from ${model.id} for task: ${task.prompt}`,
      metadata: {
        modelId: model.id,
        provider: model.provider,
        timestamp: new Date(),
        tokensUsed: 100
      }
    };
  }

  private async executeFallbackStrategy(
    operation: ResilientBIPOperation,
    primaryError: Error
  ): Promise<BIPOperationResult> {
    const fallbackConfig = this.config.bipOperations[operation.operationType].fallbackStrategy;

    return await this.fallbackManager.executeWithFallback(
      operation.task,
      fallbackConfig,
      {
        timeout: operation.timeout,
        priority: operation.priority
      }
    );
  }

  private async handleOperationFailure(operation: ResilientBIPOperation, error: Error): Promise<void> {
    // Record failure metrics
    this.metricsCollector.recordFailure(operation.modelId, {
      operation: operation.operationType,
      error: error.message,
      timestamp: new Date()
    });

    // Trigger alert for critical operations
    if (operation.priority === 'critical') {
      await this.alertManager.triggerAlert('bip-critical-failure', {
        metric: 'bip.critical.failure.rate',
        value: 1,
        timestamp: new Date(),
        context: {
          bipId: operation.bipId,
          operationType: operation.operationType,
          modelId: operation.modelId,
          error: error.message
        }
      });
    }

    // Trigger auto-recovery if needed
    if (this.shouldTriggerRecovery(error)) {
      await this.autoRecovery.triggerRecovery(operation.modelId, {
        type: 'persistent',
        severity: operation.priority === 'critical' ? 'critical' : 'medium',
        scope: 'model'
      });
    }
  }

  private recordOperationMetrics(
    operation: ResilientBIPOperation,
    model: ModelIdentity,
    response: AIResponse,
    startTime: number
  ): void {
    const responseTime = Date.now() - startTime;

    this.metricsCollector.recordSuccess(model.id, {
      responseTime,
      operation: operation.operationType,
      timestamp: new Date()
    });

    // Update load balancer with performance data
    this.loadBalancer.updateModelPerformance(model.id, {
      responseTime,
      success: true,
      timestamp: new Date()
    });
  }

  private async getHealthyModels(): Promise<ModelIdentity[]> {
    const healthyModelIds = this.healthChecker.getModelsByStatus('available');
    return healthyModelIds
      .map(id => this.registeredModels.get(id))
      .filter((model): model is ModelIdentity => model !== undefined);
  }

  private isDegradedMode(): boolean {
    const status = this.degradationController.getCurrentStatus();
    return status.level !== 'none';
  }

  private analyzeConsensus(responses: AIResponse[], threshold: number): { achieved: boolean; agreement: number } {
    if (responses.length < 2) {
      return { achieved: false, agreement: 0 };
    }

    // Simple consensus based on response similarity (can be enhanced)
    const baseResponse = responses[0].content;
    const agreements = responses.filter(r =>
      this.calculateSimilarity(r.content, baseResponse) > 0.8
    ).length;

    const agreement = agreements / responses.length;
    return {
      achieved: agreement >= threshold,
      agreement
    };
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Simple similarity calculation (can be enhanced with proper algorithms)
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
  }

  private shouldTriggerRecovery(error: Error): boolean {
    // Determine if error warrants auto-recovery
    const recoveryTriggers = [
      'timeout',
      'connection',
      'unavailable',
      'circuit breaker'
    ];

    return recoveryTriggers.some(trigger =>
      error.message.toLowerCase().includes(trigger)
    );
  }
}

/**
 * Factory for creating BIP resilience adapter with default configuration
 */
export class BIPResilienceFactory {
  static createDefault(): BIPResilienceAdapter {
    const defaultConfig: BIPResilienceConfig = {
      healthCheck: {
        interval: 30000,
        timeout: 5000,
        retries: 3
      },
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeout: 60000,
        monitoringPeriod: 10000
      },
      retry: {
        maxRetries: 3,
        backoffStrategy: 'exponential',
        baseDelay: 1000,
        maxDelay: 10000
      },
      fallback: {
        strategy: 'sequential',
        timeout: 30000
      },
      bipOperations: {
        validation: {
          priority: 2,
          timeout: 10000,
          maxRetries: 2,
          fallbackStrategy: 'sequential',
          requiresConsensus: false
        },
        voting: {
          priority: 1,
          timeout: 30000,
          maxRetries: 3,
          fallbackStrategy: 'parallel',
          requiresConsensus: true
        },
        consensus: {
          priority: 1,
          timeout: 45000,
          maxRetries: 3,
          fallbackStrategy: 'weighted',
          requiresConsensus: true
        },
        implementation: {
          priority: 2,
          timeout: 60000,
          maxRetries: 2,
          fallbackStrategy: 'sequential',
          requiresConsensus: false
        },
        review: {
          priority: 3,
          timeout: 20000,
          maxRetries: 2,
          fallbackStrategy: 'sequential',
          requiresConsensus: false
        },
        analysis: {
          priority: 3,
          timeout: 15000,
          maxRetries: 2,
          fallbackStrategy: 'sequential',
          requiresConsensus: false
        }
      },
      governanceSettings: {
        minimumActiveModels: 3,
        consensusThreshold: 0.7,
        emergencyMode: false
      }
    };

    return new BIPResilienceAdapter(defaultConfig);
  }
}
