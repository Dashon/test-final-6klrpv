'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ErrorBoundary from '../../components/shared/ErrorBoundary/ErrorBoundary';
import Toast from '../../components/shared/Toast/Toast';
import Button from '../../components/shared/Button/Button';
import { colors, typography } from '../../constants/theme';

// Maximum number of retry attempts before suggesting navigation
const MAX_RETRY_ATTEMPTS = 3;
// Delay between retry attempts in milliseconds
const RETRY_DELAY = 1000;

interface ErrorPageProps {
  error: Error;
  reset: () => void;
}

interface ErrorState {
  retryCount: number;
  isRecovering: boolean;
  lastError: Error | null;
  showToast: boolean;
}

/**
 * Error page component that provides comprehensive error handling with
 * user-friendly interface, recovery options, and accessibility features.
 */
const Error: React.FC<ErrorPageProps> = ({ error, reset }) => {
  const router = useRouter();
  const [state, setState] = useState<ErrorState>({
    retryCount: 0,
    isRecovering: false,
    lastError: error,
    showToast: true,
  });

  // Log error to monitoring service
  useEffect(() => {
    console.error('Page Error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  // Reset error state when error changes
  useEffect(() => {
    if (error !== state.lastError) {
      setState(prev => ({
        ...prev,
        lastError: error,
        showToast: true,
      }));
    }
  }, [error]);

  /**
   * Handles retry attempts with rate limiting and user feedback
   */
  const handleRetry = async () => {
    if (state.retryCount >= MAX_RETRY_ATTEMPTS) {
      setState(prev => ({
        ...prev,
        showToast: true,
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      isRecovering: true,
      showToast: false,
    }));

    try {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      reset();
      
      setState(prev => ({
        ...prev,
        retryCount: prev.retryCount + 1,
        isRecovering: false,
      }));
    } catch (retryError) {
      setState(prev => ({
        ...prev,
        isRecovering: false,
        showToast: true,
      }));
    }
  };

  /**
   * Handles navigation to homepage when recovery fails
   */
  const handleNavigateHome = async () => {
    setState(prev => ({
      ...prev,
      showToast: false,
    }));
    
    router.push('/');
  };

  return (
    <ErrorBoundary>
      <div
        role="alert"
        aria-live="assertive"
        style={{
          padding: '40px 20px',
          maxWidth: '600px',
          margin: '40px auto',
          textAlign: 'center',
          fontFamily: typography.fontFamilyUI,
        }}
      >
        <h1 style={{
          color: colors.error,
          fontSize: typography.fontSizeH2,
          marginBottom: '24px',
          fontFamily: typography.fontFamilyHeadings,
        }}>
          Something went wrong
        </h1>

        <p style={{
          color: colors.textSecondary,
          fontSize: typography.fontSizeBody,
          marginBottom: '32px',
          lineHeight: typography.baseLineHeight,
        }}>
          {error.message || 'An unexpected error occurred while loading this page.'}
        </p>

        <div style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
        }}>
          <Button
            onClick={handleRetry}
            variant="primary"
            size="medium"
            loading={state.isRecovering}
            disabled={state.retryCount >= MAX_RETRY_ATTEMPTS}
            ariaLabel="Try again"
          >
            Try Again
          </Button>

          <Button
            onClick={handleNavigateHome}
            variant="secondary"
            size="medium"
            ariaLabel="Return to homepage"
          >
            Return to Homepage
          </Button>
        </div>

        {state.showToast && (
          <Toast
            message={
              state.retryCount >= MAX_RETRY_ATTEMPTS
                ? "We're having trouble recovering. Please try again later or return to the homepage."
                : "An error occurred. We're trying to recover."
            }
            type="error"
            duration={8000}
            position="top-right"
            onClose={() => setState(prev => ({ ...prev, showToast: false }))}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Error;