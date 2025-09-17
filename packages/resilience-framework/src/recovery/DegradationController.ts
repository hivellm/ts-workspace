/**
 * Degradation Controller
 * BIP-03 Implementation - Phase 4: Advanced Features
 *
 * @author Claude-4-Sonnet (Anthropic)
 * @version 1.0.0
 */

import { ModelIdentity, ModelHealth } from '../types/index.js';

/**
 * Degradation level
 */
export type DegradationLevel = 'none' | 'minimal' | 'moderate' | 'severe' | 'critical';

/**
 * Performance threshold configuration
 */
export interface PerformanceThreshold {
  readonly responseTime: number; // milliseconds
  readonly successRate: number; // 0-1
  readonly errorRate: number; // 0-1
  readonly cpuUsage?: number; // 0-1
  readonly memoryUsage?: number; // 0-1
}

/**
 * Degradation strategy configuration
 */
export interface DegradationStrategy {
  readonly level: DegradationLevel;
  readonly thresholds: PerformanceThreshold;
  readonly actions: DegradationAction[];
  readonly priority: number; // higher = more critical
  readonly autoRevert: boolean;
  readonly revertThreshold?: PerformanceThreshold;
}

/**
 * Degradation action types
 */
export type DegradationActionType =
  | 'reduce_concurrency'
  | 'increase_timeout'
  | 'disable_features'
  | 'use_cache'
  | 'simplify_responses'
  | 'reduce_batch_size'
  | 'skip_validation'
  | 'emergency_mode';

/**
 * Degradation action configuration
 */
export interface DegradationAction {
  readonly type: DegradationActionType;
  readonly parameters: Record<string, unknown>;
  readonly impact: string;
  readonly reversible: boolean;
}

/**
 * System degradation status
 */
export interface DegradationStatus {
  readonly level: DegradationLevel;
  readonly activeActions: DegradationAction[];
  readonly triggeredBy: string;
  readonly timestamp: Date;
  readonly affectedModels: string[];
  readonly estimatedRecoveryTime?: number | undefined; // milliseconds
  readonly userImpact: string;
}

/**
 * Degradation event
 */
export interface DegradationEvent {
  readonly type: 'degradation_started' | 'degradation_escalated' | 'degradation_recovered';
  readonly previousLevel: DegradationLevel;
  readonly newLevel: DegradationLevel;
  readonly reason: string;
  readonly timestamp: Date;
  readonly actionsApplied: DegradationAction[];
}

/**
 * Degradation listener interface
 */
export interface DegradationListener {
  onDegradationChange?(event: DegradationEvent): void;
  onActionApplied?(action: DegradationAction, success: boolean): void;
  onRecoveryStarted?(level: DegradationLevel): void;
}

/**
 * Performance metrics for degradation decisions
 */
export interface PerformanceMetrics {
  readonly responseTime: number;
  readonly successRate: number;
  readonly errorRate: number;
  readonly throughput: number;
  readonly activeConnections: number;
  readonly resourceUsage: {
    cpu: number;
    memory: number;
    network: number;
  };
}

/**
 * Graceful degradation controller
 */
export class DegradationController {
  private currentLevel: DegradationLevel = 'none';
  private activeStrategies = new Map<string, DegradationStrategy>();
  private appliedActions = new Map<string, DegradationAction[]>();
  private degradationHistory: DegradationEvent[] = [];
  private listeners = new Set<DegradationListener>();
  private monitoringInterval?: NodeJS.Timeout;
  private isActive = false;

  // Performance tracking
  private performanceHistory: PerformanceMetrics[] = [];
  private modelMetrics = new Map<string, PerformanceMetrics>();
  private lastEvaluation = new Date();

  constructor(
    private readonly strategies: DegradationStrategy[] = []
  ) {
    this.initializeDefaultStrategies();
    this.strategies.forEach(strategy =>
      this.activeStrategies.set(`${strategy.level}-${strategy.priority}`, strategy)
    );
  }

  /**
   * Start degradation monitoring
   */
  async startMonitoring(intervalMs: number = 15000): Promise<void> {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.monitoringInterval = setInterval(
      () => this.evaluateSystemHealth(),
      intervalMs
    );

    console.log('🔧 DegradationController monitoring started');
  }

  /**
   * Stop degradation monitoring
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

    console.log('🔧 DegradationController monitoring stopped');
  }

  /**
   * Update system performance metrics
   */
  updateSystemMetrics(metrics: PerformanceMetrics): void {
    this.performanceHistory.push(metrics);

    // Keep only last 100 entries
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift();
    }

    // Trigger immediate evaluation if significant performance change
    if (this.shouldTriggerImmediateEvaluation(metrics)) {
      this.evaluateSystemHealth();
    }
  }

  /**
   * Update model-specific metrics
   */
  updateModelMetrics(modelId: string, metrics: PerformanceMetrics): void {
    this.modelMetrics.set(modelId, metrics);
  }

  /**
   * Manually trigger degradation to specific level
   */
  async triggerDegradation(
    level: DegradationLevel,
    reason: string,
    affectedModels: string[] = []
  ): Promise<boolean> {
    const strategy = this.findStrategyForLevel(level);
    if (!strategy) {
      console.warn(`🔧 No strategy found for degradation level: ${level}`);
      return false;
    }

    return this.applyDegradation(strategy, reason, affectedModels);
  }

  /**
   * Attempt recovery from current degradation level
   */
  async recoverFromDegradation(): Promise<boolean> {
    if (this.currentLevel === 'none') {
      return true;
    }

    const currentMetrics = this.getCurrentSystemMetrics();
    if (!currentMetrics) {
      return false;
    }

    // Check if system has recovered enough to revert
    const canRevert = this.canRevertDegradation(currentMetrics);
    if (!canRevert) {
      return false;
    }

    return this.revertDegradation();
  }

  /**
   * Get current degradation status
   */
  getCurrentStatus(): DegradationStatus {
    const activeActions = Array.from(this.appliedActions.values()).flat();
    const affectedModels = Array.from(this.appliedActions.keys());

    return {
      level: this.currentLevel,
      activeActions,
      triggeredBy: this.getLastTriggerReason(),
      timestamp: this.lastEvaluation,
      affectedModels,
      ...(this.estimateRecoveryTime() !== undefined && { estimatedRecoveryTime: this.estimateRecoveryTime() }),
      userImpact: this.calculateUserImpact(),
    };
  }

  /**
   * Get degradation history
   */
  getDegradationHistory(limit?: number): DegradationEvent[] {
    const history = [...this.degradationHistory].reverse(); // Most recent first
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Add degradation strategy
   */
  addStrategy(strategy: DegradationStrategy): void {
    const key = `${strategy.level}-${strategy.priority}`;
    this.activeStrategies.set(key, strategy);
    console.log(`🔧 Added degradation strategy: ${strategy.level} (priority: ${strategy.priority})`);
  }

  /**
   * Remove degradation strategy
   */
  removeStrategy(level: DegradationLevel, priority: number): boolean {
    const key = `${level}-${priority}`;
    const removed = this.activeStrategies.delete(key);
    if (removed) {
      console.log(`🔧 Removed degradation strategy: ${level} (priority: ${priority})`);
    }
    return removed;
  }

  /**
   * Add degradation listener
   */
  addListener(listener: DegradationListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove degradation listener
   */
  removeListener(listener: DegradationListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Get available degradation strategies
   */
  getStrategies(): DegradationStrategy[] {
    return Array.from(this.activeStrategies.values());
  }

  /**
   * Test degradation strategy (simulation mode)
   */
  async simulateStrategy(strategy: DegradationStrategy): Promise<{
    estimatedImpact: string;
    affectedSystems: string[];
    reversible: boolean;
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    const reversibleActions = strategy.actions.filter(a => a.reversible).length;
    const totalActions = strategy.actions.length;
    const reversible = reversibleActions === totalActions;

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (strategy.level === 'critical') riskLevel = 'high';
    else if (strategy.level === 'severe') riskLevel = 'medium';

    return {
      estimatedImpact: this.calculateStrategyImpact(strategy),
      affectedSystems: this.getAffectedSystems(strategy),
      reversible,
      riskLevel,
    };
  }

  /**
   * Evaluate system health and apply degradation if needed
   */
  private async evaluateSystemHealth(): Promise<void> {
    this.lastEvaluation = new Date();

    try {
      const currentMetrics = this.getCurrentSystemMetrics();
      if (!currentMetrics) {
        return;
      }

      // Check if we need to escalate degradation
      const requiredLevel = this.calculateRequiredDegradationLevel(currentMetrics);

      if (requiredLevel !== this.currentLevel) {
        if (this.shouldEscalate(requiredLevel)) {
          await this.escalateDegradation(requiredLevel, 'Performance threshold exceeded');
        } else if (this.shouldRecover(requiredLevel)) {
          await this.recoverFromDegradation();
        }
      }

      // Log evaluation
      if (this.currentLevel !== 'none') {
        console.log(`🔧 Degradation evaluation: Level ${this.currentLevel}, Required: ${requiredLevel}`);
      }

    } catch (error) {
      console.error('🔧 Error during degradation evaluation:', error);
    }
  }

  /**
   * Calculate required degradation level based on metrics
   */
  private calculateRequiredDegradationLevel(metrics: PerformanceMetrics): DegradationLevel {
    const strategies = Array.from(this.activeStrategies.values())
      .sort((a, b) => a.priority - b.priority); // Start with lowest priority (least severe)

    for (const strategy of strategies) {
      if (this.metricsExceedThreshold(metrics, strategy.thresholds)) {
        return strategy.level;
      }
    }

    return 'none';
  }

  /**
   * Check if metrics exceed threshold
   */
  private metricsExceedThreshold(
    metrics: PerformanceMetrics,
    thresholds: PerformanceThreshold
  ): boolean {
    if (metrics.responseTime > thresholds.responseTime) return true;
    if (metrics.successRate < thresholds.successRate) return true;
    if (metrics.errorRate > thresholds.errorRate) return true;
    if (thresholds.cpuUsage && metrics.resourceUsage.cpu > thresholds.cpuUsage) return true;
    if (thresholds.memoryUsage && metrics.resourceUsage.memory > thresholds.memoryUsage) return true;

    return false;
  }

  /**
   * Apply degradation strategy
   */
  private async applyDegradation(
    strategy: DegradationStrategy,
    reason: string,
    affectedModels: string[]
  ): Promise<boolean> {
    const previousLevel = this.currentLevel;

    try {
      // Apply all actions in the strategy
      const appliedActions: DegradationAction[] = [];

      for (const action of strategy.actions) {
        const success = await this.applyAction(action);
        if (success) {
          appliedActions.push(action);
          this.notifyActionApplied(action, true);
        } else {
          this.notifyActionApplied(action, false);
        }
      }

      // Update state
      this.currentLevel = strategy.level;
      this.appliedActions.set(reason, appliedActions);

      // Create degradation event
      const event: DegradationEvent = {
        type: previousLevel === 'none' ? 'degradation_started' : 'degradation_escalated',
        previousLevel,
        newLevel: strategy.level,
        reason,
        timestamp: new Date(),
        actionsApplied: appliedActions,
      };

      this.degradationHistory.push(event);
      this.notifyDegradationChange(event);

      console.log(`🔧 Applied degradation: ${previousLevel} → ${strategy.level} (${appliedActions.length} actions)`);
      return true;

    } catch (error) {
      console.error(`🔧 Failed to apply degradation strategy:`, error);
      return false;
    }
  }

  /**
   * Revert degradation actions
   */
  private async revertDegradation(): Promise<boolean> {
    const previousLevel = this.currentLevel;

    try {
      // Revert all applied actions
      let revertedCount = 0;
      for (const [reason, actions] of this.appliedActions) {
        for (const action of actions) {
          if (action.reversible) {
            const success = await this.revertAction(action);
            if (success) {
              revertedCount++;
            }
          }
        }
      }

      // Clear applied actions and update level
      this.appliedActions.clear();
      this.currentLevel = 'none';

      // Create recovery event
      const event: DegradationEvent = {
        type: 'degradation_recovered',
        previousLevel,
        newLevel: 'none',
        reason: 'System performance recovered',
        timestamp: new Date(),
        actionsApplied: [],
      };

      this.degradationHistory.push(event);
      this.notifyDegradationChange(event);

      console.log(`🔧 Recovered from degradation: ${previousLevel} → none (${revertedCount} actions reverted)`);
      return true;

    } catch (error) {
      console.error(`🔧 Failed to revert degradation:`, error);
      return false;
    }
  }

  /**
   * Apply a specific degradation action
   */
  private async applyAction(action: DegradationAction): Promise<boolean> {
    try {
      switch (action.type) {
        case 'reduce_concurrency':
          return this.applyConcurrencyReduction(action.parameters);

        case 'increase_timeout':
          return this.applyTimeoutIncrease(action.parameters);

        case 'disable_features':
          return this.applyFeatureDisabling(action.parameters);

        case 'use_cache':
          return this.applyAggressiveCaching(action.parameters);

        case 'simplify_responses':
          return this.applyResponseSimplification(action.parameters);

        case 'reduce_batch_size':
          return this.applyBatchSizeReduction(action.parameters);

        case 'skip_validation':
          return this.applyValidationSkipping(action.parameters);

        case 'emergency_mode':
          return this.applyEmergencyMode(action.parameters);

        default:
          console.warn(`🔧 Unknown degradation action: ${action.type}`);
          return false;
      }
    } catch (error) {
      console.error(`🔧 Error applying action ${action.type}:`, error);
      return false;
    }
  }

  /**
   * Revert a specific degradation action
   */
  private async revertAction(action: DegradationAction): Promise<boolean> {
    if (!action.reversible) {
      return false;
    }

    try {
      switch (action.type) {
        case 'reduce_concurrency':
          return this.revertConcurrencyReduction(action.parameters);

        case 'increase_timeout':
          return this.revertTimeoutIncrease(action.parameters);

        case 'disable_features':
          return this.revertFeatureDisabling(action.parameters);

        case 'use_cache':
          return this.revertAggressiveCaching(action.parameters);

        case 'simplify_responses':
          return this.revertResponseSimplification(action.parameters);

        case 'reduce_batch_size':
          return this.revertBatchSizeReduction(action.parameters);

        case 'skip_validation':
          return this.revertValidationSkipping(action.parameters);

        default:
          return true; // Default to success for unknown reversible actions
      }
    } catch (error) {
      console.error(`🔧 Error reverting action ${action.type}:`, error);
      return false;
    }
  }

  /**
   * Initialize default degradation strategies
   */
  private initializeDefaultStrategies(): void {
    const defaultStrategies: DegradationStrategy[] = [
      {
        level: 'minimal',
        priority: 1,
        thresholds: {
          responseTime: 5000, // 5 seconds
          successRate: 0.95,
          errorRate: 0.05,
        },
        actions: [
          {
            type: 'use_cache',
            parameters: { aggressiveness: 'moderate' },
            impact: 'Slightly stale data, improved response times',
            reversible: true,
          },
        ],
        autoRevert: true,
        revertThreshold: {
          responseTime: 3000,
          successRate: 0.98,
          errorRate: 0.02,
        },
      },
      {
        level: 'moderate',
        priority: 2,
        thresholds: {
          responseTime: 8000, // 8 seconds
          successRate: 0.90,
          errorRate: 0.10,
        },
        actions: [
          {
            type: 'reduce_concurrency',
            parameters: { factor: 0.7 },
            impact: 'Reduced parallel processing, lower resource usage',
            reversible: true,
          },
          {
            type: 'increase_timeout',
            parameters: { multiplier: 1.5 },
            impact: 'Longer timeouts, more patient operations',
            reversible: true,
          },
        ],
        autoRevert: true,
      },
      {
        level: 'severe',
        priority: 3,
        thresholds: {
          responseTime: 15000, // 15 seconds
          successRate: 0.80,
          errorRate: 0.20,
        },
        actions: [
          {
            type: 'disable_features',
            parameters: { features: ['analytics', 'detailed_logging'] },
            impact: 'Reduced functionality, improved stability',
            reversible: true,
          },
          {
            type: 'simplify_responses',
            parameters: { level: 'basic' },
            impact: 'Simplified responses, faster processing',
            reversible: true,
          },
        ],
        autoRevert: true,
      },
      {
        level: 'critical',
        priority: 4,
        thresholds: {
          responseTime: 30000, // 30 seconds
          successRate: 0.60,
          errorRate: 0.40,
        },
        actions: [
          {
            type: 'emergency_mode',
            parameters: { mode: 'minimal_operation' },
            impact: 'Emergency operation mode, basic functionality only',
            reversible: false,
          },
        ],
        autoRevert: false,
      },
    ];

    defaultStrategies.forEach(strategy => this.addStrategy(strategy));
  }

  /**
   * Degradation action implementations
   */
  private async applyConcurrencyReduction(params: Record<string, unknown>): Promise<boolean> {
    const factor = params.factor as number || 0.5;
    console.log(`🔧 Applying concurrency reduction: ${(factor * 100).toFixed(0)}%`);
    // Implementation would reduce max concurrent operations
    return true;
  }

  private async applyTimeoutIncrease(params: Record<string, unknown>): Promise<boolean> {
    const multiplier = params.multiplier as number || 2;
    console.log(`🔧 Applying timeout increase: ${multiplier}x`);
    // Implementation would increase operation timeouts
    return true;
  }

  private async applyFeatureDisabling(params: Record<string, unknown>): Promise<boolean> {
    const features = params.features as string[] || [];
    console.log(`🔧 Disabling features: ${features.join(', ')}`);
    // Implementation would disable specified features
    return true;
  }

  private async applyAggressiveCaching(params: Record<string, unknown>): Promise<boolean> {
    const aggressiveness = params.aggressiveness as string || 'high';
    console.log(`🔧 Applying aggressive caching: ${aggressiveness}`);
    // Implementation would enable aggressive caching
    return true;
  }

  private async applyResponseSimplification(params: Record<string, unknown>): Promise<boolean> {
    const level = params.level as string || 'basic';
    console.log(`🔧 Applying response simplification: ${level}`);
    // Implementation would simplify response formats
    return true;
  }

  private async applyBatchSizeReduction(params: Record<string, unknown>): Promise<boolean> {
    const factor = params.factor as number || 0.5;
    console.log(`🔧 Reducing batch sizes: ${(factor * 100).toFixed(0)}%`);
    // Implementation would reduce batch processing sizes
    return true;
  }

  private async applyValidationSkipping(params: Record<string, unknown>): Promise<boolean> {
    const level = params.level as string || 'minimal';
    console.log(`🔧 Skipping validation: ${level} level`);
    // Implementation would skip non-critical validations
    return true;
  }

  private async applyEmergencyMode(params: Record<string, unknown>): Promise<boolean> {
    const mode = params.mode as string || 'basic';
    console.log(`🔧 Activating emergency mode: ${mode}`);
    // Implementation would activate emergency operation mode
    return true;
  }

  /**
   * Revert action implementations
   */
  private async revertConcurrencyReduction(_params: Record<string, unknown>): Promise<boolean> {
    console.log(`🔧 Reverting concurrency reduction`);
    return true;
  }

  private async revertTimeoutIncrease(_params: Record<string, unknown>): Promise<boolean> {
    console.log(`🔧 Reverting timeout increase`);
    return true;
  }

  private async revertFeatureDisabling(params: Record<string, unknown>): Promise<boolean> {
    const features = params.features as string[] || [];
    console.log(`🔧 Re-enabling features: ${features.join(', ')}`);
    return true;
  }

  private async revertAggressiveCaching(_params: Record<string, unknown>): Promise<boolean> {
    console.log(`🔧 Reverting aggressive caching`);
    return true;
  }

  private async revertResponseSimplification(_params: Record<string, unknown>): Promise<boolean> {
    console.log(`🔧 Reverting response simplification`);
    return true;
  }

  private async revertBatchSizeReduction(_params: Record<string, unknown>): Promise<boolean> {
    console.log(`🔧 Reverting batch size reduction`);
    return true;
  }

  private async revertValidationSkipping(_params: Record<string, unknown>): Promise<boolean> {
    console.log(`🔧 Reverting validation skipping`);
    return true;
  }

  /**
   * Helper methods
   */
  private shouldTriggerImmediateEvaluation(metrics: PerformanceMetrics): boolean {
    const lastMetrics = this.performanceHistory[this.performanceHistory.length - 2];
    if (!lastMetrics) return false;

    // Trigger if response time increased significantly
    const responseTimeIncrease = metrics.responseTime / lastMetrics.responseTime;
    if (responseTimeIncrease > 2) return true;

    // Trigger if success rate dropped significantly
    const successRateDecrease = lastMetrics.successRate - metrics.successRate;
    if (successRateDecrease > 0.1) return true;

    return false;
  }

  private shouldEscalate(requiredLevel: DegradationLevel): boolean {
    const levelPriority = { none: 0, minimal: 1, moderate: 2, severe: 3, critical: 4 };
    return levelPriority[requiredLevel] > levelPriority[this.currentLevel];
  }

  private shouldRecover(requiredLevel: DegradationLevel): boolean {
    const levelPriority = { none: 0, minimal: 1, moderate: 2, severe: 3, critical: 4 };
    return levelPriority[requiredLevel] < levelPriority[this.currentLevel];
  }

  private async escalateDegradation(level: DegradationLevel, reason: string): Promise<void> {
    const strategy = this.findStrategyForLevel(level);
    if (strategy) {
      await this.applyDegradation(strategy, reason, []);
    }
  }

  private findStrategyForLevel(level: DegradationLevel): DegradationStrategy | undefined {
    return Array.from(this.activeStrategies.values())
      .find(strategy => strategy.level === level);
  }

  private canRevertDegradation(metrics: PerformanceMetrics): boolean {
    const strategies = Array.from(this.activeStrategies.values())
      .filter(s => s.level === this.currentLevel && s.autoRevert);

    if (strategies.length === 0) return false;

    const strategy = strategies[0];
    if (!strategy || !strategy.revertThreshold) return false;

    return !this.metricsExceedThreshold(metrics, strategy.revertThreshold);
  }

  private getCurrentSystemMetrics(): PerformanceMetrics | null {
    return this.performanceHistory[this.performanceHistory.length - 1] || null;
  }

  private getLastTriggerReason(): string {
    const lastEvent = this.degradationHistory[this.degradationHistory.length - 1];
    return lastEvent?.reason || 'Unknown';
  }

  private estimateRecoveryTime(): number | undefined {
    if (this.currentLevel === 'none') return undefined;

    // Simple estimation based on degradation level
    const estimationMap = {
      minimal: 5 * 60 * 1000, // 5 minutes
      moderate: 15 * 60 * 1000, // 15 minutes
      severe: 30 * 60 * 1000, // 30 minutes
      critical: 60 * 60 * 1000, // 1 hour
    };

    return estimationMap[this.currentLevel as keyof typeof estimationMap];
  }

  private calculateUserImpact(): string {
    const impactMap = {
      none: 'No impact - system operating normally',
      minimal: 'Minimal impact - slight performance reduction',
      moderate: 'Moderate impact - reduced functionality, slower responses',
      severe: 'Severe impact - limited functionality, significant delays',
      critical: 'Critical impact - emergency mode, basic operations only',
    };

    return impactMap[this.currentLevel];
  }

  private calculateStrategyImpact(strategy: DegradationStrategy): string {
    return strategy.actions.map(a => a.impact).join('; ');
  }

  private getAffectedSystems(strategy: DegradationStrategy): string[] {
    const systems = new Set<string>();

    strategy.actions.forEach(action => {
      switch (action.type) {
        case 'reduce_concurrency':
          systems.add('Processing Pipeline');
          break;
        case 'disable_features':
          systems.add('Feature Engine');
          break;
        case 'use_cache':
          systems.add('Caching Layer');
          break;
        default:
          systems.add('Core System');
      }
    });

    return Array.from(systems);
  }

  private notifyDegradationChange(event: DegradationEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener.onDegradationChange?.(event);
      } catch (error) {
        console.error('🔧 Error notifying degradation listener:', error);
      }
    });
  }

  private notifyActionApplied(action: DegradationAction, success: boolean): void {
    this.listeners.forEach(listener => {
      try {
        listener.onActionApplied?.(action, success);
      } catch (error) {
        console.error('🔧 Error notifying action listener:', error);
      }
    });
  }
}
