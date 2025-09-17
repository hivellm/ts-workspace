/**
 * Auto Recovery Manager
 * BIP-03 Implementation - Phase 4: Advanced Features
 *
 * @author Claude-4-Sonnet (Anthropic)
 * @version 1.0.0
 */

import { ModelIdentity, ModelHealth, CircuitBreakerState } from '../types/index.js';

/**
 * Recovery strategy types
 */
export type RecoveryStrategy =
  | 'immediate'
  | 'gradual'
  | 'progressive'
  | 'conservative'
  | 'adaptive';

/**
 * Recovery phase
 */
export type RecoveryPhase = 'detection' | 'analysis' | 'planning' | 'execution' | 'validation' | 'completed';

/**
 * Recovery action types
 */
export type RecoveryActionType =
  | 'restart_model'
  | 'clear_cache'
  | 'reset_circuit_breaker'
  | 'increase_resources'
  | 'switch_endpoint'
  | 'reload_config'
  | 'cleanup_connections'
  | 'garbage_collect'
  | 'warm_up_cache'
  | 'validate_health';

/**
 * Failure classification
 */
export interface FailureClassification {
  readonly type: 'transient' | 'persistent' | 'intermittent' | 'cascading' | 'unknown';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly scope: 'model' | 'service' | 'system' | 'network';
  readonly root_cause?: string;
  readonly contributing_factors: string[];
}

/**
 * Recovery action configuration
 */
export interface RecoveryAction {
  readonly type: RecoveryActionType;
  readonly parameters: Record<string, unknown>;
  readonly timeout: number; // milliseconds
  readonly retryable: boolean;
  readonly prerequisites?: RecoveryActionType[];
  readonly impact: 'none' | 'minimal' | 'moderate' | 'significant';
  readonly risk: 'low' | 'medium' | 'high';
}

/**
 * Recovery plan
 */
export interface RecoveryPlan {
  readonly id: string;
  readonly strategy: RecoveryStrategy;
  readonly target: string; // model ID or system component
  readonly classification: FailureClassification;
  readonly phases: RecoveryPhase[];
  readonly actions: RecoveryAction[];
  readonly estimatedDuration: number; // milliseconds
  readonly rollbackPlan?: RecoveryAction[];
  readonly successCriteria: HealthCheckCriteria;
}

/**
 * Recovery execution result
 */
export interface RecoveryExecutionResult {
  readonly planId: string;
  success: boolean;
  phase: RecoveryPhase;
  readonly completedActions: RecoveryActionType[];
  readonly failedActions: RecoveryActionType[];
  readonly startTime: Date;
  endTime: Date;
  duration: number;
  healthImprovement: number; // percentage
  readonly errors: string[];
}

/**
 * Health check criteria
 */
export interface HealthCheckCriteria {
  readonly responseTime: number; // max acceptable response time
  readonly successRate: number; // min success rate (0-1)
  readonly consecutiveSuccesses: number; // required consecutive successes
  readonly validationPeriod: number; // validation period in milliseconds
}

/**
 * Recovery event
 */
export interface RecoveryEvent {
  readonly type: 'recovery_started' | 'phase_completed' | 'action_completed' | 'recovery_failed' | 'recovery_succeeded';
  readonly planId: string;
  readonly target: string;
  readonly phase?: RecoveryPhase;
  readonly action?: RecoveryActionType;
  readonly timestamp: Date;
  readonly details: Record<string, unknown>;
}

/**
 * Recovery listener interface
 */
export interface RecoveryListener {
  onRecoveryStarted?(plan: RecoveryPlan): void;
  onPhaseCompleted?(planId: string, phase: RecoveryPhase): void;
  onActionCompleted?(planId: string, action: RecoveryActionType, success: boolean): void;
  onRecoveryCompleted?(result: RecoveryExecutionResult): void;
}

/**
 * Recovery statistics
 */
export interface RecoveryStatistics {
  readonly totalRecoveries: number;
  readonly successfulRecoveries: number;
  readonly failedRecoveries: number;
  readonly averageRecoveryTime: number;
  readonly recoverySuccessRate: number;
  readonly commonFailureTypes: Map<string, number>;
  readonly mostEffectiveActions: Map<RecoveryActionType, number>;
}

/**
 * Intelligent auto-recovery manager
 */
export class AutoRecovery {
  private activePlans = new Map<string, RecoveryPlan>();
  private executionResults = new Map<string, RecoveryExecutionResult>();
  private recoveryHistory: RecoveryEvent[] = [];
  private listeners = new Set<RecoveryListener>();
  private isActive = false;
  private monitoringInterval?: NodeJS.Timeout;

  // Recovery tracking
  private modelHealthHistory = new Map<string, ModelHealth[]>();
  private failurePatterns = new Map<string, FailureClassification[]>();
  private actionEffectiveness = new Map<RecoveryActionType, number>();
  private lastHealthCheck = new Map<string, Date>();

  constructor(
    private readonly defaultStrategy: RecoveryStrategy = 'adaptive',
    private readonly maxConcurrentRecoveries: number = 3
  ) {
    this.initializeActionEffectiveness();
  }

  /**
   * Start auto-recovery monitoring
   */
  async startMonitoring(intervalMs: number = 30000): Promise<void> {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.monitoringInterval = setInterval(
      () => this.monitorSystemHealth(),
      intervalMs
    );

    console.log('🔄 AutoRecovery monitoring started');
  }

  /**
   * Stop auto-recovery monitoring
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined as any;
    }

    console.log('🔄 AutoRecovery monitoring stopped');
  }

  /**
   * Trigger recovery for a specific model or system component
   */
  async triggerRecovery(
    target: string,
    classification?: FailureClassification,
    strategy?: RecoveryStrategy
  ): Promise<string> {
    // Check if recovery is already in progress
    const existingPlan = Array.from(this.activePlans.values())
      .find(plan => plan.target === target);

    if (existingPlan) {
      console.log(`🔄 Recovery already in progress for ${target}: ${existingPlan.id}`);
      return existingPlan.id;
    }

    // Check concurrent recovery limit
    if (this.activePlans.size >= this.maxConcurrentRecoveries) {
      throw new Error(`Maximum concurrent recoveries (${this.maxConcurrentRecoveries}) exceeded`);
    }

    // Classify the failure if not provided
    const failureClass = classification || await this.classifyFailure(target);

    // Create recovery plan
    const plan = await this.createRecoveryPlan(target, failureClass, strategy || this.defaultStrategy);

    // Execute recovery plan
    this.executeRecoveryPlan(plan);

    return plan.id;
  }

  /**
   * Cancel an active recovery
   */
  async cancelRecovery(planId: string): Promise<boolean> {
    const plan = this.activePlans.get(planId);
    if (!plan) {
      return false;
    }

    this.activePlans.delete(planId);

    const event: RecoveryEvent = {
      type: 'recovery_failed',
      planId,
      target: plan.target,
      timestamp: new Date(),
      details: { reason: 'cancelled', phase: 'execution' },
    };

    this.recordEvent(event);
    console.log(`🔄 Recovery cancelled: ${planId}`);
    return true;
  }

  /**
   * Get active recovery plans
   */
  getActiveRecoveries(): RecoveryPlan[] {
    return Array.from(this.activePlans.values());
  }

  /**
   * Get recovery history
   */
  getRecoveryHistory(target?: string, limit?: number): RecoveryEvent[] {
    let history = [...this.recoveryHistory];

    if (target) {
      history = history.filter(event => event.target === target);
    }

    history.reverse(); // Most recent first

    if (limit) {
      history = history.slice(0, limit);
    }

    return history;
  }

  /**
   * Get recovery statistics
   */
  getRecoveryStatistics(): RecoveryStatistics {
    const results = Array.from(this.executionResults.values());
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const avgTime = total > 0
      ? results.reduce((sum, r) => sum + r.duration, 0) / total
      : 0;

    // Analyze failure types
    const failureTypes = new Map<string, number>();
    this.failurePatterns.forEach(patterns => {
      patterns.forEach(pattern => {
        const count = failureTypes.get(pattern.type) || 0;
        failureTypes.set(pattern.type, count + 1);
      });
    });

    return {
      totalRecoveries: total,
      successfulRecoveries: successful,
      failedRecoveries: total - successful,
      averageRecoveryTime: avgTime,
      recoverySuccessRate: total > 0 ? successful / total : 0,
      commonFailureTypes: failureTypes,
      mostEffectiveActions: new Map(this.actionEffectiveness),
    };
  }

  /**
   * Update model health for recovery analysis
   */
  updateModelHealth(modelId: string, health: ModelHealth): void {
    let history = this.modelHealthHistory.get(modelId);
    if (!history) {
      history = [];
      this.modelHealthHistory.set(modelId, history);
    }

    history.push(health);

    // Keep only last 50 entries
    if (history.length > 50) {
      history.shift();
    }

    this.lastHealthCheck.set(modelId, new Date());

    // Check if recovery is needed
    if (this.shouldTriggerRecovery(modelId, health)) {
      this.triggerRecovery(modelId).catch(error => {
        console.error(`🔄 Failed to trigger auto-recovery for ${modelId}:`, error);
      });
    }
  }

  /**
   * Add recovery listener
   */
  addListener(listener: RecoveryListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove recovery listener
   */
  removeListener(listener: RecoveryListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Test recovery plan (simulation mode)
   */
  async simulateRecovery(target: string, strategy: RecoveryStrategy): Promise<{
    plan: RecoveryPlan;
    estimatedSuccessRate: number;
    riskAssessment: string;
    alternativeStrategies: RecoveryStrategy[];
  }> {
    const classification = await this.classifyFailure(target);
    const plan = await this.createRecoveryPlan(target, classification, strategy);

    // Calculate estimated success rate based on historical data
    const successRate = this.calculateEstimatedSuccessRate(plan);

    // Assess risk
    const riskAssessment = this.assessRecoveryRisk(plan);

    // Suggest alternatives
    const alternatives = this.suggestAlternativeStrategies(classification);

    return {
      plan,
      estimatedSuccessRate: successRate,
      riskAssessment,
      alternativeStrategies: alternatives,
    };
  }

  /**
   * Monitor system health and trigger recovery if needed
   */
  private async monitorSystemHealth(): Promise<void> {
    try {
      // Check for models that haven't been health-checked recently
      const now = new Date();
      const staleThreshold = 5 * 60 * 1000; // 5 minutes

      for (const [modelId, lastCheck] of this.lastHealthCheck) {
        if (now.getTime() - lastCheck.getTime() > staleThreshold) {
          console.log(`🔄 Model ${modelId} health check is stale, investigating...`);

          // Trigger recovery if no recent health data
          await this.triggerRecovery(modelId, {
            type: 'unknown',
            severity: 'medium',
            scope: 'model',
            contributing_factors: ['stale_health_data'],
          });
        }
      }

    } catch (error) {
      console.error('🔄 Error during health monitoring:', error);
    }
  }

  /**
   * Check if recovery should be triggered based on health
   */
  private shouldTriggerRecovery(modelId: string, health: ModelHealth): boolean {
    // Don't trigger if recovery is already active
    const hasActiveRecovery = Array.from(this.activePlans.values())
      .some(plan => plan.target === modelId);

    if (hasActiveRecovery) {
      return false;
    }

    // Trigger recovery criteria
    if (health.status === 'unavailable') return true;
    if (health.errorRate > 0.5) return true; // >50% error rate
    if (health.responseTime > 30000) return true; // >30 seconds
    if (health.failureCount > 10) return true; // >10 consecutive failures

    return false;
  }

  /**
   * Classify failure type and characteristics
   */
  private async classifyFailure(target: string): Promise<FailureClassification> {
    const healthHistory = this.modelHealthHistory.get(target) || [];

    if (healthHistory.length === 0) {
      return {
        type: 'unknown',
        severity: 'medium',
        scope: 'model',
        contributing_factors: ['no_health_data'],
      };
    }

    const recent = healthHistory.slice(-5); // Last 5 health checks
    const current = recent[recent.length - 1];

    // Analyze patterns
    let type: FailureClassification['type'] = 'unknown';
    let severity: FailureClassification['severity'] = 'medium';
    const factors: string[] = [];

    // Determine failure type
    if (recent.every(h => h.status === 'unavailable')) {
      type = 'persistent';
      severity = 'high';
    } else if (recent.some(h => h.status === 'unavailable')) {
      type = 'intermittent';
    } else if (current && current.errorRate > 0.3) {
      type = 'transient';
    }

    // Analyze severity
    if (current && current.responseTime > 60000) {
      severity = 'critical';
      factors.push('extreme_latency');
    } else if (current && current.errorRate > 0.8) {
      severity = 'critical';
      factors.push('high_error_rate');
    } else if (current && current.failureCount > 20) {
      severity = 'high';
      factors.push('repeated_failures');
    }

    // Determine scope
    const scope = this.determineFailureScope(target, current || {
      modelId: target,
      status: 'unavailable',
      lastHealthCheck: new Date(),
      responseTime: 0,
      errorRate: 0,
      failureCount: 0
    });

    return {
      type,
      severity,
      scope,
      contributing_factors: factors,
    };
  }

  /**
   * Create recovery plan based on failure classification
   */
  private async createRecoveryPlan(
    target: string,
    classification: FailureClassification,
    strategy: RecoveryStrategy
  ): Promise<RecoveryPlan> {
    const planId = `recovery-${target}-${Date.now()}`;

    // Select actions based on classification and strategy
    const actions = this.selectRecoveryActions(classification, strategy);

    // Estimate duration
    const estimatedDuration = actions.reduce((total, action) => total + action.timeout, 0);

    // Define success criteria
    const successCriteria = this.defineSuccessCriteria(classification);

    // Create rollback plan for high-risk actions
    const rollbackPlan = this.createRollbackPlan(actions);

    const plan: RecoveryPlan = {
      id: planId,
      strategy,
      target,
      classification,
      phases: ['detection', 'analysis', 'planning', 'execution', 'validation'],
      actions,
      estimatedDuration,
      ...(rollbackPlan && { rollbackPlan }),
      successCriteria,
    };

    this.activePlans.set(planId, plan);
    return plan;
  }

  /**
   * Execute recovery plan
   */
  private async executeRecoveryPlan(plan: RecoveryPlan): Promise<void> {
    const startTime = new Date();
    const result: RecoveryExecutionResult = {
      planId: plan.id,
      success: false,
      phase: 'detection',
      completedActions: [],
      failedActions: [],
      startTime,
      endTime: startTime,
      duration: 0,
      healthImprovement: 0,
      errors: [],
    };

    try {
      // Notify listeners
      this.notifyRecoveryStarted(plan);

      // Execute each phase
      for (const phase of plan.phases) {
        result.phase = phase;

        if (phase === 'execution') {
          // Execute recovery actions
          for (const action of plan.actions) {
            try {
              const success = await this.executeRecoveryAction(action, plan.target);

              if (success) {
                result.completedActions.push(action.type);
                this.notifyActionCompleted(plan.id, action.type, true);
              } else {
                result.failedActions.push(action.type);
                this.notifyActionCompleted(plan.id, action.type, false);

                if (!action.retryable) {
                  throw new Error(`Non-retryable action failed: ${action.type}`);
                }
              }
            } catch (error) {
              result.errors.push(`Action ${action.type} failed: ${error}`);
              result.failedActions.push(action.type);
              this.notifyActionCompleted(plan.id, action.type, false);
            }
          }
        }

        this.notifyPhaseCompleted(plan.id, phase);
      }

      // Validate recovery success
      const validationResult = await this.validateRecovery(plan);
      result.success = validationResult.success;
      result.healthImprovement = validationResult.improvement;

      if (result.success) {
        console.log(`🔄 Recovery succeeded: ${plan.id} (${result.completedActions.length} actions)`);
      } else {
        console.log(`🔄 Recovery partially failed: ${plan.id} (${result.failedActions.length} failures)`);
      }

    } catch (error) {
      result.errors.push(`Recovery execution failed: ${error}`);
      console.error(`🔄 Recovery failed: ${plan.id}`, error);
    } finally {
      // Complete result
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();

      // Store result and cleanup
      this.executionResults.set(plan.id, result);
      this.activePlans.delete(plan.id);

      // Update action effectiveness
      this.updateActionEffectiveness(result);

      // Notify completion
      this.notifyRecoveryCompleted(result);
    }
  }

  /**
   * Execute individual recovery action
   */
  private async executeRecoveryAction(action: RecoveryAction, target: string): Promise<boolean> {
    try {
      console.log(`🔄 Executing ${action.type} for ${target}`);

      switch (action.type) {
        case 'restart_model':
          return this.executeRestartModel(target, action.parameters);

        case 'clear_cache':
          return this.executeClearCache(target, action.parameters);

        case 'reset_circuit_breaker':
          return this.executeResetCircuitBreaker(target, action.parameters);

        case 'increase_resources':
          return this.executeIncreaseResources(target, action.parameters);

        case 'switch_endpoint':
          return this.executeSwitchEndpoint(target, action.parameters);

        case 'reload_config':
          return this.executeReloadConfig(target, action.parameters);

        case 'cleanup_connections':
          return this.executeCleanupConnections(target, action.parameters);

        case 'garbage_collect':
          return this.executeGarbageCollect(target, action.parameters);

        case 'warm_up_cache':
          return this.executeWarmUpCache(target, action.parameters);

        case 'validate_health':
          return this.executeValidateHealth(target, action.parameters);

        default:
          console.warn(`🔄 Unknown recovery action: ${action.type}`);
          return false;
      }
    } catch (error) {
      console.error(`🔄 Error executing ${action.type}:`, error);
      return false;
    }
  }

  /**
   * Recovery action implementations
   */
  private async executeRestartModel(target: string, _params: Record<string, unknown>): Promise<boolean> {
    console.log(`🔄 Restarting model: ${target}`);
    // Implementation would restart the model instance
    await this.delay(2000); // Simulate restart time
    return true;
  }

  private async executeClearCache(target: string, params: Record<string, unknown>): Promise<boolean> {
    const cacheType = params.type as string || 'all';
    console.log(`🔄 Clearing ${cacheType} cache for: ${target}`);
    // Implementation would clear relevant caches
    await this.delay(500);
    return true;
  }

  private async executeResetCircuitBreaker(target: string, _params: Record<string, unknown>): Promise<boolean> {
    console.log(`🔄 Resetting circuit breaker for: ${target}`);
    // Implementation would reset circuit breaker state
    await this.delay(100);
    return true;
  }

  private async executeIncreaseResources(target: string, params: Record<string, unknown>): Promise<boolean> {
    const factor = params.factor as number || 1.5;
    console.log(`🔄 Increasing resources by ${factor}x for: ${target}`);
    // Implementation would allocate additional resources
    await this.delay(3000);
    return true;
  }

  private async executeSwitchEndpoint(target: string, params: Record<string, unknown>): Promise<boolean> {
    const endpoint = params.endpoint as string || 'backup';
    console.log(`🔄 Switching to ${endpoint} endpoint for: ${target}`);
    // Implementation would switch to backup endpoint
    await this.delay(1000);
    return true;
  }

  private async executeReloadConfig(target: string, _params: Record<string, unknown>): Promise<boolean> {
    console.log(`🔄 Reloading configuration for: ${target}`);
    // Implementation would reload configuration
    await this.delay(1500);
    return true;
  }

  private async executeCleanupConnections(target: string, _params: Record<string, unknown>): Promise<boolean> {
    console.log(`🔄 Cleaning up connections for: ${target}`);
    // Implementation would cleanup stale connections
    await this.delay(800);
    return true;
  }

  private async executeGarbageCollect(target: string, _params: Record<string, unknown>): Promise<boolean> {
    console.log(`🔄 Running garbage collection for: ${target}`);
    // Implementation would trigger garbage collection
    await this.delay(1200);
    return true;
  }

  private async executeWarmUpCache(target: string, _params: Record<string, unknown>): Promise<boolean> {
    console.log(`🔄 Warming up cache for: ${target}`);
    // Implementation would pre-populate cache
    await this.delay(2500);
    return true;
  }

  private async executeValidateHealth(target: string, _params: Record<string, unknown>): Promise<boolean> {
    console.log(`🔄 Validating health for: ${target}`);
    // Implementation would perform health validation
    await this.delay(1000);
    return Math.random() > 0.1; // 90% success rate
  }

  /**
   * Helper methods
   */
  private selectRecoveryActions(
    classification: FailureClassification,
    strategy: RecoveryStrategy
  ): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    // Base actions for all strategies
    actions.push({
      type: 'validate_health',
      parameters: {},
      timeout: 5000,
      retryable: true,
      impact: 'none',
      risk: 'low',
    });

    // Strategy-specific actions
    switch (strategy) {
      case 'immediate':
        actions.push({
          type: 'restart_model',
          parameters: {},
          timeout: 10000,
          retryable: false,
          impact: 'significant',
          risk: 'medium',
        });
        break;

      case 'gradual':
        actions.push(
          {
            type: 'clear_cache',
            parameters: { type: 'response' },
            timeout: 2000,
            retryable: true,
            impact: 'minimal',
            risk: 'low',
          },
          {
            type: 'reset_circuit_breaker',
            parameters: {},
            timeout: 1000,
            retryable: true,
            impact: 'minimal',
            risk: 'low',
          }
        );
        break;

      case 'progressive':
        actions.push(
          {
            type: 'cleanup_connections',
            parameters: {},
            timeout: 3000,
            retryable: true,
            impact: 'minimal',
            risk: 'low',
          },
          {
            type: 'garbage_collect',
            parameters: {},
            timeout: 5000,
            retryable: true,
            impact: 'moderate',
            risk: 'low',
          },
          {
            type: 'warm_up_cache',
            parameters: {},
            timeout: 8000,
            retryable: true,
            impact: 'minimal',
            risk: 'low',
          }
        );
        break;

      case 'conservative':
        actions.push({
          type: 'reload_config',
          parameters: {},
          timeout: 3000,
          retryable: true,
          impact: 'minimal',
          risk: 'low',
        });
        break;

      case 'adaptive':
        // Choose actions based on failure classification
        if (classification.severity === 'critical') {
          actions.push({
            type: 'restart_model',
            parameters: {},
            timeout: 10000,
            retryable: false,
            impact: 'significant',
            risk: 'medium',
          });
        } else {
          actions.push(
            {
              type: 'clear_cache',
              parameters: {},
              timeout: 2000,
              retryable: true,
              impact: 'minimal',
              risk: 'low',
            },
            {
              type: 'reset_circuit_breaker',
              parameters: {},
              timeout: 1000,
              retryable: true,
              impact: 'minimal',
              risk: 'low',
            }
          );
        }
        break;
    }

    return actions;
  }

  private defineSuccessCriteria(classification: FailureClassification): HealthCheckCriteria {
    const baseCriteria = {
      responseTime: 5000,
      successRate: 0.9,
      consecutiveSuccesses: 3,
      validationPeriod: 60000, // 1 minute
    };

    // Adjust based on classification
    switch (classification.severity) {
      case 'critical':
        return {
          ...baseCriteria,
          responseTime: 10000,
          successRate: 0.8,
          consecutiveSuccesses: 5,
          validationPeriod: 120000,
        };

      case 'high':
        return {
          ...baseCriteria,
          consecutiveSuccesses: 4,
          validationPeriod: 90000,
        };

      default:
        return baseCriteria;
    }
  }

  private createRollbackPlan(actions: RecoveryAction[]): RecoveryAction[] | undefined {
    const highRiskActions = actions.filter(a => a.risk === 'high');
    if (highRiskActions.length === 0) {
      return undefined;
    }

    // Create rollback actions for high-risk actions
    return highRiskActions.map(action => ({
      type: 'validate_health', // Simplified rollback
      parameters: { rollback_for: action.type },
      timeout: 5000,
      retryable: true,
      impact: 'minimal',
      risk: 'low',
    }));
  }

  private async validateRecovery(plan: RecoveryPlan): Promise<{
    success: boolean;
    improvement: number;
  }> {
    // Get current health
    const healthHistory = this.modelHealthHistory.get(plan.target);
    if (!healthHistory || healthHistory.length === 0) {
      return { success: false, improvement: 0 };
    }

    const current = healthHistory[healthHistory.length - 1];
    const criteria = plan.successCriteria;

    // Check success criteria
    const success = current &&
      current.responseTime <= criteria.responseTime &&
      (1 - current.errorRate) >= criteria.successRate &&
      current.failureCount === 0;

    // Calculate improvement (simplified)
    const beforeHealth = healthHistory.length > 1 ? healthHistory[healthHistory.length - 2] : current;
    const improvement = Math.max(0,
      current && beforeHealth ? ((1 - current.errorRate) - (1 - beforeHealth.errorRate)) * 100 : 0
    );

    return { success: success || false, improvement };
  }

  private determineFailureScope(target: string, health: ModelHealth): FailureClassification['scope'] {
    // Simple heuristic based on health metrics
    if (health.errorRate > 0.9) return 'system';
    if (health.responseTime > 30000) return 'network';
    if (health.failureCount > 5) return 'service';
    return 'model';
  }

  private calculateEstimatedSuccessRate(plan: RecoveryPlan): number {
    // Calculate based on historical effectiveness of actions
    let totalWeight = 0;
    let weightedSuccess = 0;

    for (const action of plan.actions) {
      const effectiveness = this.actionEffectiveness.get(action.type) || 0.5;
      const weight = action.risk === 'low' ? 1 : action.risk === 'medium' ? 0.7 : 0.4;

      totalWeight += weight;
      weightedSuccess += effectiveness * weight;
    }

    return totalWeight > 0 ? weightedSuccess / totalWeight : 0.5;
  }

  private assessRecoveryRisk(plan: RecoveryPlan): string {
    const highRiskActions = plan.actions.filter(a => a.risk === 'high').length;
    const totalActions = plan.actions.length;

    if (highRiskActions > totalActions * 0.5) {
      return 'High risk: Multiple high-impact actions';
    } else if (highRiskActions > 0) {
      return 'Medium risk: Some high-impact actions';
    } else {
      return 'Low risk: Safe recovery actions';
    }
  }

  private suggestAlternativeStrategies(classification: FailureClassification): RecoveryStrategy[] {
    const alternatives: RecoveryStrategy[] = [];

    switch (classification.type) {
      case 'transient':
        alternatives.push('conservative', 'gradual');
        break;
      case 'persistent':
        alternatives.push('immediate', 'progressive');
        break;
      case 'intermittent':
        alternatives.push('adaptive', 'gradual');
        break;
      default:
        alternatives.push('adaptive', 'conservative');
    }

    return alternatives;
  }

  private initializeActionEffectiveness(): void {
    // Initialize with baseline effectiveness rates
    this.actionEffectiveness.set('restart_model', 0.85);
    this.actionEffectiveness.set('clear_cache', 0.7);
    this.actionEffectiveness.set('reset_circuit_breaker', 0.8);
    this.actionEffectiveness.set('increase_resources', 0.6);
    this.actionEffectiveness.set('switch_endpoint', 0.75);
    this.actionEffectiveness.set('reload_config', 0.65);
    this.actionEffectiveness.set('cleanup_connections', 0.6);
    this.actionEffectiveness.set('garbage_collect', 0.5);
    this.actionEffectiveness.set('warm_up_cache', 0.55);
    this.actionEffectiveness.set('validate_health', 0.9);
  }

  private updateActionEffectiveness(result: RecoveryExecutionResult): void {
    const alpha = 0.1; // Learning rate

    for (const action of result.completedActions) {
      const current = this.actionEffectiveness.get(action) || 0.5;
      const newValue = current * (1 - alpha) + (result.success ? 1 : 0) * alpha;
      this.actionEffectiveness.set(action, newValue);
    }
  }

  private recordEvent(event: RecoveryEvent): void {
    this.recoveryHistory.push(event);

    // Keep only last 1000 events
    if (this.recoveryHistory.length > 1000) {
      this.recoveryHistory.shift();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Notification methods
   */
  private notifyRecoveryStarted(plan: RecoveryPlan): void {
    const event: RecoveryEvent = {
      type: 'recovery_started',
      planId: plan.id,
      target: plan.target,
      timestamp: new Date(),
      details: { strategy: plan.strategy, actions: plan.actions.length },
    };

    this.recordEvent(event);

    this.listeners.forEach(listener => {
      try {
        listener.onRecoveryStarted?.(plan);
      } catch (error) {
        console.error('🔄 Error notifying recovery started:', error);
      }
    });
  }

  private notifyPhaseCompleted(planId: string, phase: RecoveryPhase): void {
    const event: RecoveryEvent = {
      type: 'phase_completed',
      planId,
      target: this.activePlans.get(planId)?.target || 'unknown',
      phase,
      timestamp: new Date(),
      details: { phase },
    };

    this.recordEvent(event);

    this.listeners.forEach(listener => {
      try {
        listener.onPhaseCompleted?.(planId, phase);
      } catch (error) {
        console.error('🔄 Error notifying phase completed:', error);
      }
    });
  }

  private notifyActionCompleted(planId: string, action: RecoveryActionType, success: boolean): void {
    const event: RecoveryEvent = {
      type: 'action_completed',
      planId,
      target: this.activePlans.get(planId)?.target || 'unknown',
      action,
      timestamp: new Date(),
      details: { action, success },
    };

    this.recordEvent(event);

    this.listeners.forEach(listener => {
      try {
        listener.onActionCompleted?.(planId, action, success);
      } catch (error) {
        console.error('🔄 Error notifying action completed:', error);
      }
    });
  }

  private notifyRecoveryCompleted(result: RecoveryExecutionResult): void {
    const event: RecoveryEvent = {
      type: result.success ? 'recovery_succeeded' : 'recovery_failed',
      planId: result.planId,
      target: 'unknown', // Target info lost at this point
      timestamp: new Date(),
      details: {
        success: result.success,
        duration: result.duration,
        completedActions: result.completedActions.length,
        failedActions: result.failedActions.length,
      },
    };

    this.recordEvent(event);

    this.listeners.forEach(listener => {
      try {
        listener.onRecoveryCompleted?.(result);
      } catch (error) {
        console.error('🔄 Error notifying recovery completed:', error);
      }
    });
  }
}
