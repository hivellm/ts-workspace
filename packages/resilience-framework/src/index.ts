/**
 * AI Model Resilience Framework
 * BIP-03 Implementation - Main Export File
 *
 * @author Claude-4-Sonnet (Anthropic)
 * @version 1.0.0
 */

// Type exports
export * from './types/index.js';

// Core components
export {
  HealthChecker,
  type HealthCheckListener
} from './core/HealthChecker.js';

export {
  CircuitBreaker,
  CircuitBreakerFactory,
  type CircuitBreakerListener,
  type CircuitBreakerStateChangeEvent,
  type CircuitBreakerExecutionEvent
} from './core/CircuitBreaker.js';

export {
  RetryManager,
  BatchRetryExecutor,
  RetryExhaustedError,
  RetryStatisticsCollector,
  type RetryStatistics
} from './core/RetryManager.js';

// Fallback components
export {
  FallbackManager,
  DefaultModelExecutor,
  type ModelExecutor,
  type PerformanceMetrics,
  type RoutingConfig
} from './fallback/FallbackManager.js';

// Monitoring components
export {
  MetricsCollector,
  AlertManager,
  Dashboard,
  Analytics,
  type SystemMetrics,
  type ModelMetrics,
  type MetricDataPoint,
  type Alert,
  type AlertConfig,
  type DashboardLayout,
  type DashboardSnapshot,
  type PerformanceReport,
  type TrendAnalysis,
  type AnomalyDetection
} from './monitoring/index.js';

// Phase 4: Advanced Features
export {
  DegradationController,
  AutoRecovery,
  LoadBalancer,
  ChaosTestSuite,
  OptimizationEngine,
  type DegradationLevel,
  type DegradationStrategy,
  type DegradationStatus,
  type RecoveryStrategy,
  type RecoveryPlan,
  type RecoveryExecutionResult,
  type LoadBalancingAlgorithm,
  type LoadBalancingDecision,
  type ModelLoadStats,
  type ChaosExperiment,
  type ExperimentResult,
  type OptimizationStrategy,
  type OptimizationResult,
  type BottleneckAnalysis
} from './recovery/index.js';

// Re-export commonly used types for convenience
export type {
  ModelIdentity,
  ModelHealth,
  ModelStatus,
  CircuitBreakerState,
  CircuitBreakerConfig,
  CircuitBreakerStatus,
  RetryOptions,
  FallbackStrategy,
  FallbackConfig,
  AITask,
  AIResponse,
  ResilienceMetrics,
  ResilienceExecutionResult,
  ModelResilienceConfig,
  ResilienceFrameworkConfig
} from './types/index.js';
