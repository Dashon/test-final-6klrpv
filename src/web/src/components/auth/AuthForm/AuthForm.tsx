import React, { useCallback, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import classnames from 'classnames';

import Input from '../../shared/Input/Input';
import PasswordInput from '../PasswordInput/PasswordInput';
import Button from '../../shared/Button/Button';
import { useAuth } from '../../../hooks/useAuth';
import { validateEmail, validatePassword } from '../../../utils/validation';
import { PASSWORD_RULES, VALIDATION_MESSAGES } from '../../../constants/validation';
import { colors, typography } from '../../../constants/theme';

// Form validation schemas
const loginSchema = yup.object().shape({
  email: yup.string()
    .required(VALIDATION_MESSAGES.required)
    .email(VALIDATION_MESSAGES.email.format),
  password: yup.string()
    .required(VALIDATION_MESSAGES.required)
    .min(PASSWORD_RULES.minLength, VALIDATION_MESSAGES.password.tooShort)
    .max(PASSWORD_RULES.maxLength, VALIDATION_MESSAGES.password.tooLong),
  mfaCode: yup.string().when('mfaRequired', {
    is: true,
    then: yup.string().required('MFA code is required').length(6, 'MFA code must be 6 digits')
  })
});

const registerSchema = loginSchema.shape({
  firstName: yup.string().required(VALIDATION_MESSAGES.required),
  lastName: yup.string().required(VALIDATION_MESSAGES.required),
  confirmPassword: yup.string()
    .required(VALIDATION_MESSAGES.required)
    .oneOf([yup.ref('password')], 'Passwords must match'),
  acceptTerms: yup.boolean()
    .oneOf([true], 'You must accept the terms and conditions')
});

interface AuthFormProps {
  formType: 'login' | 'register';
  onSuccess: (token: string) => void;
  onError: (error: any) => void;
  onMFARequired: (challengeId: string) => void;
}

interface FormData {
  email: string;
  password: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  mfaCode?: string;
  acceptTerms?: boolean;
}

export const AuthForm: React.FC<AuthFormProps> = ({
  formType,
  onSuccess,
  onError,
  onMFARequired
}) => {
  const [mfaRequired, setMfaRequired] = useState(false);
  const [socialAuthPending, setSocialAuthPending] = useState(false);
  const { handleLogin, handleRegister, handleMFAChallenge, handleSocialAuth } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    trigger
  } = useForm<FormData>({
    resolver: yup.reach(formType === 'login' ? loginSchema : registerSchema),
    mode: 'onBlur'
  });

  // Form submission handler with enhanced security
  const onSubmit = useCallback(async (data: FormData) => {
    try {
      if (formType === 'login') {
        const response = await handleLogin({
          email: data.email,
          password: data.password,
          mfaCode: data.mfaCode
        });

        if (response.mfaRequired) {
          setMfaRequired(true);
          onMFARequired(response.challengeId);
          return;
        }

        onSuccess(response.accessToken);
      } else {
        const response = await handleRegister({
          email: data.email,
          password: data.password,
          firstName: data.firstName!,
          lastName: data.lastName!,
          acceptedTerms: data.acceptTerms!
        });
        onSuccess(response.accessToken);
      }
    } catch (error) {
      onError(error);
    }
  }, [formType, handleLogin, handleRegister, onSuccess, onError, onMFARequired]);

  // Social authentication handler
  const handleSocialLogin = useCallback(async (provider: string) => {
    try {
      setSocialAuthPending(true);
      const response = await handleSocialAuth(provider);
      onSuccess(response.accessToken);
    } catch (error) {
      onError(error);
    } finally {
      setSocialAuthPending(false);
    }
  }, [handleSocialAuth, onSuccess, onError]);

  return (
    <form 
      onSubmit={handleSubmit(onSubmit)}
      className="auth-form w-full max-w-md mx-auto"
      noValidate
      aria-labelledby="auth-form-title"
    >
      <h1 
        id="auth-form-title"
        className="text-2xl font-bold mb-6 text-center"
        style={{ fontFamily: typography.fontFamilyHeadings }}
      >
        {formType === 'login' ? 'Sign In' : 'Create Account'}
      </h1>

      <div className="space-y-4">
        <Input
          type="email"
          label="Email Address"
          {...register('email')}
          error={errors.email?.message}
          autoComplete="email"
          required
          aria-describedby={errors.email ? 'email-error' : undefined}
        />

        <PasswordInput
          label="Password"
          {...register('password')}
          error={errors.password?.message}
          showStrengthIndicator={formType === 'register'}
          allowVisibilityToggle
          showRequirements={formType === 'register'}
        />

        {formType === 'register' && (
          <>
            <PasswordInput
              label="Confirm Password"
              {...register('confirmPassword')}
              error={errors.confirmPassword?.message}
              allowVisibilityToggle
            />

            <Input
              type="text"
              label="First Name"
              {...register('firstName')}
              error={errors.firstName?.message}
              autoComplete="given-name"
              required
            />

            <Input
              type="text"
              label="Last Name"
              {...register('lastName')}
              error={errors.lastName?.message}
              autoComplete="family-name"
              required
            />

            <div className="flex items-start mb-4">
              <input
                type="checkbox"
                id="acceptTerms"
                {...register('acceptTerms')}
                className="mt-1"
              />
              <label 
                htmlFor="acceptTerms"
                className="ml-2 text-sm text-gray-600"
              >
                I accept the terms and conditions
              </label>
              {errors.acceptTerms && (
                <span className="text-error text-sm ml-2" role="alert">
                  {errors.acceptTerms.message}
                </span>
              )}
            </div>
          </>
        )}

        {mfaRequired && (
          <Input
            type="text"
            label="MFA Code"
            {...register('mfaCode')}
            error={errors.mfaCode?.message}
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            required
          />
        )}

        <Button
          type="submit"
          fullWidth
          loading={isSubmitting}
          disabled={isSubmitting || socialAuthPending}
        >
          {formType === 'login' ? 'Sign In' : 'Create Account'}
        </Button>
      </div>

      <div className="mt-4">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              Or continue with
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <Button
            variant="secondary"
            onClick={() => handleSocialLogin('google')}
            disabled={isSubmitting || socialAuthPending}
            aria-label="Sign in with Google"
          >
            Google
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleSocialLogin('facebook')}
            disabled={isSubmitting || socialAuthPending}
            aria-label="Sign in with Facebook"
          >
            Facebook
          </Button>
        </div>
      </div>
    </form>
  );
};

export default AuthForm;