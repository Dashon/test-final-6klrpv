import React, { useCallback, useState, useRef, useEffect } from 'react';
import classnames from 'classnames';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'; // v2.x
import Input from '../../shared/Input/Input';
import { validatePassword } from '../../../utils/validation';
import { PASSWORD_RULES } from '../../../constants/validation';
import { colors, typography } from '../../../constants/theme';

export interface PasswordInputProps {
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  error?: string;
  label?: string;
  placeholder?: string;
  showStrengthIndicator?: boolean;
  allowVisibilityToggle?: boolean;
  showRequirements?: boolean;
}

/**
 * A secure password input component with comprehensive validation, strength indication,
 * and accessibility features. Implements WCAG 2.1 Level AA compliance.
 *
 * @component
 * @example
 * ```tsx
 * <PasswordInput
 *   label="Password"
 *   value={password}
 *   onChange={(value, isValid) => handlePasswordChange(value, isValid)}
 *   showStrengthIndicator
 *   allowVisibilityToggle
 * />
 * ```
 */
const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChange,
  error,
  label = 'Password',
  placeholder = 'Enter your password',
  showStrengthIndicator = true,
  allowVisibilityToggle = false,
  showRequirements = true,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [strength, setStrength] = useState(0);
  const [validationState, setValidationState] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const strengthId = useRef(`strength-${Math.random().toString(36).substr(2, 9)}`);
  const requirementsId = useRef(`requirements-${Math.random().toString(36).substr(2, 9)}`);

  /**
   * Calculates password strength based on multiple criteria
   */
  const calculatePasswordStrength = useCallback((password: string): number => {
    if (!password) return 0;

    let score = 0;
    const checks = [
      password.length >= PASSWORD_RULES.minLength,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /\d/.test(password),
      PASSWORD_RULES.specialCharRegex.test(password),
      password.length >= 12,
      !/(.)\1{2,}/.test(password), // No character repeated 3+ times
      !/^(123|abc|qwerty)/i.test(password) // No common sequences
    ];

    checks.forEach(check => {
      if (check) score += 12.5;
    });

    return Math.min(100, Math.max(0, score));
  }, []);

  /**
   * Handles password visibility toggle with accessibility announcements
   */
  const togglePasswordVisibility = useCallback(() => {
    if (!allowVisibilityToggle) return;

    setShowPassword(prev => !prev);
    const announcement = `Password ${!showPassword ? 'shown' : 'hidden'}`;
    const announcer = document.createElement('div');
    announcer.setAttribute('role', 'alert');
    announcer.setAttribute('aria-live', 'polite');
    announcer.className = 'sr-only';
    announcer.textContent = announcement;
    document.body.appendChild(announcer);
    setTimeout(() => document.body.removeChild(announcer), 1000);
    inputRef.current?.focus();
  }, [allowVisibilityToggle, showPassword]);

  /**
   * Handles password changes with validation and strength calculation
   */
  const handlePasswordChange = useCallback((newValue: string) => {
    const validation = validatePassword(newValue);
    const newStrength = calculatePasswordStrength(newValue);
    
    setValidationState(prev => ({
      ...prev,
      minLength: newValue.length >= PASSWORD_RULES.minLength,
      maxLength: newValue.length <= PASSWORD_RULES.maxLength,
      hasUppercase: /[A-Z]/.test(newValue),
      hasNumber: /\d/.test(newValue),
      hasSpecialChar: PASSWORD_RULES.specialCharRegex.test(newValue)
    }));

    if (showStrengthIndicator) {
      setStrength(newStrength);
    }

    onChange(newValue, validation.isValid);
  }, [calculatePasswordStrength, onChange, showStrengthIndicator]);

  /**
   * Renders password strength indicator with ARIA support
   */
  const renderStrengthIndicator = () => {
    if (!showStrengthIndicator) return null;

    const getStrengthLabel = () => {
      if (strength >= 80) return 'Strong';
      if (strength >= 50) return 'Moderate';
      return 'Weak';
    };

    const strengthLabel = getStrengthLabel();
    const strengthColor = strength >= 80 ? colors.success : strength >= 50 ? colors.warning : colors.error;

    return (
      <div 
        className="mt-2" 
        id={strengthId.current}
        role="progressbar"
        aria-valuenow={strength}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Password strength: ${strengthLabel}`}
      >
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">Password Strength</span>
          <span className="text-sm font-medium" style={{ color: strengthColor }}>
            {strengthLabel}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded h-2">
          <div
            className="h-2 rounded transition-all duration-300"
            style={{
              width: `${strength}%`,
              backgroundColor: strengthColor
            }}
          />
        </div>
      </div>
    );
  };

  /**
   * Renders password requirements checklist
   */
  const renderRequirements = () => {
    if (!showRequirements) return null;

    const requirements = [
      { key: 'minLength', label: `At least ${PASSWORD_RULES.minLength} characters` },
      { key: 'maxLength', label: `No more than ${PASSWORD_RULES.maxLength} characters` },
      { key: 'hasUppercase', label: 'At least one uppercase letter' },
      { key: 'hasNumber', label: 'At least one number' },
      { key: 'hasSpecialChar', label: 'At least one special character' }
    ];

    return (
      <div 
        className="mt-2 text-sm" 
        id={requirementsId.current}
        role="list"
        aria-label="Password requirements"
      >
        {requirements.map(({ key, label }) => (
          <div 
            key={key}
            role="listitem"
            className={classnames('flex items-center gap-2', {
              'text-success': validationState[key],
              'text-textSecondary': !validationState[key]
            })}
          >
            <span aria-hidden="true">
              {validationState[key] ? '✓' : '○'}
            </span>
            {label}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="password-input-container">
      <div className="relative">
        <Input
          ref={inputRef}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={handlePasswordChange}
          error={error}
          label={label}
          placeholder={placeholder}
          aria-describedby={`${strengthId.current} ${requirementsId.current}`}
          autoComplete="new-password"
          pattern={PASSWORD_RULES.specialCharRegex.source}
        />
        
        {allowVisibilityToggle && (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className={classnames(
              'absolute right-3 top-1/2 transform -translate-y-1/2',
              'p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2',
              'focus:ring-primary focus:ring-opacity-50'
            )}
            aria-label={`${showPassword ? 'Hide' : 'Show'} password`}
            aria-pressed={showPassword}
          >
            {showPassword ? (
              <EyeSlashIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />
            ) : (
              <EyeIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {renderStrengthIndicator()}
      {renderRequirements()}
    </div>
  );
};

export default PasswordInput;