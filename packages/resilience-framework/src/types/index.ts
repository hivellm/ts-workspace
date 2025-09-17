/**
 * AI Model Resilience Framework Types
 * BIP-03 Implementation - Core Type Definitions
 *
 * @author Claude-4-Sonnet (Anthropic)
 * @version 1.0.0
 */

/**
 * AI Model identification and metadata
 */
export interface ModelIdentity {
  readonly id: string;
  readonly name: string;
  readonly provider: string;
  readonly version?: string;
  readonly capabilities?: string[];
}

/**
 * Model health status information
 */
export interface ModelHealth {
  readonly modelId: string;
  readonly status: ModelStatus;
  readonly lastHealthCheck: Date;
  readonly responseTime: number; // in milliseconds
  readonly errorRate: number; // percentage (0-100)
  readonly failureCount: number;
  readonly lastError?: Error | undefined;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Model availability status
 */
export type ModelStatus = 'available' | 'degraded' | 'unavailable' | 'maintenance';

/**
 * Circuit breaker states
 */
export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  readonly failureThreshold: number; // number of failures to trigger open state
  readonly recoveryTimeout: number; // milliseconds to wait before attempting recovery
  readonly successThreshold: number; // successful calls needed to close circuit
  readonly timeout: number; // request timeout in milliseconds
}

/**
 * Circuit breaker status
 */
export interface CircuitBreakerStatus {
  readonly state: CircuitBreakerState;
  readonly failureCount: number;
  readonly lastFailureTime?: Date | undefined;
  readonly nextRetryTime?: Date | undefined;
  readonly successCount: number;
}

/**
 * Retry configuration options
 */
export interface RetryOptions {
  readonly maxRetries: number;
  readonly baseDelay: number; // base delay in milliseconds
  readonly maxDelay: number; // maximum delay in milliseconds
  readonly backoffMultiplier: number; // exponential backoff multiplier
  readonly jitter: boolean; // add random jitter to delays
  readonly retryableErrors?: string[]; // specific error types to retry
}

/**
 * Fallback strategy types
 */
export type FallbackStrategy = 'sequential' | 'parallel' | 'weighted' | 'random';

/**
 * Fallback configuration
 */
export interface FallbackConfig {
  readonly primary: ModelIdentity;
  readonly fallbacks: ModelIdentity[];
  readonly strategy: FallbackStrategy;
  readonly maxConcurrent?: number; // for parallel strategy
  readonly weights?: Record<string, number>; // for weighted strategy
  readonly timeout: number; // overall timeout for fallback execution
}

/**
 * AI task execution context
 */
export interface AITask {
  readonly id: string;
  readonly type: string;
  readonly payload: unknown;
  readonly priority?: 'low' | 'normal' | 'high' | 'critical';
  readonly timeout?: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * AI response from model execution
 */
export interface AIResponse {
  readonly taskId: string;
  readonly modelId: string;
  readonly result: unknown;
  readonly success: boolean;
  readonly responseTime: number;
  readonly timestamp: Date;
  readonly error?: Error;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Resilience metrics for monitoring
 */
export interface ResilienceMetrics {
  readonly timestamp: Date;
  readonly modelAvailability: Map<string, number>; // model ID -> availability percentage
  readonly failoverEvents: number;
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly averageResponseTime: number;
  readonly degradedOperations: number;
  readonly circuitBreakerTrips: number;
  readonly recoveryEvents: number;
}

/**
 * Alert severity levels
 */
export type AlertSeverity = 'critical' | 'warning' | 'info';

/**
 * Alert configuration
 */
export interface AlertConfig {
  readonly name: string;
  readonly description: string;
  readonly severity: AlertSeverity;
  readonly threshold: number;
  readonly window: number; // time window in milliseconds
  readonly channels: string[]; // notification channels
  readonly enabled: boolean;
}

/**
 * Alert event
 */
export interface AlertEvent {
  readonly id: string;
  readonly alertName: string;
  readonly severity: AlertSeverity;
  readonly message: string;
  readonly timestamp: Date;
  readonly modelId?: string;
  readonly value: number;
  readonly threshold: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Recovery action types
 */
export type RecoveryAction = 'restart' | 'reset_circuit' | 'update_config' | 'manual_intervention';

/**
 * Recovery event
 */
export interface RecoveryEvent {
  readonly id: string;
  readonly modelId: string;
  readonly action: RecoveryAction;
  readonly trigger: 'automatic' | 'manual';
  readonly timestamp: Date;
  readonly success: boolean;
  readonly duration: number; // recovery time in milliseconds
  readonly details?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  readonly interval: number; // check interval in milliseconds
  readonly timeout: number; // individual check timeout
  readonly retries: number; // retries for failed checks
  readonly endpoint?: string; // health check endpoint
  readonly expectedResponse?: unknown; // expected health check response
}

/**
 * Model configuration for resilience
 */
export interface ModelResilienceConfig {
  readonly modelId: string;
  readonly circuitBreaker: CircuitBreakerConfig;
  readonly retry: RetryOptions;
  readonly healthCheck: HealthCheckConfig;
  readonly fallback?: FallbackConfig;
  readonly alerts: AlertConfig[];
  readonly enabled: boolean;
}

/**
 * Global resilience configuration
 */
export interface ResilienceFrameworkConfig {
  readonly models: Record<string, ModelResilienceConfig>;
  readonly global: {
    readonly defaultTimeout: number;
    readonly maxConcurrentRequests: number;
    readonly metricsRetention: number; // metrics retention period in milliseconds
    readonly alerting: {
      readonly enabled: boolean;
      readonly channels: Record<string, unknown>;
    };
    readonly recovery: {
      readonly autoRecoveryEnabled: boolean;
      readonly maxRecoveryAttempts: number;
      readonly recoveryDelay: number;
    };
  };
}

/**
 * Execution result with resilience information
 */
export interface ResilienceExecutionResult<T = unknown> {
  readonly result: T;
  readonly success: boolean;
  readonly modelUsed: string;
  readonly executionTime: number;
  readonly fallbackUsed: boolean;
  readonly retryCount: number;
  readonly circuitBreakerTriggered: boolean;
  readonly error?: Error;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Error types for resilience framework
 */
export class ResilienceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly modelId?: string,
    public readonly recoverable: boolean = true
  ) {
    super(message);
    this.name = 'ResilienceError';
  }
}

export class CircuitBreakerError extends ResilienceError {
  constructor(modelId: string, state: CircuitBreakerState) {
    super(
      `Circuit breaker is ${state} for model ${modelId}`,
      'CIRCUIT_BREAKER_OPEN',
      modelId,
      true
    );
    this.name = 'CircuitBreakerError';
  }
}

export class ModelUnavailableError extends ResilienceError {
  constructor(modelId: string, reason?: string) {
    super(
      `Model ${modelId} is unavailable${reason ? `: ${reason}` : ''}`,
      'MODEL_UNAVAILABLE',
      modelId,
      true
    );
    this.name = 'ModelUnavailableError';
  }
}

export class AllModelsFailedError extends ResilienceError {
  constructor(modelIds: string[], lastError?: Error) {
    super(
      `All models failed: ${modelIds.join(', ')}`,
      'ALL_MODELS_FAILED',
      undefined,
      false
    );
    this.name = 'AllModelsFailedError';
    if (lastError) {
      this.cause = lastError;
    }
  }
}

/**
 * Alert notification channels
 */
export type AlertChannel = 'slack' | 'email' | 'webhook' | 'console';

/**
 * Alert instance
 */
export interface Alert {
  readonly id: string;
  readonly configId: string;
  readonly timestamp: Date;
  readonly severity: AlertSeverity;
  readonly title: string;
  readonly message: string;
  readonly metric: string;
  readonly value: number;
  readonly threshold: number;
  readonly modelId?: string | undefined;
  readonly metadata?: Record<string, unknown> | undefined;
}

/**
 * Alert delivery status
 */
export interface AlertDeliveryStatus {
  readonly alertId: string;
  readonly channel: AlertChannel;
  readonly success: boolean;
  readonly timestamp: Date;
  readonly error?: string | undefined;
  readonly responseTime: number;
}

/**
 * Metric data point for time series
 */
export interface MetricDataPoint {
  readonly timestamp: Date;
  readonly value: number;
  readonly metadata?: Record<string, unknown> | undefined;
}

/**
 * Dashboard widget types
 */
export type WidgetType =
  | 'metric'
  | 'chart'
  | 'status'
  | 'alert'
  | 'model-grid'
  | 'performance-summary';

/**
 * Metric widget data
 */
export interface MetricWidget {
  readonly type: 'metric';
  readonly metric: string;
  readonly value: number;
  readonly unit?: string | undefined;
  readonly trend?: 'up' | 'down' | 'stable' | undefined;
  readonly status?: 'good' | 'warning' | 'critical' | undefined;
  readonly previousValue?: number | undefined;
}

/**
 * Status widget data
 */
export interface StatusWidget {
  readonly type: 'status';
  readonly status: 'operational' | 'degraded' | 'down' | 'maintenance';
  readonly message: string;
  readonly uptime: number;
  readonly lastIncident?: Date | undefined;
}

/**
 * Chart widget data
 */
export interface ChartWidget {
  readonly type: 'chart';
  readonly chartType: 'line' | 'area' | 'bar' | 'pie' | 'gauge';
  readonly series: unknown[];
  readonly timeRange: unknown;
}

/**
 * Alert widget data
 */
export interface AlertWidget {
  readonly type: 'alert';
  readonly activeAlerts: number;
  readonly criticalAlerts: number;
  readonly warningAlerts: number;
  readonly recentAlerts: Alert[];
}

/**
 * Model grid widget data
 */
export interface ModelGridWidget {
  readonly type: 'model-grid';
  readonly models: unknown[];
}

/**
 * Performance summary widget data
 */
export interface PerformanceSummaryWidget {
  readonly type: 'performance-summary';
  readonly totalRequests: number;
  readonly successRate: number;
  readonly averageResponseTime: number;
  readonly p95ResponseTime: number;
  readonly activeModels: number;
  readonly healthyModels: number;
}
