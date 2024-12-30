/**
 * Card Component
 * A reusable card container with configurable elevation, padding, and interactive states
 * Implements responsive behavior and accessibility features
 * @version 1.0.0
 */

import React from 'react';
import styled from '@emotion/styled';
import { colors, shadows, spacing, transitions } from '../../constants/theme';
import { getResponsiveValue, ResponsiveConfig } from '../../utils/responsive';

/**
 * Props interface for the Card component
 */
export interface CardProps {
  /** Child elements to render inside the card */
  children: React.ReactNode;
  /** Shadow elevation level (1-3) affecting z-index appearance */
  elevation?: 1 | 2 | 3;
  /** Custom padding value or responsive configuration object */
  padding?: number | ResponsiveConfig<number>;
  /** Additional CSS classes for custom styling */
  className?: string;
  /** Optional click handler making the card interactive */
  onClick?: () => void;
  /** ARIA role for accessibility */
  role?: string;
}

/**
 * Calculates the appropriate shadow based on elevation level
 * @param elevation - Desired elevation level (1-3)
 */
const getElevation = (elevation: number = 1): keyof typeof shadows => {
  switch (elevation) {
    case 1:
      return 'sm';
    case 2:
      return 'md';
    case 3:
      return 'lg';
    default:
      return 'sm';
  }
};

/**
 * Calculates padding based on responsive configuration or direct value
 * @param padding - Padding value or responsive config
 */
const getResponsivePadding = (
  padding: number | ResponsiveConfig<number> = spacing.md
): string | number => {
  if (typeof padding === 'number') {
    return `${padding}px`;
  }

  return `${getResponsiveValue(padding)}px`;
};

/**
 * Styled container component implementing card visual appearance
 */
const StyledCard = styled.div<{
  elevation?: number;
  padding?: number | ResponsiveConfig<number>;
  onClick?: () => void;
}>`
  background-color: ${colors.backgroundPrimary};
  border-radius: 8px;
  box-shadow: ${props => shadows[getElevation(props.elevation)]};
  padding: ${props => getResponsivePadding(props.padding)};
  transition: all ${transitions.default} ${transitions.easeInOut};
  position: relative;
  overflow: hidden;
  
  /* Interactive states */
  cursor: ${props => (props.onClick ? 'pointer' : 'default')};
  
  ${props => props.onClick && `
    &:hover {
      box-shadow: ${shadows[getElevation((props.elevation || 1) + 1)]};
      transform: translateY(-2px);
    }
    
    &:active {
      transform: translateY(0);
    }
  `}

  /* Focus state for accessibility */
  &:focus-visible {
    outline: 2px solid ${colors.primary};
    outline-offset: 2px;
  }

  /* High contrast mode support */
  @media (forced-colors: active) {
    border: 1px solid ButtonText;
  }
`;

/**
 * Card component providing a consistent container with elevation and padding
 * @param props - CardProps
 */
export const Card: React.FC<CardProps> = ({
  children,
  elevation = 1,
  padding = spacing.md,
  className,
  onClick,
  role = 'region',
  ...rest
}) => {
  // Validate elevation range
  const validatedElevation = Math.max(1, Math.min(3, elevation));

  return (
    <StyledCard
      elevation={validatedElevation}
      padding={padding}
      className={className}
      onClick={onClick}
      role={role}
      tabIndex={onClick ? 0 : undefined}
      {...rest}
    >
      {children}
    </StyledCard>
  );
};

// Default export
export default Card;