/**
 * PersonaCard Component
 * A reusable card component for displaying AI persona details with real-time learning progress
 * Implements design system specifications and accessibility features
 * @version 1.0.0
 */

import React, { useCallback, useEffect, memo } from 'react';
import styled from '@emotion/styled';
import { Persona, PersonaType } from '../../../types/persona';
import { Card } from '../../shared/Card/Card';
import { colors, typography, spacing, transitions } from '../../../constants/theme';
import { usePersona } from '../../../hooks/usePersona';

/**
 * Props interface for PersonaCard component
 */
export interface PersonaCardProps {
  /** Persona data object */
  persona: Persona;
  /** Whether this persona is currently active */
  isActive: boolean;
  /** Optional callback when persona is activated */
  onActivate?: (id: string) => void;
  /** Optional CSS class name */
  className?: string;
  /** Optional test ID for testing */
  testId?: string;
}

/**
 * Styled card component with interactive states
 */
const StyledCard = styled(Card)<{ isActive: boolean }>`
  cursor: pointer;
  transition: all ${transitions.default} ${transitions.easeInOut};
  transform-origin: center;
  background-color: ${props => props.isActive ? `${colors.primary}10` : colors.backgroundPrimary};
  border: 2px solid ${props => props.isActive ? colors.primary : 'transparent'};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.md};
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid ${colors.primary};
    outline-offset: 2px;
  }
`;

/**
 * Styled header section
 */
const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${spacing.md}px;
`;

/**
 * Styled persona name
 */
const PersonaName = styled.h3`
  font-family: ${typography.fontFamilyUI};
  font-size: ${typography.fontSizeH3};
  font-weight: ${typography.fontWeightBold};
  color: ${colors.textPrimary};
  margin: 0;
`;

/**
 * Styled type badge
 */
const TypeBadge = styled.span`
  padding: ${spacing.xxs}px ${spacing.xs}px;
  border-radius: 4px;
  background-color: ${colors.primaryLight}20;
  color: ${colors.primary};
  font-size: ${typography.fontSizeSmall};
  font-weight: ${typography.fontWeightMedium};
`;

/**
 * Styled progress container
 */
const ProgressContainer = styled.div`
  margin-top: ${spacing.md}px;
`;

/**
 * Styled progress bar
 */
const ProgressBar = styled.div<{ progress: number }>`
  height: 4px;
  background-color: ${colors.backgroundSecondary};
  border-radius: 2px;
  overflow: hidden;
  
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => props.progress}%;
    background-color: ${colors.primary};
    transition: width ${transitions.default} ${transitions.easeInOut};
  }
`;

/**
 * Styled status text
 */
const StatusText = styled.p`
  font-size: ${typography.fontSizeSmall};
  color: ${colors.textSecondary};
  margin: ${spacing.xs}px 0 0;
`;

/**
 * PersonaCard component for displaying AI persona details
 */
const PersonaCard: React.FC<PersonaCardProps> = ({
  persona,
  isActive,
  onActivate,
  className,
  testId
}) => {
  const { activatePersona, loadingState } = usePersona();

  /**
   * Handles persona activation with debouncing
   */
  const handleActivate = useCallback(async (event: React.MouseEvent) => {
    event.preventDefault();
    
    if (loadingState.activating) return;

    try {
      const result = await activatePersona(persona.id);
      if (result.success && onActivate) {
        onActivate(persona.id);
      }
    } catch (error) {
      console.error('Failed to activate persona:', error);
    }
  }, [persona.id, activatePersona, onActivate, loadingState.activating]);

  /**
   * Formats learning progress for display
   */
  const formatProgress = (progress: number): string => {
    return `${Math.round(progress)}%`;
  };

  return (
    <StyledCard
      elevation={isActive ? 2 : 1}
      padding={spacing.md}
      isActive={isActive}
      onClick={handleActivate}
      role="button"
      aria-pressed={isActive}
      data-testid={testId}
      className={className}
    >
      <Header>
        <PersonaName>{persona.name}</PersonaName>
        <TypeBadge>{persona.type}</TypeBadge>
      </Header>

      <ProgressContainer>
        <ProgressBar 
          progress={persona.state.learningProgress}
          role="progressbar"
          aria-valuenow={persona.state.learningProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
        <StatusText>
          Learning Progress: {formatProgress(persona.state.learningProgress)}
          {loadingState.activating && ' (Activating...)'}
        </StatusText>
      </ProgressContainer>
    </StyledCard>
  );
};

// Export memoized component for performance optimization
export default memo(PersonaCard);