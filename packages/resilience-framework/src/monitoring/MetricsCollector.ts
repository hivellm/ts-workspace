/**
 * Metrics Collector
 * BIP-03 Implementation - Phase 3: Monitoring & Alerting
 *
 * @author Claude-4-Sonnet (Anthropic)
 * @version 1.0.0
 */

import { ModelIdentity, ModelHealth } from '../types/index.js';

/**
 * System-wide metrics aggregation
 */
export interface SystemMetrics {
  readonly timestamp: Date;
  readonly systemUptime: number;
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly averageResponseTime: number;
  readonly activeModels: number;
  readonly healthyModels: number;
  readonly circuitBreakersOpen: number;
  readonly fallbacksTriggered: number;
}

/**
 * Model-specific performance metrics
 */
export interface ModelMetrics {
  readonly modelId: string;
  readonly timestamp: Date;
  readonly requests: number;
  readonly successes: number;
  readonly failures: number;
  readonly averageResponseTime: number;
  readonly lastResponseTime: number;
  readonly successRate: number;
  readonly healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  readonly circuitBreakerState: 'closed' | 'open' | 'half-open';
  readonly uptime: number;
}

/**
 * Time-series data point for analytics
 */
export interface MetricDataPoint {
  readonly timestamp: Date;
  readonly value: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Metrics collection configuration
 */
export interface MetricsConfig {
  readonly collectionInterval: number;
  readonly retentionPeriod: number;
  readonly batchSize: number;
  readonly enableRealTimeMetrics: boolean;
  readonly metricsEndpoint?: string;
}

/**
 * Metrics collector event listener
 */
export interface MetricsListener {
  onMetricsCollected?(metrics: SystemMetrics): void;
  onModelMetricsUpdated?(modelMetrics: ModelMetrics): void;
  onThresholdExceeded?(metric: string, value: number, threshold: number): void;
}

/**
 * Real-time metrics collector for the resilience framework
 */
export class MetricsCollector {
  private readonly metrics = new Map<string, ModelMetrics>();
  private readonly timeSeries = new Map<string, MetricDataPoint[]>();
  private readonly listeners = new Set<MetricsListener>();
  private systemStartTime = new Date();
  private collectionTimer?: NodeJS.Timeout;
  private isCollecting = false;

  // Aggregated counters
  private totalRequests = 0;
  private successfulRequests = 0;
  private failedRequests = 0;
  private responseTimesSum = 0;
  private circuitBreakersOpen = 0;
  private fallbacksTriggered = 0;

  constructor(
    private readonly config: MetricsConfig = {
      collectionInterval: 10000, // 10 seconds
      retentionPeriod: 86400000, // 24 hours
      batchSize: 100,
      enableRealTimeMetrics: true,
    }
  ) {}

  /**
   * Start metrics collection
   */
  async startCollection(): Promise<void> {
    if (this.isCollecting) {
      return;
    }

    this.isCollecting = true;
    this.systemStartTime = new Date();

    if (this.config.enableRealTimeMetrics) {
      this.collectionTimer = setInterval(
        () => this.collectSystemMetrics(),
        this.config.collectionInterval
      );
    }

    console.log('📊 MetricsCollector started');
  }

  /**
   * Stop metrics collection
   */
  async stopCollection(): Promise<void> {
    if (!this.isCollecting) {
      return;
    }

    this.isCollecting = false;

    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = undefined as any;
    }

    console.log('📊 MetricsCollector stopped');
  }

  /**
   * Record a request execution
   */
  recordRequest(
    modelId: string,
    success: boolean,
    responseTime: number,
    metadata?: Record<string, unknown>
  ): void {
    this.totalRequests++;

    if (success) {
      this.successfulRequests++;
    } else {
      this.failedRequests++;
    }

    this.responseTimesSum += responseTime;

    // Update model-specific metrics
    this.updateModelMetrics(modelId, success, responseTime);

    // Record time series data
    this.recordTimeSeries(`${modelId}.responseTime`, responseTime, metadata);
    this.recordTimeSeries(`${modelId}.success`, success ? 1 : 0, metadata);
  }

  /**
   * Record circuit breaker state change
   */
  recordCircuitBreakerStateChange(
    modelId: string,
    newState: 'closed' | 'open' | 'half-open',
    previousState: 'closed' | 'open' | 'half-open'
  ): void {
    if (newState === 'open' && previousState !== 'open') {
      this.circuitBreakersOpen++;
    } else if (newState !== 'open' && previousState === 'open') {
      this.circuitBreakersOpen = Math.max(0, this.circuitBreakersOpen - 1);
    }

    this.recordTimeSeries(`${modelId}.circuitBreaker`, this.getStateValue(newState));

    const modelMetrics = this.metrics.get(modelId);
    if (modelMetrics) {
      this.updateModelMetrics(modelId, modelMetrics.successes > 0, modelMetrics.lastResponseTime);
    }
  }

  /**
   * Record fallback triggered
   */
  recordFallbackTriggered(
    primaryModelId: string,
    fallbackModelId: string,
    strategy: string
  ): void {
    this.fallbacksTriggered++;

    this.recordTimeSeries('system.fallbacks', 1, {
      primaryModel: primaryModelId,
      fallbackModel: fallbackModelId,
      strategy,
    });
  }

  /**
   * Record model health update
   */
  recordModelHealth(modelId: string, health: ModelHealth): void {
    this.recordTimeSeries(`${modelId}.health`, this.getHealthValue(health.status), {
      responseTime: health.responseTime,
      lastChecked: health.lastHealthCheck,
    });

    // Update model metrics
    const existing = this.metrics.get(modelId);
    if (existing) {
      this.updateModelMetrics(modelId, health.status === 'available', health.responseTime || 0);
    }
  }

  /**
   * Get current system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const now = new Date();
    const uptime = now.getTime() - this.systemStartTime.getTime();
    const averageResponseTime = this.totalRequests > 0
      ? this.responseTimesSum / this.totalRequests
      : 0;

    const healthyModels = Array.from(this.metrics.values())
      .filter(m => m.healthStatus === 'healthy').length;

    return {
      timestamp: now,
      systemUptime: uptime,
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      averageResponseTime,
      activeModels: this.metrics.size,
      healthyModels,
      circuitBreakersOpen: this.circuitBreakersOpen,
      fallbacksTriggered: this.fallbacksTriggered,
    };
  }

  /**
   * Get metrics for a specific model
   */
  getModelMetrics(modelId: string): ModelMetrics | undefined {
    return this.metrics.get(modelId);
  }

  /**
   * Get all model metrics
   */
  getAllModelMetrics(): Map<string, ModelMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Get time series data for a metric
   */
  getTimeSeries(
    metricName: string,
    startTime?: Date,
    endTime?: Date
  ): MetricDataPoint[] {
    const data = this.timeSeries.get(metricName) || [];

    if (!startTime && !endTime) {
      return [...data];
    }

    return data.filter(point => {
      if (startTime && point.timestamp < startTime) return false;
      if (endTime && point.timestamp > endTime) return false;
      return true;
    });
  }

  /**
   * Get available metric names
   */
  getAvailableMetrics(): string[] {
    return Array.from(this.timeSeries.keys()).sort();
  }

  /**
   * Add metrics listener
   */
  addListener(listener: MetricsListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove metrics listener
   */
  removeListener(listener: MetricsListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Clear all metrics data
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.timeSeries.clear();
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.responseTimesSum = 0;
    this.circuitBreakersOpen = 0;
    this.fallbacksTriggered = 0;
    this.systemStartTime = new Date();
  }

  /**
   * Export metrics data for external systems
   */
  exportMetrics(): {
    system: SystemMetrics;
    models: Record<string, ModelMetrics>;
    timeSeries: Record<string, MetricDataPoint[]>;
  } {
    return {
      system: this.getSystemMetrics() as any, // Will be resolved
      models: Object.fromEntries(this.metrics),
      timeSeries: Object.fromEntries(this.timeSeries),
    };
  }

  /**
   * Import metrics data from external source
   */
  importMetrics(data: {
    models?: Record<string, ModelMetrics>;
    timeSeries?: Record<string, MetricDataPoint[]>;
  }): void {
    if (data.models) {
      for (const [modelId, metrics] of Object.entries(data.models)) {
        this.metrics.set(modelId, metrics);
      }
    }

    if (data.timeSeries) {
      for (const [metricName, dataPoints] of Object.entries(data.timeSeries)) {
        this.timeSeries.set(metricName, dataPoints);
      }
    }
  }

  /**
   * Update model-specific metrics
   */
  private updateModelMetrics(
    modelId: string,
    success: boolean,
    responseTime: number
  ): void {
    const now = new Date();
    const existing = this.metrics.get(modelId);

    if (existing) {
      // Update existing metrics
      const totalRequests = existing.requests + 1;
      const successes = existing.successes + (success ? 1 : 0);
      const failures = existing.failures + (success ? 0 : 1);
      const successRate = successes / totalRequests;

      // Calculate new average response time
      const totalResponseTime = (existing.averageResponseTime * existing.requests) + responseTime;
      const averageResponseTime = totalResponseTime / totalRequests;

      // Determine health status based on recent performance
      const healthStatus = this.calculateHealthStatus(successRate, averageResponseTime);

      const updatedMetrics: ModelMetrics = {
        modelId,
        timestamp: now,
        requests: totalRequests,
        successes,
        failures,
        averageResponseTime,
        lastResponseTime: responseTime,
        successRate,
        healthStatus,
        circuitBreakerState: existing.circuitBreakerState,
        uptime: now.getTime() - (now.getTime() - existing.uptime),
      };

      this.metrics.set(modelId, updatedMetrics);

      // Notify listeners
      this.listeners.forEach(listener => {
        listener.onModelMetricsUpdated?.(updatedMetrics);
      });

      // Check thresholds
      this.checkThresholds(modelId, updatedMetrics);
    } else {
      // Create new metrics entry
      const newMetrics: ModelMetrics = {
        modelId,
        timestamp: now,
        requests: 1,
        successes: success ? 1 : 0,
        failures: success ? 0 : 1,
        averageResponseTime: responseTime,
        lastResponseTime: responseTime,
        successRate: success ? 1 : 0,
        healthStatus: this.calculateHealthStatus(success ? 1 : 0, responseTime),
        circuitBreakerState: 'closed',
        uptime: 0,
      };

      this.metrics.set(modelId, newMetrics);

      this.listeners.forEach(listener => {
        listener.onModelMetricsUpdated?.(newMetrics);
      });
    }
  }

  /**
   * Record time series data point
   */
  private recordTimeSeries(
    metricName: string,
    value: number,
    metadata?: Record<string, unknown>
  ): void {
    const dataPoint: MetricDataPoint = {
      timestamp: new Date(),
      value,
      ...(metadata && { metadata }),
    };

    let series = this.timeSeries.get(metricName);
    if (!series) {
      series = [];
      this.timeSeries.set(metricName, series);
    }

    series.push(dataPoint);

    // Cleanup old data based on retention period
    const cutoffTime = new Date(Date.now() - this.config.retentionPeriod);
    const validData = series.filter(point => point.timestamp >= cutoffTime);

    if (validData.length !== series.length) {
      this.timeSeries.set(metricName, validData);
    }
  }

  /**
   * Collect and emit system metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    try {
      const systemMetrics = await this.getSystemMetrics();

      this.listeners.forEach(listener => {
        listener.onMetricsCollected?.(systemMetrics);
      });

      // Record system-level time series
      this.recordTimeSeries('system.uptime', systemMetrics.systemUptime);
      this.recordTimeSeries('system.totalRequests', systemMetrics.totalRequests);
      this.recordTimeSeries('system.successRate',
        systemMetrics.totalRequests > 0
          ? systemMetrics.successfulRequests / systemMetrics.totalRequests
          : 0
      );
      this.recordTimeSeries('system.averageResponseTime', systemMetrics.averageResponseTime);
      this.recordTimeSeries('system.activeModels', systemMetrics.activeModels);
      this.recordTimeSeries('system.healthyModels', systemMetrics.healthyModels);
    } catch (error) {
      console.error('❌ Error collecting system metrics:', error);
    }
  }

  /**
   * Calculate health status based on performance metrics
   */
  private calculateHealthStatus(
    successRate: number,
    averageResponseTime: number
  ): 'healthy' | 'degraded' | 'unhealthy' | 'unknown' {
    if (successRate >= 0.95 && averageResponseTime < 2000) {
      return 'healthy';
    } else if (successRate >= 0.8 && averageResponseTime < 5000) {
      return 'degraded';
    } else if (successRate < 0.5 || averageResponseTime > 10000) {
      return 'unhealthy';
    } else {
      return 'degraded';
    }
  }

  /**
   * Check metric thresholds and notify listeners
   */
  private checkThresholds(modelId: string, metrics: ModelMetrics): void {
    // Check success rate threshold
    if (metrics.successRate < 0.8) {
      this.listeners.forEach(listener => {
        listener.onThresholdExceeded?.('successRate', metrics.successRate, 0.8);
      });
    }

    // Check response time threshold
    if (metrics.averageResponseTime > 5000) {
      this.listeners.forEach(listener => {
        listener.onThresholdExceeded?.('averageResponseTime', metrics.averageResponseTime, 5000);
      });
    }
  }

  /**
   * Convert circuit breaker state to numeric value for time series
   */
  private getStateValue(state: 'closed' | 'open' | 'half-open'): number {
    switch (state) {
      case 'closed': return 0;
      case 'half-open': return 1;
      case 'open': return 2;
      default: return -1;
    }
  }

  /**
   * Convert health status to numeric value for time series
   */
  private getHealthValue(status: string): number {
    switch (status) {
      case 'healthy': return 1;
      case 'degraded': return 0.5;
      case 'unhealthy': return 0;
      default: return -1;
    }
  }
}
