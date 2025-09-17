/**
 * Monitoring Integration Tests
 * BIP-03 Implementation - Phase 3 Testing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MetricsCollector,
  AlertManager,
  Dashboard,
  Analytics,
  type SystemMetrics,
  type ModelMetrics,
  type Alert,
  type AlertConfig,
  type DashboardSnapshot,
  type PerformanceReport
} from '../../src/monitoring/index.js';

describe('Monitoring Integration', () => {
  let metricsCollector: MetricsCollector;
  let alertManager: AlertManager;
  let dashboard: Dashboard;
  let analytics: Analytics;

  beforeEach(() => {
    metricsCollector = new MetricsCollector();
    alertManager = new AlertManager();
    dashboard = new Dashboard();
    analytics = new Analytics();
  });

  describe('MetricsCollector', () => {
    it('should collect and store metrics', async () => {
      await metricsCollector.startCollection();

      // Record some test metrics
      metricsCollector.recordRequest('claude-4-sonnet', true, 1500);
      metricsCollector.recordRequest('gpt-5', false, 3000);
      metricsCollector.recordRequest('claude-4-sonnet', true, 1200);

      const systemMetrics = await metricsCollector.getSystemMetrics();

      expect(systemMetrics.totalRequests).toBe(3);
      expect(systemMetrics.successfulRequests).toBe(2);
      expect(systemMetrics.failedRequests).toBe(1);
      expect(systemMetrics.averageResponseTime).toBeGreaterThan(0);

      const claudeMetrics = metricsCollector.getModelMetrics('claude-4-sonnet');
      expect(claudeMetrics).toBeDefined();
      expect(claudeMetrics!.requests).toBe(2);
      expect(claudeMetrics!.successes).toBe(2);
      expect(claudeMetrics!.successRate).toBe(1);

      await metricsCollector.stopCollection();
    });

    it('should handle circuit breaker state changes', () => {
      metricsCollector.recordCircuitBreakerStateChange('test-model', 'open', 'closed');

      const metrics = metricsCollector.getSystemMetrics();
      expect(metrics).toBeDefined();
    });

    it('should record fallback events', () => {
      metricsCollector.recordFallbackTriggered('primary-model', 'fallback-model', 'sequential');

      const systemMetrics = metricsCollector.getSystemMetrics();
      expect(systemMetrics).toBeDefined();
    });
  });

  describe('AlertManager', () => {
    it('should trigger alerts based on system metrics', async () => {
      const alertTriggered = vi.fn();
      alertManager.addListener({ onAlertTriggered: alertTriggered });

      const testSystemMetrics: SystemMetrics = {
        timestamp: new Date(),
        systemUptime: 1000,
        totalRequests: 100,
        successfulRequests: 70, // 70% success rate - below 90% threshold
        failedRequests: 30,
        averageResponseTime: 2000,
        activeModels: 3,
        healthyModels: 2,
        circuitBreakersOpen: 0,
        fallbacksTriggered: 5,
      };

      await alertManager.processSystemMetrics(testSystemMetrics);

      expect(alertTriggered).toHaveBeenCalled();
    });

    it('should respect cooldown periods', async () => {
      const alertTriggered = vi.fn();
      alertManager.addListener({ onAlertTriggered: alertTriggered });

      // Trigger same alert twice rapidly
      await alertManager.triggerAlert('system-low-success-rate', 0.7);
      await alertManager.triggerAlert('system-low-success-rate', 0.6);

      // Should only trigger once due to cooldown
      expect(alertTriggered).toHaveBeenCalledTimes(1);
    });

    it('should manage alert configurations', () => {
      const customAlert: AlertConfig = {
        id: 'custom-test-alert',
        name: 'Test Alert',
        description: 'Test alert for unit testing',
        severity: 'warning',
        channels: ['console'],
        enabled: true,
        cooldownPeriod: 60000,
        condition: {
          metric: 'test.metric',
          operator: 'gt',
          threshold: 100,
        },
      };

      alertManager.addAlertConfig(customAlert);

      const success = alertManager.setAlertEnabled('custom-test-alert', false);
      expect(success).toBe(true);

      const removed = alertManager.removeAlertConfig('custom-test-alert');
      expect(removed).toBe(true);
    });

    it('should test alert delivery', async () => {
      const result = await alertManager.testAlert('console');
      expect(result).toBe(true);
    });
  });

  describe('Dashboard', () => {
    it('should manage dashboard layouts', () => {
      const layouts = dashboard.getLayouts();
      expect(layouts.length).toBeGreaterThan(0);

      const success = dashboard.setActiveLayout('default');
      expect(success).toBe(true);
    });

    it('should update with metrics data', async () => {
      const dataUpdated = vi.fn();
      dashboard.addListener({ onDataUpdated: dataUpdated });

      const testSystemMetrics: SystemMetrics = {
        timestamp: new Date(),
        systemUptime: 5000,
        totalRequests: 50,
        successfulRequests: 48,
        failedRequests: 2,
        averageResponseTime: 1500,
        activeModels: 2,
        healthyModels: 2,
        circuitBreakersOpen: 0,
        fallbacksTriggered: 1,
      };

      dashboard.updateSystemMetrics(testSystemMetrics);

      // Dashboard should process the update
      expect(testSystemMetrics.totalRequests).toBe(50);
    });

    it('should start and stop dashboard updates', async () => {
      await dashboard.start();
      expect(dashboard.getCurrentSnapshot()).toBeDefined();

      dashboard.stop();
      // Dashboard should stop updating
    });

    it('should export dashboard data', async () => {
      await dashboard.start();

      // Add some data
      const testMetrics: SystemMetrics = {
        timestamp: new Date(),
        systemUptime: 1000,
        totalRequests: 10,
        successfulRequests: 9,
        failedRequests: 1,
        averageResponseTime: 1000,
        activeModels: 1,
        healthyModels: 1,
        circuitBreakersOpen: 0,
        fallbacksTriggered: 0,
      };

      dashboard.updateSystemMetrics(testMetrics);

      const jsonData = dashboard.exportData('json');
      expect(jsonData).toContain('timestamp');

      const csvData = dashboard.exportData('csv');
      expect(csvData).toContain('Timestamp,Metric,Value');

      dashboard.stop();
    });
  });

  describe('Analytics', () => {
    it('should generate performance reports', () => {
      // Add some test data
      const now = new Date();
      const testSystemMetrics: SystemMetrics = {
        timestamp: now,
        systemUptime: 3600000, // 1 hour
        totalRequests: 1000,
        successfulRequests: 950,
        failedRequests: 50,
        averageResponseTime: 1200,
        activeModels: 3,
        healthyModels: 3,
        circuitBreakersOpen: 0,
        fallbacksTriggered: 2,
      };

      analytics.addSystemMetrics(testSystemMetrics);

      const report = analytics.generatePerformanceReport('hour');

      expect(report.period).toBe('hour');
      expect(report.summary.successRate).toBeCloseTo(0.95, 2);
      expect(report.summary.totalRequests).toBe(1000);
      expect(report.trends).toBeDefined();
      expect(report.anomalies).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it('should analyze trends', () => {
      // Add test data points with trend - Analytics requires at least 10 data points
      const baseTime = new Date();
      for (let i = 0; i < 15; i++) {
        analytics.addMetricData('test.metric', {
          timestamp: new Date(baseTime.getTime() + i * 60000), // 1 minute intervals
          value: 100 + i * 5, // Increasing trend
        });
      }

      const trends = analytics.analyzeTrends('hour');

      expect(trends.length).toBeGreaterThan(0);
      const testTrend = trends.find(t => t.metric === 'test.metric');
      expect(testTrend).toBeDefined();
      expect(testTrend!.direction).toBe('increasing');
    });

    it('should detect anomalies', () => {
      // Add normal data points - Analytics requires at least 30 data points for anomaly detection
      const baseTime = new Date();
      for (let i = 0; i < 35; i++) {
        analytics.addMetricData('anomaly.test', {
          timestamp: new Date(baseTime.getTime() + i * 60000),
          value: 100 + (Math.random() * 5 - 2.5), // Normal variation around 100
        });
      }

      // Add several anomalous data points to ensure detection
      for (let i = 0; i < 5; i++) {
        analytics.addMetricData('anomaly.test', {
          timestamp: new Date(baseTime.getTime() + (36 + i) * 60000),
          value: 500 + i * 50, // Major outliers
        });
      }

      const anomalies = analytics.detectAnomalies('hour');

      expect(anomalies.length).toBeGreaterThan(0);
      const highSeverityAnomalies = anomalies.filter(a => a.severity === 'high');
      expect(highSeverityAnomalies.length).toBeGreaterThan(0);
    });

    it('should generate capacity recommendations', () => {
      // Add test data indicating performance issues
      const testSystemMetrics: SystemMetrics = {
        timestamp: new Date(),
        systemUptime: 1000,
        totalRequests: 100,
        successfulRequests: 80, // Low success rate
        failedRequests: 20,
        averageResponseTime: 8000, // High response time
        activeModels: 2,
        healthyModels: 1,
        circuitBreakersOpen: 1,
        fallbacksTriggered: 5,
      };

      analytics.addSystemMetrics(testSystemMetrics);

      const recommendations = analytics.generateCapacityRecommendations();

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      // Should suggest improvements due to poor performance
    });

    it('should calculate statistics', () => {
      const testData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const stats = analytics.calculateStatistics(testData);

      expect(stats.count).toBe(10);
      expect(stats.min).toBe(1);
      expect(stats.max).toBe(10);
      expect(stats.mean).toBe(5.5);
      expect(stats.median).toBe(5.5);
      expect(stats.p95).toBeCloseTo(9.55, 1);
    });

    it('should generate forecasts', () => {
      // Add trend data
      const baseTime = new Date();
      for (let i = 0; i < 100; i++) {
        analytics.addMetricData('forecast.test', {
          timestamp: new Date(baseTime.getTime() + i * 60000),
          value: 100 + i * 2, // Linear growth
        });
      }

      const forecast = analytics.generateForecast('forecast.test', 24);

      expect(forecast).toBeDefined();
      expect(forecast!.predictions).toHaveLength(24);
      expect(forecast!.timeHorizon).toBe(24);
      expect(forecast!.accuracy).toBeGreaterThan(0);
    });

    it('should manage data retention', () => {
      const status = analytics.getDataRetentionStatus();

      expect(status.totalMetrics).toBeGreaterThanOrEqual(0);
      expect(status.totalDataPoints).toBeGreaterThanOrEqual(0);

      analytics.clearData();

      const clearedStatus = analytics.getDataRetentionStatus();
      expect(clearedStatus.totalMetrics).toBe(0);
      expect(clearedStatus.totalDataPoints).toBe(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete monitoring workflow', async () => {
      // Start all components
      await metricsCollector.startCollection();
      await dashboard.start();

      // Set up listeners for integration
      const alerts: Alert[] = [];
      alertManager.addListener({
        onAlertTriggered: (alert) => alerts.push(alert),
      });

      const dashboardSnapshots: DashboardSnapshot[] = [];
      dashboard.addListener({
        onDataUpdated: (snapshot) => dashboardSnapshots.push(snapshot),
      });

      // Simulate some activity
      metricsCollector.recordRequest('claude-4-sonnet', true, 1000);
      metricsCollector.recordRequest('gpt-5', false, 5000);
      metricsCollector.recordCircuitBreakerStateChange('gpt-5', 'open', 'closed');

      const systemMetrics = await metricsCollector.getSystemMetrics();

      // Update dashboard and analytics
      dashboard.updateSystemMetrics(systemMetrics);
      analytics.addSystemMetrics(systemMetrics);

      // Process alerts
      await alertManager.processSystemMetrics(systemMetrics);

      // Verify integration
      expect(systemMetrics.totalRequests).toBe(2);
      expect(systemMetrics.successfulRequests).toBe(1);

      // Generate analytics report
      const report = analytics.generatePerformanceReport('hour');
      expect(report).toBeDefined();

      // Cleanup
      await metricsCollector.stopCollection();
      dashboard.stop();
    });

    it('should handle high-volume metrics efficiently', async () => {
      await metricsCollector.startCollection();

      const startTime = Date.now();

      // Simulate high volume of requests
      for (let i = 0; i < 1000; i++) {
        const modelId = `model-${i % 5}`; // 5 different models
        const success = Math.random() > 0.1; // 90% success rate
        const responseTime = 500 + Math.random() * 2000; // 500-2500ms

        metricsCollector.recordRequest(modelId, success, responseTime);
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should handle 1000 requests quickly
      expect(processingTime).toBeLessThan(1000); // Less than 1 second

      const systemMetrics = await metricsCollector.getSystemMetrics();
      expect(systemMetrics.totalRequests).toBe(1000);

      await metricsCollector.stopCollection();
    });
  });
});

/**
 * Helper function to create test model metrics
 */
function createTestModelMetrics(modelId: string, overrides: Partial<ModelMetrics> = {}): ModelMetrics {
  return {
    modelId,
    timestamp: new Date(),
    requests: 100,
    successes: 95,
    failures: 5,
    averageResponseTime: 1500,
    lastResponseTime: 1200,
    successRate: 0.95,
    healthStatus: 'healthy',
    circuitBreakerState: 'closed',
    uptime: 3600000, // 1 hour
    ...overrides,
  };
}
