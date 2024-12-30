/**
 * Enhanced Error Boundary Component for iOS
 * Version: 1.0.0
 * 
 * A production-ready error boundary that provides comprehensive error handling,
 * analytics tracking, and fallback UI for React Native components.
 */

import React from 'react'; // v18.x
import { View, Text, StyleSheet } from 'react-native'; // v0.71.x
import { Analytics, EVENT_TYPES } from '../../utils/analytics';

/**
 * Error severity levels for analytics tracking
 */
enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Props interface for the ErrorBoundary component
 */
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  analyticsEnabled?: boolean;
  retryEnabled?: boolean;
}

/**
 * Enhanced error state interface
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
  lastErrorTimestamp: Date | null;
  recoveryAttempts: number;
}

// Constants for error handling configuration
const ERROR_RETRY_LIMIT = 3;
const ERROR_BATCH_INTERVAL = 5000; // 5 seconds
const ERROR_SEVERITY_THRESHOLDS = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 5
};

/**
 * Enhanced Error Boundary component with comprehensive error tracking
 * and analytics integration
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorBatchTimeout: NodeJS.Timeout | null = null;
  private batchedErrors: Array<{ error: Error; timestamp: Date }> = [];

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0,
      lastErrorTimestamp: null,
      recoveryAttempts: 0
    };
  }

  /**
   * Static method to derive error state from caught errors
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorCount: (prevState: ErrorBoundaryState) => prevState.errorCount + 1,
      lastErrorTimestamp: new Date()
    };
  }

  /**
   * Lifecycle method for handling caught errors with analytics integration
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { analyticsEnabled = true, onError } = this.props;

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Add error to batch for analytics
    if (analyticsEnabled) {
      this.batchedErrors.push({
        error,
        timestamp: new Date()
      });

      // Set up batch processing if not already scheduled
      if (!this.errorBatchTimeout) {
        this.errorBatchTimeout = setTimeout(() => {
          this.processErrorBatch();
        }, ERROR_BATCH_INTERVAL);
      }
    }

    // Update component state
    this.setState(prevState => ({
      errorCount: prevState.errorCount + 1,
      lastErrorTimestamp: new Date()
    }));
  }

  /**
   * Cleanup method for error batching timeout
   */
  componentWillUnmount(): void {
    if (this.errorBatchTimeout) {
      clearTimeout(this.errorBatchTimeout);
    }
  }

  /**
   * Process batched errors for analytics
   */
  private processErrorBatch(): void {
    if (this.batchedErrors.length === 0) return;

    const errorSeverity = this.calculateErrorSeverity();
    
    // Track errors in analytics
    Analytics.trackEvent(EVENT_TYPES.ERROR, {
      error_count: this.batchedErrors.length,
      severity: errorSeverity,
      errors: this.batchedErrors.map(({ error, timestamp }) => ({
        message: error.message,
        stack: error.stack,
        timestamp: timestamp.toISOString()
      })),
      component: this.constructor.name,
      recovery_attempts: this.state.recoveryAttempts
    });

    // Clear batched errors
    this.batchedErrors = [];
    this.errorBatchTimeout = null;
  }

  /**
   * Calculate error severity based on frequency and count
   */
  private calculateErrorSeverity(): ErrorSeverity {
    const { errorCount } = this.state;

    if (errorCount >= ERROR_SEVERITY_THRESHOLDS.CRITICAL) {
      return ErrorSeverity.CRITICAL;
    } else if (errorCount >= ERROR_SEVERITY_THRESHOLDS.HIGH) {
      return ErrorSeverity.HIGH;
    } else if (errorCount >= ERROR_SEVERITY_THRESHOLDS.MEDIUM) {
      return ErrorSeverity.MEDIUM;
    }
    return ErrorSeverity.LOW;
  }

  /**
   * Handle retry attempts for error recovery
   */
  private handleRetry = (): void => {
    const { recoveryAttempts } = this.state;
    
    if (recoveryAttempts < ERROR_RETRY_LIMIT) {
      Analytics.trackEvent(EVENT_TYPES.SYSTEM_EVENT, {
        action: 'error_recovery_attempt',
        attempt_number: recoveryAttempts + 1,
        error_message: this.state.error?.message
      });

      this.setState(prevState => ({
        hasError: false,
        error: null,
        recoveryAttempts: prevState.recoveryAttempts + 1
      }));
    }
  };

  /**
   * Render error UI or children based on error state
   */
  render(): React.ReactNode {
    const { hasError, error, recoveryAttempts } = this.state;
    const { children, fallback, retryEnabled = true } = this.props;

    if (!hasError) {
      return children;
    }

    if (fallback) {
      return fallback;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>
          {error?.message || 'An unexpected error occurred'}
        </Text>
        {retryEnabled && recoveryAttempts < ERROR_RETRY_LIMIT && (
          <Text style={styles.retryButton} onPress={this.handleRetry}>
            Tap to retry
          </Text>
        )}
        {__DEV__ && error?.stack && (
          <Text style={styles.stackTrace}>{error.stack}</Text>
        )}
      </View>
    );
  }
}

/**
 * Styles for the error UI
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff'
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#ff3b30'
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#000'
  },
  retryButton: {
    fontSize: 16,
    color: '#007aff',
    textDecorationLine: 'underline',
    marginTop: 10
  },
  stackTrace: {
    fontSize: 12,
    color: '#666',
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f8f8f8'
  }
});

export default ErrorBoundary;