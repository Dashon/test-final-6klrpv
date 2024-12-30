import React from 'react'; // v18.x
import styled from '@emotion/styled'; // v11.x
import { colors, typography, transitions } from '../../../constants/theme';

// Button Props Interface
interface ButtonProps {
  /** Content to be rendered inside the button */
  children: React.ReactNode;
  /** Visual style variant of the button */
  variant?: 'primary' | 'secondary' | 'text';
  /** Size variant affecting padding and height */
  size?: 'small' | 'medium' | 'large';
  /** Whether the button should take full width of its container */
  fullWidth?: boolean;
  /** Disabled state of the button */
  disabled?: boolean;
  /** Loading state showing a spinner */
  loading?: boolean;
  /** Click handler function */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** HTML button type attribute */
  type?: 'button' | 'submit' | 'reset';
  /** Accessibility label */
  ariaLabel?: string;
  /** Optional CSS class name */
  className?: string;
  /** Tab index for keyboard navigation */
  tabIndex?: number;
}

// Helper function to determine button height based on size
const getSizeHeight = (size: ButtonProps['size'] = 'medium'): string => {
  switch (size) {
    case 'small':
      return '32px';
    case 'large':
      return '48px';
    default:
      return '40px';
  }
};

// Helper function to determine button padding based on size
const getSizePadding = (size: ButtonProps['size'] = 'medium'): string => {
  switch (size) {
    case 'small':
      return '0 16px';
    case 'large':
      return '0 32px';
    default:
      return '0 24px';
  }
};

// Styled button component with comprehensive styles
const StyledButton = styled.button<Omit<ButtonProps, 'children' | 'onClick' | 'type' | 'ariaLabel'>>`
  /* Base styles */
  font-family: ${typography.fontFamilyUI};
  font-weight: ${typography.fontWeightBold};
  font-size: ${props => props.size === 'small' ? '14px' : '16px'};
  line-height: 1.5;
  border-radius: 4px;
  border: none;
  cursor: ${props => (props.disabled || props.loading) ? 'not-allowed' : 'pointer'};
  transition: all ${transitions.fast};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  position: relative;
  text-decoration: none;
  outline: none;
  min-height: ${props => getSizeHeight(props.size)};
  padding: ${props => getSizePadding(props.size)};
  width: ${props => props.fullWidth ? '100%' : 'auto'};
  opacity: ${props => (props.disabled || props.loading) ? 0.5 : 1};

  /* Variant styles */
  ${props => {
    switch (props.variant) {
      case 'secondary':
        return `
          background-color: ${colors.secondary};
          color: white;
          &:hover:not(:disabled) {
            background-color: ${colors.secondaryLight};
          }
        `;
      case 'text':
        return `
          background-color: transparent;
          color: ${colors.textPrimary};
          &:hover:not(:disabled) {
            background-color: rgba(0, 0, 0, 0.04);
          }
        `;
      default: // primary
        return `
          background-color: ${colors.primary};
          color: white;
          &:hover:not(:disabled) {
            background-color: ${colors.primaryLight};
          }
        `;
    }
  }}

  /* Focus styles */
  &:focus-visible {
    box-shadow: 0 0 0 2px ${colors.primary};
    outline: none;
  }

  /* Active styles */
  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  /* RTL Support */
  [dir="rtl"] & {
    direction: rtl;
  }

  /* Loading spinner styles */
  ${props => props.loading && `
    &::after {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      border: 2px solid currentColor;
      border-radius: 50%;
      border-right-color: transparent;
      animation: spin 0.75s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `}
`;

/**
 * Button component implementing the design system's button styles and behaviors
 * with comprehensive accessibility features and loading states.
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  ariaLabel,
  className,
  tabIndex,
  ...props
}) => {
  return (
    <StyledButton
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled || loading}
      loading={loading}
      onClick={onClick}
      type={type}
      aria-label={ariaLabel}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      className={className}
      tabIndex={tabIndex}
      {...props}
    >
      {loading ? <span className="sr-only">Loading...</span> : children}
    </StyledButton>
  );
};

export default Button;