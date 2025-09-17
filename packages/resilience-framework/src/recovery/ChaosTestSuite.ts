/**
 * Chaos Engineering Test Suite
 * BIP-03 Implementation - Phase 4: Advanced Features
 *
 * @author Claude-4-Sonnet (Anthropic)
 * @version 1.0.0
 */

import { ModelIdentity, AITask } from '../types/index.js';

/**
 * Chaos experiment types
 */
export type ChaosExperimentType =
  | 'model_failure'
  | 'network_latency'
  | 'timeout_failure'
  | 'intermittent_errors'
  | 'resource_exhaustion'
  | 'cascade_failure'
  | 'partial_outage'
  | 'configuration_drift'
  | 'memory_leak'
  | 'cpu_spike';

/**
 * Experiment severity level
 */
export type ExperimentSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Experiment target scope
 */
export type ExperimentScope = 'single_model' | 'model_group' | 'service_layer' | 'system_wide';

/**
 * Chaos experiment configuration
 */
export interface ChaosExperiment {
  readonly id: string;
  readonly name: string;
  readonly type: ChaosExperimentType;
  readonly description: string;
  readonly severity: ExperimentSeverity;
  readonly scope: ExperimentScope;
  readonly targets: string[]; // model IDs or service names
  readonly duration: number; // milliseconds
  readonly parameters: Record<string, unknown>;
  readonly successCriteria: ExperimentSuccessCriteria;
  readonly rollbackStrategy: RollbackStrategy;
  readonly schedule?: ExperimentSchedule;
}

/**
 * Experiment success criteria
 */
export interface ExperimentSuccessCriteria {
  readonly maxResponseTime: number; // milliseconds
  readonly minSuccessRate: number; // 0-1
  readonly maxErrorRate: number; // 0-1
  readonly systemStability: boolean;
  readonly recoveryTime: number; // max recovery time in milliseconds
  readonly customMetrics?: Array<{
    metric: string;
    threshold: number;
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  }>;
}

/**
 * Rollback strategy
 */
export interface RollbackStrategy {
  readonly automatic: boolean;
  readonly triggers: RollbackTrigger[];
  readonly timeout: number; // max experiment time before rollback
  readonly actions: RollbackAction[];
}

/**
 * Rollback trigger conditions
 */
export interface RollbackTrigger {
  readonly condition: string;
  readonly threshold: number;
  readonly windowMs: number;
}

/**
 * Rollback actions
 */
export interface RollbackAction {
  readonly type: 'stop_experiment' | 'restore_config' | 'restart_services' | 'alert_team';
  readonly parameters: Record<string, unknown>;
}

/**
 * Experiment schedule
 */
export interface ExperimentSchedule {
  readonly enabled: boolean;
  readonly frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  readonly cron?: string; // For custom schedules
  readonly excludeHours?: number[]; // Hours to avoid (0-23)
  readonly excludeDays?: number[]; // Days to avoid (0-6, 0=Sunday)
}

/**
 * Experiment execution result
 */
export interface ExperimentResult {
  readonly experimentId: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly duration: number;
  readonly success: boolean;
  readonly status: 'completed' | 'failed' | 'cancelled' | 'timeout';
  readonly observations: ExperimentObservation[];
  readonly metrics: ExperimentMetrics;
  readonly failures: string[];
  readonly recommendations: string[];
}

/**
 * Experiment observation
 */
export interface ExperimentObservation {
  readonly timestamp: Date;
  readonly type: 'metric' | 'event' | 'error' | 'recovery';
  readonly source: string;
  readonly data: Record<string, unknown>;
  readonly severity: 'info' | 'warning' | 'error' | 'critical';
}

/**
 * Experiment metrics collected during execution
 */
export interface ExperimentMetrics {
  readonly responseTimeP50: number;
  readonly responseTimeP95: number;
  readonly responseTimeP99: number;
  readonly successRate: number;
  readonly errorRate: number;
  readonly throughput: number;
  readonly recoveryTime?: number;
  readonly systemLoad: number;
  readonly resourceUsage: {
    cpu: number;
    memory: number;
    network: number;
  };
}

/**
 * Chaos test execution context
 */
export interface ChaosTestContext {
  readonly experiment: ChaosExperiment;
  readonly environment: 'development' | 'staging' | 'production';
  readonly safetyChecks: boolean;
  readonly dryRun: boolean;
  readonly observers: string[]; // Team members to notify
}

/**
 * Chaos test listener interface
 */
export interface ChaosTestListener {
  onExperimentStarted?(experiment: ChaosExperiment): void;
  onObservationRecorded?(observation: ExperimentObservation): void;
  onExperimentCompleted?(result: ExperimentResult): void;
  onRollbackTriggered?(experimentId: string, reason: string): void;
}

/**
 * Failure injection interface
 */
export interface FailureInjector {
  injectFailure(type: ChaosExperimentType, parameters: Record<string, unknown>): Promise<boolean>;
  removeFailure(injectionId: string): Promise<boolean>;
  getActiveInjections(): Promise<string[]>;
}

/**
 * Comprehensive chaos engineering test suite
 */
export class ChaosTestSuite {
  private experiments = new Map<string, ChaosExperiment>();
  private activeExperiments = new Map<string, ChaosTestContext>();
  private experimentHistory: ExperimentResult[] = [];
  private listeners = new Set<ChaosTestListener>();
  private injectors = new Map<ChaosExperimentType, FailureInjector>();
  private scheduledExperiments = new Map<string, NodeJS.Timeout>();
  private isActive = false;

  // Safety controls
  private readonly maxConcurrentExperiments = 3;
  private readonly productionSafetyChecks = true;
  private readonly emergencyStopEnabled = true;

  constructor() {
    this.initializeDefaultExperiments();
    this.initializeDefaultInjectors();
  }

  /**
   * Start chaos testing suite
   */
  async start(): Promise<void> {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    console.log('🌪️ ChaosTestSuite started');
  }

  /**
   * Stop chaos testing suite
   */
  async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    // Stop all active experiments
    for (const experimentId of this.activeExperiments.keys()) {
      await this.stopExperiment(experimentId);
    }

    // Clear scheduled experiments
    for (const timeout of this.scheduledExperiments.values()) {
      clearTimeout(timeout);
    }
    this.scheduledExperiments.clear();

    console.log('🌪️ ChaosTestSuite stopped');
  }

  /**
   * Add chaos experiment
   */
  addExperiment(experiment: ChaosExperiment): void {
    this.experiments.set(experiment.id, experiment);

    // Schedule if configured
    if (experiment.schedule?.enabled) {
      this.scheduleExperiment(experiment);
    }

    console.log(`🌪️ Added chaos experiment: ${experiment.name}`);
  }

  /**
   * Remove chaos experiment
   */
  removeExperiment(experimentId: string): boolean {
    const removed = this.experiments.delete(experimentId);

    if (removed) {
      // Stop if active
      if (this.activeExperiments.has(experimentId)) {
        this.stopExperiment(experimentId);
      }

      // Clear schedule
      const timeout = this.scheduledExperiments.get(experimentId);
      if (timeout) {
        clearTimeout(timeout);
        this.scheduledExperiments.delete(experimentId);
      }

      console.log(`🌪️ Removed chaos experiment: ${experimentId}`);
    }

    return removed;
  }

  /**
   * Execute chaos experiment
   */
  async runExperiment(
    experimentId: string,
    context?: Partial<ChaosTestContext>
  ): Promise<ExperimentResult> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    // Check safety constraints
    if (!this.canRunExperiment(experiment, context)) {
      throw new Error('Safety constraints prevent experiment execution');
    }

    // Check concurrent limit
    if (this.activeExperiments.size >= this.maxConcurrentExperiments) {
      throw new Error(`Maximum concurrent experiments (${this.maxConcurrentExperiments}) exceeded`);
    }

    const fullContext: ChaosTestContext = {
      experiment,
      environment: 'development',
      safetyChecks: true,
      dryRun: false,
      observers: [],
      ...context,
    };

    this.activeExperiments.set(experimentId, fullContext);

    const result = await this.executeExperiment(fullContext);

    this.activeExperiments.delete(experimentId);
    this.experimentHistory.push(result);

    return result;
  }

  /**
   * Stop running experiment
   */
  async stopExperiment(experimentId: string): Promise<boolean> {
    const context = this.activeExperiments.get(experimentId);
    if (!context) {
      return false;
    }

    try {
      await this.executeRollback(context.experiment);
      this.activeExperiments.delete(experimentId);

      console.log(`🌪️ Stopped experiment: ${experimentId}`);
      return true;
    } catch (error) {
      console.error(`🌪️ Error stopping experiment ${experimentId}:`, error);
      return false;
    }
  }

  /**
   * Emergency stop all experiments
   */
  async emergencyStop(): Promise<void> {
    if (!this.emergencyStopEnabled) {
      throw new Error('Emergency stop is disabled');
    }

    console.log('🚨 EMERGENCY STOP: Halting all chaos experiments');

    const stopPromises = Array.from(this.activeExperiments.keys()).map(id =>
      this.stopExperiment(id)
    );

    await Promise.allSettled(stopPromises);

    console.log('🚨 Emergency stop completed');
  }

  /**
   * Get active experiments
   */
  getActiveExperiments(): ChaosExperiment[] {
    return Array.from(this.activeExperiments.values()).map(ctx => ctx.experiment);
  }

  /**
   * Get experiment history
   */
  getExperimentHistory(limit?: number): ExperimentResult[] {
    const history = [...this.experimentHistory].reverse(); // Most recent first
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get available experiments
   */
  getAvailableExperiments(): ChaosExperiment[] {
    return Array.from(this.experiments.values());
  }

  /**
   * Add experiment listener
   */
  addListener(listener: ChaosTestListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove experiment listener
   */
  removeListener(listener: ChaosTestListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Register failure injector
   */
  registerInjector(type: ChaosExperimentType, injector: FailureInjector): void {
    this.injectors.set(type, injector);
    console.log(`🌪️ Registered failure injector: ${type}`);
  }

  /**
   * Validate experiment safety
   */
  validateExperimentSafety(experiment: ChaosExperiment): {
    safe: boolean;
    warnings: string[];
    blockers: string[];
  } {
    const warnings: string[] = [];
    const blockers: string[] = [];

    // Check severity vs environment
    if (experiment.severity === 'critical' && this.productionSafetyChecks) {
      blockers.push('Critical experiments not allowed in production');
    }

    // Check duration
    if (experiment.duration > 3600000) { // 1 hour
      warnings.push('Experiment duration exceeds 1 hour');
    }

    // Check targets
    if (experiment.targets.length === 0) {
      blockers.push('No targets specified for experiment');
    }

    // Check rollback strategy
    if (!experiment.rollbackStrategy.automatic) {
      warnings.push('Manual rollback strategy requires monitoring');
    }

    return {
      safe: blockers.length === 0,
      warnings,
      blockers,
    };
  }

  /**
   * Generate experiment recommendations
   */
  generateRecommendations(): {
    suggested: ChaosExperiment[];
    priorities: string[];
    riskAssessment: string;
  } {
    const suggestions: ChaosExperiment[] = [];
    const priorities: string[] = [];

    // Analyze recent failures and suggest experiments
    const recentFailures = this.analyzeRecentFailures();

    if (recentFailures.networkIssues > 2) {
      priorities.push('Test network resilience');
      suggestions.push(this.createNetworkLatencyExperiment());
    }

    if (recentFailures.timeouts > 3) {
      priorities.push('Test timeout handling');
      suggestions.push(this.createTimeoutExperiment());
    }

    return {
      suggested: suggestions,
      priorities,
      riskAssessment: this.assessSystemRisk(),
    };
  }

  /**
   * Execute experiment with monitoring
   */
  private async executeExperiment(context: ChaosTestContext): Promise<ExperimentResult> {
    const { experiment } = context;
    const startTime = new Date();
    const observations: ExperimentObservation[] = [];
    const failures: string[] = [];

    let success = false;
    let status: ExperimentResult['status'] = 'failed';

    try {
      // Notify start
      this.notifyExperimentStarted(experiment);

      // Record baseline metrics
      const baselineMetrics = await this.collectMetrics();
      this.recordObservation(observations, 'metric', 'baseline', baselineMetrics as any, 'info');

      if (context.dryRun) {
        console.log(`🌪️ DRY RUN: Would execute experiment ${experiment.name}`);
        success = true;
        status = 'completed';
      } else {
        // Inject failure
        const injectionSuccess = await this.injectFailure(experiment);

        if (!injectionSuccess) {
          failures.push('Failed to inject failure');
          status = 'failed';
        } else {
          // Monitor experiment
          const monitoringResult = await this.monitorExperiment(experiment, observations);

          // Check success criteria
          success = this.evaluateSuccessCriteria(experiment, monitoringResult.finalMetrics);
          status = success ? 'completed' : 'failed';

          // Execute rollback
          await this.executeRollback(experiment);
        }
      }

    } catch (error) {
      failures.push(`Experiment execution error: ${error}`);
      status = 'failed';

      // Emergency rollback
      try {
        await this.executeRollback(experiment);
      } catch (rollbackError) {
        failures.push(`Rollback failed: ${rollbackError}`);
      }
    }

    const endTime = new Date();
    const finalMetrics = await this.collectMetrics();

    const result: ExperimentResult = {
      experimentId: experiment.id,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      success,
      status,
      observations,
      metrics: finalMetrics,
      failures,
      recommendations: this.generateExperimentRecommendations(experiment, observations),
    };

    this.notifyExperimentCompleted(result);
    return result;
  }

  /**
   * Inject failure based on experiment type
   */
  private async injectFailure(experiment: ChaosExperiment): Promise<boolean> {
    const injector = this.injectors.get(experiment.type);
    if (!injector) {
      console.warn(`🌪️ No injector available for experiment type: ${experiment.type}`);
      return false;
    }

    try {
      return await injector.injectFailure(experiment.type, experiment.parameters);
    } catch (error) {
      console.error(`🌪️ Failed to inject failure for ${experiment.type}:`, error);
      return false;
    }
  }

  /**
   * Monitor experiment execution
   */
  private async monitorExperiment(
    experiment: ChaosExperiment,
    observations: ExperimentObservation[]
  ): Promise<{ finalMetrics: ExperimentMetrics }> {
    const monitoringInterval = 5000; // 5 seconds
    const endTime = Date.now() + experiment.duration;

    while (Date.now() < endTime) {
      try {
        const metrics = await this.collectMetrics();
        this.recordObservation(observations, 'metric', 'monitoring', metrics as any, 'info');

        // Check rollback triggers
        if (this.shouldTriggerRollback(experiment, metrics)) {
          this.notifyRollbackTriggered(experiment.id, 'Rollback trigger activated');
          break;
        }

        await this.delay(monitoringInterval);
      } catch (error) {
        this.recordObservation(observations, 'error', 'monitoring', { error: String(error) }, 'error');
      }
    }

    const finalMetrics = await this.collectMetrics();
    return { finalMetrics };
  }

  /**
   * Execute rollback strategy
   */
  private async executeRollback(experiment: ChaosExperiment): Promise<void> {
    console.log(`🌪️ Executing rollback for experiment: ${experiment.name}`);

    // Remove injected failures
    const injector = this.injectors.get(experiment.type);
    if (injector) {
      const activeInjections = await injector.getActiveInjections();
      for (const injectionId of activeInjections) {
        await injector.removeFailure(injectionId);
      }
    }

    // Execute rollback actions
    for (const action of experiment.rollbackStrategy.actions) {
      try {
        await this.executeRollbackAction(action);
      } catch (error) {
        console.error(`🌪️ Rollback action failed:`, error);
      }
    }
  }

  /**
   * Collect system metrics
   */
  private async collectMetrics(): Promise<ExperimentMetrics> {
    // Simulate metrics collection
    // In real implementation, this would gather actual system metrics
    return {
      responseTimeP50: Math.random() * 1000 + 500,
      responseTimeP95: Math.random() * 2000 + 1000,
      responseTimeP99: Math.random() * 5000 + 2000,
      successRate: Math.random() * 0.2 + 0.8, // 80-100%
      errorRate: Math.random() * 0.1, // 0-10%
      throughput: Math.random() * 1000 + 500,
      systemLoad: Math.random() * 0.5 + 0.3, // 30-80%
      resourceUsage: {
        cpu: Math.random() * 0.4 + 0.3, // 30-70%
        memory: Math.random() * 0.3 + 0.4, // 40-70%
        network: Math.random() * 0.2 + 0.2, // 20-40%
      },
    };
  }

  /**
   * Initialize default chaos experiments
   */
  private initializeDefaultExperiments(): void {
    const defaultExperiments: ChaosExperiment[] = [
      {
        id: 'model-failure-test',
        name: 'Model Failure Test',
        type: 'model_failure',
        description: 'Test system resilience when a primary model fails',
        severity: 'medium',
        scope: 'single_model',
        targets: ['primary-model'],
        duration: 300000, // 5 minutes
        parameters: {
          failureRate: 1.0, // 100% failure
        },
        successCriteria: {
          maxResponseTime: 10000,
          minSuccessRate: 0.8,
          maxErrorRate: 0.2,
          systemStability: true,
          recoveryTime: 30000,
        },
        rollbackStrategy: {
          automatic: true,
          triggers: [
            {
              condition: 'system_error_rate',
              threshold: 0.5,
              windowMs: 60000,
            },
          ],
          timeout: 600000, // 10 minutes max
          actions: [
            {
              type: 'stop_experiment',
              parameters: {},
            },
          ],
        },
      },
      {
        id: 'network-latency-test',
        name: 'Network Latency Test',
        type: 'network_latency',
        description: 'Test system behavior under network latency conditions',
        severity: 'low',
        scope: 'service_layer',
        targets: ['all-models'],
        duration: 600000, // 10 minutes
        parameters: {
          latencyMs: 2000, // 2 second delay
          jitter: 500, // ±500ms jitter
        },
        successCriteria: {
          maxResponseTime: 8000,
          minSuccessRate: 0.9,
          maxErrorRate: 0.1,
          systemStability: true,
          recoveryTime: 60000,
        },
        rollbackStrategy: {
          automatic: true,
          triggers: [],
          timeout: 900000, // 15 minutes max
          actions: [
            {
              type: 'stop_experiment',
              parameters: {},
            },
          ],
        },
      },
    ];

    defaultExperiments.forEach(exp => this.addExperiment(exp));
  }

  /**
   * Initialize default failure injectors
   */
  private initializeDefaultInjectors(): void {
    // Register mock injectors for demonstration
    this.registerInjector('model_failure', new MockFailureInjector());
    this.registerInjector('network_latency', new MockLatencyInjector());
    this.registerInjector('timeout_failure', new MockTimeoutInjector());
  }

  /**
   * Helper methods
   */
  private canRunExperiment(experiment: ChaosExperiment, context?: Partial<ChaosTestContext>): boolean {
    // Safety checks
    if (context?.environment === 'production' && experiment.severity === 'critical') {
      return false;
    }

    if (context?.safetyChecks && !experiment.rollbackStrategy.automatic) {
      return false;
    }

    return true;
  }

  private shouldTriggerRollback(experiment: ChaosExperiment, metrics: ExperimentMetrics): boolean {
    for (const trigger of experiment.rollbackStrategy.triggers) {
      switch (trigger.condition) {
        case 'system_error_rate':
          if (metrics.errorRate > trigger.threshold) return true;
          break;
        case 'response_time':
          if (metrics.responseTimeP95 > trigger.threshold) return true;
          break;
        case 'system_load':
          if (metrics.systemLoad > trigger.threshold) return true;
          break;
      }
    }
    return false;
  }

  private evaluateSuccessCriteria(experiment: ChaosExperiment, metrics: ExperimentMetrics): boolean {
    const criteria = experiment.successCriteria;

    if (metrics.responseTimeP95 > criteria.maxResponseTime) return false;
    if (metrics.successRate < criteria.minSuccessRate) return false;
    if (metrics.errorRate > criteria.maxErrorRate) return false;

    return true;
  }

  private recordObservation(
    observations: ExperimentObservation[],
    type: ExperimentObservation['type'],
    source: string,
    data: Record<string, unknown>,
    severity: ExperimentObservation['severity']
  ): void {
    const observation: ExperimentObservation = {
      timestamp: new Date(),
      type,
      source,
      data,
      severity,
    };

    observations.push(observation);
    this.notifyObservationRecorded(observation);
  }

  private async executeRollbackAction(action: RollbackAction): Promise<void> {
    console.log(`🌪️ Executing rollback action: ${action.type}`);

    switch (action.type) {
      case 'stop_experiment':
        // Already handled by experiment termination
        break;
      case 'restart_services':
        console.log('🔄 Restarting affected services');
        break;
      case 'alert_team':
        console.log('📢 Alerting response team');
        break;
      default:
        console.warn(`Unknown rollback action: ${action.type}`);
    }
  }

  private scheduleExperiment(experiment: ChaosExperiment): void {
    if (!experiment.schedule?.enabled) return;

    // Simple scheduling - run every hour for demonstration
    const interval = 3600000; // 1 hour

    const timeout = setInterval(() => {
      this.runExperiment(experiment.id, { dryRun: false })
        .catch(error => console.error(`🌪️ Scheduled experiment failed:`, error));
    }, interval);

    this.scheduledExperiments.set(experiment.id, timeout as any);
  }

  private analyzeRecentFailures(): {
    networkIssues: number;
    timeouts: number;
    modelFailures: number;
  } {
    // Simple mock analysis
    return {
      networkIssues: Math.floor(Math.random() * 5),
      timeouts: Math.floor(Math.random() * 5),
      modelFailures: Math.floor(Math.random() * 3),
    };
  }

  private assessSystemRisk(): string {
    const activeCount = this.activeExperiments.size;

    if (activeCount === 0) return 'Low risk - no active experiments';
    if (activeCount <= 2) return 'Medium risk - controlled experimentation';
    return 'High risk - multiple concurrent experiments';
  }

  private createNetworkLatencyExperiment(): ChaosExperiment {
    return {
      id: `network-latency-${Date.now()}`,
      name: 'Generated Network Latency Test',
      type: 'network_latency',
      description: 'Auto-generated based on recent network issues',
      severity: 'low',
      scope: 'service_layer',
      targets: ['all'],
      duration: 300000,
      parameters: { latencyMs: 1000 },
      successCriteria: {
        maxResponseTime: 5000,
        minSuccessRate: 0.9,
        maxErrorRate: 0.1,
        systemStability: true,
        recoveryTime: 30000,
      },
      rollbackStrategy: {
        automatic: true,
        triggers: [],
        timeout: 600000,
        actions: [{ type: 'stop_experiment', parameters: {} }],
      },
    };
  }

  private createTimeoutExperiment(): ChaosExperiment {
    return {
      id: `timeout-test-${Date.now()}`,
      name: 'Generated Timeout Test',
      type: 'timeout_failure',
      description: 'Auto-generated based on recent timeout issues',
      severity: 'medium',
      scope: 'single_model',
      targets: ['primary'],
      duration: 180000,
      parameters: { timeoutMs: 1000 },
      successCriteria: {
        maxResponseTime: 8000,
        minSuccessRate: 0.85,
        maxErrorRate: 0.15,
        systemStability: true,
        recoveryTime: 45000,
      },
      rollbackStrategy: {
        automatic: true,
        triggers: [],
        timeout: 300000,
        actions: [{ type: 'stop_experiment', parameters: {} }],
      },
    };
  }

  private generateExperimentRecommendations(
    experiment: ChaosExperiment,
    observations: ExperimentObservation[]
  ): string[] {
    const recommendations: string[] = [];

    const errorObservations = observations.filter(o => o.severity === 'error');
    if (errorObservations.length > 0) {
      recommendations.push('Review error handling mechanisms');
    }

    const criticalObservations = observations.filter(o => o.severity === 'critical');
    if (criticalObservations.length > 0) {
      recommendations.push('Implement additional safeguards');
    }

    recommendations.push('Continue regular chaos testing');

    return recommendations;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Notification methods
   */
  private notifyExperimentStarted(experiment: ChaosExperiment): void {
    this.listeners.forEach(listener => {
      try {
        listener.onExperimentStarted?.(experiment);
      } catch (error) {
        console.error('🌪️ Error notifying experiment start:', error);
      }
    });
  }

  private notifyObservationRecorded(observation: ExperimentObservation): void {
    this.listeners.forEach(listener => {
      try {
        listener.onObservationRecorded?.(observation);
      } catch (error) {
        console.error('🌪️ Error notifying observation:', error);
      }
    });
  }

  private notifyExperimentCompleted(result: ExperimentResult): void {
    this.listeners.forEach(listener => {
      try {
        listener.onExperimentCompleted?.(result);
      } catch (error) {
        console.error('🌪️ Error notifying experiment completion:', error);
      }
    });
  }

  private notifyRollbackTriggered(experimentId: string, reason: string): void {
    this.listeners.forEach(listener => {
      try {
        listener.onRollbackTriggered?.(experimentId, reason);
      } catch (error) {
        console.error('🌪️ Error notifying rollback:', error);
      }
    });
  }
}

/**
 * Mock failure injectors for demonstration
 */
class MockFailureInjector implements FailureInjector {
  private activeInjections = new Set<string>();

  async injectFailure(type: ChaosExperimentType, parameters: Record<string, unknown>): Promise<boolean> {
    const injectionId = `${type}-${Date.now()}`;
    this.activeInjections.add(injectionId);
    console.log(`🔧 Injected ${type} failure`);
    return true;
  }

  async removeFailure(injectionId: string): Promise<boolean> {
    const removed = this.activeInjections.delete(injectionId);
    if (removed) {
      console.log(`🔧 Removed failure injection: ${injectionId}`);
    }
    return removed;
  }

  async getActiveInjections(): Promise<string[]> {
    return Array.from(this.activeInjections);
  }
}

class MockLatencyInjector implements FailureInjector {
  private activeInjections = new Set<string>();

  async injectFailure(type: ChaosExperimentType, parameters: Record<string, unknown>): Promise<boolean> {
    const injectionId = `${type}-${Date.now()}`;
    const latency = parameters.latencyMs as number || 1000;
    this.activeInjections.add(injectionId);
    console.log(`🐌 Injected ${latency}ms network latency`);
    return true;
  }

  async removeFailure(injectionId: string): Promise<boolean> {
    const removed = this.activeInjections.delete(injectionId);
    if (removed) {
      console.log(`🚀 Removed latency injection: ${injectionId}`);
    }
    return removed;
  }

  async getActiveInjections(): Promise<string[]> {
    return Array.from(this.activeInjections);
  }
}

class MockTimeoutInjector implements FailureInjector {
  private activeInjections = new Set<string>();

  async injectFailure(type: ChaosExperimentType, parameters: Record<string, unknown>): Promise<boolean> {
    const injectionId = `${type}-${Date.now()}`;
    const timeout = parameters.timeoutMs as number || 5000;
    this.activeInjections.add(injectionId);
    console.log(`⏰ Injected ${timeout}ms timeout failures`);
    return true;
  }

  async removeFailure(injectionId: string): Promise<boolean> {
    const removed = this.activeInjections.delete(injectionId);
    if (removed) {
      console.log(`✅ Removed timeout injection: ${injectionId}`);
    }
    return removed;
  }

  async getActiveInjections(): Promise<string[]> {
    return Array.from(this.activeInjections);
  }
}
