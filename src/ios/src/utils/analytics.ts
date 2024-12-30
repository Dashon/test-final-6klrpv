/**
 * Analytics Utility Module for iOS
 * Version: 1.0.0
 * 
 * Provides privacy-compliant analytics functionality with enhanced error handling,
 * offline support, and environment-specific configurations.
 * 
 * @packageDocumentation
 */

import analytics from '@segment/analytics-react-native'; // v2.15.0
import crashlytics from '@react-native-firebase/crashlytics'; // v18.0.0
import mixpanel from 'mixpanel-react-native'; // v2.3.0
import { developmentConfig } from '../config/development';
import { productionConfig } from '../config/production';

/**
 * Analytics event types enumeration
 */
export enum EVENT_TYPES {
  USER_ACTION = 'user_action',
  SYSTEM_EVENT = 'system_event',
  ERROR = 'error',
  PERFORMANCE = 'performance',
  BUSINESS = 'business'
}

/**
 * Privacy rules for PII detection and handling
 */
const PRIVACY_RULES = {
  PII_FIELDS: ['email', 'phone', 'address', 'name', 'ip_address'],
  ANONYMIZATION_RULES: {
    email: (value: string) => value.split('@')[0] + '@[REDACTED]',
    phone: () => '[REDACTED]',
    address: () => '[REDACTED]',
    name: (value: string) => value.charAt(0) + '[REDACTED]',
    ip_address: () => '[REDACTED]'
  }
} as const;

/**
 * Retry configuration for failed events
 */
const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  BACKOFF_MULTIPLIER: 2,
  INITIAL_DELAY: 1000
} as const;

/**
 * Event batching configuration
 */
const BATCH_CONFIG = {
  MAX_BATCH_SIZE: 100,
  BATCH_INTERVAL: 30000, // 30 seconds
  MAX_QUEUE_SIZE: 1000
} as const;

/**
 * Analytics state interface
 */
interface AnalyticsState {
  initialized: boolean;
  userConsent: {
    analytics: boolean;
    crashReporting: boolean;
    performance: boolean;
  };
  offlineQueue: any[];
  currentBatch: any[];
  lastBatchTime: number;
}

/**
 * Analytics class providing core functionality
 */
class AnalyticsManager {
  private state: AnalyticsState;
  private config: typeof developmentConfig | typeof productionConfig;
  private batchTimeout?: NodeJS.Timeout;

  constructor() {
    this.state = {
      initialized: false,
      userConsent: {
        analytics: false,
        crashReporting: false,
        performance: false
      },
      offlineQueue: [],
      currentBatch: [],
      lastBatchTime: Date.now()
    };
    this.config = process.env.NODE_ENV === 'production' ? productionConfig : developmentConfig;
  }

  /**
   * Initializes analytics providers with error handling and retry logic
   */
  public async initializeAnalytics(config: { [key: string]: any }): Promise<void> {
    try {
      if (this.state.initialized) {
        return;
      }

      const { FEATURE_FLAGS, LOGGING_CONFIG } = this.config;

      if (!FEATURE_FLAGS.ENABLE_ANALYTICS) {
        return;
      }

      // Initialize Segment
      await this.initializeWithRetry(async () => {
        await analytics.setup(config.SEGMENT_WRITE_KEY, {
          recordScreenViews: true,
          trackAppLifecycleEvents: true
        });
      });

      // Initialize Mixpanel
      await this.initializeWithRetry(async () => {
        await mixpanel.init(config.MIXPANEL_TOKEN);
      });

      // Initialize Crashlytics if enabled
      if (FEATURE_FLAGS.ENABLE_CRASH_REPORTING) {
        await crashlytics().setCrashlyticsCollectionEnabled(true);
      }

      this.setupEventBatching();
      this.state.initialized = true;

      if (LOGGING_CONFIG.LEVEL === 'debug') {
        console.log('Analytics initialized successfully');
      }
    } catch (error) {
      this.handleError('Analytics initialization failed', error);
    }
  }

  /**
   * Tracks events with privacy protection and validation
   */
  public async trackEvent(
    eventName: string,
    properties: { [key: string]: any } = {},
    options: { [key: string]: any } = {}
  ): Promise<void> {
    try {
      if (!this.validateEventTracking(eventName, properties)) {
        return;
      }

      const sanitizedProperties = this.sanitizeProperties(properties);
      const eventData = {
        eventName,
        properties: sanitizedProperties,
        timestamp: Date.now(),
        ...options
      };

      if (!navigator.onLine) {
        this.queueOfflineEvent(eventData);
        return;
      }

      await this.addToBatch(eventData);
    } catch (error) {
      this.handleError('Event tracking failed', error);
    }
  }

  /**
   * Associates analytics data with a user while ensuring privacy compliance
   */
  public async identifyUser(
    userId: string,
    traits: { [key: string]: any } = {},
    options: { [key: string]: any } = {}
  ): Promise<void> {
    try {
      if (!this.state.userConsent.analytics || !userId) {
        return;
      }

      const sanitizedTraits = this.sanitizeProperties(traits);

      await Promise.all([
        analytics.identify(userId, sanitizedTraits, options),
        mixpanel.identify(userId)
      ]);

      if (sanitizedTraits) {
        await mixpanel.setPeople(sanitizedTraits);
      }
    } catch (error) {
      this.handleError('User identification failed', error);
    }
  }

  /**
   * Tracks screen views with privacy-aware property filtering
   */
  public async trackScreen(
    screenName: string,
    properties: { [key: string]: any } = {},
    options: { [key: string]: any } = {}
  ): Promise<void> {
    try {
      if (!this.validateEventTracking(screenName, properties)) {
        return;
      }

      const sanitizedProperties = this.sanitizeProperties(properties);
      await Promise.all([
        analytics.screen(screenName, sanitizedProperties, options),
        mixpanel.track(`Screen View - ${screenName}`, sanitizedProperties)
      ]);
    } catch (error) {
      this.handleError('Screen tracking failed', error);
    }
  }

  /**
   * Private helper methods
   */
  private async initializeWithRetry(initFunction: () => Promise<void>): Promise<void> {
    let attempts = 0;
    while (attempts < RETRY_CONFIG.MAX_ATTEMPTS) {
      try {
        await initFunction();
        return;
      } catch (error) {
        attempts++;
        if (attempts === RETRY_CONFIG.MAX_ATTEMPTS) {
          throw error;
        }
        await this.delay(RETRY_CONFIG.INITIAL_DELAY * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempts));
      }
    }
  }

  private validateEventTracking(eventName: string, properties: { [key: string]: any }): boolean {
    return this.state.initialized &&
           this.state.userConsent.analytics &&
           typeof eventName === 'string' &&
           eventName.length > 0;
  }

  private sanitizeProperties(properties: { [key: string]: any }): { [key: string]: any } {
    const sanitized = { ...properties };
    for (const [key, value] of Object.entries(sanitized)) {
      if (PRIVACY_RULES.PII_FIELDS.includes(key.toLowerCase())) {
        const anonymizer = PRIVACY_RULES.ANONYMIZATION_RULES[key.toLowerCase()];
        sanitized[key] = anonymizer ? anonymizer(value) : '[REDACTED]';
      }
    }
    return sanitized;
  }

  private async addToBatch(eventData: any): Promise<void> {
    this.state.currentBatch.push(eventData);
    if (this.state.currentBatch.length >= BATCH_CONFIG.MAX_BATCH_SIZE) {
      await this.flushBatch();
    }
  }

  private async flushBatch(): Promise<void> {
    if (this.state.currentBatch.length === 0) return;

    try {
      await Promise.all(
        this.state.currentBatch.map(event =>
          Promise.all([
            analytics.track(event.eventName, event.properties),
            mixpanel.track(event.eventName, event.properties)
          ])
        )
      );
      this.state.currentBatch = [];
      this.state.lastBatchTime = Date.now();
    } catch (error) {
      this.handleError('Batch flush failed', error);
    }
  }

  private setupEventBatching(): void {
    this.batchTimeout = setInterval(
      () => this.flushBatch(),
      BATCH_CONFIG.BATCH_INTERVAL
    );
  }

  private queueOfflineEvent(eventData: any): void {
    if (this.state.offlineQueue.length < BATCH_CONFIG.MAX_QUEUE_SIZE) {
      this.state.offlineQueue.push(eventData);
    }
  }

  private handleError(message: string, error: any): void {
    if (this.config.FEATURE_FLAGS.ENABLE_CRASH_REPORTING) {
      crashlytics().recordError(error);
    }
    if (this.config.LOGGING_CONFIG.LEVEL === 'debug') {
      console.error(message, error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const Analytics = new AnalyticsManager();