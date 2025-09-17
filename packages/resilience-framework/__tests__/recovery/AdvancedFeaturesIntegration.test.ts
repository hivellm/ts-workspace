/**
 * Advanced Features Integration Tests
 * BIP-03 Implementation - Phase 4: Advanced Features
 *
 * @author Claude-4-Sonnet (Anthropic)
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DegradationController,
  AutoRecovery,
  LoadBalancer,
  ChaosTestSuite,
  OptimizationEngine,
  type DegradationLevel,
  type RecoveryStrategy,
  type LoadBalancingAlgorithm,
  type ChaosExperiment,
  type OptimizationStrategy,
  type ModelIdentity,
  type PerformanceMetrics
} from '../../src/index.js';

describe('Advanced Features Integration', () => {
  let degradationController: DegradationController;
  let autoRecovery: AutoRecovery;
  let loadBalancer: LoadBalancer;
  let chaosTestSuite: ChaosTestSuite;
  let optimizationEngine: OptimizationEngine;

  const mockModels: ModelIdentity[] = [
    { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', version: '4.0' },
    { id: 'claude-3', name: 'Claude 3', provider: 'Anthropic', version: '3.0' },
    { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google', version: '1.0' },
  ];

  const mockTask = {
    id: 'test-task-001',
    type: 'text_generation' as const,
    prompt: 'Generate a test response',
    parameters: {},
    metadata: { priority: 'normal' }
  };

  beforeEach(async () => {
    degradationController = new DegradationController();
    autoRecovery = new AutoRecovery();
    loadBalancer = new LoadBalancer();
    chaosTestSuite = new ChaosTestSuite();
    optimizationEngine = new OptimizationEngine();

    // Register models with load balancer
    for (const model of mockModels) {
      loadBalancer.registerModel(model, {
        modelId: model.id,
        weight: 1.0,
        priority: 5,
        maxConnections: 100,
        enabled: true,
      });
    }
  });

  afterEach(async () => {
    await degradationController.stopMonitoring();
    await autoRecovery.stopMonitoring();
    await loadBalancer.stop();
    await chaosTestSuite.stop();
    await optimizationEngine.stop();
  });

  describe('Degradation Controller', () => {
    it('should start monitoring and detect performance issues', async () => {
      await degradationController.startMonitoring(1000); // 1 second for testing

      expect(degradationController.getCurrentStatus().level).toBe('none');

      // Simulate poor performance metrics
      const poorMetrics = {
        responseTime: 15000, // 15 seconds
        successRate: 0.7,
        errorRate: 0.3,
        throughput: 50,
        activeConnections: 5,
        resourceUsage: { cpu: 0.9, memory: 0.8, network: 0.5 },
      };

      degradationController.updateSystemMetrics(poorMetrics);

      // Trigger manual degradation
      const success = await degradationController.triggerDegradation(
        'moderate',
        'High response time detected',
        ['gpt-4']
      );

      expect(success).toBe(true);
      expect(degradationController.getCurrentStatus().level).toBe('moderate');
    });

    it('should automatically recover when performance improves', async () => {
      // First degrade
      await degradationController.triggerDegradation('minimal', 'Test degradation');
      expect(degradationController.getCurrentStatus().level).toBe('minimal');

      // Simulate improved performance metrics
      const improvedMetrics = {
        responseTime: 1000, // Good response time
        successRate: 0.99,
        errorRate: 0.01,
        throughput: 200,
        activeConnections: 2,
        resourceUsage: { cpu: 0.3, memory: 0.4, network: 0.2 },
      };

      degradationController.updateSystemMetrics(improvedMetrics);

      // Then attempt recovery
      const recovered = await degradationController.recoverFromDegradation();
      expect(recovered).toBe(true);
      expect(degradationController.getCurrentStatus().level).toBe('none');
    });

    it('should provide degradation history', () => {
      const history = degradationController.getDegradationHistory(5);
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('Auto Recovery', () => {
    it('should start monitoring and trigger recovery', async () => {
      await autoRecovery.startMonitoring(1000); // 1 second for testing

      // Simulate model health issue
      const unhealthyModel = {
        status: 'unavailable' as const,
        lastHealthCheck: new Date(),
        responseTime: 30000,
        errorRate: 0.8,
        failureCount: 15,
        lastError: 'Connection timeout',
        consecutiveFailures: 10,
        availability: 0.2,
      };

      autoRecovery.updateModelHealth('gpt-4', unhealthyModel);

      // Manual recovery trigger
      const recoveryId = await autoRecovery.triggerRecovery(
        'gpt-4',
        {
          type: 'persistent',
          severity: 'high',
          scope: 'model',
          contributing_factors: ['high_error_rate', 'timeouts'],
        },
        'immediate'
      );

      expect(typeof recoveryId).toBe('string');
      expect(recoveryId.startsWith('recovery-')).toBe(true);
    });

    it('should provide recovery statistics', () => {
      const stats = autoRecovery.getRecoveryStatistics();

      expect(stats).toHaveProperty('totalRecoveries');
      expect(stats).toHaveProperty('successfulRecoveries');
      expect(stats).toHaveProperty('recoverySuccessRate');
      expect(stats).toHaveProperty('averageRecoveryTime');
    });

    it('should simulate recovery plans', async () => {
      const simulation = await autoRecovery.simulateRecovery('claude-3', 'adaptive');

      expect(simulation).toHaveProperty('plan');
      expect(simulation).toHaveProperty('estimatedSuccessRate');
      expect(simulation).toHaveProperty('riskAssessment');
      expect(simulation).toHaveProperty('alternativeStrategies');
      expect(Array.isArray(simulation.alternativeStrategies)).toBe(true);
    });
  });

  describe('Load Balancer', () => {
    it('should start and select models using different algorithms', async () => {
      await loadBalancer.start();

      // Test round robin
      loadBalancer.updateConfiguration({ algorithm: 'round_robin' });
      const decision1 = await loadBalancer.selectModel(mockTask);
      expect(mockModels.some(m => m.id === decision1.selectedModel.id)).toBe(true);
      expect(decision1.algorithm).toBe('round_robin');

      // Test adaptive algorithm
      loadBalancer.updateConfiguration({ algorithm: 'adaptive' });
      const decision2 = await loadBalancer.selectModel(mockTask);
      expect(decision2.algorithm).toBe('adaptive');
    });

    it('should track load statistics', () => {
      const stats = loadBalancer.getLoadStatistics();
      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBe(mockModels.length);

      stats.forEach(stat => {
        expect(stat).toHaveProperty('modelId');
        expect(stat).toHaveProperty('activeConnections');
        expect(stat).toHaveProperty('totalRequests');
        expect(stat).toHaveProperty('averageResponseTime');
        expect(stat).toHaveProperty('healthScore');
      });
    });

    it('should update model performance and record completions', () => {
      const modelId = 'gpt-4';

      // Update performance metrics
      const metrics: PerformanceMetrics = {
        averageResponseTime: 2000,
        throughputRps: 100,
        errorRate: 0.05,
        successRate: 0.95,
        resourceUsage: { cpu: 0.4, memory: 0.5, network: 0.3 },
      };

      loadBalancer.updateModelPerformance(modelId, metrics);

      // Record successful completion
      loadBalancer.recordRequestCompletion(modelId, true, 1500);

      const stats = loadBalancer.getModelStatistics(modelId);
      expect(stats).toBeDefined();
      expect(stats!.totalRequests).toBeGreaterThan(0);
      expect(stats!.successfulRequests).toBeGreaterThan(0);
    });

    it('should provide algorithm recommendations', () => {
      const recommendations = loadBalancer.getAlgorithmRecommendations();

      expect(recommendations).toHaveProperty('current');
      expect(recommendations).toHaveProperty('recommendations');
      expect(Array.isArray(recommendations.recommendations)).toBe(true);

      recommendations.recommendations.forEach(rec => {
        expect(rec).toHaveProperty('algorithm');
        expect(rec).toHaveProperty('score');
        expect(rec).toHaveProperty('reason');
      });
    });
  });

  describe('Chaos Test Suite', () => {
    it('should start and manage chaos experiments', async () => {
      await chaosTestSuite.start();

      const experiments = chaosTestSuite.getAvailableExperiments();
      expect(Array.isArray(experiments)).toBe(true);
      expect(experiments.length).toBeGreaterThan(0);

      // Run a dry run experiment
      const experimentId = experiments[0].id;
      const result = await chaosTestSuite.runExperiment(experimentId, {
        dryRun: true,
        environment: 'development',
        safetyChecks: true,
      });

      expect(result).toHaveProperty('experimentId');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('observations');
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
    });

    it('should validate experiment safety', () => {
      const experiments = chaosTestSuite.getAvailableExperiments();
      const experiment = experiments[0];

      const safety = chaosTestSuite.validateExperimentSafety(experiment);

      expect(safety).toHaveProperty('safe');
      expect(safety).toHaveProperty('warnings');
      expect(safety).toHaveProperty('blockers');
      expect(Array.isArray(safety.warnings)).toBe(true);
      expect(Array.isArray(safety.blockers)).toBe(true);
    });

    it('should generate experiment recommendations', () => {
      const recommendations = chaosTestSuite.generateRecommendations();

      expect(recommendations).toHaveProperty('suggested');
      expect(recommendations).toHaveProperty('priorities');
      expect(recommendations).toHaveProperty('riskAssessment');
      expect(Array.isArray(recommendations.suggested)).toBe(true);
      expect(Array.isArray(recommendations.priorities)).toBe(true);
    });

    it('should manage experiment lifecycle', async () => {
      const customExperiment: ChaosExperiment = {
        id: 'test-experiment-001',
        name: 'Test Model Failure',
        type: 'model_failure',
        description: 'Test system resilience when primary model fails',
        severity: 'low',
        scope: 'single_model',
        targets: ['gpt-4'],
        duration: 60000, // 1 minute
        parameters: { failureRate: 0.5 },
        successCriteria: {
          maxResponseTime: 10000,
          minSuccessRate: 0.8,
          maxErrorRate: 0.2,
          systemStability: true,
          recoveryTime: 30000,
        },
        rollbackStrategy: {
          automatic: true,
          triggers: [],
          timeout: 120000,
          actions: [{ type: 'stop_experiment', parameters: {} }],
        },
      };

      chaosTestSuite.addExperiment(customExperiment);
      expect(chaosTestSuite.getAvailableExperiments().some(e => e.id === customExperiment.id)).toBe(true);

      const removed = chaosTestSuite.removeExperiment(customExperiment.id);
      expect(removed).toBe(true);
      expect(chaosTestSuite.getAvailableExperiments().some(e => e.id === customExperiment.id)).toBe(false);
    });
  });

  describe('Optimization Engine', () => {
    it('should start and manage performance optimization', async () => {
      await optimizationEngine.start();

      const status = optimizationEngine.getOptimizationStatus();
      expect(status).toHaveProperty('strategy');
      expect(status).toHaveProperty('activeOptimizations');
      expect(status).toHaveProperty('totalOptimizationsApplied');
      expect(Array.isArray(status.activeOptimizations)).toBe(true);
    });

    it('should set performance targets and generate recommendations', async () => {
      const component = 'gpt-4';
      const targets = {
        responseTimeP50: 1000,
        responseTimeP95: 3000,
        responseTimeP99: 5000,
        throughputRps: 50,
        errorRate: 0.05,
        resourceUtilization: 0.7,
        costPerRequest: 0.01,
      };

      optimizationEngine.setPerformanceTargets(component, targets);

      // Update with poor performance to trigger recommendations
      const poorMetrics: PerformanceMetrics = {
        averageResponseTime: 8000, // Above target
        throughputRps: 20, // Below target
        errorRate: 0.15, // Above target
        successRate: 0.85,
        resourceUsage: { cpu: 0.9, memory: 0.8, network: 0.6 },
      };

      optimizationEngine.updatePerformanceMetrics(component, poorMetrics);

      const recommendations = await optimizationEngine.getOptimizationRecommendations(component);
      expect(Array.isArray(recommendations)).toBe(true);

      if (recommendations.length > 0) {
        expect(recommendations[0]).toHaveProperty('technique');
        expect(recommendations[0]).toHaveProperty('priority');
        expect(recommendations[0]).toHaveProperty('estimatedImprovement');
        expect(recommendations[0]).toHaveProperty('rationale');
      }
    });

    it('should apply and rollback optimizations', async () => {
      const component = 'claude-3';

      // First provide some performance metrics
      const initialMetrics: PerformanceMetrics = {
        modelId: component,
        averageResponseTime: 3000,
        successRate: 0.9,
        lastUpdated: new Date(),
        requestCount: 100,
        errorRate: 0.1,
        throughputRps: 50,
      };

      optimizationEngine.updatePerformanceMetrics(component, initialMetrics);

      // Apply optimization
      const result = await optimizationEngine.applyOptimization(
        component,
        'response_caching',
        { maxSize: '200MB', strategy: 'lru' }
      );

      expect(result).toHaveProperty('technique');
      expect(result).toHaveProperty('applied');
      expect(result).toHaveProperty('improvement');
      expect(result.technique).toBe('response_caching');

      // Attempt rollback
      if (result.rollbackAvailable) {
        const rollbackSuccess = await optimizationEngine.rollbackOptimization(
          component,
          'response_caching'
        );
        expect(typeof rollbackSuccess).toBe('boolean');
      }
    });

    it('should train ML optimization model', async () => {
      const trainingData = [
        {
          context: { responseTime: 5000, throughput: 30, errorRate: 0.1 },
          technique: 'response_caching' as const,
          improvement: 25,
        },
        {
          context: { responseTime: 3000, throughput: 50, errorRate: 0.05 },
          technique: 'parallel_processing' as const,
          improvement: 35,
        },
        {
          context: { responseTime: 8000, throughput: 20, errorRate: 0.2 },
          technique: 'model_warming' as const,
          improvement: 20,
        },
      ];

      await optimizationEngine.trainMLModel(trainingData);

      // Training should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should coordinate degradation and recovery', async () => {
      await degradationController.startMonitoring(500);
      await autoRecovery.startMonitoring(500);

      // Simulate system stress
      await degradationController.triggerDegradation('moderate', 'Integration test');
      expect(degradationController.getCurrentStatus().level).toBe('moderate');

      // Trigger recovery
      const recoveryId = await autoRecovery.triggerRecovery('system', undefined, 'gradual');
      expect(typeof recoveryId).toBe('string');

      // Attempt to recover from degradation
      const recovered = await degradationController.recoverFromDegradation();
      expect(typeof recovered).toBe('boolean');
    });

    it('should combine load balancing with optimization', async () => {
      await loadBalancer.start();
      await optimizationEngine.start();

      // Select model with load balancer
      const decision = await loadBalancer.selectModel(mockTask);
      const selectedModelId = decision.selectedModel.id;

      // First provide some performance metrics for the selected model
      const modelMetrics: PerformanceMetrics = {
        modelId: selectedModelId,
        averageResponseTime: 2500,
        successRate: 0.95,
        lastUpdated: new Date(),
        requestCount: 150,
        errorRate: 0.05,
        throughputRps: 75,
      };

      optimizationEngine.updatePerformanceMetrics(selectedModelId, modelMetrics);

      // Apply optimization to selected model
      const optimization = await optimizationEngine.applyOptimization(
        selectedModelId,
        'connection_pooling',
        { poolSize: 50 }
      );

      expect(optimization.applied).toBe(true);
      expect(optimization.technique).toBe('connection_pooling');
    });

    it('should run chaos experiments while monitoring with other systems', async () => {
      await chaosTestSuite.start();
      await loadBalancer.start();
      await optimizationEngine.start();

      // Get baseline metrics
      const initialStats = loadBalancer.getLoadStatistics();
      const initialOptStatus = optimizationEngine.getOptimizationStatus();

      expect(Array.isArray(initialStats)).toBe(true);
      expect(initialOptStatus).toHaveProperty('strategy');

      // Run a simple chaos experiment
      const experiments = chaosTestSuite.getAvailableExperiments();
      if (experiments.length > 0) {
        const result = await chaosTestSuite.runExperiment(experiments[0].id, {
          dryRun: true,
          environment: 'development',
        });

        expect(result.success).toBe(true);
      }

      // Verify other systems still operational
      const postStats = loadBalancer.getLoadStatistics();
      const postOptStatus = optimizationEngine.getOptimizationStatus();

      expect(Array.isArray(postStats)).toBe(true);
      expect(postOptStatus).toHaveProperty('strategy');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid model IDs gracefully', async () => {
      await expect(
        autoRecovery.triggerRecovery('non-existent-model')
      ).resolves.toBeTypeOf('string');

      const recommendations = await optimizationEngine.getOptimizationRecommendations('invalid-model');
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBe(0);
    });

    it('should handle concurrent operations safely', async () => {
      await Promise.all([
        degradationController.startMonitoring(100),
        autoRecovery.startMonitoring(100),
        loadBalancer.start(),
        optimizationEngine.start(),
      ]);

      // All should start without conflicts
      expect(true).toBe(true);
    });

    it('should provide safe emergency stop for chaos testing', async () => {
      await chaosTestSuite.start();

      // Emergency stop should work even with no active experiments
      await expect(chaosTestSuite.emergencyStop()).resolves.toBeUndefined();
    });
  });
});
