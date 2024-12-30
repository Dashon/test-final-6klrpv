'use client';

import React, { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // v13.x
import { toast } from 'react-hot-toast'; // v2.x
import { generateCorrelationId } from '@sentry/nextjs'; // v7.x
import FingerprintJS from '@fingerprintjs/fingerprintjs'; // v3.x

import AuthForm from '../../../components/auth/AuthForm/AuthForm';
import { useAuth } from '../../../hooks/useAuth';
import { RegisterData } from '../../../types/auth';

/**
 * Next.js page component for user registration with enhanced security features
 * Implements OAuth 2.0 + JWT authentication with MFA support and device fingerprinting
 * Follows WCAG 2.1 Level AA accessibility standards
 */
const RegisterPage: React.FC = () => {
  const router = useRouter();
  const { handleRegister, setupMFA } = useAuth();
  const [deviceInfo, setDeviceInfo] = React.useState<string | null>(null);

  // Initialize device fingerprinting on mount
  useEffect(() => {
    const initializeFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        setDeviceInfo(result.visitorId);
      } catch (error) {
        console.error('Device fingerprinting failed:', error);
      }
    };
    initializeFingerprint();
  }, []);

  /**
   * Handles successful registration with MFA setup flow
   */
  const handleRegistrationSuccess = useCallback(async (registrationData: RegisterData) => {
    try {
      // Log successful registration event
      console.info('Registration successful:', {
        email: registrationData.email,
        timestamp: new Date().toISOString()
      });

      // Initialize MFA setup if enabled
      const mfaSetup = await setupMFA();
      
      if (mfaSetup) {
        // Show success message with MFA setup instructions
        toast.success(
          'Account created successfully! Please set up two-factor authentication.',
          { duration: 5000 }
        );
        router.push('/auth/mfa-setup');
      } else {
        // Show success message and redirect to dashboard
        toast.success('Account created successfully! Welcome aboard.', {
          duration: 5000
        });
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('MFA setup failed:', error);
      toast.error('Account created, but MFA setup failed. Please try again later.');
      router.push('/dashboard');
    }
  }, [router, setupMFA]);

  /**
   * Handles registration errors with correlation tracking
   */
  const handleRegistrationError = useCallback((error: any, correlationId: string) => {
    // Log error with correlation ID for tracking
    console.error('Registration failed:', {
      error,
      correlationId,
      timestamp: new Date().toISOString()
    });

    // Show user-friendly error message with reference ID
    toast.error(
      `Registration failed. Please try again. (Ref: ${correlationId.slice(0, 8)})`,
      { duration: 5000 }
    );
  }, []);

  return (
    <main 
      className="min-h-screen flex flex-col items-center justify-center px-4 bg-backgroundPrimary"
      role="main"
      aria-labelledby="registration-title"
    >
      <div className="w-full max-w-md">
        <h1 
          id="registration-title"
          className="text-3xl font-bold text-center mb-8 text-textPrimary"
          tabIndex={-1}
        >
          Create Your Account
        </h1>

        <AuthForm
          formType="register"
          onSuccess={handleRegistrationSuccess}
          onError={(error) => handleRegistrationError(error, generateCorrelationId())}
          deviceInfo={deviceInfo}
          aria-describedby="registration-description"
        />

        <p 
          id="registration-description"
          className="mt-4 text-sm text-textSecondary text-center"
        >
          By registering, you agree to our Terms of Service and Privacy Policy.
          Your security is our priority.
        </p>
      </div>
    </main>
  );
};

export default RegisterPage;