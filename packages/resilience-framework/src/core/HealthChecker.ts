/**
 * Health Checker Service
 * BIP-03 Implementation - Core Infrastructure Phase 1
 *
 * @author Claude-4-Sonnet (Anthropic)
 * @version 1.0.0
 */

import {
  ModelIdentity,
  ModelHealth,
  ModelStatus,
  HealthCheckConfig,
  ResilienceError,
  AlertEvent,
  AlertSeverity
} from '../types/index.js';

/**
 * Health checker for monitoring AI model availability and performance
 */
export class HealthChecker {
  private readonly models = new Map<string, ModelHealth>();
  private readonly configs = new Map<string, HealthCheckConfig>();
  private readonly intervals = new Map<string, NodeJS.Timeout>();
  private readonly listeners = new Set<HealthCheckListener>();
  private isRunning = false;

  constructor(private readonly defaultConfig: HealthCheckConfig = {
    interval: 30000, // 30 seconds
    timeout: 5000,   // 5 seconds
    retries: 3,
  }) {}

  /**
   * Register a model for health monitoring
   */
  async registerModel(
    model: ModelIdentity,
    config?: Partial<HealthCheckConfig>
  ): Promise<void> {
    const modelConfig = { ...this.defaultConfig, ...config };
    this.configs.set(model.id, modelConfig);

    // Initialize health status
    const initialHealth: ModelHealth = {
      modelId: model.id,
      status: 'available',
      lastHealthCheck: new Date(),
      responseTime: 0,
      errorRate: 0,
      failureCount: 0,
    };

    this.models.set(model.id, initialHealth);

    // Start monitoring if health checker is running
    if (this.isRunning) {
      await this.startModelMonitoring(model.id);
    }
  }

  /**
   * Unregister a model from health monitoring
   */
  async unregisterModel(modelId: string): Promise<void> {
    // Stop monitoring
    const interval = this.intervals.get(modelId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(modelId);
    }

    // Remove from collections
    this.models.delete(modelId);
    this.configs.delete(modelId);
  }

  /**
   * Start health monitoring for all registered models
   */
  async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Start monitoring for all registered models
    for (const modelId of this.models.keys()) {
      await this.startModelMonitoring(modelId);
    }
  }

  /**
   * Stop health monitoring for all models
   */
  async stopMonitoring(): Promise<void> {
    this.isRunning = false;

    // Clear all intervals
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
  }

  /**
   * Perform immediate health check for a specific model
   */
  async checkModelHealth(modelId: string): Promise<ModelHealth> {
    const config = this.configs.get(modelId);
    if (!config) {
      throw new ResilienceError(
        `Model ${modelId} is not registered for health monitoring`,
        'MODEL_NOT_REGISTERED',
        modelId,
        false
      );
    }

    const startTime = Date.now();
    let status: ModelStatus = 'available';
    let error: Error | undefined;
    let responseTime = 0;

    try {
      // Perform health check with retries
      await this.performHealthCheckWithRetries(modelId, config);
      responseTime = Date.now() - startTime;

      // Determine status based on response time
      if (responseTime > config.timeout * 0.8) {
        status = 'degraded';
      }
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      status = 'unavailable';
      responseTime = Date.now() - startTime;
    }

    // Update health status
    const currentHealth = this.models.get(modelId);
    const newHealth: ModelHealth = {
      modelId,
      status,
      lastHealthCheck: new Date(),
      responseTime,
      errorRate: this.calculateErrorRate(modelId, status === 'unavailable'),
      failureCount: status === 'unavailable'
        ? (currentHealth?.failureCount || 0) + 1
        : 0,
      lastError: error,
    };

    this.models.set(modelId, newHealth);

    // Notify listeners
    this.notifyHealthChange(newHealth);

    // Check for alerts
    await this.checkAlerts(newHealth);

    return newHealth;
  }

  /**
   * Get current health status for a model
   */
  getModelHealth(modelId: string): ModelHealth | undefined {
    return this.models.get(modelId);
  }

  /**
   * Get health status for all models
   */
  getAllModelHealth(): Map<string, ModelHealth> {
    return new Map(this.models);
  }

  /**
   * Get models by status
   */
  getModelsByStatus(status: ModelStatus): string[] {
    return Array.from(this.models.entries())
      .filter(([, health]) => health.status === status)
      .map(([modelId]) => modelId);
  }

  /**
   * Add health check listener
   */
  addListener(listener: HealthCheckListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove health check listener
   */
  removeListener(listener: HealthCheckListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Start monitoring for a specific model
   */
  private async startModelMonitoring(modelId: string): Promise<void> {
    const config = this.configs.get(modelId);
    if (!config) {
      return;
    }

    // Perform initial health check
    await this.checkModelHealth(modelId);

    // Set up periodic health checks
    const interval = setInterval(async () => {
      try {
        await this.checkModelHealth(modelId);
      } catch (error) {
        // Log error but continue monitoring
        console.error(`Health check failed for model ${modelId}:`, error);
      }
    }, config.interval);

    this.intervals.set(modelId, interval);
  }

  /**
   * Perform health check with retries
   */
  private async performHealthCheckWithRetries(
    modelId: string,
    config: HealthCheckConfig
  ): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= config.retries; attempt++) {
      try {
        await this.performSingleHealthCheck(modelId, config);
        return; // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < config.retries) {
          // Wait before retry (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await this.delay(delay);
        }
      }
    }

    throw lastError || new Error('Health check failed after retries');
  }

  /**
   * Perform a single health check
   */
  private async performSingleHealthCheck(
    modelId: string,
    config: HealthCheckConfig
  ): Promise<void> {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Health check timeout for model ${modelId}`));
      }, config.timeout);
    });

    // Create health check promise
    const healthCheckPromise = this.executeHealthCheck(modelId, config);

    // Race between health check and timeout
    await Promise.race([healthCheckPromise, timeoutPromise]);
  }

  /**
   * Execute actual health check (to be implemented based on model type)
   */
  private async executeHealthCheck(
    modelId: string,
    config: HealthCheckConfig
  ): Promise<void> {
    // Basic health check implementation
    // In real implementation, this would call the actual model endpoint

    if (config.endpoint) {
      // HTTP health check
      const response = await fetch(config.endpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(config.timeout),
      });

      if (!response.ok) {
        throw new Error(`Health check failed with status ${response.status}`);
      }

      if (config.expectedResponse) {
        const body = await response.json();
        // Simple equality check - could be more sophisticated
        if (JSON.stringify(body) !== JSON.stringify(config.expectedResponse)) {
          throw new Error('Health check response does not match expected');
        }
      }
    } else {
      // Simple ping-style check
      // Simulate model availability check
      const isAvailable = await this.simulateModelCheck(modelId);
      if (!isAvailable) {
        throw new Error(`Model ${modelId} is not responding`);
      }
    }
  }

  /**
   * Simulate model availability check (placeholder)
   */
  private async simulateModelCheck(_modelId: string): Promise<boolean> {
    // In real implementation, this would check actual model availability
    // For now, randomly simulate availability (90% success rate)
    await this.delay(Math.random() * 1000); // Simulate network delay
    return Math.random() > 0.1;
  }

  /**
   * Calculate error rate for a model
   */
  private calculateErrorRate(modelId: string, isError: boolean): number {
    // Simple moving average implementation
    // In production, this would use a more sophisticated algorithm
    const currentHealth = this.models.get(modelId);
    if (!currentHealth) {
      return isError ? 100 : 0;
    }

    // Simple exponential moving average
    const alpha = 0.1; // smoothing factor
    const errorValue = isError ? 100 : 0;
    return currentHealth.errorRate * (1 - alpha) + errorValue * alpha;
  }

  /**
   * Notify all listeners of health changes
   */
  private notifyHealthChange(health: ModelHealth): void {
    for (const listener of this.listeners) {
      try {
        listener.onHealthChange(health);
      } catch (error) {
        console.error('Error notifying health change listener:', error);
      }
    }
  }

  /**
   * Check for alert conditions
   */
  private async checkAlerts(health: ModelHealth): Promise<void> {
    const alerts: AlertEvent[] = [];

    // Model unavailable alert
    if (health.status === 'unavailable') {
      alerts.push({
        id: `${health.modelId}-unavailable-${Date.now()}`,
        alertName: 'model_unavailable',
        severity: 'error' as AlertSeverity,
        message: `Model ${health.modelId} is unavailable`,
        timestamp: new Date(),
        modelId: health.modelId,
        value: 0,
        threshold: 1,
      });
    }

    // High error rate alert
    if (health.errorRate > 50) {
      alerts.push({
        id: `${health.modelId}-high-error-rate-${Date.now()}`,
        alertName: 'high_error_rate',
        severity: 'warning' as AlertSeverity,
        message: `Model ${health.modelId} has high error rate: ${health.errorRate.toFixed(1)}%`,
        timestamp: new Date(),
        modelId: health.modelId,
        value: health.errorRate,
        threshold: 50,
      });
    }

    // High response time alert
    if (health.responseTime > 10000) { // 10 seconds
      alerts.push({
        id: `${health.modelId}-slow-response-${Date.now()}`,
        alertName: 'slow_response',
        severity: 'warning' as AlertSeverity,
        message: `Model ${health.modelId} has slow response time: ${health.responseTime}ms`,
        timestamp: new Date(),
        modelId: health.modelId,
        value: health.responseTime,
        threshold: 10000,
      });
    }

    // Notify listeners of alerts
    for (const alert of alerts) {
      for (const listener of this.listeners) {
        try {
          listener.onAlert?.(alert);
        } catch (error) {
          console.error('Error notifying alert listener:', error);
        }
      }
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Health check event listener interface
 */
export interface HealthCheckListener {
  onHealthChange(health: ModelHealth): void;
  onAlert?(alert: AlertEvent): void;
}
