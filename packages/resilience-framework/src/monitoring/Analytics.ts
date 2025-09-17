/**
 * Performance Analytics
 * BIP-03 Implementation - Phase 3: Monitoring & Alerting
 *
 * @author Claude-4-Sonnet (Anthropic)
 * @version 1.0.0
 */

import { MetricDataPoint, SystemMetrics, ModelMetrics } from './MetricsCollector.js';
import { Alert } from './AlertManager.js';

/**
 * Time period for analytics
 */
export type AnalyticsPeriod = 'hour' | 'day' | 'week' | 'month';

/**
 * Trend direction
 */
export type TrendDirection = 'increasing' | 'decreasing' | 'stable' | 'volatile';

/**
 * Statistical summary
 */
export interface StatisticalSummary {
  readonly count: number;
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly median: number;
  readonly p95: number;
  readonly p99: number;
  readonly standardDeviation: number;
}

/**
 * Trend analysis result
 */
export interface TrendAnalysis {
  readonly metric: string;
  readonly period: AnalyticsPeriod;
  readonly direction: TrendDirection;
  readonly confidence: number; // 0-1
  readonly changePercentage: number;
  readonly linearRegression: {
    slope: number;
    intercept: number;
    correlation: number;
  };
}

/**
 * Performance report
 */
export interface PerformanceReport {
  readonly period: AnalyticsPeriod;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly summary: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    errorRate: number;
    uptimePercentage: number;
  };
  readonly modelPerformance: Map<string, ModelPerformanceReport>;
  readonly trends: TrendAnalysis[];
  readonly anomalies: AnomalyDetection[];
  readonly recommendations: string[];
}

/**
 * Model-specific performance report
 */
export interface ModelPerformanceReport {
  readonly modelId: string;
  readonly summary: StatisticalSummary;
  readonly availability: number; // percentage
  readonly reliability: number; // percentage
  readonly performance: number; // composite score 0-100
  readonly circuitBreakerActivations: number;
  readonly fallbackTriggers: number;
  readonly trends: {
    responseTime: TrendDirection;
    successRate: TrendDirection;
    reliability: TrendDirection;
  };
}

/**
 * Anomaly detection result
 */
export interface AnomalyDetection {
  readonly timestamp: Date;
  readonly metric: string;
  readonly value: number;
  readonly expectedValue: number;
  readonly deviationScore: number; // Z-score
  readonly severity: 'low' | 'medium' | 'high';
  readonly description: string;
}

/**
 * Forecast prediction
 */
export interface ForecastPrediction {
  readonly metric: string;
  readonly timeHorizon: number; // hours into future
  readonly predictions: Array<{
    timestamp: Date;
    predictedValue: number;
    confidenceInterval: { lower: number; upper: number };
  }>;
  readonly accuracy: number; // historical accuracy percentage
}

/**
 * Capacity planning recommendation
 */
export interface CapacityRecommendation {
  readonly type: 'scale_up' | 'scale_down' | 'add_model' | 'remove_model' | 'optimize';
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
  readonly justification: string;
  readonly estimatedImpact: {
    performanceImprovement?: number;
    costSavings?: number;
    reliabilityImprovement?: number;
  };
  readonly implementationEffort: 'low' | 'medium' | 'high';
}

/**
 * Comprehensive performance analytics engine
 */
export class Analytics {
  private readonly dataRetentionPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days
  private historicalData = new Map<string, MetricDataPoint[]>();
  private systemMetricsHistory: SystemMetrics[] = [];
  private modelMetricsHistory = new Map<string, ModelMetrics[]>();
  private alertHistory: Alert[] = [];

  /**
   * Add metric data point for analysis
   */
  addMetricData(metric: string, dataPoint: MetricDataPoint): void {
    let series = this.historicalData.get(metric);
    if (!series) {
      series = [];
      this.historicalData.set(metric, series);
    }

    series.push(dataPoint);
    this.cleanupOldData(metric);
  }

  /**
   * Add system metrics snapshot
   */
  addSystemMetrics(metrics: SystemMetrics): void {
    this.systemMetricsHistory.push(metrics);
    this.cleanupSystemMetricsHistory();
  }

  /**
   * Add model metrics snapshot
   */
  addModelMetrics(modelId: string, metrics: ModelMetrics): void {
    let history = this.modelMetricsHistory.get(modelId);
    if (!history) {
      history = [];
      this.modelMetricsHistory.set(modelId, history);
    }

    history.push(metrics);
    this.cleanupModelMetricsHistory(modelId);
  }

  /**
   * Add alert for analysis
   */
  addAlert(alert: Alert): void {
    this.alertHistory.push(alert);
    this.cleanupAlertHistory();
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport(period: AnalyticsPeriod): PerformanceReport {
    const timeRange = this.getTimeRange(period);
    const systemMetrics = this.getSystemMetricsInRange(timeRange.start, timeRange.end);

    // Calculate summary statistics
    const summary = this.calculateSystemSummary(systemMetrics);

    // Generate model performance reports
    const modelPerformance = new Map<string, ModelPerformanceReport>();
    for (const [modelId] of this.modelMetricsHistory) {
      const report = this.generateModelPerformanceReport(modelId, period);
      modelPerformance.set(modelId, report);
    }

    // Analyze trends
    const trends = this.analyzeTrends(period);

    // Detect anomalies
    const anomalies = this.detectAnomalies(period);

    // Generate recommendations
    const recommendations = this.generateRecommendations(summary, modelPerformance, trends, anomalies);

    return {
      period,
      startTime: timeRange.start,
      endTime: timeRange.end,
      summary,
      modelPerformance,
      trends,
      anomalies,
      recommendations,
    };
  }

  /**
   * Analyze metric trends
   */
  analyzeTrends(period: AnalyticsPeriod): TrendAnalysis[] {
    const trends: TrendAnalysis[] = [];
    const timeRange = this.getTimeRange(period);

    for (const [metric, data] of this.historicalData) {
      const filteredData = data.filter(point =>
        point.timestamp >= timeRange.start && point.timestamp <= timeRange.end
      );

      if (filteredData.length < 5) continue; // Need minimum data points

      const trend = this.calculateTrend(metric, filteredData, period);
      trends.push(trend);
    }

    return trends;
  }

  /**
   * Detect anomalies in metrics
   */
  detectAnomalies(period: AnalyticsPeriod): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    const timeRange = this.getTimeRange(period);

    for (const [metric, data] of this.historicalData) {
      const filteredData = data.filter(point =>
        point.timestamp >= timeRange.start && point.timestamp <= timeRange.end
      );

      if (filteredData.length < 15) continue; // Need sufficient data for anomaly detection

      const detected = this.detectMetricAnomalies(metric, filteredData);
      anomalies.push(...detected);
    }

    return anomalies.sort((a, b) => b.deviationScore - a.deviationScore);
  }

  /**
   * Generate capacity planning recommendations
   */
  generateCapacityRecommendations(): CapacityRecommendation[] {
    const recommendations: CapacityRecommendation[] = [];
    const recentReport = this.generatePerformanceReport('day');

    // Analyze response time trends
    const responseTimeTrend = recentReport.trends.find(t => t.metric.includes('responseTime'));
    if (responseTimeTrend && responseTimeTrend.direction === 'increasing' && responseTimeTrend.confidence > 0.7) {
      recommendations.push({
        type: 'scale_up',
        priority: 'high',
        description: 'Response times are consistently increasing',
        justification: `Response time trend shows ${responseTimeTrend.changePercentage.toFixed(1)}% increase with ${(responseTimeTrend.confidence * 100).toFixed(0)}% confidence`,
        estimatedImpact: {
          performanceImprovement: 30,
          reliabilityImprovement: 15,
        },
        implementationEffort: 'medium',
      });
    }

    // Analyze success rate trends
    const successRateTrend = recentReport.trends.find(t => t.metric.includes('successRate'));
    if (successRateTrend && successRateTrend.direction === 'decreasing' && successRateTrend.confidence > 0.6) {
      recommendations.push({
        type: 'add_model',
        priority: 'critical',
        description: 'Success rates are declining, additional redundancy needed',
        justification: `Success rate trend shows ${Math.abs(successRateTrend.changePercentage).toFixed(1)}% decrease`,
        estimatedImpact: {
          reliabilityImprovement: 40,
          performanceImprovement: 20,
        },
        implementationEffort: 'high',
      });
    }

    // Analyze model utilization
    const underutilizedModels = Array.from(recentReport.modelPerformance.values())
      .filter(model => model.availability < 0.3);

    if (underutilizedModels.length > 0) {
      recommendations.push({
        type: 'optimize',
        priority: 'medium',
        description: 'Some models are underutilized',
        justification: `${underutilizedModels.length} models have less than 30% utilization`,
        estimatedImpact: {
          costSavings: 25,
        },
        implementationEffort: 'low',
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Forecast future metrics
   */
  generateForecast(metric: string, hoursAhead: number): ForecastPrediction | null {
    const data = this.historicalData.get(metric);
    if (!data || data.length < 50) {
      return null; // Need sufficient historical data
    }

    // Use simple linear regression for prediction
    const recentData = data.slice(-100); // Use last 100 data points
    const { slope, intercept } = this.calculateLinearRegression(recentData);

    const predictions: ForecastPrediction['predictions'] = [];
    const now = new Date();
    const hourMs = 60 * 60 * 1000;

    for (let i = 1; i <= hoursAhead; i++) {
      const futureTime = new Date(now.getTime() + (i * hourMs));
      const timeIndex = recentData.length + i;
      const predictedValue = slope * timeIndex + intercept;

      // Simple confidence interval (±20% for demonstration)
      const confidenceRange = Math.abs(predictedValue) * 0.2;

      predictions.push({
        timestamp: futureTime,
        predictedValue,
        confidenceInterval: {
          lower: predictedValue - confidenceRange,
          upper: predictedValue + confidenceRange,
        },
      });
    }

    // Calculate historical accuracy (simplified)
    const accuracy = Math.max(0, 100 - (Math.abs(slope) * 10)); // Rough accuracy estimation

    return {
      metric,
      timeHorizon: hoursAhead,
      predictions,
      accuracy,
    };
  }

  /**
   * Calculate statistical summary for data points
   */
  calculateStatistics(data: number[]): StatisticalSummary {
    if (data.length === 0) {
      return {
        count: 0,
        min: 0,
        max: 0,
        mean: 0,
        median: 0,
        p95: 0,
        p99: 0,
        standardDeviation: 0,
      };
    }

    const sorted = [...data].sort((a, b) => a - b);
    const count = data.length;
    const sum = data.reduce((acc, val) => acc + val, 0);
    const mean = sum / count;

    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
    const standardDeviation = Math.sqrt(variance);

    return {
      count,
      min: sorted[0] || 0,
      max: sorted[count - 1] || 0,
      mean,
      median: this.getPercentile(sorted, 50),
      p95: this.getPercentile(sorted, 95),
      p99: this.getPercentile(sorted, 99),
      standardDeviation,
    };
  }

  /**
   * Get available metrics for analysis
   */
  getAvailableMetrics(): string[] {
    return Array.from(this.historicalData.keys()).sort();
  }

  /**
   * Get data retention status
   */
  getDataRetentionStatus(): {
    totalMetrics: number;
    totalDataPoints: number;
    oldestDataPoint: Date | null;
    newestDataPoint: Date | null;
  } {
    let totalDataPoints = 0;
    let oldest: Date | null = null;
    let newest: Date | null = null;

    for (const data of this.historicalData.values()) {
      totalDataPoints += data.length;

      if (data.length > 0) {
        const firstPoint = data[0];
        const lastPoint = data[data.length - 1];

        if (firstPoint && lastPoint) {
          const first = firstPoint.timestamp;
          const last = lastPoint.timestamp;

          if (!oldest || first < oldest) oldest = first;
          if (!newest || last > newest) newest = last;
        }
      }
    }

    return {
      totalMetrics: this.historicalData.size,
      totalDataPoints,
      oldestDataPoint: oldest,
      newestDataPoint: newest,
    };
  }

  /**
   * Clear all analytics data
   */
  clearData(): void {
    this.historicalData.clear();
    this.systemMetricsHistory = [];
    this.modelMetricsHistory.clear();
    this.alertHistory = [];
    console.log('📊 Analytics data cleared');
  }

  /**
   * Private helper methods
   */

  private getTimeRange(period: AnalyticsPeriod): { start: Date; end: Date } {
    const now = new Date();
    let hoursBack: number;

    switch (period) {
      case 'hour': hoursBack = 1; break;
      case 'day': hoursBack = 24; break;
      case 'week': hoursBack = 24 * 7; break;
      case 'month': hoursBack = 24 * 30; break;
    }

    return {
      start: new Date(now.getTime() - (hoursBack * 60 * 60 * 1000)),
      end: now,
    };
  }

  private getSystemMetricsInRange(start: Date, end: Date): SystemMetrics[] {
    return this.systemMetricsHistory.filter(metrics =>
      metrics.timestamp >= start && metrics.timestamp <= end
    );
  }

  private calculateSystemSummary(systemMetrics: SystemMetrics[]): PerformanceReport['summary'] {
    if (systemMetrics.length === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        averageResponseTime: 0,
        errorRate: 0,
        uptimePercentage: 0,
      };
    }

    const latest = systemMetrics[systemMetrics.length - 1];
    if (!latest) {
      return {
        totalRequests: 0,
        successRate: 0,
        averageResponseTime: 0,
        errorRate: 0,
        uptimePercentage: 0,
      };
    }

    const totalRequests = latest.totalRequests;
    const successRate = totalRequests > 0 ? latest.successfulRequests / totalRequests : 0;
    const errorRate = 1 - successRate;

    // Calculate average response time across the period
    const responseTimes = systemMetrics.map(m => m.averageResponseTime).filter(rt => rt > 0);
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length
      : 0;

    // Calculate uptime percentage (simplified)
    const healthyPeriods = systemMetrics.filter(m => m.healthyModels > 0).length;
    const uptimePercentage = systemMetrics.length > 0 ? healthyPeriods / systemMetrics.length : 0;

    return {
      totalRequests,
      successRate,
      averageResponseTime,
      errorRate,
      uptimePercentage,
    };
  }

  private generateModelPerformanceReport(modelId: string, period: AnalyticsPeriod): ModelPerformanceReport {
    const history = this.modelMetricsHistory.get(modelId) || [];
    const timeRange = this.getTimeRange(period);

    const filteredHistory = history.filter(metrics =>
      metrics.timestamp >= timeRange.start && metrics.timestamp <= timeRange.end
    );

    if (filteredHistory.length === 0) {
      return this.getEmptyModelReport(modelId);
    }

    const responseTimes = filteredHistory.map(m => m.averageResponseTime);
    const summary = this.calculateStatistics(responseTimes);

    const successRates = filteredHistory.map(m => m.successRate);
    const avgSuccessRate = successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length;

    const availability = avgSuccessRate; // Simplified
    const reliability = this.calculateReliability(filteredHistory);
    const performance = this.calculatePerformanceScore(summary, avgSuccessRate, reliability);

    return {
      modelId,
      summary,
      availability,
      reliability,
      performance,
      circuitBreakerActivations: 0, // Would be tracked separately
      fallbackTriggers: 0, // Would be tracked separately
      trends: {
        responseTime: this.calculateMetricTrend(responseTimes),
        successRate: this.calculateMetricTrend(successRates),
        reliability: 'stable', // Simplified
      },
    };
  }

  private calculateTrend(metric: string, data: MetricDataPoint[], period: AnalyticsPeriod): TrendAnalysis {
    const values = data.map(point => point.value);
    const regression = this.calculateLinearRegression(data);

    let direction: TrendDirection;
    const slope = regression.slope;
    const correlation = Math.abs(regression.correlation);

    if (correlation < 0.3) {
      direction = 'volatile';
    } else if (Math.abs(slope) < 0.01) {
      direction = 'stable';
    } else if (slope > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }

    const firstValue = values[0] || 0;
    const lastValue = values[values.length - 1] || 0;
    const changePercentage = firstValue !== 0
      ? ((lastValue - firstValue) / firstValue) * 100
      : 0;

    return {
      metric,
      period,
      direction,
      confidence: correlation,
      changePercentage,
      linearRegression: regression,
    };
  }

  private detectMetricAnomalies(metric: string, data: MetricDataPoint[]): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    const values = data.map(d => d.value);
    const stats = this.calculateStatistics(values);

    // Use Z-score for anomaly detection
    for (let i = 0; i < data.length; i++) {
      const point = data[i];
      if (!point) continue;

      const zScore = Math.abs((point.value - stats.mean) / stats.standardDeviation);

      if (zScore > 2.5) { // 2.5 standard deviations
        let severity: AnomalyDetection['severity'];
        if (zScore > 4) severity = 'high';
        else if (zScore > 3) severity = 'medium';
        else severity = 'low';

        anomalies.push({
          timestamp: point.timestamp,
          metric,
          value: point.value,
          expectedValue: stats.mean,
          deviationScore: zScore,
          severity,
          description: `Value ${point.value.toFixed(2)} deviates ${zScore.toFixed(1)} standard deviations from mean ${stats.mean.toFixed(2)}`,
        });
      }
    }

    return anomalies;
  }

  private generateRecommendations(
    summary: PerformanceReport['summary'],
    modelPerformance: Map<string, ModelPerformanceReport>,
    trends: TrendAnalysis[],
    anomalies: AnomalyDetection[]
  ): string[] {
    const recommendations: string[] = [];

    // Check success rate
    if (summary.successRate < 0.95) {
      recommendations.push(`System success rate (${(summary.successRate * 100).toFixed(1)}%) is below target. Consider adding redundancy.`);
    }

    // Check response time
    if (summary.averageResponseTime > 5000) {
      recommendations.push(`Average response time (${summary.averageResponseTime.toFixed(0)}ms) exceeds threshold. Optimize model performance.`);
    }

    // Check trends
    const degradingTrends = trends.filter(t =>
      t.direction === 'decreasing' &&
      t.metric.includes('successRate') &&
      t.confidence > 0.6
    );

    if (degradingTrends.length > 0) {
      recommendations.push(`${degradingTrends.length} metrics showing declining trends. Monitor closely.`);
    }

    // Check anomalies
    const highSeverityAnomalies = anomalies.filter(a => a.severity === 'high').length;
    if (highSeverityAnomalies > 0) {
      recommendations.push(`${highSeverityAnomalies} high-severity anomalies detected. Investigate root causes.`);
    }

    // Model-specific recommendations
    const poorPerformingModels = Array.from(modelPerformance.values())
      .filter(model => model.performance < 70);

    if (poorPerformingModels.length > 0) {
      recommendations.push(`${poorPerformingModels.length} models performing below 70/100. Consider replacement or optimization.`);
    }

    return recommendations;
  }

  private calculateLinearRegression(data: MetricDataPoint[]): {
    slope: number;
    intercept: number;
    correlation: number;
  } {
    const n = data.length;
    if (n === 0) return { slope: 0, intercept: 0, correlation: 0 };

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;

    for (let i = 0; i < n; i++) {
      const x = i; // Use index as x (time)
      const dataPoint = data[i];
      if (!dataPoint) continue;
      const y = dataPoint.value;

      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
      sumYY += y * y;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate correlation coefficient
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    const correlation = denominator !== 0 ? numerator / denominator : 0;

    return { slope, intercept, correlation };
  }

  private getPercentile(sortedData: number[], percentile: number): number {
    if (sortedData.length === 0) return 0;

    const index = (percentile / 100) * (sortedData.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sortedData[lower] || 0;
    }

    const weight = index - lower;
    const lowerValue = sortedData[lower] || 0;
    const upperValue = sortedData[upper] || 0;
    return lowerValue * (1 - weight) + upperValue * weight;
  }

  private calculateReliability(history: ModelMetrics[]): number {
    // Simple reliability calculation based on consistent performance
    const successRates = history.map(m => m.successRate);
    const variance = this.calculateStatistics(successRates).standardDeviation;
    return Math.max(0, 1 - variance); // Lower variance = higher reliability
  }

  private calculatePerformanceScore(
    summary: StatisticalSummary,
    successRate: number,
    reliability: number
  ): number {
    // Composite performance score (0-100)
    const responseTimeScore = Math.max(0, 100 - (summary.mean / 100)); // Penalize slow responses
    const successRateScore = successRate * 100;
    const reliabilityScore = reliability * 100;

    return (responseTimeScore * 0.3 + successRateScore * 0.5 + reliabilityScore * 0.2);
  }

  private calculateMetricTrend(values: number[]): TrendDirection {
    if (values.length < 2) return 'stable';

    const first = values[0];
    const last = values[values.length - 1];

    if (!first || !last || first === 0) return 'stable';

    const change = Math.abs(last - first) / first;

    if (change < 0.05) return 'stable';
    return last > first ? 'increasing' : 'decreasing';
  }

  private getEmptyModelReport(modelId: string): ModelPerformanceReport {
    return {
      modelId,
      summary: {
        count: 0,
        min: 0,
        max: 0,
        mean: 0,
        median: 0,
        p95: 0,
        p99: 0,
        standardDeviation: 0,
      },
      availability: 0,
      reliability: 0,
      performance: 0,
      circuitBreakerActivations: 0,
      fallbackTriggers: 0,
      trends: {
        responseTime: 'stable',
        successRate: 'stable',
        reliability: 'stable',
      },
    };
  }

  private cleanupOldData(metric: string): void {
    const data = this.historicalData.get(metric);
    if (!data) return;

    const cutoffTime = new Date(Date.now() - this.dataRetentionPeriod);
    const filtered = data.filter(point => point.timestamp >= cutoffTime);

    if (filtered.length !== data.length) {
      this.historicalData.set(metric, filtered);
    }
  }

  private cleanupSystemMetricsHistory(): void {
    const cutoffTime = new Date(Date.now() - this.dataRetentionPeriod);
    this.systemMetricsHistory = this.systemMetricsHistory.filter(
      metrics => metrics.timestamp >= cutoffTime
    );
  }

  private cleanupModelMetricsHistory(modelId: string): void {
    const history = this.modelMetricsHistory.get(modelId);
    if (!history) return;

    const cutoffTime = new Date(Date.now() - this.dataRetentionPeriod);
    const filtered = history.filter(metrics => metrics.timestamp >= cutoffTime);

    if (filtered.length !== history.length) {
      this.modelMetricsHistory.set(modelId, filtered);
    }
  }

  private cleanupAlertHistory(): void {
    const cutoffTime = new Date(Date.now() - this.dataRetentionPeriod);
    this.alertHistory = this.alertHistory.filter(alert => alert.timestamp >= cutoffTime);
  }
}
