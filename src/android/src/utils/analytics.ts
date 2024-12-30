/**
 * @fileoverview Analytics utility module for Android application
 * @version 1.0.0
 * 
 * Implements comprehensive analytics, error reporting, and performance monitoring
 * with offline support, privacy controls, and enhanced context collection.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import analytics from '@segment/analytics-react-native';
import crashlytics from '@react-native-firebase/crashlytics';
import perf from '@react-native-firebase/perf';
import { ANALYTICS, ENV } from '../config/development';

// Global constants for analytics configuration
const OFFLINE_QUEUE_KEY = '@analytics_queue';
const MAX_QUEUE_SIZE = 1000;
const EVENT_BATCH_SIZE = 50;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

// PII detection patterns
const PII_PATTERNS = [
    /\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/, // Email
    /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, // Credit card
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b\d{10,11}\b/ // Phone numbers
];

/**
 * Interface for analytics event properties
 */
interface EventProperties {
    [key: string]: any;
}

/**
 * Interface for error context
 */
interface ErrorContext {
    severity?: 'low' | 'medium' | 'high' | 'critical';
    tags?: string[];
    metadata?: Record<string, any>;
}

/**
 * Core analytics service implementing comprehensive tracking functionality
 */
export class AnalyticsService {
    private isEnabled: boolean;
    private trackingId: string;
    private offlineEvents: EventProperties[];
    private retryAttempts: number;
    private privacySettings: {
        enablePiiFiltering: boolean;
        allowedDataTypes: string[];
    };

    constructor() {
        this.isEnabled = ANALYTICS.ENABLED;
        this.trackingId = ANALYTICS.TRACKING_ID;
        this.offlineEvents = [];
        this.retryAttempts = 0;
        this.privacySettings = {
            enablePiiFiltering: true,
            allowedDataTypes: ['screen_name', 'event_type', 'timestamp']
        };

        this.initialize();
    }

    /**
     * Initialize analytics services and configurations
     */
    private async initialize(): Promise<void> {
        try {
            // Initialize Segment analytics
            await analytics.setup(this.trackingId, {
                recordScreenViews: true,
                trackAppLifecycleEvents: true
            });

            // Initialize Firebase Crashlytics
            await crashlytics().setCrashlyticsCollectionEnabled(this.isEnabled);
            
            // Initialize Firebase Performance
            await perf().setPerformanceCollectionEnabled(this.isEnabled);

            // Restore offline queue
            await this.restoreOfflineQueue();

            // Process any pending offline events
            if (this.offlineEvents.length > 0) {
                await this.processBatchEvents();
            }
        } catch (error) {
            console.error('Analytics initialization failed:', error);
            await this.trackError(error as Error);
        }
    }

    /**
     * Track screen view events with privacy filtering
     */
    public async trackScreen(screenName: string, properties?: EventProperties): Promise<void> {
        if (!this.isEnabled) return;

        try {
            const filteredProperties = this.filterPiiData({
                ...properties,
                screen_name: screenName,
                timestamp: new Date().toISOString(),
                environment: ENV
            });

            await analytics.screen(screenName, filteredProperties);
        } catch (error) {
            await this.handleTrackingError(error as Error, 'screen', { screenName, properties });
        }
    }

    /**
     * Track custom events with enhanced context
     */
    public async trackEvent(eventName: string, properties?: EventProperties): Promise<void> {
        if (!this.isEnabled) return;

        try {
            const enhancedProperties = this.enhanceEventProperties(properties);
            const filteredProperties = this.filterPiiData(enhancedProperties);

            if (navigator.onLine) {
                await analytics.track(eventName, filteredProperties);
            } else {
                await this.queueOfflineEvent({ eventName, properties: filteredProperties });
            }
        } catch (error) {
            await this.handleTrackingError(error as Error, 'event', { eventName, properties });
        }
    }

    /**
     * Track errors with enhanced context and automatic categorization
     */
    public async trackError(error: Error, context?: ErrorContext): Promise<void> {
        if (!this.isEnabled) return;

        try {
            const errorContext = this.enhanceErrorContext(error, context);
            
            // Log to Crashlytics
            await crashlytics().recordError(error, errorContext);

            // Track as analytics event
            await this.trackEvent('error_occurred', {
                error_name: error.name,
                error_message: error.message,
                error_stack: error.stack,
                ...errorContext
            });
        } catch (trackingError) {
            console.error('Error tracking failed:', trackingError);
        }
    }

    /**
     * Start a performance trace with automatic cleanup
     */
    public startTrace(traceName: string): Promise<perf.Trace> {
        return new Promise(async (resolve, reject) => {
            try {
                const trace = await perf().startTrace(traceName);
                resolve(trace);
            } catch (error) {
                await this.trackError(error as Error);
                reject(error);
            }
        });
    }

    /**
     * Set user properties with privacy controls
     */
    public async setUserProperties(properties: EventProperties): Promise<void> {
        if (!this.isEnabled) return;

        try {
            const filteredProperties = this.filterPiiData(properties);
            await analytics.identify(filteredProperties);
            await crashlytics().setAttributes(filteredProperties);
        } catch (error) {
            await this.trackError(error as Error);
        }
    }

    /**
     * Filter PII data from properties
     */
    private filterPiiData(properties: EventProperties): EventProperties {
        if (!this.privacySettings.enablePiiFiltering) return properties;

        const filteredProperties: EventProperties = {};
        
        for (const [key, value] of Object.entries(properties)) {
            if (typeof value === 'string') {
                let shouldFilter = false;
                for (const pattern of PII_PATTERNS) {
                    if (pattern.test(value)) {
                        shouldFilter = true;
                        break;
                    }
                }
                if (!shouldFilter) {
                    filteredProperties[key] = value;
                }
            } else {
                filteredProperties[key] = value;
            }
        }

        return filteredProperties;
    }

    /**
     * Enhance event properties with additional context
     */
    private enhanceEventProperties(properties?: EventProperties): EventProperties {
        return {
            ...properties,
            timestamp: new Date().toISOString(),
            environment: ENV,
            app_version: process.env.APP_VERSION,
            platform: 'android'
        };
    }

    /**
     * Enhance error context with additional information
     */
    private enhanceErrorContext(error: Error, context?: ErrorContext): Record<string, any> {
        return {
            timestamp: new Date().toISOString(),
            environment: ENV,
            platform: 'android',
            error_type: error.name,
            severity: context?.severity || 'medium',
            tags: context?.tags || [],
            metadata: {
                ...context?.metadata,
                stack_trace: error.stack
            }
        };
    }

    /**
     * Queue events for offline processing
     */
    private async queueOfflineEvent(event: EventProperties): Promise<void> {
        if (this.offlineEvents.length >= MAX_QUEUE_SIZE) {
            this.offlineEvents.shift();
        }
        
        this.offlineEvents.push(event);
        await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.offlineEvents));
    }

    /**
     * Restore offline event queue from storage
     */
    private async restoreOfflineQueue(): Promise<void> {
        try {
            const queueData = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
            if (queueData) {
                this.offlineEvents = JSON.parse(queueData);
            }
        } catch (error) {
            console.error('Failed to restore offline queue:', error);
        }
    }

    /**
     * Process batch events from offline queue
     */
    private async processBatchEvents(): Promise<void> {
        while (this.offlineEvents.length > 0) {
            const batch = this.offlineEvents.splice(0, EVENT_BATCH_SIZE);
            try {
                await Promise.all(
                    batch.map(event => analytics.track(event.eventName, event.properties))
                );
                await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.offlineEvents));
            } catch (error) {
                this.offlineEvents.unshift(...batch);
                throw error;
            }
        }
    }

    /**
     * Handle tracking errors with retry logic
     */
    private async handleTrackingError(error: Error, type: string, data: any): Promise<void> {
        if (this.retryAttempts < MAX_RETRY_ATTEMPTS) {
            this.retryAttempts++;
            setTimeout(async () => {
                if (type === 'screen') {
                    await this.trackScreen(data.screenName, data.properties);
                } else {
                    await this.trackEvent(data.eventName, data.properties);
                }
            }, RETRY_DELAY_MS * this.retryAttempts);
        } else {
            await this.trackError(error);
            this.retryAttempts = 0;
        }
    }
}