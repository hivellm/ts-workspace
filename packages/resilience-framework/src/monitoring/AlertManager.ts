/**
 * Alert Manager
 * BIP-03 Implementation - Phase 3: Monitoring & Alerting
 *
 * @author Claude-4-Sonnet (Anthropic)
 * @version 1.0.0
 */

import { ModelMetrics, SystemMetrics } from './MetricsCollector.js';

/**
 * Alert severity levels
 */
export type AlertSeverity = 'critical' | 'warning' | 'info';

/**
 * Alert notification channels
 */
export type AlertChannel = 'slack' | 'email' | 'webhook' | 'console';

/**
 * Alert configuration
 */
export interface AlertConfig {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly severity: AlertSeverity;
  readonly channels: AlertChannel[];
  readonly enabled: boolean;
  readonly cooldownPeriod: number; // milliseconds
  readonly condition: AlertCondition;
  readonly template?: AlertTemplate;
}

/**
 * Alert condition evaluation
 */
export interface AlertCondition {
  readonly metric: string;
  readonly operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  readonly threshold: number;
  readonly window?: number; // time window in milliseconds
  readonly minOccurrences?: number; // minimum occurrences in window
}

/**
 * Alert template for custom messaging
 */
export interface AlertTemplate {
  readonly title: string;
  readonly message: string;
  readonly tags?: string[];
  readonly includeMetrics?: boolean;
}

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
  readonly modelId?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Notification channel configuration
 */
export interface ChannelConfig {
  readonly slack?: {
    webhook: string;
    channel: string;
    username?: string;
    iconEmoji?: string;
  };
  readonly email?: {
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
    from: string;
    to: string[];
  };
  readonly webhook?: {
    url: string;
    headers?: Record<string, string>;
    timeout?: number;
  };
}

/**
 * Alert delivery status
 */
export interface AlertDeliveryStatus {
  readonly alertId: string;
  readonly channel: AlertChannel;
  readonly success: boolean;
  readonly timestamp: Date;
  readonly error?: string;
  readonly responseTime: number;
}

/**
 * Alert manager event listener
 */
export interface AlertManagerListener {
  onAlertTriggered?(alert: Alert): void;
  onAlertResolved?(alertId: string): void;
  onDeliveryStatus?(status: AlertDeliveryStatus): void;
}

/**
 * Comprehensive alert management system
 */
export class AlertManager {
  private readonly configs = new Map<string, AlertConfig>();
  private readonly activeAlerts = new Map<string, Alert>();
  private readonly alertHistory: Alert[] = [];
  private readonly lastTriggerTime = new Map<string, number>();
  private readonly listeners = new Set<AlertManagerListener>();
  private readonly deliveryStats = new Map<AlertChannel, {
    sent: number;
    succeeded: number;
    failed: number;
    averageResponseTime: number;
  }>();

  constructor(
    private readonly channelConfig: ChannelConfig = {}
  ) {
    this.initializeDefaultAlerts();
    this.initializeDeliveryStats();
  }

  /**
   * Add alert configuration
   */
  addAlertConfig(config: AlertConfig): void {
    this.configs.set(config.id, config);
    console.log(`🚨 Alert configuration added: ${config.name}`);
  }

  /**
   * Remove alert configuration
   */
  removeAlertConfig(configId: string): boolean {
    const removed = this.configs.delete(configId);
    if (removed) {
      // Resolve any active alerts for this config
      const activeAlert = Array.from(this.activeAlerts.values())
        .find(alert => alert.configId === configId);

      if (activeAlert) {
        this.resolveAlert(activeAlert.id);
      }

      console.log(`🚨 Alert configuration removed: ${configId}`);
    }
    return removed;
  }

  /**
   * Enable/disable alert configuration
   */
  setAlertEnabled(configId: string, enabled: boolean): boolean {
    const config = this.configs.get(configId);
    if (!config) {
      return false;
    }

    this.configs.set(configId, { ...config, enabled });
    console.log(`🚨 Alert ${configId} ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  }

  /**
   * Process system metrics and check for alerts
   */
  async processSystemMetrics(metrics: SystemMetrics): Promise<void> {
    const checks = [
      { metric: 'system.successRate', value: metrics.totalRequests > 0 ? metrics.successfulRequests / metrics.totalRequests : 1 },
      { metric: 'system.averageResponseTime', value: metrics.averageResponseTime },
      { metric: 'system.circuitBreakersOpen', value: metrics.circuitBreakersOpen },
      { metric: 'system.fallbacksTriggered', value: metrics.fallbacksTriggered },
      { metric: 'system.healthyModels', value: metrics.healthyModels },
    ];

    for (const check of checks) {
      await this.evaluateMetric(check.metric, check.value);
    }
  }

  /**
   * Process model metrics and check for alerts
   */
  async processModelMetrics(metrics: ModelMetrics): Promise<void> {
    const checks = [
      { metric: 'model.successRate', value: metrics.successRate, modelId: metrics.modelId },
      { metric: 'model.averageResponseTime', value: metrics.averageResponseTime, modelId: metrics.modelId },
      { metric: 'model.failures', value: metrics.failures, modelId: metrics.modelId },
    ];

    for (const check of checks) {
      await this.evaluateMetric(check.metric, check.value, check.modelId);
    }
  }

  /**
   * Manually trigger an alert
   */
  async triggerAlert(
    configId: string,
    value: number,
    modelId?: string,
    metadata?: Record<string, unknown>
  ): Promise<string | null> {
    const config = this.configs.get(configId);
    if (!config || !config.enabled) {
      return null;
    }

    // Check cooldown period
    const lastTrigger = this.lastTriggerTime.get(configId) || 0;
    const now = Date.now();
    if (now - lastTrigger < config.cooldownPeriod) {
      return null; // Still in cooldown
    }

    const alert = await this.createAlert(config, value, modelId, metadata);
    return await this.sendAlert(alert);
  }

  /**
   * Resolve an active alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    this.activeAlerts.delete(alertId);
    this.listeners.forEach(listener => {
      listener.onAlertResolved?.(alertId);
    });

    console.log(`✅ Alert resolved: ${alert.title}`);
    return true;
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit?: number): Alert[] {
    const history = [...this.alertHistory].reverse(); // Most recent first
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get delivery statistics
   */
  getDeliveryStats(): Map<AlertChannel, {
    sent: number;
    succeeded: number;
    failed: number;
    averageResponseTime: number;
    successRate: number;
  }> {
    const stats = new Map();
    for (const [channel, rawStats] of this.deliveryStats) {
      stats.set(channel, {
        ...rawStats,
        successRate: rawStats.sent > 0 ? rawStats.succeeded / rawStats.sent : 0,
      });
    }
    return stats;
  }

  /**
   * Add alert listener
   */
  addListener(listener: AlertManagerListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove alert listener
   */
  removeListener(listener: AlertManagerListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Update channel configuration
   */
  updateChannelConfig(config: Partial<ChannelConfig>): void {
    Object.assign(this.channelConfig, config);
    console.log('🚨 Alert channel configuration updated');
  }

  /**
   * Test alert delivery for a specific channel
   */
  async testAlert(channel: AlertChannel): Promise<boolean> {
    const testAlert: Alert = {
      id: `test-${Date.now()}`,
      configId: 'test',
      timestamp: new Date(),
      severity: 'info',
      title: 'Test Alert',
      message: 'This is a test alert from CMMV-Hive Resilience Framework',
      metric: 'test.metric',
      value: 1,
      threshold: 0,
      metadata: { test: true },
    };

    try {
      const success = await this.deliverAlert(testAlert, channel);
      console.log(`🧪 Test alert ${success ? 'succeeded' : 'failed'} for channel: ${channel}`);
      return success;
    } catch (error) {
      console.error(`🧪 Test alert failed for channel ${channel}:`, error);
      return false;
    }
  }

  /**
   * Evaluate a metric against all relevant alert configurations
   */
  private async evaluateMetric(
    metric: string,
    value: number,
    modelId?: string
  ): Promise<void> {
    for (const config of this.configs.values()) {
      if (!config.enabled || config.condition.metric !== metric) {
        continue;
      }

      const shouldTrigger = this.evaluateCondition(config.condition, value);
      if (shouldTrigger) {
        await this.triggerAlert(config.id, value, modelId);
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  private evaluateCondition(condition: AlertCondition, value: number): boolean {
    switch (condition.operator) {
      case 'gt': return value > condition.threshold;
      case 'gte': return value >= condition.threshold;
      case 'lt': return value < condition.threshold;
      case 'lte': return value <= condition.threshold;
      case 'eq': return value === condition.threshold;
      case 'neq': return value !== condition.threshold;
      default: return false;
    }
  }

  /**
   * Create alert instance
   */
  private async createAlert(
    config: AlertConfig,
    value: number,
    modelId?: string,
    metadata?: Record<string, unknown>
  ): Promise<Alert> {
    const alertId = `${config.id}-${Date.now()}`;
    const template = config.template || this.getDefaultTemplate(config);

    const alert: Alert = {
      id: alertId,
      configId: config.id,
      timestamp: new Date(),
      severity: config.severity,
      title: this.interpolateTemplate(template.title, { value, threshold: config.condition.threshold, modelId }),
      message: this.interpolateTemplate(template.message, { value, threshold: config.condition.threshold, modelId }),
      metric: config.condition.metric,
      value,
      threshold: config.condition.threshold,
      ...(modelId && { modelId }),
      ...(metadata && { metadata }),
    };

    this.activeAlerts.set(alertId, alert);
    this.alertHistory.push(alert);
    this.lastTriggerTime.set(config.id, Date.now());

    this.listeners.forEach(listener => {
      listener.onAlertTriggered?.(alert);
    });

    return alert;
  }

  /**
   * Send alert to all configured channels
   */
  private async sendAlert(alert: Alert): Promise<string> {
    const config = this.configs.get(alert.configId);
    if (!config) {
      throw new Error(`Alert configuration not found: ${alert.configId}`);
    }

    const deliveryPromises = config.channels.map(channel =>
      this.deliverAlert(alert, channel)
    );

    const results = await Promise.allSettled(deliveryPromises);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;

    console.log(`🚨 Alert sent: ${alert.title} (${successCount}/${config.channels.length} channels)`);
    return alert.id;
  }

  /**
   * Deliver alert to specific channel
   */
  private async deliverAlert(alert: Alert, channel: AlertChannel): Promise<boolean> {
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      switch (channel) {
        case 'slack':
          success = await this.deliverToSlack(alert);
          break;
        case 'email':
          success = await this.deliverToEmail(alert);
          break;
        case 'webhook':
          success = await this.deliverToWebhook(alert);
          break;
        case 'console':
          success = this.deliverToConsole(alert);
          break;
        default:
          throw new Error(`Unknown alert channel: ${channel}`);
      }
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
    }

    const responseTime = Date.now() - startTime;

    // Update delivery stats
    this.updateDeliveryStats(channel, success, responseTime);

    // Notify listeners
    const status: AlertDeliveryStatus = {
      alertId: alert.id,
      channel,
      success,
      timestamp: new Date(),
      responseTime,
      ...(error && { error }),
    };

    this.listeners.forEach(listener => {
      listener.onDeliveryStatus?.(status);
    });

    return success;
  }

  /**
   * Deliver alert to Slack
   */
  private async deliverToSlack(alert: Alert): Promise<boolean> {
    const config = this.channelConfig.slack;
    if (!config) {
      throw new Error('Slack configuration not found');
    }

    const payload = {
      channel: config.channel,
      username: config.username || 'CMMV-Hive Alert',
      icon_emoji: config.iconEmoji || ':warning:',
      text: alert.title,
      attachments: [{
        color: this.getSeverityColor(alert.severity),
        fields: [
          { title: 'Metric', value: alert.metric, short: true },
          { title: 'Value', value: alert.value.toString(), short: true },
          { title: 'Threshold', value: alert.threshold.toString(), short: true },
          { title: 'Model', value: alert.modelId || 'System', short: true },
        ],
        text: alert.message,
        ts: Math.floor(alert.timestamp.getTime() / 1000),
      }],
    };

    // Simulate Slack API call (in real implementation, use actual HTTP request)
    console.log('📱 Slack alert:', payload);
    return true; // Assume success for simulation
  }

  /**
   * Deliver alert to email
   */
  private async deliverToEmail(alert: Alert): Promise<boolean> {
    const config = this.channelConfig.email;
    if (!config) {
      throw new Error('Email configuration not found');
    }

    // Simulate email sending (in real implementation, use nodemailer or similar)
    console.log('📧 Email alert:', {
      from: config.from,
      to: config.to,
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      text: alert.message,
    });

    return true; // Assume success for simulation
  }

  /**
   * Deliver alert to webhook
   */
  private async deliverToWebhook(alert: Alert): Promise<boolean> {
    const config = this.channelConfig.webhook;
    if (!config) {
      throw new Error('Webhook configuration not found');
    }

    // Simulate webhook call (in real implementation, use fetch or axios)
    console.log('🔗 Webhook alert:', {
      url: config.url,
      alert,
    });

    return true; // Assume success for simulation
  }

  /**
   * Deliver alert to console
   */
  private deliverToConsole(alert: Alert): boolean {
    const icon = this.getSeverityIcon(alert.severity);
    console.log(`${icon} [${alert.severity.toUpperCase()}] ${alert.title}`);
    console.log(`   ${alert.message}`);
    console.log(`   Metric: ${alert.metric} = ${alert.value} (threshold: ${alert.threshold})`);
    if (alert.modelId) {
      console.log(`   Model: ${alert.modelId}`);
    }
    return true;
  }

  /**
   * Initialize default alert configurations
   */
  private initializeDefaultAlerts(): void {
    const defaultAlerts: AlertConfig[] = [
      {
        id: 'system-low-success-rate',
        name: 'System Low Success Rate',
        description: 'System-wide success rate has fallen below acceptable threshold',
        severity: 'critical',
        channels: ['console', 'slack'],
        enabled: true,
        cooldownPeriod: 300000, // 5 minutes
        condition: {
          metric: 'system.successRate',
          operator: 'lt',
          threshold: 0.9,
        },
        template: {
          title: 'System Success Rate Critical: {{value}}% < {{threshold}}%',
          message: 'System-wide success rate has dropped to {{value}}%, below the critical threshold of {{threshold}}%. Immediate attention required.',
        },
      },
      {
        id: 'model-high-response-time',
        name: 'Model High Response Time',
        description: 'Model response time exceeds acceptable threshold',
        severity: 'warning',
        channels: ['console'],
        enabled: true,
        cooldownPeriod: 180000, // 3 minutes
        condition: {
          metric: 'model.averageResponseTime',
          operator: 'gt',
          threshold: 5000, // 5 seconds
        },
        template: {
          title: 'High Response Time: {{modelId}} - {{value}}ms',
          message: 'Model {{modelId}} response time ({{value}}ms) exceeds threshold ({{threshold}}ms).',
        },
      },
      {
        id: 'circuit-breakers-open',
        name: 'Circuit Breakers Open',
        description: 'Multiple circuit breakers are open',
        severity: 'critical',
        channels: ['console', 'slack'],
        enabled: true,
        cooldownPeriod: 240000, // 4 minutes
        condition: {
          metric: 'system.circuitBreakersOpen',
          operator: 'gte',
          threshold: 2,
        },
        template: {
          title: 'Multiple Circuit Breakers Open: {{value}}',
          message: '{{value}} circuit breakers are currently open, indicating widespread model failures.',
        },
      },
    ];

    defaultAlerts.forEach(alert => this.addAlertConfig(alert));
  }

  /**
   * Initialize delivery statistics
   */
  private initializeDeliveryStats(): void {
    const channels: AlertChannel[] = ['slack', 'email', 'webhook', 'console'];
    channels.forEach(channel => {
      this.deliveryStats.set(channel, {
        sent: 0,
        succeeded: 0,
        failed: 0,
        averageResponseTime: 0,
      });
    });
  }

  /**
   * Update delivery statistics
   */
  private updateDeliveryStats(
    channel: AlertChannel,
    success: boolean,
    responseTime: number
  ): void {
    const stats = this.deliveryStats.get(channel);
    if (!stats) return;

    const newStats = {
      sent: stats.sent + 1,
      succeeded: stats.succeeded + (success ? 1 : 0),
      failed: stats.failed + (success ? 0 : 1),
      averageResponseTime: (stats.averageResponseTime * stats.sent + responseTime) / (stats.sent + 1),
    };

    this.deliveryStats.set(channel, newStats);
  }

  /**
   * Get default alert template
   */
  private getDefaultTemplate(config: AlertConfig): AlertTemplate {
    return {
      title: `${config.name}: {{metric}} = {{value}}`,
      message: `Alert triggered for ${config.name}. Metric: {{metric}}, Value: {{value}}, Threshold: {{threshold}}`,
    };
  }

  /**
   * Interpolate template variables
   */
  private interpolateTemplate(
    template: string,
    variables: Record<string, unknown>
  ): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }
    return result;
  }

  /**
   * Get severity color for Slack attachments
   */
  private getSeverityColor(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical': return 'danger';
      case 'warning': return 'warning';
      case 'info': return 'good';
      default: return '#808080';
    }
  }

  /**
   * Get severity icon for console output
   */
  private getSeverityIcon(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  }
}
