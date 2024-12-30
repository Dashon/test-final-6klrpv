'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as analytics from '@amplitude/analytics-browser';

import AuthForm from '../../../../components/auth/AuthForm/AuthForm';
import Button from '../../../../components/shared/Button/Button';
import { resetPassword } from '../../../../services/auth';
import { validatePassword } from '../../../../utils/validation';
import { colors, typography } from '../../../../constants/theme';
import { ErrorCode } from '../../../../../backend/shared/constants/error-codes';

// Interface for password reset form data
interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

// Interface for token validation result
interface TokenValidationResult {
  isValid: boolean;
  error: string | null;
}

/**
 * Password Reset Page Component
 * Implements secure password reset functionality with comprehensive validation,
 * error handling, and accessibility features.
 */
const ResetPasswordPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenValidated, setTokenValidated] = useState(false);
  const [attempts, setAttempts] = useState(0);

  // Maximum allowed reset attempts before lockout
  const MAX_ATTEMPTS = 3;
  const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  /**
   * Validates reset token from URL with comprehensive security checks
   */
  const validateToken = useCallback(async (token: string): Promise<TokenValidationResult> => {
    try {
      // Basic token format validation
      if (!token || typeof token !== 'string' || token.length < 32) {
        return { isValid: false, error: 'Invalid reset token format' };
      }

      // Check token expiration (handled by backend)
      const response = await fetch('/api/auth/validate-reset-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        const data = await response.json();
        return { 
          isValid: false, 
          error: data.message || 'Token validation failed' 
        };
      }

      return { isValid: true, error: null };
    } catch (error) {
      console.error('Token validation error:', error);
      return { 
        isValid: false, 
        error: 'Error validating reset token' 
      };
    }
  }, []);

  /**
   * Handles password reset form submission with security measures
   */
  const handleResetPassword = useCallback(async (formData: ResetPasswordFormData) => {
    try {
      setLoading(true);
      setError(null);

      // Check attempt limits
      if (attempts >= MAX_ATTEMPTS) {
        setError(`Too many attempts. Please try again in ${LOCKOUT_DURATION / 60000} minutes.`);
        return;
      }

      const token = searchParams.get('token');
      if (!token) {
        setError('Reset token is missing');
        return;
      }

      // Validate password strength
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        setError(passwordValidation.errors.password);
        return;
      }

      // Ensure passwords match
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      // Attempt password reset
      await resetPassword({
        token,
        newPassword: formData.password,
        confirmPassword: formData.confirmPassword
      });

      // Track successful password reset
      analytics.track('Password Reset Success', {
        timestamp: new Date().toISOString()
      });

      // Redirect to login with success message
      router.push('/login?resetSuccess=true');
    } catch (error: any) {
      setAttempts(prev => prev + 1);
      
      // Handle specific error cases
      const errorMessage = error.code === ErrorCode.VALIDATION_ERROR
        ? 'Invalid password format'
        : error.code === ErrorCode.AUTHENTICATION_ERROR
        ? 'Reset token has expired'
        : 'Failed to reset password. Please try again.';

      setError(errorMessage);

      // Track failed attempt
      analytics.track('Password Reset Failed', {
        error: error.code,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  }, [attempts, router, searchParams]);

  // Validate token on component mount
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      validateToken(token).then(result => {
        setTokenValidated(result.isValid);
        if (!result.isValid) {
          setError(result.error);
        }
      });
    } else {
      setError('Reset token is missing');
    }
  }, [searchParams, validateToken]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 
            className="mt-6 text-center text-3xl font-extrabold"
            style={{ fontFamily: typography.fontFamilyHeadings }}
          >
            Reset Your Password
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please enter your new password below
          </p>
        </div>

        {error && (
          <div 
            className="bg-red-50 border border-red-400 rounded p-4 text-red-800"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        {tokenValidated && !error && (
          <AuthForm
            formType="reset-password"
            onSuccess={() => router.push('/login?resetSuccess=true')}
            onError={setError}
            loading={loading}
          />
        )}

        <div className="mt-4 text-center">
          <Button
            variant="text"
            onClick={() => router.push('/login')}
            aria-label="Return to login page"
          >
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;