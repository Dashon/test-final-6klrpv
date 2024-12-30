/**
 * Advanced Analytics Library
 * Version: 1.0.0
 * 
 * Enterprise-grade analytics implementation with multi-provider support,
 * professional dashboards, and GDPR compliance.
 */

import * as Sentry from '@sentry/browser';
import * as mixpanel from 'mixpanel-browser';
import * as amplitude from '@amplitude/analytics-browser';
import { analytics as prodAnalytics } from '../config/production';
import { analytics as devAnalytics } from '../config/development';

// Environment and feature flags
const ANALYTICS_ENABLED = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true';
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENV || 'development';
const ANALYTICS_QUEUE_KEY = 'analytics_queue';
const MAX_QUEUE_SIZE = 1000;

// Type definitions
interface AnalyticsConfig {
  enabled: boolean;
  debugEvents: boolean;
  consoleLog: boolean;
  sampleRate: number;
  mixpanel?: {
    token: string;
    enabled: boolean;
  };
  customEvents?: {
    enabled: boolean;
    endpoint: string;
  };
}

interface AnalyticsEventProperties {
  [key: string]: any;
  timestamp?: number;
  sessionId?: string;
  userId?: string;
  professional?: boolean;
}

interface AnalyticsOptions {
  immediate?: boolean;
  professional?: boolean;
  debug?: boolean;
}

interface ProfessionalMetric {
  type: string;
  value: number;
  category: string;
}

interface MetricProperties {
  timeframe?: string;
  comparison?: boolean;
  customDimensions?: Record<string, string>;
}

/**
 * Analytics Queue for offline support and batch processing
 */
class AnalyticsQueue {
  private queue: Array<{
    eventName: string;
    properties: AnalyticsEventProperties;
    timestamp: number;
  }> = [];

  constructor() {
    this.loadQueue();
  }

  private loadQueue(): void {
    try {
      const savedQueue = localStorage.getItem(ANALYTICS_QUEUE_KEY);
      if (savedQueue) {
        this.queue = JSON.parse(savedQueue);
      }
    } catch (error) {
      console.error('Failed to load analytics queue:', error);
    }
  }

  private saveQueue(): void {
    try {
      localStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save analytics queue:', error);
    }
  }

  public enqueue(eventName: string, properties: AnalyticsEventProperties): void {
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      this.queue.shift();
    }
    this.queue.push({
      eventName,
      properties,
      timestamp: Date.now()
    });
    this.saveQueue();
  }

  public async processQueue(): Promise<void> {
    const events = [...this.queue];
    this.queue = [];
    this.saveQueue();

    for (const event of events) {
      try {
        await analytics.trackEvent(event.eventName, event.properties, { immediate: true });
      } catch (error) {
        this.enqueue(event.eventName, event.properties);
      }
    }
  }
}

/**
 * Consent Manager for GDPR compliance
 */
class ConsentManager {
  private consentKey = 'analytics_consent';
  private consented: boolean;

  constructor() {
    this.consented = this.loadConsent();
  }

  private loadConsent(): boolean {
    return localStorage.getItem(this.consentKey) === 'true';
  }

  public setConsent(consent: boolean): void {
    this.consented = consent;
    localStorage.setItem(this.consentKey, String(consent));
  }

  public hasConsent(): boolean {
    return this.consented;
  }
}

/**
 * Enhanced Analytics Service
 */
class AnalyticsService {
  private initialized: boolean = false;
  private config: AnalyticsConfig;
  private queue: AnalyticsQueue;
  private consentManager: ConsentManager;
  private sessionId: string;

  constructor() {
    this.config = ENVIRONMENT === 'production' ? prodAnalytics : devAnalytics;
    this.queue = new AnalyticsQueue();
    this.consentManager = new ConsentManager();
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize analytics providers with enhanced configuration
   */
  public async initialize(): Promise<void> {
    if (this.initialized || !ANALYTICS_ENABLED) return;

    try {
      // Initialize Sentry for error tracking
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: ENVIRONMENT,
        tracesSampleRate: this.config.sampleRate / 100,
        integrations: [new Sentry.BrowserTracing()]
      });

      // Initialize Mixpanel
      if (this.config.mixpanel?.enabled) {
        mixpanel.init(this.config.mixpanel.token, {
          debug: this.config.debugEvents,
          persistence: 'localStorage',
          api_host: 'https://api-eu.mixpanel.com'
        });
      }

      // Initialize Amplitude
      amplitude.init(process.env.NEXT_PUBLIC_AMPLITUDE_KEY || '', {
        serverUrl: 'https://api.eu.amplitude.com',
        defaultTracking: {
          sessions: true,
          pageViews: true,
          formInteractions: true,
          fileDownloads: true
        }
      });

      this.initialized = true;
      await this.queue.processQueue();
    } catch (error) {
      console.error('Analytics initialization failed:', error);
      Sentry.captureException(error);
    }
  }

  /**
   * Track events across all providers with enhanced metadata
   */
  public async trackEvent(
    eventName: string,
    properties: AnalyticsEventProperties = {},
    options: AnalyticsOptions = {}
  ): Promise<void> {
    if (!ANALYTICS_ENABLED || !this.consentManager.hasConsent()) return;

    const enhancedProperties = {
      ...properties,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      environment: ENVIRONMENT,
      userId: properties.userId || 'anonymous',
      professional: options.professional || false
    };

    try {
      if (!this.initialized && !options.immediate) {
        this.queue.enqueue(eventName, enhancedProperties);
        return;
      }

      // Track in Mixpanel
      if (this.config.mixpanel?.enabled) {
        mixpanel.track(eventName, enhancedProperties);
      }

      // Track in Amplitude
      amplitude.track(eventName, enhancedProperties);

      // Track custom events
      if (this.config.customEvents?.enabled) {
        await fetch(this.config.customEvents.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventName, properties: enhancedProperties })
        });
      }

      if (this.config.debugEvents) {
        console.log('Analytics Event:', { eventName, properties: enhancedProperties });
      }
    } catch (error) {
      console.error('Failed to track event:', error);
      Sentry.captureException(error);
      if (!options.immediate) {
        this.queue.enqueue(eventName, enhancedProperties);
      }
    }
  }

  /**
   * Track professional-specific metrics with enhanced analytics
   */
  public async trackProfessionalMetrics(
    metric: ProfessionalMetric,
    properties: MetricProperties = {}
  ): Promise<void> {
    if (!ANALYTICS_ENABLED || !this.consentManager.hasConsent()) return;

    const metricProperties = {
      ...properties,
      metricType: metric.type,
      metricValue: metric.value,
      metricCategory: metric.category,
      professional: true,
      timestamp: Date.now()
    };

    await this.trackEvent('professional_metric', metricProperties, { professional: true });
  }

  /**
   * Track performance metrics for monitoring
   */
  public trackPerformance(metric: string, value: number): void {
    if (!ANALYTICS_ENABLED) return;

    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${metric}: ${value}`,
      level: 'info'
    });

    if (this.config.mixpanel?.enabled) {
      mixpanel.track('performance_metric', { metric, value });
    }
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();