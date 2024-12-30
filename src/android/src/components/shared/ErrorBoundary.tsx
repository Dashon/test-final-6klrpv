/**
 * @fileoverview Enhanced React Error Boundary component with comprehensive error tracking
 * and accessibility support for Android application.
 * @version 1.0.0
 */

import React, { Component, ErrorInfo } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo, TouchableOpacity } from 'react-native';
import { AnalyticsService } from '../../utils/analytics';

// Initialize analytics service
const analyticsService = new AnalyticsService();

/**
 * Props interface for ErrorBoundary component
 */
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackComponent?: React.ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

/**
 * State interface for ErrorBoundary component
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorType: string | null;
  isRecoverable: boolean;
}

/**
 * Enhanced Error Boundary component that provides comprehensive error handling,
 * analytics tracking, and accessibility support.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: null,
      isRecoverable: true
    };
  }

  /**
   * Static method to derive error state from caught errors
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Analyze error type to determine if it's recoverable
    const isRecoverable = !(
      error instanceof TypeError ||
      error.name === 'SyntaxError' ||
      error.name === 'ReferenceError'
    );

    return {
      hasError: true,
      error,
      errorType: error.name,
      isRecoverable
    };
  }

  /**
   * Lifecycle method called when an error is caught
   */
  async componentDidCatch(error: Error, errorInfo: ErrorInfo): Promise<void> {
    try {
      // Track error with analytics service
      await analyticsService.trackError(error, {
        severity: this.state.isRecoverable ? 'medium' : 'high',
        tags: ['error_boundary', `error_type_${error.name}`],
        metadata: {
          componentStack: errorInfo.componentStack,
          isRecoverable: this.state.isRecoverable
        }
      });

      // Announce error to screen readers
      AccessibilityInfo.announceForAccessibility(
        `An error has occurred: ${error.message}. ${
          this.state.isRecoverable ? 'You can try to recover the application.' : 
          'Please restart the application.'
        }`
      );

      // Call optional error handler
      this.props.onError?.(error, errorInfo);

    } catch (trackingError) {
      // Queue error for offline tracking if analytics fails
      await analyticsService.queueOfflineError(error);
      console.error('Error tracking failed:', trackingError);
    }

    // Update component state
    this.setState({
      errorInfo,
      hasError: true
    });
  }

  /**
   * Handle retry attempt for recoverable errors
   */
  private handleRetry = async (): Promise<void> => {
    try {
      // Track retry attempt
      await analyticsService.trackEvent('error_recovery_attempt', {
        error_type: this.state.errorType,
        is_recoverable: this.state.isRecoverable
      });

      // Reset error state
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorType: null
      });

      // Call optional reset handler
      this.props.onReset?.();

      // Announce recovery attempt to screen readers
      AccessibilityInfo.announceForAccessibility(
        'Attempting to recover from error...'
      );
    } catch (error) {
      console.error('Recovery attempt failed:', error);
    }
  };

  /**
   * Render error UI or children based on error state
   */
  render(): React.ReactNode {
    if (this.state.hasError) {
      // Use custom fallback component if provided
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      // Default error UI
      return (
        <View style={styles.container} accessibilityRole="alert">
          <Text style={styles.errorText} accessibilityLabel="Error occurred">
            Something went wrong
          </Text>
          <Text style={styles.errorDetails}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          {this.state.isRecoverable && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={this.handleRetry}
              accessibilityRole="button"
              accessibilityLabel="Try to recover"
              accessibilityHint="Attempts to recover from the error"
            >
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * Styles for error UI
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF'
  },
  errorText: {
    fontSize: 16,
    color: '#FF0000',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold'
  },
  errorDetails: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  retryButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 5
  },
  retryText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500'
  }
});

export default ErrorBoundary;