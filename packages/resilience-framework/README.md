# @cmmv-hive/resilience-framework

AI Model Resilience Framework for CMMV-Hive - BIP-03 Implementation

## Overview

The Resilience Framework provides comprehensive AI model resilience patterns to ensure the CMMV-Hive governance system remains operational even during AI model failures or degradation scenarios. This framework implements circuit breaker patterns, fallback strategies, health monitoring, and automatic recovery mechanisms.

## Features

### ✅ Phase 1: Core Infrastructure (Implemented)
- **Health Monitoring**: Real-time AI model health checks with configurable intervals
- **Circuit Breaker**: Automatic failure detection and isolation to prevent cascade failures
- **Retry Management**: Exponential backoff with jitter for transient failures
- **TypeScript Support**: Comprehensive type definitions and strict typing

### ✅ Phase 2: Fallback Strategies (Implemented)
- **Sequential Fallback**: Try models in priority order until success
- **Parallel Fallback**: Race multiple models for fastest response
- **Weighted Fallback**: Route to best-performing models based on metrics
- **Random Fallback**: Random model selection for load distribution
- **Performance Metrics**: Dynamic model performance tracking and weighting
- **Configuration Management**: Hot-reload routing configuration

### 📋 Phase 3: Monitoring & Alerting (Planned)
- Metrics collection framework
- Alert system integration
- Real-time monitoring dashboard
- Performance analytics

## Installation

```bash
# Using pnpm (recommended)
pnpm add @cmmv-hive/resilience-framework

# Using npm
npm install @cmmv-hive/resilience-framework

# Using yarn
yarn add @cmmv-hive/resilience-framework
```

## Quick Start

### Basic Circuit Breaker Usage

```typescript
import { CircuitBreaker, CircuitBreakerFactory } from '@cmmv-hive/resilience-framework';

// Create circuit breaker for a model
const circuitBreaker = CircuitBreakerFactory.getOrCreate('claude-4-sonnet', {
  failureThreshold: 5,
  recoveryTimeout: 60000, // 1 minute
  successThreshold: 3,
  timeout: 30000, // 30 seconds
});

// Execute AI model operation with circuit breaker protection
try {
  const result = await circuitBreaker.execute(async () => {
    return await callAIModel('your prompt here');
  });
  console.log('AI response:', result);
} catch (error) {
  if (error instanceof CircuitBreakerError) {
    console.log('Circuit breaker is open, using fallback');
    // Handle fallback logic
  } else {
    console.error('AI model error:', error);
  }
}
```

### Health Monitoring

```typescript
import { HealthChecker, ModelIdentity } from '@cmmv-hive/resilience-framework';

const healthChecker = new HealthChecker({
  interval: 30000, // Check every 30 seconds
  timeout: 5000,   // 5 second timeout
  retries: 3,      // 3 retries on failure
});

// Register models for monitoring
const model: ModelIdentity = {
  id: 'claude-4-sonnet',
  name: 'Claude 4 Sonnet',
  provider: 'Anthropic',
  version: '4.0',
};

await healthChecker.registerModel(model);

// Add health change listener
healthChecker.addListener({
  onHealthChange: (health) => {
    console.log(`Model ${health.modelId} status: ${health.status}`);
    console.log(`Response time: ${health.responseTime}ms`);
    console.log(`Error rate: ${health.errorRate}%`);
  },
  onAlert: (alert) => {
    console.log(`Alert: ${alert.alertName} - ${alert.message}`);
  }
});

// Start monitoring
await healthChecker.startMonitoring();
```

### Retry Management

```typescript
import { RetryManager, RetryOptions } from '@cmmv-hive/resilience-framework';

const retryManager = new RetryManager({
  maxRetries: 3,
  baseDelay: 1000,    // 1 second
  maxDelay: 30000,    // 30 seconds max
  backoffMultiplier: 2,
  jitter: true,       // Add random jitter
});

// Execute with retry logic
try {
  const result = await retryManager.executeWithRetry(async () => {
    return await callUnreliableService();
  });
  console.log('Success after retries:', result);
} catch (error) {
  console.error('All retries failed:', error);
}

// Execute with timeout and retry
const result = await retryManager.executeWithTimeoutAndRetry(
  async () => callSlowService(),
  10000, // 10 second timeout
  { maxRetries: 5 }
);
```

### Batch Operations

```typescript
import { RetryManager } from '@cmmv-hive/resilience-framework';

const retryManager = new RetryManager();
const batchExecutor = retryManager.createBatchExecutor();

// Add multiple operations
batchExecutor
  .add(() => callAIModel1('prompt'))
  .add(() => callAIModel2('prompt'))
  .add(() => callAIModel3('prompt'));

// Execute all with retries
const results = await batchExecutor.executeAll();

// Or execute any (first success wins)
const firstSuccess = await batchExecutor.executeAny();

// Or get all results (settled)
const allResults = await batchExecutor.executeAllSettled();
```

### Fallback Strategies (Phase 2)

```typescript
import { FallbackManager, ModelExecutor } from '@cmmv-hive/resilience-framework';

// Initialize fallback manager
const fallbackManager = new FallbackManager();

// Define AI models
const primaryModel = {
  id: 'claude-4-sonnet',
  name: 'Claude 4 Sonnet',
  provider: 'Anthropic'
};

const fallbackModels = [
  {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'OpenAI'
  },
  {
    id: 'deepseek-v3',
    name: 'DeepSeek V3',
    provider: 'DeepSeek'
  }
];

// Configure fallback strategy
const fallbackConfig = {
  primary: primaryModel,
  fallbacks: fallbackModels,
  strategy: 'weighted', // 'sequential', 'parallel', 'weighted', 'random'
  timeout: 30000,
  maxConcurrent: 3
};

// Execute task with fallback protection
const task = {
  id: 'bip-analysis',
  type: 'completion',
  payload: { prompt: 'Analyze this BIP proposal for governance compliance...' },
  priority: 'high'
};

const result = await fallbackManager.executeWithFallback(task, fallbackConfig);

if (result.success) {
  console.log(`✅ Success with ${result.modelUsed}`);
  console.log(`📝 Response: ${result.result}`);
  console.log(`⚡ Time: ${result.executionTime}ms`);
  console.log(`🔄 Fallback used: ${result.fallbackUsed}`);
} else {
  console.error('❌ All models failed:', result.error);
  console.log('🔍 Attempted models:', result.metadata?.attemptedModels);
}

// Configure performance-based routing
fallbackManager.configureRouting({
  defaultStrategy: 'weighted',
  maxConcurrency: 5,
  timeoutMs: 60000,
  retryOnFailure: true
});

// Monitor performance metrics
const metrics = fallbackManager.getPerformanceMetrics();
for (const [modelId, metric] of metrics) {
  console.log(`📊 ${modelId}:`);
  console.log(`   Success Rate: ${(metric.successRate * 100).toFixed(1)}%`);
  console.log(`   Avg Response: ${metric.averageResponseTime.toFixed(0)}ms`);
  console.log(`   Requests: ${metric.requestCount}`);
}
```

#### Fallback Strategies

1. **Sequential Fallback**: Try models one by one in priority order
   - ✅ Predictable behavior
   - ✅ Lower resource usage
   - ❌ Slower when primary fails

2. **Parallel Fallback**: Race multiple models simultaneously
   - ✅ Fastest response time
   - ✅ High availability
   - ❌ Higher resource usage

3. **Weighted Fallback**: Route based on performance metrics
   - ✅ Adaptive routing
   - ✅ Performance optimization
   - ✅ Learns from history

4. **Random Fallback**: Random model selection
   - ✅ Load distribution
   - ✅ Simple implementation
   - ❌ No performance optimization

## API Reference

### CircuitBreaker

The circuit breaker prevents cascade failures by temporarily blocking requests to failing models.

#### Configuration Options

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number;    // Failures needed to open circuit
  recoveryTimeout: number;     // Time to wait before retry (ms)
  successThreshold: number;    // Successes needed to close circuit
  timeout: number;             // Request timeout (ms)
}
```

#### States

- **Closed**: Normal operation, requests pass through
- **Open**: Circuit is tripped, requests are blocked
- **Half-Open**: Testing if service has recovered

### HealthChecker

Monitors AI model health and availability in real-time.

#### Configuration Options

```typescript
interface HealthCheckConfig {
  interval: number;           // Check interval (ms)
  timeout: number;            // Individual check timeout (ms)
  retries: number;            // Retries for failed checks
  endpoint?: string;          // Health check endpoint URL
  expectedResponse?: unknown; // Expected response for validation
}
```

#### Model Status

- **available**: Model is healthy and responsive
- **degraded**: Model is slow but functional
- **unavailable**: Model is not responding
- **maintenance**: Model is in maintenance mode

### RetryManager

Provides exponential backoff retry logic with jitter and configurable error handling.

#### Configuration Options

```typescript
interface RetryOptions {
  maxRetries: number;           // Maximum retry attempts
  baseDelay: number;            // Base delay in milliseconds
  maxDelay: number;             // Maximum delay cap
  backoffMultiplier: number;    // Exponential backoff multiplier
  jitter: boolean;              // Add random jitter
  retryableErrors?: string[];   // Specific errors to retry
}
```

## Error Handling

### Error Types

```typescript
// Base resilience error
class ResilienceError extends Error {
  code: string;
  modelId?: string;
  recoverable: boolean;
}

// Circuit breaker specific error
class CircuitBreakerError extends ResilienceError {
  // Thrown when circuit breaker is open
}

// Model unavailable error
class ModelUnavailableError extends ResilienceError {
  // Thrown when model is not available
}

// All models failed error
class AllModelsFailedError extends ResilienceError {
  // Thrown when all fallback models fail
}

// Retry exhausted error
class RetryExhaustedError extends ResilienceError {
  maxRetries: number;
  lastError: Error;
}
```

## Configuration

### Environment Variables

```bash
# Global settings
RESILIENCE_DEFAULT_TIMEOUT=30000
RESILIENCE_MAX_CONCURRENT_REQUESTS=10
RESILIENCE_HEALTH_CHECK_INTERVAL=30000

# Model-specific settings
RESILIENCE_CLAUDE_4_SONNET_TIMEOUT=25000
RESILIENCE_GPT_5_FAILURE_THRESHOLD=3
```

### Configuration File

```yaml
# config/resilience.yml
global:
  defaultTimeout: 30000
  maxConcurrentRequests: 10
  healthCheckInterval: 30000

models:
  claude-4-sonnet:
    circuitBreaker:
      failureThreshold: 5
      recoveryTimeout: 60000
      successThreshold: 3
      timeout: 30000
    retry:
      maxRetries: 3
      baseDelay: 1000
      maxDelay: 30000
      backoffMultiplier: 2
      jitter: true
    healthCheck:
      interval: 30000
      timeout: 5000
      retries: 3
```

## Monitoring and Metrics

### Health Metrics

```typescript
interface ModelHealth {
  modelId: string;
  status: ModelStatus;
  lastHealthCheck: Date;
  responseTime: number;       // milliseconds
  errorRate: number;          // percentage (0-100)
  failureCount: number;
  lastError?: Error;
}
```

### Circuit Breaker Metrics

```typescript
interface CircuitBreakerStatus {
  state: CircuitBreakerState;
  failureCount: number;
  lastFailureTime?: Date;
  nextRetryTime?: Date;
  successCount: number;
}
```

### Retry Statistics

```typescript
interface RetryStatistics {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  averageRetries: number;
  maxRetries: number;
  totalDelay: number;
  averageDelay: number;
}
```

## Testing

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test CircuitBreaker.test.ts
```

## Development

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Start development mode (watch)
pnpm dev

# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix
```

## Contributing

1. Follow the existing code style and patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure all tests pass before submitting PR
5. Follow the BIP review process (BIP-01)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/cmmv-hive/cmmv-hive/issues)
- **Documentation**: [Full documentation](https://cmmv-hive.github.io/resilience-framework)
- **BIP-03**: [Original proposal and specification](../../gov/bips/BIP-03/)

---

**BIP-03 Implementation Status**: Phase 1 Complete ✅ | Phase 2 In Development 🔄

This framework is part of the CMMV-Hive BIP-03 implementation to ensure >99.9% system uptime and resilient AI model operations.


