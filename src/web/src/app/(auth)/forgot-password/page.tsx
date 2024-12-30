'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import AuthForm from '../../../components/auth/AuthForm/AuthForm';
import { useAuth } from '../../../hooks/useAuth';
import { colors, typography } from '../../../constants/theme';
import { validateEmail } from '../../../utils/validation';
import { ErrorCode } from '../../../../backend/shared/constants/error-codes';

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_ATTEMPTS: 5,
  WINDOW_MS: 3600000, // 1 hour
};

/**
 * Forgot Password Page Component
 * Provides secure password reset functionality with rate limiting and monitoring
 */
const ForgotPasswordPage: React.FC = () => {
  const router = useRouter();
  const { handleForgotPassword } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track rate limiting
  const [attempts, setAttempts] = useState<{ count: number; timestamp: number }>({
    count: 0,
    timestamp: Date.now(),
  });

  /**
   * Checks if rate limit has been exceeded
   */
  const isRateLimited = useCallback((): boolean => {
    const now = Date.now();
    if (now - attempts.timestamp > RATE_LIMIT.WINDOW_MS) {
      // Reset counter if window has expired
      setAttempts({ count: 0, timestamp: now });
      return false;
    }
    return attempts.count >= RATE_LIMIT.MAX_ATTEMPTS;
  }, [attempts]);

  /**
   * Handles form submission with security checks and rate limiting
   */
  const handleSubmit = useCallback(async (formData: { email: string }) => {
    try {
      // Check rate limiting
      if (isRateLimited()) {
        toast.error(
          'Too many password reset attempts. Please try again later.',
          {
            id: 'rate-limit-error',
            duration: 5000,
            ariaProps: {
              role: 'alert',
              'aria-live': 'assertive',
            },
          }
        );
        return;
      }

      setIsSubmitting(true);

      // Validate email format
      if (!validateEmail(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      // Attempt password reset
      await handleForgotPassword(formData.email);

      // Update rate limiting counter
      setAttempts(prev => ({
        count: prev.count + 1,
        timestamp: prev.timestamp,
      }));

      // Show success message
      toast.success(
        'Password reset instructions have been sent to your email',
        {
          id: 'reset-success',
          duration: 5000,
          ariaProps: {
            role: 'status',
            'aria-live': 'polite',
          },
        }
      );

      // Redirect to login page after short delay
      setTimeout(() => {
        router.push('/login');
      }, 2000);

    } catch (error: any) {
      // Handle specific error cases
      const errorMessage = error.code === ErrorCode.RATE_LIMIT_EXCEEDED
        ? 'Too many requests. Please try again later.'
        : error.message || 'An error occurred. Please try again.';

      toast.error(errorMessage, {
        id: 'reset-error',
        duration: 5000,
        ariaProps: {
          role: 'alert',
          'aria-live': 'assertive',
        },
      });

    } finally {
      setIsSubmitting(false);
    }
  }, [handleForgotPassword, isRateLimited, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 
            className="text-3xl font-bold"
            style={{ fontFamily: typography.fontFamilyHeadings }}
          >
            Reset Your Password
          </h1>
          <p 
            className="mt-2 text-sm text-gray-600"
            style={{ fontFamily: typography.fontFamilyUI }}
          >
            Enter your email address and we'll send you instructions to reset your password.
          </p>
        </div>

        <AuthForm
          formType="forgot-password"
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          isRateLimited={isRateLimited()}
          aria-labelledby="forgot-password-title"
        />

        <div className="text-center">
          <button
            onClick={() => router.push('/login')}
            className="text-sm font-medium text-primary hover:text-primaryDark transition-colors"
            style={{ color: colors.primary }}
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;