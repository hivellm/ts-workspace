/**
 * Real-time Monitoring Dashboard
 * BIP-03 Implementation - Phase 3: Monitoring & Alerting
 *
 * @author Claude-4-Sonnet (Anthropic)
 * @version 1.0.0
 */

import { SystemMetrics, ModelMetrics, MetricDataPoint } from './MetricsCollector.js';
import { Alert, AlertSeverity } from './AlertManager.js';

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
 * Chart visualization types
 */
export type ChartType = 'line' | 'area' | 'bar' | 'pie' | 'gauge';

/**
 * Time range for dashboard data
 */
export interface TimeRange {
  readonly start: Date;
  readonly end: Date;
  readonly interval?: number; // milliseconds
}

/**
 * Dashboard widget configuration
 */
export interface WidgetConfig {
  readonly id: string;
  readonly type: WidgetType;
  readonly title: string;
  readonly position: { x: number; y: number; width: number; height: number };
  readonly config: Record<string, unknown>;
  readonly refreshInterval?: number;
}

/**
 * Metric widget data
 */
export interface MetricWidget {
  readonly type: 'metric';
  readonly metric: string;
  readonly value: number;
  readonly unit?: string;
  readonly trend?: 'up' | 'down' | 'stable';
  readonly status?: 'good' | 'warning' | 'critical';
  readonly previousValue?: number;
}

/**
 * Chart widget data
 */
export interface ChartWidget {
  readonly type: 'chart';
  readonly chartType: ChartType;
  readonly series: ChartSeries[];
  readonly xAxis?: ChartAxis;
  readonly yAxis?: ChartAxis;
  readonly timeRange: TimeRange;
}

/**
 * Chart series data
 */
export interface ChartSeries {
  readonly name: string;
  readonly data: Array<{ x: number | Date; y: number; label?: string }>;
  readonly color?: string;
  readonly style?: 'solid' | 'dashed' | 'dotted';
}

/**
 * Chart axis configuration
 */
export interface ChartAxis {
  readonly label?: string;
  readonly min?: number;
  readonly max?: number;
  readonly format?: 'number' | 'time' | 'percentage';
}

/**
 * Status widget data
 */
export interface StatusWidget {
  readonly type: 'status';
  readonly status: 'operational' | 'degraded' | 'down' | 'maintenance';
  readonly message: string;
  readonly uptime: number;
  readonly lastIncident?: Date;
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
  readonly models: Array<{
    id: string;
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    responseTime: number;
    successRate: number;
    circuitBreakerState: 'closed' | 'open' | 'half-open';
  }>;
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

/**
 * Dashboard layout configuration
 */
export interface DashboardLayout {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly widgets: WidgetConfig[];
  readonly refreshInterval: number;
  readonly autoRefresh: boolean;
}

/**
 * Dashboard data snapshot
 */
export interface DashboardSnapshot {
  readonly timestamp: Date;
  readonly widgets: Map<string,
    | MetricWidget
    | ChartWidget
    | StatusWidget
    | AlertWidget
    | ModelGridWidget
    | PerformanceSummaryWidget
  >;
  readonly systemMetrics: SystemMetrics;
  readonly modelMetrics: Map<string, ModelMetrics>;
  readonly activeAlerts: Alert[];
}

/**
 * Dashboard update listener
 */
export interface DashboardListener {
  onDataUpdated?(snapshot: DashboardSnapshot): void;
  onWidgetUpdated?(widgetId: string, data: unknown): void;
  onError?(error: Error): void;
}

/**
 * Real-time monitoring dashboard
 */
export class Dashboard {
  private layouts = new Map<string, DashboardLayout>();
  private currentLayout?: DashboardLayout;
  private currentSnapshot?: DashboardSnapshot;
  private updateTimer?: NodeJS.Timeout;
  private listeners = new Set<DashboardListener>();
  private isActive = false;

  // Data sources
  private systemMetrics?: SystemMetrics;
  private modelMetrics = new Map<string, ModelMetrics>();
  private timeSeriesData = new Map<string, MetricDataPoint[]>();
  private activeAlerts: Alert[] = [];

  constructor() {
    this.initializeDefaultLayouts();
  }

  /**
   * Add dashboard layout
   */
  addLayout(layout: DashboardLayout): void {
    this.layouts.set(layout.id, layout);
    console.log(`📊 Dashboard layout added: ${layout.name}`);
  }

  /**
   * Get available layouts
   */
  getLayouts(): DashboardLayout[] {
    return Array.from(this.layouts.values());
  }

  /**
   * Set active layout
   */
  setActiveLayout(layoutId: string): boolean {
    const layout = this.layouts.get(layoutId);
    if (!layout) {
      return false;
    }

    this.currentLayout = layout;
    console.log(`📊 Dashboard layout activated: ${layout.name}`);

    if (this.isActive) {
      this.scheduleUpdate();
    }

    return true;
  }

  /**
   * Start dashboard updates
   */
  async start(): Promise<void> {
    if (this.isActive) {
      return;
    }

    if (!this.currentLayout) {
      // Use default layout if none selected
      const defaultLayout = this.layouts.get('default');
      if (defaultLayout) {
        this.currentLayout = defaultLayout;
      } else {
        throw new Error('No dashboard layout available');
      }
    }

    this.isActive = true;
    await this.updateDashboard();
    this.scheduleUpdate();

    console.log('📊 Dashboard started');
  }

  /**
   * Stop dashboard updates
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = undefined as any;
    }

    console.log('📊 Dashboard stopped');
  }

  /**
   * Update system metrics
   */
  updateSystemMetrics(metrics: SystemMetrics): void {
    this.systemMetrics = metrics;

    if (this.isActive && this.currentLayout) {
      // Trigger immediate update for real-time metrics
      this.updateDashboard();
    }
  }

  /**
   * Update model metrics
   */
  updateModelMetrics(modelId: string, metrics: ModelMetrics): void {
    this.modelMetrics.set(modelId, metrics);

    if (this.isActive && this.currentLayout) {
      this.updateDashboard();
    }
  }

  /**
   * Update time series data
   */
  updateTimeSeries(metricName: string, data: MetricDataPoint[]): void {
    this.timeSeriesData.set(metricName, data);
  }

  /**
   * Update active alerts
   */
  updateAlerts(alerts: Alert[]): void {
    this.activeAlerts = alerts;

    if (this.isActive && this.currentLayout) {
      this.updateDashboard();
    }
  }

  /**
   * Get current dashboard snapshot
   */
  getCurrentSnapshot(): DashboardSnapshot | undefined {
    return this.currentSnapshot;
  }

  /**
   * Generate dashboard data for export
   */
  exportData(format: 'json' | 'csv' = 'json'): string {
    if (!this.currentSnapshot) {
      throw new Error('No dashboard data available');
    }

    switch (format) {
      case 'json':
        return JSON.stringify({
          timestamp: this.currentSnapshot.timestamp,
          systemMetrics: this.currentSnapshot.systemMetrics,
          modelMetrics: Object.fromEntries(this.currentSnapshot.modelMetrics),
          activeAlerts: this.currentSnapshot.activeAlerts,
          widgets: Object.fromEntries(this.currentSnapshot.widgets),
        }, null, 2);

      case 'csv':
        return this.generateCSVExport();

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Add dashboard listener
   */
  addListener(listener: DashboardListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove dashboard listener
   */
  removeListener(listener: DashboardListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Get widget data by ID
   */
  getWidgetData(widgetId: string): unknown {
    return this.currentSnapshot?.widgets.get(widgetId);
  }

  /**
   * Refresh dashboard data immediately
   */
  async refresh(): Promise<void> {
    if (!this.isActive) {
      await this.start();
    } else {
      await this.updateDashboard();
    }
  }

  /**
   * Update dashboard with latest data
   */
  private async updateDashboard(): Promise<void> {
    if (!this.currentLayout) {
      return;
    }

    try {
      const widgets = new Map<string,
        | MetricWidget
        | ChartWidget
        | StatusWidget
        | AlertWidget
        | ModelGridWidget
        | PerformanceSummaryWidget
      >();

      for (const widgetConfig of this.currentLayout.widgets) {
        const widgetData = await this.generateWidgetData(widgetConfig);
        widgets.set(widgetConfig.id, widgetData);
      }

      const snapshot: DashboardSnapshot = {
        timestamp: new Date(),
        widgets,
        systemMetrics: this.systemMetrics || this.getEmptySystemMetrics(),
        modelMetrics: new Map(this.modelMetrics),
        activeAlerts: [...this.activeAlerts],
      };

      this.currentSnapshot = snapshot;

      // Notify listeners
      this.listeners.forEach(listener => {
        try {
          listener.onDataUpdated?.(snapshot);
        } catch (error) {
          console.error('📊 Dashboard listener error:', error);
          listener.onError?.(error instanceof Error ? error : new Error(String(error)));
        }
      });

    } catch (error) {
      console.error('📊 Dashboard update error:', error);
      this.listeners.forEach(listener => {
        listener.onError?.(error instanceof Error ? error : new Error(String(error)));
      });
    }
  }

  /**
   * Generate data for a specific widget
   */
  private async generateWidgetData(config: WidgetConfig): Promise<
    | MetricWidget
    | ChartWidget
    | StatusWidget
    | AlertWidget
    | ModelGridWidget
    | PerformanceSummaryWidget
  > {
    switch (config.type) {
      case 'metric':
        return this.generateMetricWidget(config);

      case 'chart':
        return this.generateChartWidget(config);

      case 'status':
        return this.generateStatusWidget(config);

      case 'alert':
        return this.generateAlertWidget(config);

      case 'model-grid':
        return this.generateModelGridWidget(config);

      case 'performance-summary':
        return this.generatePerformanceSummaryWidget(config);

      default:
        throw new Error(`Unknown widget type: ${config.type}`);
    }
  }

  /**
   * Generate metric widget data
   */
  private generateMetricWidget(config: WidgetConfig): MetricWidget {
    const metricName = config.config.metric as string;
    const value = this.getMetricValue(metricName);
    const previousValue = this.getPreviousMetricValue(metricName);

    return {
      type: 'metric',
      metric: metricName,
      value,
      unit: config.config.unit as string,
      trend: this.calculateTrend(value, previousValue),
      status: this.getMetricStatus(metricName, value),
      ...(previousValue !== undefined && { previousValue }),
    };
  }

  /**
   * Generate chart widget data
   */
  private generateChartWidget(config: WidgetConfig): ChartWidget {
    const chartType = config.config.chartType as ChartType || 'line';
    const metrics = config.config.metrics as string[] || [];
    const timeRange = this.getTimeRange(config.config.timeRange as any);

    const series: ChartSeries[] = metrics.map(metric => {
      const data = this.getTimeSeriesForRange(metric, timeRange);
      return {
        name: metric,
        data: data.map(point => ({ x: point.timestamp, y: point.value })),
        color: this.getSeriesColor(metric),
      };
    });

    return {
      type: 'chart',
      chartType,
      series,
      timeRange,
      xAxis: { label: 'Time', format: 'time' },
      yAxis: { label: 'Value', format: 'number' },
    };
  }

  /**
   * Generate status widget data
   */
  private generateStatusWidget(config: WidgetConfig): StatusWidget {
    const healthyModels = Array.from(this.modelMetrics.values())
      .filter(m => m.healthStatus === 'healthy').length;
    const totalModels = this.modelMetrics.size;

    let status: StatusWidget['status'];
    let message: string;

    if (totalModels === 0) {
      status = 'maintenance';
      message = 'No models registered';
    } else if (healthyModels === totalModels) {
      status = 'operational';
      message = 'All systems operational';
    } else if (healthyModels > totalModels * 0.8) {
      status = 'degraded';
      message = `${totalModels - healthyModels} models degraded`;
    } else {
      status = 'down';
      message = `${totalModels - healthyModels} models failing`;
    }

    const uptime = this.systemMetrics?.systemUptime || 0;

    const lastIncident = this.getLastIncidentTime();
    return {
      type: 'status',
      status,
      message,
      uptime,
      ...(lastIncident && { lastIncident }),
    };
  }

  /**
   * Generate alert widget data
   */
  private generateAlertWidget(config: WidgetConfig): AlertWidget {
    const criticalAlerts = this.activeAlerts.filter(a => a.severity === 'critical').length;
    const warningAlerts = this.activeAlerts.filter(a => a.severity === 'warning').length;
    const recentAlerts = this.activeAlerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return {
      type: 'alert',
      activeAlerts: this.activeAlerts.length,
      criticalAlerts,
      warningAlerts,
      recentAlerts,
    };
  }

  /**
   * Generate model grid widget data
   */
  private generateModelGridWidget(config: WidgetConfig): ModelGridWidget {
    const models = Array.from(this.modelMetrics.values()).map(metrics => ({
      id: metrics.modelId,
      name: metrics.modelId, // In real implementation, this could be a more friendly name
      status: metrics.healthStatus,
      responseTime: metrics.averageResponseTime,
      successRate: metrics.successRate,
      circuitBreakerState: metrics.circuitBreakerState,
    }));

    return {
      type: 'model-grid',
      models,
    };
  }

  /**
   * Generate performance summary widget data
   */
  private generatePerformanceSummaryWidget(config: WidgetConfig): PerformanceSummaryWidget {
    const totalRequests = this.systemMetrics?.totalRequests || 0;
    const successfulRequests = this.systemMetrics?.successfulRequests || 0;
    const successRate = totalRequests > 0 ? successfulRequests / totalRequests : 0;
    const averageResponseTime = this.systemMetrics?.averageResponseTime || 0;

    // Calculate P95 response time from time series data
    const p95ResponseTime = this.calculateP95ResponseTime();

    const activeModels = this.systemMetrics?.activeModels || 0;
    const healthyModels = this.systemMetrics?.healthyModels || 0;

    return {
      type: 'performance-summary',
      totalRequests,
      successRate,
      averageResponseTime,
      p95ResponseTime,
      activeModels,
      healthyModels,
    };
  }

  /**
   * Schedule next dashboard update
   */
  private scheduleUpdate(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    if (this.isActive && this.currentLayout) {
      this.updateTimer = setTimeout(
        () => this.updateDashboard(),
        this.currentLayout.refreshInterval
      );
    }
  }

  /**
   * Initialize default dashboard layouts
   */
  private initializeDefaultLayouts(): void {
    const defaultLayout: DashboardLayout = {
      id: 'default',
      name: 'System Overview',
      description: 'Main dashboard showing system health and performance',
      refreshInterval: 5000, // 5 seconds
      autoRefresh: true,
      widgets: [
        {
          id: 'system-status',
          type: 'status',
          title: 'System Status',
          position: { x: 0, y: 0, width: 4, height: 2 },
          config: {},
        },
        {
          id: 'performance-summary',
          type: 'performance-summary',
          title: 'Performance Summary',
          position: { x: 4, y: 0, width: 8, height: 2 },
          config: {},
        },
        {
          id: 'active-alerts',
          type: 'alert',
          title: 'Active Alerts',
          position: { x: 0, y: 2, width: 6, height: 3 },
          config: {},
        },
        {
          id: 'model-grid',
          type: 'model-grid',
          title: 'Model Status',
          position: { x: 6, y: 2, width: 6, height: 3 },
          config: {},
        },
        {
          id: 'response-time-chart',
          type: 'chart',
          title: 'Response Time Trend',
          position: { x: 0, y: 5, width: 12, height: 4 },
          config: {
            chartType: 'line',
            metrics: ['system.averageResponseTime'],
            timeRange: { hours: 1 },
          },
        },
      ],
    };

    this.addLayout(defaultLayout);

    // Set as active layout
    this.setActiveLayout('default');
  }

  /**
   * Helper methods
   */
  private getMetricValue(metricName: string): number {
    // Extract metric value from system or model metrics
    if (metricName.startsWith('system.')) {
      const field = metricName.replace('system.', '');
      return (this.systemMetrics as any)?.[field] || 0;
    }

    return 0; // Default value
  }

  private getPreviousMetricValue(metricName: string): number | undefined {
    // In a real implementation, this would look up historical data
    return undefined;
  }

  private calculateTrend(current: number, previous?: number): 'up' | 'down' | 'stable' {
    if (previous === undefined) return 'stable';
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'stable';
  }

  private getMetricStatus(metricName: string, value: number): 'good' | 'warning' | 'critical' {
    // Simple status determination based on metric type
    if (metricName.includes('successRate')) {
      if (value >= 0.95) return 'good';
      if (value >= 0.8) return 'warning';
      return 'critical';
    }

    if (metricName.includes('responseTime')) {
      if (value <= 1000) return 'good';
      if (value <= 5000) return 'warning';
      return 'critical';
    }

    return 'good';
  }

  private getTimeRange(config: any): TimeRange {
    const now = new Date();
    const hours = config?.hours || 1;
    const start = new Date(now.getTime() - (hours * 60 * 60 * 1000));

    return { start, end: now };
  }

  private getTimeSeriesForRange(metric: string, timeRange: TimeRange): MetricDataPoint[] {
    const data = this.timeSeriesData.get(metric) || [];
    return data.filter(point =>
      point.timestamp >= timeRange.start && point.timestamp <= timeRange.end
    );
  }

  private getSeriesColor(metric: string): string {
    // Simple color assignment based on metric name
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
    let hash = 0;
    for (let i = 0; i < metric.length; i++) {
      hash = (hash << 5) - hash + metric.charCodeAt(i);
    }
    return colors[Math.abs(hash) % colors.length] || '#3b82f6';
  }

  private getLastIncidentTime(): Date | undefined {
    const criticalAlerts = this.activeAlerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length === 0) return undefined;

    const firstAlert = criticalAlerts[0];
    if (!firstAlert) return undefined;

    return criticalAlerts.reduce((latest, alert) =>
      alert.timestamp > latest ? alert.timestamp : latest, firstAlert.timestamp
    );
  }

  private calculateP95ResponseTime(): number {
    // Simple P95 calculation from recent response times
    // In a real implementation, this would use proper statistical calculation
    const responseTimes = Array.from(this.modelMetrics.values())
      .map(m => m.averageResponseTime)
      .sort((a, b) => a - b);

    if (responseTimes.length === 0) return 0;

    const p95Index = Math.floor(responseTimes.length * 0.95);
    return responseTimes[p95Index] || 0;
  }

  private getEmptySystemMetrics(): SystemMetrics {
    return {
      timestamp: new Date(),
      systemUptime: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      activeModels: 0,
      healthyModels: 0,
      circuitBreakersOpen: 0,
      fallbacksTriggered: 0,
    };
  }

  private generateCSVExport(): string {
    if (!this.currentSnapshot) return '';

    const lines: string[] = [];
    lines.push('Timestamp,Metric,Value,Unit,Status');

    // Add system metrics
    const systemMetrics = this.currentSnapshot.systemMetrics;
    lines.push(`${systemMetrics.timestamp.toISOString()},System Uptime,${systemMetrics.systemUptime},ms,info`);
    lines.push(`${systemMetrics.timestamp.toISOString()},Total Requests,${systemMetrics.totalRequests},count,info`);
    lines.push(`${systemMetrics.timestamp.toISOString()},Success Rate,${systemMetrics.successfulRequests / (systemMetrics.totalRequests || 1)},ratio,info`);

    // Add model metrics
    for (const [modelId, metrics] of this.currentSnapshot.modelMetrics) {
      lines.push(`${metrics.timestamp.toISOString()},${modelId} Success Rate,${metrics.successRate},ratio,${metrics.healthStatus}`);
      lines.push(`${metrics.timestamp.toISOString()},${modelId} Response Time,${metrics.averageResponseTime},ms,${metrics.healthStatus}`);
    }

    return lines.join('\n');
  }
}
