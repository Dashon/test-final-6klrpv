'use client';

import React, { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // v13.x
import { useEffect } from 'react'; // v18.x
import { Auth0Provider } from '@auth0/auth0-react'; // v2.x

import AuthForm from '../../../components/auth/AuthForm/AuthForm';
import { useAuth } from '../../../hooks/useAuth';
import { colors, typography } from '../../../constants/theme';
import { ErrorCode } from '../../../../backend/shared/constants/error-codes';

/**
 * Login page component implementing OAuth 2.0 + JWT authentication with MFA support
 * and comprehensive security features including session management and audit logging.
 */
const LoginPage: React.FC = () => {
  const router = useRouter();
  const {
    handleLogin,
    isAuthenticated,
    handleMFAChallenge,
    handleSocialAuth
  } = useAuth();

  // Redirect authenticated users
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  /**
   * Handles successful authentication with role-based redirects
   * and comprehensive security logging
   */
  const handleAuthSuccess = useCallback(async (response: any) => {
    try {
      // Log successful authentication event
      console.info('Authentication successful', {
        timestamp: new Date().toISOString(),
        userId: response.user?.id,
        method: response.mfaVerified ? 'MFA' : 'Password'
      });

      // Role-based redirect
      const redirectPath = response.user?.role === 'PROFESSIONAL' 
        ? '/professional/dashboard'
        : '/dashboard';

      router.replace(redirectPath);
    } catch (error) {
      console.error('Post-authentication error:', error);
      handleAuthError(error);
    }
  }, [router]);

  /**
   * Handles authentication errors with comprehensive error tracking
   * and user feedback
   */
  const handleAuthError = useCallback(async (error: any) => {
    // Log authentication failure
    console.error('Authentication failed:', {
      timestamp: new Date().toISOString(),
      errorCode: error.code || ErrorCode.AUTHENTICATION_ERROR,
      message: error.message,
      correlationId: error.correlationId
    });

    // Clear sensitive form data
    const form = document.querySelector('form');
    if (form) {
      form.reset();
    }

    // Update accessibility announcement
    const announcer = document.createElement('div');
    announcer.setAttribute('role', 'alert');
    announcer.setAttribute('aria-live', 'polite');
    announcer.className = 'sr-only';
    announcer.textContent = 'Authentication failed. Please try again.';
    document.body.appendChild(announcer);
    setTimeout(() => document.body.removeChild(announcer), 1000);
  }, []);

  /**
   * Handles MFA verification process with security logging
   */
  const handleMFARequired = useCallback(async (challengeId: string) => {
    try {
      // Log MFA challenge initiation
      console.info('MFA challenge initiated', {
        timestamp: new Date().toISOString(),
        challengeId
      });

      // Present MFA interface
      const mfaResponse = await handleMFAChallenge(challengeId);
      
      if (mfaResponse.verified) {
        handleAuthSuccess(mfaResponse);
      }
    } catch (error) {
      console.error('MFA verification failed:', error);
      handleAuthError(error);
    }
  }, [handleMFAChallenge, handleAuthSuccess, handleAuthError]);

  return (
    <Auth0Provider
      domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN!}
      clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID!}
      redirectUri={typeof window !== 'undefined' ? window.location.origin : ''}
    >
      <div 
        className="min-h-screen flex items-center justify-center bg-backgroundSecondary px-4"
        style={{ fontFamily: typography.fontFamilyUI }}
      >
        <div className="w-full max-w-md">
          <h1 
            className="text-3xl font-bold text-center mb-8"
            style={{ 
              fontFamily: typography.fontFamilyHeadings,
              color: colors.textPrimary 
            }}
          >
            Welcome Back
          </h1>

          <div className="bg-white rounded-lg shadow-md p-8">
            <AuthForm
              formType="login"
              onSuccess={handleAuthSuccess}
              onError={handleAuthError}
              onMFARequired={handleMFARequired}
            />
          </div>

          {/* Accessibility and SEO enhancements */}
          <div className="sr-only" role="status" aria-live="polite">
            Login page loaded
          </div>
          <noscript>
            <div className="text-error text-center mt-4">
              JavaScript is required to use this application.
            </div>
          </noscript>
        </div>
      </div>
    </Auth0Provider>
  );
};

export default LoginPage;