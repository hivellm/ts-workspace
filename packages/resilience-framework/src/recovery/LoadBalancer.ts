/**
 * Intelligent Load Balancer
 * BIP-03 Implementation - Phase 4: Advanced Features
 *
 * @author Claude-4-Sonnet (Anthropic)
 * @version 1.0.0
 */

import { ModelIdentity, AITask, AIResponse } from '../types/index.js';
import { PerformanceMetrics } from '../fallback/FallbackManager.js';

/**
 * Load balancing algorithms
 */
export type LoadBalancingAlgorithm =
  | 'round_robin'
  | 'weighted_round_robin'
  | 'least_connections'
  | 'least_response_time'
  | 'weighted_least_connections'
  | 'resource_based'
  | 'adaptive'
  | 'geographic'
  | 'priority_based';

/**
 * Model load balancing weight
 */
export interface ModelWeight {
  readonly modelId: string;
  readonly weight: number; // 0-1, higher = more traffic
  readonly priority: number; // 1-10, higher = higher priority
  readonly maxConnections: number;
  readonly enabled: boolean;
}

/**
 * Load balancing configuration
 */
export interface LoadBalancingConfig {
  readonly algorithm: LoadBalancingAlgorithm;
  readonly weights: ModelWeight[];
  readonly healthCheckInterval: number; // milliseconds
  readonly failureThreshold: number;
  readonly recoveryThreshold: number;
  readonly sessionAffinity: boolean;
  readonly stickySessions: boolean;
  readonly adaptiveLearning: boolean;
}

/**
 * Model load statistics
 */
export interface ModelLoadStats {
  readonly modelId: string;
  readonly activeConnections: number;
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly averageResponseTime: number;
  readonly currentLoad: number; // 0-1
  readonly healthScore: number; // 0-1
  readonly lastUsed: Date;
  readonly cpuUsage?: number;
  readonly memoryUsage?: number;
}

/**
 * Load balancing decision
 */
export interface LoadBalancingDecision {
  readonly selectedModel: ModelIdentity;
  readonly algorithm: LoadBalancingAlgorithm;
  readonly reason: string;
  readonly alternatives: ModelIdentity[];
  readonly confidence: number; // 0-1
  readonly estimatedResponseTime: number;
}

/**
 * Load balancing event
 */
export interface LoadBalancingEvent {
  readonly type: 'model_selected' | 'model_failed' | 'model_recovered' | 'weight_updated' | 'algorithm_changed';
  readonly modelId?: string;
  readonly algorithm?: LoadBalancingAlgorithm;
  readonly timestamp: Date;
  readonly details: Record<string, unknown>;
}

/**
 * Session information for sticky sessions
 */
export interface SessionInfo {
  readonly sessionId: string;
  readonly modelId: string;
  readonly createdAt: Date;
  readonly lastAccess: Date;
  readonly requestCount: number;
}

/**
 * Load balancer listener interface
 */
export interface LoadBalancerListener {
  onModelSelected?(decision: LoadBalancingDecision): void;
  onModelHealthChanged?(modelId: string, healthy: boolean): void;
  onLoadStatsUpdated?(stats: ModelLoadStats[]): void;
  onAlgorithmChanged?(newAlgorithm: LoadBalancingAlgorithm): void;
}

/**
 * Geographic location for geo-based load balancing
 */
export interface GeographicLocation {
  readonly latitude: number;
  readonly longitude: number;
  readonly region: string;
  readonly datacenter?: string;
}

/**
 * Resource utilization metrics
 */
export interface ResourceMetrics {
  readonly cpu: number; // 0-1
  readonly memory: number; // 0-1
  readonly network: number; // 0-1
  readonly storage: number; // 0-1
  readonly connections: number;
}

/**
 * Intelligent load balancer for AI models
 */
export class LoadBalancer {
  private models = new Map<string, ModelIdentity>();
  private loadStats = new Map<string, ModelLoadStats>();
  private weights = new Map<string, ModelWeight>();
  private sessions = new Map<string, SessionInfo>();
  private listeners = new Set<LoadBalancerListener>();
  private healthChecks = new Map<string, boolean>();
  private roundRobinIndex = 0;
  private adaptiveLearning = new Map<string, number>();
  private isActive = false;
  private monitoringInterval?: NodeJS.Timeout;

  // Performance tracking
  private performanceHistory = new Map<string, PerformanceMetrics[]>();
  private resourceMetrics = new Map<string, ResourceMetrics>();
  private geographicLocations = new Map<string, GeographicLocation>();

  constructor(
    private config: LoadBalancingConfig = {
      algorithm: 'adaptive',
      weights: [],
      healthCheckInterval: 30000,
      failureThreshold: 5,
      recoveryThreshold: 3,
      sessionAffinity: false,
      stickySessions: false,
      adaptiveLearning: true,
    }
  ) {}

  /**
   * Start load balancer monitoring
   */
  async start(): Promise<void> {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.monitoringInterval = setInterval(
      () => this.updateLoadStatistics(),
      this.config.healthCheckInterval
    );

    console.log(`⚖️ LoadBalancer started with ${this.config.algorithm} algorithm`);
  }

  /**
   * Stop load balancer monitoring
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

    console.log('⚖️ LoadBalancer stopped');
  }

  /**
   * Register a model for load balancing
   */
  registerModel(
    model: ModelIdentity,
    weight?: ModelWeight,
    location?: GeographicLocation
  ): void {
    this.models.set(model.id, model);

    const defaultWeight: ModelWeight = {
      modelId: model.id,
      weight: 1.0,
      priority: 5,
      maxConnections: 100,
      enabled: true,
    };

    this.weights.set(model.id, weight || defaultWeight);

    if (location) {
      this.geographicLocations.set(model.id, location);
    }

    // Initialize load stats
    this.loadStats.set(model.id, {
      modelId: model.id,
      activeConnections: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      currentLoad: 0,
      healthScore: 1,
      lastUsed: new Date(),
    });

    this.healthChecks.set(model.id, true);
    console.log(`⚖️ Registered model: ${model.id}`);
  }

  /**
   * Unregister a model from load balancing
   */
  unregisterModel(modelId: string): boolean {
    const removed = this.models.delete(modelId);

    if (removed) {
      this.weights.delete(modelId);
      this.loadStats.delete(modelId);
      this.healthChecks.delete(modelId);
      this.performanceHistory.delete(modelId);
      this.resourceMetrics.delete(modelId);
      this.geographicLocations.delete(modelId);

      // Remove sessions for this model
      for (const [sessionId, session] of this.sessions) {
        if (session.modelId === modelId) {
          this.sessions.delete(sessionId);
        }
      }

      console.log(`⚖️ Unregistered model: ${modelId}`);
    }

    return removed;
  }

  /**
   * Select the best model for a task
   */
  async selectModel(
    task: AITask,
    sessionId?: string,
    clientLocation?: GeographicLocation
  ): Promise<LoadBalancingDecision> {
    const availableModels = this.getAvailableModels();

    if (availableModels.length === 0) {
      throw new Error('No available models for load balancing');
    }

    // Check for session affinity
    if (sessionId && this.config.sessionAffinity) {
      const sessionModel = this.getSessionModel(sessionId);
      if (sessionModel && this.isModelHealthy(sessionModel.id)) {
        return {
          selectedModel: sessionModel,
          algorithm: this.config.algorithm,
          reason: 'session_affinity',
          alternatives: availableModels.filter(m => m.id !== sessionModel.id),
          confidence: 1.0,
          estimatedResponseTime: this.estimateResponseTime(sessionModel.id),
        };
      }
    }

    // Select based on algorithm
    const decision = await this.applyLoadBalancingAlgorithm(
      availableModels,
      task,
      clientLocation
    );

    // Update session if sticky sessions enabled
    if (sessionId && this.config.stickySessions) {
      this.updateSession(sessionId, decision.selectedModel.id);
    }

    // Record the decision
    this.recordModelSelection(decision);

    return decision;
  }

  /**
   * Update model performance metrics
   */
  updateModelPerformance(modelId: string, metrics: PerformanceMetrics): void {
    let history = this.performanceHistory.get(modelId);
    if (!history) {
      history = [];
      this.performanceHistory.set(modelId, history);
    }

    history.push(metrics);

    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }

    // Update load stats
    this.updateModelLoadStats(modelId, metrics);

    // Update adaptive learning
    if (this.config.adaptiveLearning) {
      this.updateAdaptiveLearning(modelId, metrics);
    }
  }

  /**
   * Update resource utilization metrics
   */
  updateResourceMetrics(modelId: string, resources: ResourceMetrics): void {
    this.resourceMetrics.set(modelId, resources);

    // Update health score based on resource usage
    const stats = this.loadStats.get(modelId);
    if (stats) {
      const healthScore = this.calculateHealthScore(modelId, resources);
      this.loadStats.set(modelId, { ...stats, healthScore });
    }
  }

  /**
   * Record request completion
   */
  recordRequestCompletion(
    modelId: string,
    success: boolean,
    responseTime: number
  ): void {
    const stats = this.loadStats.get(modelId);
    if (!stats) return;

    const updatedStats: ModelLoadStats = {
      ...stats,
      totalRequests: stats.totalRequests + 1,
      successfulRequests: stats.successfulRequests + (success ? 1 : 0),
      failedRequests: stats.failedRequests + (success ? 0 : 1),
      averageResponseTime: this.calculateNewAverage(
        stats.averageResponseTime,
        responseTime,
        stats.totalRequests
      ),
      lastUsed: new Date(),
    };

    this.loadStats.set(modelId, updatedStats);

    // Update health status
    this.updateModelHealth(modelId);
  }

  /**
   * Get current load statistics for all models
   */
  getLoadStatistics(): ModelLoadStats[] {
    return Array.from(this.loadStats.values());
  }

  /**
   * Get load statistics for a specific model
   */
  getModelStatistics(modelId: string): ModelLoadStats | undefined {
    return this.loadStats.get(modelId);
  }

  /**
   * Update load balancing configuration
   */
  updateConfiguration(config: Partial<LoadBalancingConfig>): void {
    const oldAlgorithm = this.config.algorithm;
    this.config = { ...this.config, ...config };

    if (oldAlgorithm !== this.config.algorithm) {
      this.notifyAlgorithmChanged(this.config.algorithm);
      console.log(`⚖️ Load balancing algorithm changed: ${oldAlgorithm} → ${this.config.algorithm}`);
    }
  }

  /**
   * Update model weights
   */
  updateModelWeights(weights: ModelWeight[]): void {
    weights.forEach(weight => {
      this.weights.set(weight.modelId, weight);
    });

    this.notifyLoadStatsUpdated();
    console.log(`⚖️ Updated weights for ${weights.length} models`);
  }

  /**
   * Get current model weights
   */
  getModelWeights(): ModelWeight[] {
    return Array.from(this.weights.values());
  }

  /**
   * Add load balancer listener
   */
  addListener(listener: LoadBalancerListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove load balancer listener
   */
  removeListener(listener: LoadBalancerListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  /**
   * Clear expired sessions
   */
  clearExpiredSessions(maxAge: number = 3600000): number { // 1 hour default
    const now = new Date();
    let cleared = 0;

    for (const [sessionId, session] of this.sessions) {
      if (now.getTime() - session.lastAccess.getTime() > maxAge) {
        this.sessions.delete(sessionId);
        cleared++;
      }
    }

    if (cleared > 0) {
      console.log(`⚖️ Cleared ${cleared} expired sessions`);
    }

    return cleared;
  }

  /**
   * Get load balancing algorithm recommendations
   */
  getAlgorithmRecommendations(): {
    current: LoadBalancingAlgorithm;
    recommendations: Array<{
      algorithm: LoadBalancingAlgorithm;
      score: number;
      reason: string;
    }>;
  } {
    const recommendations = this.analyzeAlgorithmPerformance();

    return {
      current: this.config.algorithm,
      recommendations: recommendations.sort((a, b) => b.score - a.score),
    };
  }

  /**
   * Apply load balancing algorithm
   */
  private async applyLoadBalancingAlgorithm(
    models: ModelIdentity[],
    task: AITask,
    clientLocation?: GeographicLocation
  ): Promise<LoadBalancingDecision> {
    switch (this.config.algorithm) {
      case 'round_robin':
        return this.applyRoundRobin(models);

      case 'weighted_round_robin':
        return this.applyWeightedRoundRobin(models);

      case 'least_connections':
        return this.applyLeastConnections(models);

      case 'least_response_time':
        return this.applyLeastResponseTime(models);

      case 'weighted_least_connections':
        return this.applyWeightedLeastConnections(models);

      case 'resource_based':
        return this.applyResourceBased(models);

      case 'adaptive':
        return this.applyAdaptive(models, task);

      case 'geographic':
        return this.applyGeographic(models, clientLocation);

      case 'priority_based':
        return this.applyPriorityBased(models);

      default:
        return this.applyRoundRobin(models); // Fallback
    }
  }

  /**
   * Load balancing algorithm implementations
   */
  private applyRoundRobin(models: ModelIdentity[]): LoadBalancingDecision {
    if (models.length === 0) {
      throw new Error('No models available for round robin selection');
    }

    const selectedModel = models[this.roundRobinIndex % models.length]!;
    this.roundRobinIndex++;

    return {
      selectedModel,
      algorithm: 'round_robin',
      reason: `Round robin selection (index: ${this.roundRobinIndex - 1})`,
      alternatives: models.filter(m => m.id !== selectedModel.id),
      confidence: 0.8,
      estimatedResponseTime: this.estimateResponseTime(selectedModel.id),
    };
  }

  private applyWeightedRoundRobin(models: ModelIdentity[]): LoadBalancingDecision {
    const weightedModels = this.createWeightedModelList(models);

    if (weightedModels.length === 0) {
      throw new Error('No weighted models available for selection');
    }

    const selectedModel = weightedModels[this.roundRobinIndex % weightedModels.length]!;
    this.roundRobinIndex++;

    const weight = this.weights.get(selectedModel.id)?.weight || 1;

    return {
      selectedModel,
      algorithm: 'weighted_round_robin',
      reason: `Weighted round robin (weight: ${weight})`,
      alternatives: models.filter(m => m.id !== selectedModel.id),
      confidence: 0.85,
      estimatedResponseTime: this.estimateResponseTime(selectedModel.id),
    };
  }

  private applyLeastConnections(models: ModelIdentity[]): LoadBalancingDecision {
    const selectedModel = models.reduce((best, current) => {
      const bestStats = this.loadStats.get(best.id);
      const currentStats = this.loadStats.get(current.id);

      if (!bestStats) return current;
      if (!currentStats) return best;

      return currentStats.activeConnections < bestStats.activeConnections ? current : best;
    });

    const connections = this.loadStats.get(selectedModel.id)?.activeConnections || 0;

    return {
      selectedModel,
      algorithm: 'least_connections',
      reason: `Least connections (${connections} active)`,
      alternatives: models.filter(m => m.id !== selectedModel.id),
      confidence: 0.9,
      estimatedResponseTime: this.estimateResponseTime(selectedModel.id),
    };
  }

  private applyLeastResponseTime(models: ModelIdentity[]): LoadBalancingDecision {
    const selectedModel = models.reduce((best, current) => {
      const bestStats = this.loadStats.get(best.id);
      const currentStats = this.loadStats.get(current.id);

      if (!bestStats) return current;
      if (!currentStats) return best;

      return currentStats.averageResponseTime < bestStats.averageResponseTime ? current : best;
    });

    const responseTime = this.loadStats.get(selectedModel.id)?.averageResponseTime || 0;

    return {
      selectedModel,
      algorithm: 'least_response_time',
      reason: `Fastest response time (${responseTime.toFixed(0)}ms avg)`,
      alternatives: models.filter(m => m.id !== selectedModel.id),
      confidence: 0.95,
      estimatedResponseTime: responseTime,
    };
  }

  private applyWeightedLeastConnections(models: ModelIdentity[]): LoadBalancingDecision {
    const selectedModel = models.reduce((best, current) => {
      const bestStats = this.loadStats.get(best.id);
      const currentStats = this.loadStats.get(current.id);
      const bestWeight = this.weights.get(best.id)?.weight || 1;
      const currentWeight = this.weights.get(current.id)?.weight || 1;

      if (!bestStats) return current;
      if (!currentStats) return best;

      const bestRatio = bestStats.activeConnections / bestWeight;
      const currentRatio = currentStats.activeConnections / currentWeight;

      return currentRatio < bestRatio ? current : best;
    });

    const stats = this.loadStats.get(selectedModel.id);
    const weight = this.weights.get(selectedModel.id)?.weight || 1;
    const ratio = (stats?.activeConnections || 0) / weight;

    return {
      selectedModel,
      algorithm: 'weighted_least_connections',
      reason: `Weighted least connections (ratio: ${ratio.toFixed(2)})`,
      alternatives: models.filter(m => m.id !== selectedModel.id),
      confidence: 0.92,
      estimatedResponseTime: this.estimateResponseTime(selectedModel.id),
    };
  }

  private applyResourceBased(models: ModelIdentity[]): LoadBalancingDecision {
    const selectedModel = models.reduce((best, current) => {
      const bestResources = this.resourceMetrics.get(best.id);
      const currentResources = this.resourceMetrics.get(current.id);

      if (!bestResources) return current;
      if (!currentResources) return best;

      const bestLoad = (bestResources.cpu + bestResources.memory) / 2;
      const currentLoad = (currentResources.cpu + currentResources.memory) / 2;

      return currentLoad < bestLoad ? current : best;
    });

    const resources = this.resourceMetrics.get(selectedModel.id);
    const load = resources ? (resources.cpu + resources.memory) / 2 : 0;

    return {
      selectedModel,
      algorithm: 'resource_based',
      reason: `Lowest resource utilization (${(load * 100).toFixed(1)}%)`,
      alternatives: models.filter(m => m.id !== selectedModel.id),
      confidence: 0.88,
      estimatedResponseTime: this.estimateResponseTime(selectedModel.id),
    };
  }

  private applyAdaptive(models: ModelIdentity[], task: AITask): LoadBalancingDecision {
    // Combine multiple factors with adaptive weights
    const scores = models.map(model => {
      const stats = this.loadStats.get(model.id);
      const weight = this.weights.get(model.id);
      const resources = this.resourceMetrics.get(model.id);
      const learning = this.adaptiveLearning.get(model.id) || 0.5;

      if (!stats || !weight) return { model, score: 0 };

      // Calculate composite score
      const responseTimeScore = Math.max(0, 1 - (stats.averageResponseTime / 10000));
      const loadScore = Math.max(0, 1 - stats.currentLoad);
      const healthScore = stats.healthScore;
      const weightScore = weight.weight;
      const resourceScore = resources ? 1 - ((resources.cpu + resources.memory) / 2) : 0.5;
      const learningScore = learning;

      const score = (
        responseTimeScore * 0.25 +
        loadScore * 0.20 +
        healthScore * 0.20 +
        weightScore * 0.15 +
        resourceScore * 0.10 +
        learningScore * 0.10
      );

      return { model, score };
    });

    const best = scores.reduce((a, b) => a.score > b.score ? a : b);

    return {
      selectedModel: best.model,
      algorithm: 'adaptive',
      reason: `Adaptive selection (score: ${best.score.toFixed(3)})`,
      alternatives: models.filter(m => m.id !== best.model.id),
      confidence: best.score,
      estimatedResponseTime: this.estimateResponseTime(best.model.id),
    };
  }

  private applyGeographic(models: ModelIdentity[], clientLocation?: GeographicLocation): LoadBalancingDecision {
    if (!clientLocation) {
      // Fallback to least response time if no location
      return this.applyLeastResponseTime(models);
    }

    const distances = models.map(model => {
      const modelLocation = this.geographicLocations.get(model.id);
      if (!modelLocation) return { model, distance: Infinity };

      const distance = this.calculateDistance(clientLocation, modelLocation);
      return { model, distance };
    });

    const closest = distances.reduce((a, b) => a.distance < b.distance ? a : b);

    return {
      selectedModel: closest.model,
      algorithm: 'geographic',
      reason: `Closest geographic location (${closest.distance.toFixed(0)}km)`,
      alternatives: models.filter(m => m.id !== closest.model.id),
      confidence: 0.85,
      estimatedResponseTime: this.estimateResponseTime(closest.model.id),
    };
  }

  private applyPriorityBased(models: ModelIdentity[]): LoadBalancingDecision {
    const priorityModels = models
      .map(model => ({
        model,
        priority: this.weights.get(model.id)?.priority || 1,
      }))
      .sort((a, b) => b.priority - a.priority);

    if (priorityModels.length === 0) {
      throw new Error('No priority models available for selection');
    }

    // Select highest priority model that's healthy
    const selectedModel = priorityModels[0]!.model;

    return {
      selectedModel,
      algorithm: 'priority_based',
      reason: `Highest priority (${priorityModels[0]!.priority})`,
      alternatives: models.filter(m => m.id !== selectedModel.id),
      confidence: 0.9,
      estimatedResponseTime: this.estimateResponseTime(selectedModel.id),
    };
  }

  /**
   * Helper methods
   */
  private getAvailableModels(): ModelIdentity[] {
    return Array.from(this.models.values()).filter(model => {
      const weight = this.weights.get(model.id);
      const isHealthy = this.healthChecks.get(model.id);
      return weight?.enabled && isHealthy;
    });
  }

  private isModelHealthy(modelId: string): boolean {
    return this.healthChecks.get(modelId) || false;
  }

  private getSessionModel(sessionId: string): ModelIdentity | undefined {
    const session = this.sessions.get(sessionId);
    return session ? this.models.get(session.modelId) : undefined;
  }

  private updateSession(sessionId: string, modelId: string): void {
    const existing = this.sessions.get(sessionId);

    if (existing) {
      this.sessions.set(sessionId, {
        ...existing,
        lastAccess: new Date(),
        requestCount: existing.requestCount + 1,
      });
    } else {
      this.sessions.set(sessionId, {
        sessionId,
        modelId,
        createdAt: new Date(),
        lastAccess: new Date(),
        requestCount: 1,
      });
    }
  }

  private estimateResponseTime(modelId: string): number {
    const stats = this.loadStats.get(modelId);
    return stats?.averageResponseTime || 5000; // Default 5 seconds
  }

  private updateModelLoadStats(modelId: string, metrics: PerformanceMetrics): void {
    const stats = this.loadStats.get(modelId);
    if (!stats) return;

    const updatedStats: ModelLoadStats = {
      ...stats,
      averageResponseTime: metrics.averageResponseTime,
      currentLoad: this.calculateCurrentLoad(modelId),
    };

    this.loadStats.set(modelId, updatedStats);
  }

  private calculateCurrentLoad(modelId: string): number {
    const stats = this.loadStats.get(modelId);
    const weight = this.weights.get(modelId);

    if (!stats || !weight) return 0;

    return Math.min(1, stats.activeConnections / weight.maxConnections);
  }

  private calculateHealthScore(modelId: string, resources: ResourceMetrics): number {
    const stats = this.loadStats.get(modelId);
    if (!stats) return 0;

    const responseTimeScore = Math.max(0, 1 - (stats.averageResponseTime / 10000));
    const successRateScore = stats.totalRequests > 0
      ? stats.successfulRequests / stats.totalRequests
      : 1;
    const resourceScore = 1 - ((resources.cpu + resources.memory) / 2);

    return (responseTimeScore + successRateScore + resourceScore) / 3;
  }

  private updateAdaptiveLearning(modelId: string, metrics: PerformanceMetrics): void {
    const current = this.adaptiveLearning.get(modelId) || 0.5;
    const performance = Math.max(0, 1 - (metrics.averageResponseTime / 10000));

    // Simple exponential moving average
    const alpha = 0.1;
    const updated = current * (1 - alpha) + performance * alpha;

    this.adaptiveLearning.set(modelId, updated);
  }

  private updateModelHealth(modelId: string): void {
    const stats = this.loadStats.get(modelId);
    if (!stats) return;

    const successRate = stats.totalRequests > 0
      ? stats.successfulRequests / stats.totalRequests
      : 1;

    const isHealthy = successRate >= (1 - this.config.failureThreshold / 10);
    const wasHealthy = this.healthChecks.get(modelId);

    this.healthChecks.set(modelId, isHealthy);

    if (wasHealthy !== isHealthy) {
      this.notifyModelHealthChanged(modelId, isHealthy);
    }
  }

  private createWeightedModelList(models: ModelIdentity[]): ModelIdentity[] {
    const weighted: ModelIdentity[] = [];

    models.forEach(model => {
      const weight = this.weights.get(model.id)?.weight || 1;
      const count = Math.max(1, Math.round(weight * 10)); // Scale weight to count

      for (let i = 0; i < count; i++) {
        weighted.push(model);
      }
    });

    return weighted;
  }

  private calculateDistance(loc1: GeographicLocation, loc2: GeographicLocation): number {
    // Haversine formula for great circle distance
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(loc2.latitude - loc1.latitude);
    const dLon = this.toRadians(loc2.longitude - loc1.longitude);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(loc1.latitude)) * Math.cos(this.toRadians(loc2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private calculateNewAverage(oldAvg: number, newValue: number, count: number): number {
    return (oldAvg * (count - 1) + newValue) / count;
  }

  private analyzeAlgorithmPerformance(): Array<{
    algorithm: LoadBalancingAlgorithm;
    score: number;
    reason: string;
  }> {
    // Simple heuristic analysis
    const algorithms: LoadBalancingAlgorithm[] = [
      'round_robin', 'weighted_round_robin', 'least_connections',
      'least_response_time', 'adaptive', 'resource_based'
    ];

    return algorithms.map(algorithm => {
      let score = 0.5; // Base score
      let reason = '';

      switch (algorithm) {
        case 'adaptive':
          score = 0.9;
          reason = 'Best overall performance with learning';
          break;
        case 'least_response_time':
          score = 0.8;
          reason = 'Good for latency-sensitive applications';
          break;
        case 'resource_based':
          score = 0.7;
          reason = 'Efficient resource utilization';
          break;
        default:
          score = 0.6;
          reason = 'Standard algorithm';
      }

      return { algorithm, score, reason };
    });
  }

  private updateLoadStatistics(): void {
    // Update current load for all models
    for (const [modelId] of this.models) {
      const currentLoad = this.calculateCurrentLoad(modelId);
      const stats = this.loadStats.get(modelId);

      if (stats) {
        this.loadStats.set(modelId, { ...stats, currentLoad });
      }
    }

    this.notifyLoadStatsUpdated();
  }

  private recordModelSelection(decision: LoadBalancingDecision): void {
    // Increment active connections
    const stats = this.loadStats.get(decision.selectedModel.id);
    if (stats) {
      this.loadStats.set(decision.selectedModel.id, {
        ...stats,
        activeConnections: stats.activeConnections + 1,
        lastUsed: new Date(),
      });
    }

    this.notifyModelSelected(decision);
  }

  /**
   * Notification methods
   */
  private notifyModelSelected(decision: LoadBalancingDecision): void {
    this.listeners.forEach(listener => {
      try {
        listener.onModelSelected?.(decision);
      } catch (error) {
        console.error('⚖️ Error notifying model selection:', error);
      }
    });
  }

  private notifyModelHealthChanged(modelId: string, healthy: boolean): void {
    this.listeners.forEach(listener => {
      try {
        listener.onModelHealthChanged?.(modelId, healthy);
      } catch (error) {
        console.error('⚖️ Error notifying health change:', error);
      }
    });
  }

  private notifyLoadStatsUpdated(): void {
    const stats = this.getLoadStatistics();
    this.listeners.forEach(listener => {
      try {
        listener.onLoadStatsUpdated?.(stats);
      } catch (error) {
        console.error('⚖️ Error notifying stats update:', error);
      }
    });
  }

  private notifyAlgorithmChanged(algorithm: LoadBalancingAlgorithm): void {
    this.listeners.forEach(listener => {
      try {
        listener.onAlgorithmChanged?.(algorithm);
      } catch (error) {
        console.error('⚖️ Error notifying algorithm change:', error);
      }
    });
  }
}
