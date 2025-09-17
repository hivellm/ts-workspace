/**
 * Performance Optimization Engine
 * BIP-03 Implementation - Phase 4: Advanced Features
 *
 * @author Claude-4-Sonnet (Anthropic)
 * @version 1.0.0
 */

import { ModelIdentity, AITask } from '../types/index.js';
import { PerformanceMetrics } from '../fallback/FallbackManager.js';

/**
 * Optimization strategy types
 */
export type OptimizationStrategy =
  | 'latency_focused'
  | 'throughput_focused'
  | 'cost_focused'
  | 'balanced'
  | 'adaptive'
  | 'ml_driven'
  | 'resource_efficient'
  | 'user_experience';

/**
 * Optimization technique types
 */
export type OptimizationTechnique =
  | 'request_batching'
  | 'response_caching'
  | 'connection_pooling'
  | 'request_compression'
  | 'parallel_processing'
  | 'lazy_loading'
  | 'prefetching'
  | 'model_warming'
  | 'resource_scaling'
  | 'intelligent_routing';

/**
 * Performance bottleneck types
 */
export type BottleneckType =
  | 'cpu_bound'
  | 'memory_bound'
  | 'network_bound'
  | 'io_bound'
  | 'model_latency'
  | 'queue_congestion'
  | 'resource_contention'
  | 'serialization'
  | 'garbage_collection';

/**
 * Optimization configuration
 */
export interface OptimizationConfig {
  readonly strategy: OptimizationStrategy;
  readonly enabledTechniques: OptimizationTechnique[];
  readonly aggressiveness: 'conservative' | 'moderate' | 'aggressive';
  readonly adaptiveLearning: boolean;
  readonly monitoringInterval: number; // milliseconds
  readonly optimizationInterval: number; // milliseconds
  readonly rollbackOnFailure: boolean;
}

/**
 * Performance target configuration
 */
export interface PerformanceTarget {
  readonly responseTimeP50: number; // milliseconds
  readonly responseTimeP95: number; // milliseconds
  readonly responseTimeP99: number; // milliseconds
  readonly throughputRps: number; // requests per second
  readonly errorRate: number; // 0-1
  readonly resourceUtilization: number; // 0-1
  readonly costPerRequest: number; // monetary units
}

/**
 * Optimization technique configuration
 */
export interface OptimizationTechniqueConfig {
  readonly technique: OptimizationTechnique;
  readonly enabled: boolean;
  readonly parameters: Record<string, unknown>;
  readonly impact: 'low' | 'medium' | 'high';
  readonly risk: 'low' | 'medium' | 'high';
  readonly prerequisites?: OptimizationTechnique[];
}

/**
 * Performance bottleneck analysis
 */
export interface BottleneckAnalysis {
  readonly type: BottleneckType;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly component: string; // model ID or system component
  readonly impact: number; // 0-1, percentage of total performance impact
  readonly root_cause: string;
  readonly recommendations: OptimizationRecommendation[];
  readonly confidence: number; // 0-1
}

/**
 * Optimization recommendation
 */
export interface OptimizationRecommendation {
  readonly technique: OptimizationTechnique;
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly estimatedImprovement: number; // percentage improvement
  readonly estimatedEffort: 'low' | 'medium' | 'high';
  readonly riskLevel: 'low' | 'medium' | 'high';
  readonly rationale: string;
  readonly parameters: Record<string, unknown>;
}

/**
 * Optimization result
 */
export interface OptimizationResult {
  readonly technique: OptimizationTechnique;
  readonly applied: boolean;
  readonly beforeMetrics: PerformanceMetrics;
  readonly afterMetrics: PerformanceMetrics;
  readonly improvement: {
    responseTime: number; // percentage
    throughput: number; // percentage
    errorRate: number; // percentage
    resourceUsage: number; // percentage
  };
  readonly duration: number; // milliseconds to apply
  readonly rollbackAvailable: boolean;
}

/**
 * ML-driven optimization model
 */
export interface MLOptimizationModel {
  readonly modelId: string;
  readonly version: string;
  readonly features: string[];
  readonly accuracy: number; // 0-1
  readonly lastTrained: Date;
  readonly predictions: OptimizationPrediction[];
}

/**
 * Optimization prediction
 */
export interface OptimizationPrediction {
  readonly technique: OptimizationTechnique;
  readonly expectedImprovement: number; // percentage
  readonly confidence: number; // 0-1
  readonly context: Record<string, unknown>;
}

/**
 * Resource allocation optimization
 */
export interface ResourceAllocation {
  readonly cpu: number; // cores or percentage
  readonly memory: number; // MB or percentage
  readonly network: number; // Mbps or percentage
  readonly storage: number; // GB or percentage
  readonly connections: number; // max concurrent connections
}

/**
 * Caching optimization configuration
 */
export interface CacheOptimization {
  readonly strategy: 'lru' | 'lfu' | 'ttl' | 'adaptive';
  readonly maxSize: number; // entries or MB
  readonly ttl: number; // milliseconds
  readonly hitRateTarget: number; // 0-1
  readonly evictionPolicy: 'aggressive' | 'conservative';
  readonly preloadStrategies: string[];
}

/**
 * Optimization event
 */
export interface OptimizationEvent {
  readonly type: 'optimization_started' | 'technique_applied' | 'bottleneck_detected' | 'target_achieved' | 'rollback_triggered';
  readonly timestamp: Date;
  readonly technique?: OptimizationTechnique;
  readonly component?: string;
  readonly details: Record<string, unknown>;
}

/**
 * Optimization listener interface
 */
export interface OptimizationListener {
  onOptimizationStarted?(strategy: OptimizationStrategy): void;
  onTechniqueApplied?(result: OptimizationResult): void;
  onBottleneckDetected?(analysis: BottleneckAnalysis): void;
  onTargetAchieved?(target: PerformanceTarget, metrics: PerformanceMetrics): void;
  onRollbackTriggered?(technique: OptimizationTechnique, reason: string): void;
}

/**
 * Advanced performance optimization engine
 */
export class OptimizationEngine {
  private config: OptimizationConfig;
  private performanceTargets = new Map<string, PerformanceTarget>();
  private appliedOptimizations = new Map<string, OptimizationResult[]>();
  private performanceHistory = new Map<string, PerformanceMetrics[]>();
  private bottleneckHistory: BottleneckAnalysis[] = [];
  private listeners = new Set<OptimizationListener>();
  private mlModel?: MLOptimizationModel;
  private isActive = false;
  private monitoringInterval?: NodeJS.Timeout;
  private optimizationInterval?: NodeJS.Timeout;

  // Optimization state
  private resourceAllocations = new Map<string, ResourceAllocation>();
  private cacheConfigurations = new Map<string, CacheOptimization>();
  private techniqueEffectiveness = new Map<OptimizationTechnique, number>();
  private currentOptimizations = new Set<OptimizationTechnique>();
  private optimizationQueue: OptimizationRecommendation[] = [];

  constructor(config: OptimizationConfig = {
    strategy: 'adaptive',
    enabledTechniques: ['response_caching', 'connection_pooling', 'parallel_processing'],
    aggressiveness: 'moderate',
    adaptiveLearning: true,
    monitoringInterval: 30000, // 30 seconds
    optimizationInterval: 300000, // 5 minutes
    rollbackOnFailure: true,
  }) {
    this.config = config;
    this.initializeTechniqueEffectiveness();
  }

  /**
   * Start optimization engine
   */
  async start(): Promise<void> {
    if (this.isActive) {
      return;
    }

    this.isActive = true;

    // Start monitoring
    this.monitoringInterval = setInterval(
      () => this.monitorPerformance(),
      this.config.monitoringInterval
    );

    // Start optimization cycles
    this.optimizationInterval = setInterval(
      () => this.runOptimizationCycle(),
      this.config.optimizationInterval
    );

    console.log('🚀 OptimizationEngine started with strategy:', this.config.strategy);
  }

  /**
   * Stop optimization engine
   */
  async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined as any;
    }

    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = undefined as any;
    }

    console.log('🚀 OptimizationEngine stopped');
  }

  /**
   * Set performance targets
   */
  setPerformanceTargets(component: string, targets: PerformanceTarget): void {
    this.performanceTargets.set(component, targets);
    console.log(`🎯 Set performance targets for ${component}`);
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(component: string, metrics: PerformanceMetrics): void {
    let history = this.performanceHistory.get(component);
    if (!history) {
      history = [];
      this.performanceHistory.set(component, history);
    }

    history.push(metrics);

    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }

    // Trigger immediate analysis if significant performance change
    if (this.shouldTriggerImmediateOptimization(component, metrics)) {
      this.analyzeAndOptimize(component);
    }
  }

  /**
   * Manually trigger optimization for a component
   */
  async optimizeComponent(component: string): Promise<OptimizationResult[]> {
    const results = await this.analyzeAndOptimize(component);
    return results;
  }

  /**
   * Apply specific optimization technique
   */
  async applyOptimization(
    component: string,
    technique: OptimizationTechnique,
    parameters?: Record<string, unknown>
  ): Promise<OptimizationResult> {
    const beforeMetrics = this.getCurrentMetrics(component);

    if (!beforeMetrics) {
      throw new Error(`No performance metrics available for component: ${component}`);
    }

    console.log(`🔧 Applying ${technique} optimization to ${component}`);

    const success = await this.executeTechnique(component, technique, parameters || {});

    // Wait for stabilization
    await this.delay(5000);

    const afterMetrics = this.getCurrentMetrics(component) || beforeMetrics;

    const improvement = this.calculateImprovement(beforeMetrics, afterMetrics);

    const result: OptimizationResult = {
      technique,
      applied: success,
      beforeMetrics,
      afterMetrics,
      improvement,
      duration: 5000, // Simplified
      rollbackAvailable: this.canRollback(technique),
    };

    // Store result
    let componentResults = this.appliedOptimizations.get(component);
    if (!componentResults) {
      componentResults = [];
      this.appliedOptimizations.set(component, componentResults);
    }
    componentResults.push(result);

    // Update technique effectiveness
    if (this.config.adaptiveLearning) {
      this.updateTechniqueEffectiveness(technique, improvement);
    }

    this.notifyTechniqueApplied(result);
    return result;
  }

  /**
   * Rollback optimization
   */
  async rollbackOptimization(component: string, technique: OptimizationTechnique): Promise<boolean> {
    if (!this.canRollback(technique)) {
      return false;
    }

    console.log(`🔄 Rolling back ${technique} optimization for ${component}`);

    const success = await this.executeRollback(component, technique);

    if (success) {
      this.currentOptimizations.delete(technique);
      this.notifyRollbackTriggered(technique, 'Manual rollback requested');
    }

    return success;
  }

  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations(component: string): Promise<OptimizationRecommendation[]> {
    const metrics = this.getCurrentMetrics(component);
    if (!metrics) {
      return [];
    }

    const bottlenecks = await this.analyzeBottlenecks(component, metrics);
    const recommendations: OptimizationRecommendation[] = [];

    for (const bottleneck of bottlenecks) {
      recommendations.push(...bottleneck.recommendations);
    }

    // Sort by priority and estimated improvement
    recommendations.sort((a, b) => {
      const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      return (priorityWeight[b.priority] * b.estimatedImprovement) -
             (priorityWeight[a.priority] * a.estimatedImprovement);
    });

    return recommendations;
  }

  /**
   * Get optimization status
   */
  getOptimizationStatus(): {
    strategy: OptimizationStrategy;
    activeOptimizations: OptimizationTechnique[];
    queuedOptimizations: number;
    totalOptimizationsApplied: number;
    averageImprovement: number;
  } {
    const allResults = Array.from(this.appliedOptimizations.values()).flat();
    const totalApplied = allResults.length;
    const averageImprovement = totalApplied > 0
      ? allResults.reduce((sum, r) => sum + r.improvement.responseTime, 0) / totalApplied
      : 0;

    return {
      strategy: this.config.strategy,
      activeOptimizations: Array.from(this.currentOptimizations),
      queuedOptimizations: this.optimizationQueue.length,
      totalOptimizationsApplied: totalApplied,
      averageImprovement,
    };
  }

  /**
   * Get bottleneck analysis history
   */
  getBottleneckHistory(limit?: number): BottleneckAnalysis[] {
    const history = [...this.bottleneckHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Update optimization configuration
   */
  updateConfiguration(newConfig: Partial<OptimizationConfig>): void {
    const oldStrategy = this.config.strategy;
    this.config = { ...this.config, ...newConfig };

    if (oldStrategy !== this.config.strategy) {
      console.log(`🚀 Optimization strategy changed: ${oldStrategy} → ${this.config.strategy}`);
    }
  }

  /**
   * Train ML optimization model
   */
  async trainMLModel(trainingData: Array<{
    context: Record<string, unknown>;
    technique: OptimizationTechnique;
    improvement: number;
  }>): Promise<void> {
    console.log(`🧠 Training ML optimization model with ${trainingData.length} samples`);

    // Simple mock ML model for demonstration
    const features = ['responseTime', 'throughput', 'errorRate', 'resourceUsage'];
    const predictions: OptimizationPrediction[] = [];

    // Generate predictions based on training data patterns
    for (const technique of this.config.enabledTechniques) {
      const relevantData = trainingData.filter(d => d.technique === technique);
      const avgImprovement = relevantData.length > 0
        ? relevantData.reduce((sum, d) => sum + d.improvement, 0) / relevantData.length
        : 0;

      predictions.push({
        technique,
        expectedImprovement: avgImprovement,
        confidence: Math.min(1, relevantData.length / 10), // Higher confidence with more data
        context: {},
      });
    }

    this.mlModel = {
      modelId: 'optimization-model-v1',
      version: '1.0.0',
      features,
      accuracy: 0.75, // Mock accuracy
      lastTrained: new Date(),
      predictions,
    };

    console.log('🧠 ML optimization model trained successfully');
  }

  /**
   * Add optimization listener
   */
  addListener(listener: OptimizationListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove optimization listener
   */
  removeListener(listener: OptimizationListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Monitor performance across all components
   */
  private async monitorPerformance(): Promise<void> {
    try {
      for (const [component] of this.performanceHistory) {
        const metrics = this.getCurrentMetrics(component);
        if (!metrics) continue;

        // Check if targets are being met
        const targets = this.performanceTargets.get(component);
        if (targets && !this.areTargetsMet(metrics, targets)) {
          console.log(`📊 Performance targets not met for ${component}`);

          // Add to optimization queue if not already optimizing
          if (!this.isOptimizing(component)) {
            const recommendations = await this.getOptimizationRecommendations(component);
            this.optimizationQueue.push(...recommendations.slice(0, 3)); // Top 3 recommendations
          }
        }
      }
    } catch (error) {
      console.error('🚀 Error during performance monitoring:', error);
    }
  }

  /**
   * Run optimization cycle
   */
  private async runOptimizationCycle(): Promise<void> {
    if (this.optimizationQueue.length === 0) {
      return;
    }

    console.log(`🔄 Running optimization cycle with ${this.optimizationQueue.length} queued optimizations`);

    // Process top recommendation
    const recommendation = this.optimizationQueue.shift();
    if (!recommendation) return;

    try {
      // Find component that needs this optimization
      const component = this.findComponentForOptimization(recommendation);
      if (component) {
        await this.applyOptimization(component, recommendation.technique, recommendation.parameters);
      }
    } catch (error) {
      console.error(`🚀 Error applying optimization ${recommendation.technique}:`, error);
    }
  }

  /**
   * Analyze and optimize a specific component
   */
  private async analyzeAndOptimize(component: string): Promise<OptimizationResult[]> {
    const metrics = this.getCurrentMetrics(component);
    if (!metrics) {
      return [];
    }

    // Analyze bottlenecks
    const bottlenecks = await this.analyzeBottlenecks(component, metrics);

    // Get recommendations
    const recommendations = await this.getOptimizationRecommendations(component);

    const results: OptimizationResult[] = [];

    // Apply top recommendations based on strategy
    const toApply = this.selectOptimizationsToApply(recommendations);

    for (const recommendation of toApply) {
      try {
        const result = await this.applyOptimization(
          component,
          recommendation.technique,
          recommendation.parameters
        );
        results.push(result);
      } catch (error) {
        console.error(`🚀 Failed to apply ${recommendation.technique}:`, error);
      }
    }

    return results;
  }

  /**
   * Analyze performance bottlenecks
   */
  private async analyzeBottlenecks(component: string, metrics: PerformanceMetrics): Promise<BottleneckAnalysis[]> {
    const bottlenecks: BottleneckAnalysis[] = [];

    // CPU bottleneck analysis
    if (metrics.resourceUsage && metrics.resourceUsage.cpu > 0.8) {
      bottlenecks.push({
        type: 'cpu_bound',
        severity: 'high',
        component,
        impact: 0.7,
        root_cause: 'High CPU utilization detected',
        confidence: 0.85,
        recommendations: [
          {
            technique: 'parallel_processing',
            priority: 'high',
            estimatedImprovement: 30,
            estimatedEffort: 'medium',
            riskLevel: 'low',
            rationale: 'Parallelize processing to distribute CPU load',
            parameters: { workerCount: 4 },
          },
        ],
      });
    }

    // Memory bottleneck analysis
    if (metrics.resourceUsage && metrics.resourceUsage.memory > 0.9) {
      bottlenecks.push({
        type: 'memory_bound',
        severity: 'critical',
        component,
        impact: 0.8,
        root_cause: 'Memory utilization approaching limits',
        confidence: 0.9,
        recommendations: [
          {
            technique: 'response_caching',
            priority: 'critical',
            estimatedImprovement: 40,
            estimatedEffort: 'low',
            riskLevel: 'low',
            rationale: 'Implement aggressive caching to reduce memory pressure',
            parameters: { maxSize: '500MB', strategy: 'lru' },
          },
        ],
      });
    }

    // Latency bottleneck analysis
    if (metrics.averageResponseTime > 5000) { // > 5 seconds
      bottlenecks.push({
        type: 'model_latency',
        severity: 'high',
        component,
        impact: 0.6,
        root_cause: 'High response times detected',
        confidence: 0.8,
        recommendations: [
          {
            technique: 'model_warming',
            priority: 'high',
            estimatedImprovement: 25,
            estimatedEffort: 'low',
            riskLevel: 'low',
            rationale: 'Pre-warm models to reduce cold start latency',
            parameters: { warmupRequests: 10 },
          },
          {
            technique: 'prefetching',
            priority: 'medium',
            estimatedImprovement: 20,
            estimatedEffort: 'medium',
            riskLevel: 'medium',
            rationale: 'Prefetch likely requests to improve response times',
            parameters: { prefetchRatio: 0.3 },
          },
        ],
      });
    }

    // Store bottleneck analysis
    bottlenecks.forEach(bottleneck => {
      this.bottleneckHistory.push(bottleneck);
      this.notifyBottleneckDetected(bottleneck);
    });

    // Keep only last 50 bottleneck analyses
    if (this.bottleneckHistory.length > 50) {
      this.bottleneckHistory = this.bottleneckHistory.slice(-50);
    }

    return bottlenecks;
  }

  /**
   * Execute optimization technique
   */
  private async executeTechnique(
    component: string,
    technique: OptimizationTechnique,
    parameters: Record<string, unknown>
  ): Promise<boolean> {
    try {
      switch (technique) {
        case 'request_batching':
          return this.executeRequestBatching(component, parameters);

        case 'response_caching':
          return this.executeResponseCaching(component, parameters);

        case 'connection_pooling':
          return this.executeConnectionPooling(component, parameters);

        case 'request_compression':
          return this.executeRequestCompression(component, parameters);

        case 'parallel_processing':
          return this.executeParallelProcessing(component, parameters);

        case 'lazy_loading':
          return this.executeLazyLoading(component, parameters);

        case 'prefetching':
          return this.executePrefetching(component, parameters);

        case 'model_warming':
          return this.executeModelWarming(component, parameters);

        case 'resource_scaling':
          return this.executeResourceScaling(component, parameters);

        case 'intelligent_routing':
          return this.executeIntelligentRouting(component, parameters);

        default:
          console.warn(`🚀 Unknown optimization technique: ${technique}`);
          return false;
      }
    } catch (error) {
      console.error(`🚀 Error executing ${technique}:`, error);
      return false;
    }
  }

  /**
   * Optimization technique implementations
   */
  private async executeRequestBatching(component: string, params: Record<string, unknown>): Promise<boolean> {
    const batchSize = params.batchSize as number || 10;
    console.log(`📦 Enabling request batching for ${component} (batch size: ${batchSize})`);
    this.currentOptimizations.add('request_batching');
    return true;
  }

  private async executeResponseCaching(component: string, params: Record<string, unknown>): Promise<boolean> {
    const maxSize = params.maxSize as string || '100MB';
    const strategy = params.strategy as string || 'lru';
    console.log(`💾 Enabling response caching for ${component} (${maxSize}, ${strategy})`);

    this.cacheConfigurations.set(component, {
      strategy: strategy as any,
      maxSize: parseInt(maxSize) || 100,
      ttl: 300000, // 5 minutes
      hitRateTarget: 0.8,
      evictionPolicy: 'conservative',
      preloadStrategies: [],
    });

    this.currentOptimizations.add('response_caching');
    return true;
  }

  private async executeConnectionPooling(component: string, params: Record<string, unknown>): Promise<boolean> {
    const poolSize = params.poolSize as number || 20;
    console.log(`🔗 Enabling connection pooling for ${component} (pool size: ${poolSize})`);
    this.currentOptimizations.add('connection_pooling');
    return true;
  }

  private async executeRequestCompression(component: string, params: Record<string, unknown>): Promise<boolean> {
    const algorithm = params.algorithm as string || 'gzip';
    console.log(`🗜️ Enabling request compression for ${component} (${algorithm})`);
    this.currentOptimizations.add('request_compression');
    return true;
  }

  private async executeParallelProcessing(component: string, params: Record<string, unknown>): Promise<boolean> {
    const workerCount = params.workerCount as number || 4;
    console.log(`⚡ Enabling parallel processing for ${component} (${workerCount} workers)`);
    this.currentOptimizations.add('parallel_processing');
    return true;
  }

  private async executeLazyLoading(component: string, params: Record<string, unknown>): Promise<boolean> {
    const threshold = params.threshold as number || 0.8;
    console.log(`💤 Enabling lazy loading for ${component} (threshold: ${threshold})`);
    this.currentOptimizations.add('lazy_loading');
    return true;
  }

  private async executePrefetching(component: string, params: Record<string, unknown>): Promise<boolean> {
    const prefetchRatio = params.prefetchRatio as number || 0.3;
    console.log(`🔮 Enabling prefetching for ${component} (ratio: ${prefetchRatio})`);
    this.currentOptimizations.add('prefetching');
    return true;
  }

  private async executeModelWarming(component: string, params: Record<string, unknown>): Promise<boolean> {
    const warmupRequests = params.warmupRequests as number || 10;
    console.log(`🔥 Warming up model ${component} (${warmupRequests} requests)`);
    this.currentOptimizations.add('model_warming');
    return true;
  }

  private async executeResourceScaling(component: string, params: Record<string, unknown>): Promise<boolean> {
    const scaleFactor = params.scaleFactor as number || 1.5;
    console.log(`📈 Scaling resources for ${component} (factor: ${scaleFactor}x)`);

    const currentAllocation = this.resourceAllocations.get(component) || {
      cpu: 2,
      memory: 4096,
      network: 1000,
      storage: 10240,
      connections: 100,
    };

    this.resourceAllocations.set(component, {
      cpu: currentAllocation.cpu * scaleFactor,
      memory: currentAllocation.memory * scaleFactor,
      network: currentAllocation.network * scaleFactor,
      storage: currentAllocation.storage,
      connections: Math.round(currentAllocation.connections * scaleFactor),
    });

    this.currentOptimizations.add('resource_scaling');
    return true;
  }

  private async executeIntelligentRouting(component: string, params: Record<string, unknown>): Promise<boolean> {
    const algorithm = params.algorithm as string || 'adaptive';
    console.log(`🧠 Enabling intelligent routing for ${component} (${algorithm})`);
    this.currentOptimizations.add('intelligent_routing');
    return true;
  }

  /**
   * Helper methods
   */
  private shouldTriggerImmediateOptimization(component: string, metrics: PerformanceMetrics): boolean {
    const targets = this.performanceTargets.get(component);
    if (!targets) return false;

    // Trigger if performance is significantly below targets
    if (metrics.averageResponseTime > targets.responseTimeP95 * 1.5) return true;
    if (metrics.errorRate && metrics.errorRate > targets.errorRate * 2) return true;
    if (metrics.resourceUsage && metrics.resourceUsage.cpu > 0.9) return true;

    return false;
  }

  private getCurrentMetrics(component: string): PerformanceMetrics | null {
    const history = this.performanceHistory.get(component);
    return history && history.length > 0 ? history[history.length - 1] || null : null;
  }

  private areTargetsMet(metrics: PerformanceMetrics, targets: PerformanceTarget): boolean {
    if (metrics.averageResponseTime > targets.responseTimeP95) return false;
    if (metrics.errorRate && metrics.errorRate > targets.errorRate) return false;
    if (metrics.throughputRps && metrics.throughputRps < targets.throughputRps) return false;
    return true;
  }

  private isOptimizing(component: string): boolean {
    return this.optimizationQueue.some(opt =>
      this.findComponentForOptimization(opt) === component
    );
  }

  private findComponentForOptimization(recommendation: OptimizationRecommendation): string | null {
    // Simple heuristic - return first component that needs optimization
    for (const [component, targets] of this.performanceTargets) {
      const metrics = this.getCurrentMetrics(component);
      if (metrics && !this.areTargetsMet(metrics, targets)) {
        return component;
      }
    }
    return null;
  }

  private selectOptimizationsToApply(recommendations: OptimizationRecommendation[]): OptimizationRecommendation[] {
    const maxConcurrent = this.config.aggressiveness === 'aggressive' ? 3 :
                         this.config.aggressiveness === 'moderate' ? 2 : 1;

    return recommendations
      .filter(rec => this.config.enabledTechniques.includes(rec.technique))
      .slice(0, maxConcurrent);
  }

  private calculateImprovement(before: PerformanceMetrics, after: PerformanceMetrics): OptimizationResult['improvement'] {
    const responseTime = before.averageResponseTime > 0
      ? ((before.averageResponseTime - after.averageResponseTime) / before.averageResponseTime) * 100
      : 0;

    const throughput = before.throughputRps && before.throughputRps > 0 && after.throughputRps
      ? ((after.throughputRps - before.throughputRps) / before.throughputRps) * 100
      : 0;

    const errorRate = before.errorRate && before.errorRate > 0 && after.errorRate !== undefined
      ? ((before.errorRate - after.errorRate) / before.errorRate) * 100
      : 0;

    const resourceUsage = before.resourceUsage && after.resourceUsage && before.resourceUsage.cpu > 0
      ? ((before.resourceUsage.cpu - after.resourceUsage.cpu) / before.resourceUsage.cpu) * 100
      : 0;

    return { responseTime, throughput, errorRate, resourceUsage };
  }

  private canRollback(technique: OptimizationTechnique): boolean {
    const nonRollbackable: OptimizationTechnique[] = ['model_warming', 'resource_scaling'];
    return !nonRollbackable.includes(technique);
  }

  private async executeRollback(component: string, technique: OptimizationTechnique): Promise<boolean> {
    // Implementation would reverse the specific optimization
    console.log(`🔄 Rolling back ${technique} for ${component}`);

    switch (technique) {
      case 'response_caching':
        this.cacheConfigurations.delete(component);
        break;
      case 'resource_scaling':
        // Cannot rollback resource scaling easily
        return false;
      default:
        // Generic rollback
        break;
    }

    return true;
  }

  private initializeTechniqueEffectiveness(): void {
    // Initialize with baseline effectiveness rates
    this.techniqueEffectiveness.set('request_batching', 15);
    this.techniqueEffectiveness.set('response_caching', 30);
    this.techniqueEffectiveness.set('connection_pooling', 20);
    this.techniqueEffectiveness.set('request_compression', 10);
    this.techniqueEffectiveness.set('parallel_processing', 35);
    this.techniqueEffectiveness.set('lazy_loading', 12);
    this.techniqueEffectiveness.set('prefetching', 18);
    this.techniqueEffectiveness.set('model_warming', 25);
    this.techniqueEffectiveness.set('resource_scaling', 40);
    this.techniqueEffectiveness.set('intelligent_routing', 22);
  }

  private updateTechniqueEffectiveness(technique: OptimizationTechnique, improvement: OptimizationResult['improvement']): void {
    const alpha = 0.1; // Learning rate
    const current = this.techniqueEffectiveness.get(technique) || 20;
    const observed = improvement.responseTime; // Use response time improvement as primary metric

    const updated = current * (1 - alpha) + observed * alpha;
    this.techniqueEffectiveness.set(technique, Math.max(0, updated));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Notification methods
   */
  private notifyTechniqueApplied(result: OptimizationResult): void {
    this.listeners.forEach(listener => {
      try {
        listener.onTechniqueApplied?.(result);
      } catch (error) {
        console.error('🚀 Error notifying technique applied:', error);
      }
    });
  }

  private notifyBottleneckDetected(analysis: BottleneckAnalysis): void {
    this.listeners.forEach(listener => {
      try {
        listener.onBottleneckDetected?.(analysis);
      } catch (error) {
        console.error('🚀 Error notifying bottleneck detected:', error);
      }
    });
  }

  private notifyRollbackTriggered(technique: OptimizationTechnique, reason: string): void {
    this.listeners.forEach(listener => {
      try {
        listener.onRollbackTriggered?.(technique, reason);
      } catch (error) {
        console.error('🚀 Error notifying rollback triggered:', error);
      }
    });
  }
}
