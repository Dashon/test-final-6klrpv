import React, { useCallback, useRef, useState } from 'react';
import classnames from 'classnames';
import { colors, typography } from '../../constants/theme';
import { VALIDATION_MESSAGES } from '../../constants/validation';

// Type for supported input modes
type InputMode = 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';

export interface InputProps {
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search';
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  inputMode?: InputMode;
  'aria-describedby'?: string;
  id?: string;
  name?: string;
  maxLength?: number;
  pattern?: string;
}

/**
 * A reusable form input component with comprehensive accessibility support,
 * validation states, and consistent styling across the application.
 *
 * @component
 * @example
 * ```tsx
 * <Input
 *   label="Email Address"
 *   type="email"
 *   value={email}
 *   onChange={handleEmailChange}
 *   required
 *   error={emailError}
 * />
 * ```
 */
export const Input: React.FC<InputProps> = ({
  type = 'text',
  value,
  onChange,
  error,
  label,
  placeholder,
  disabled = false,
  required = false,
  autoComplete,
  inputMode,
  'aria-describedby': ariaDescribedBy,
  id,
  name,
  maxLength,
  pattern,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = `${id || name}-error`;
  const labelId = `${id || name}-label`;

  // Debounced change handler to prevent excessive re-renders
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      event.preventDefault();
      const newValue = event.target.value;
      
      // Validate required field
      if (required && !newValue) {
        onChange('');
        return;
      }

      onChange(newValue);
    },
    [onChange, required]
  );

  // Handle keyboard interactions for accessibility
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && inputRef.current) {
        inputRef.current.blur();
      }
    },
    []
  );

  // Focus management handlers
  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

  return (
    <div
      className={classnames('input-container relative mb-4', {
        'opacity-50 cursor-not-allowed': disabled,
      })}
    >
      {label && (
        <label
          htmlFor={id || name}
          id={labelId}
          className={classnames(
            'input-label block mb-2 text-sm font-medium',
            {
              'text-error': error,
              'text-textPrimary': !error,
            }
          )}
        >
          {label}
          {required && <span className="text-error ml-1" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type={type}
          id={id || name}
          name={name}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          maxLength={maxLength}
          pattern={pattern}
          aria-invalid={!!error}
          aria-required={required}
          aria-describedby={classnames(errorId, ariaDescribedBy)}
          className={classnames(
            'input-field w-full px-4 py-2 rounded border transition-colors duration-200',
            'focus:outline-none focus:ring-2',
            {
              'border-error focus:border-error focus:ring-error/20': error,
              'border-gray-300 focus:border-focus focus:ring-focus/20': !error && isFocused,
              'border-gray-300 hover:border-gray-400': !error && !isFocused,
              'bg-gray-100': disabled,
            }
          )}
          style={{
            fontFamily: typography.fontFamilyUI,
            fontSize: typography.baseFontSize,
          }}
        />

        {error && (
          <div
            id={errorId}
            className="input-error-message text-error text-sm mt-1"
            role="alert"
          >
            {error}
          </div>
        )}

        {required && !error && (
          <div className="sr-only" id={`${id || name}-required-msg`}>
            {VALIDATION_MESSAGES.required}
          </div>
        )}
      </div>
    </div>
  );
};

export default Input;