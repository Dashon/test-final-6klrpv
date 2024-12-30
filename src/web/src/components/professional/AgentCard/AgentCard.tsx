/**
 * AgentCard Component
 * A reusable card component for displaying AI agent information in professional dashboards and marketplace
 * Implements white-label customization, accessibility, and internationalization
 * @version 1.0.0
 */

import React, { memo, useCallback } from 'react';
import styled from '@emotion/styled';
import { useTranslation } from 'react-i18next';
import Card from '../../shared/Card/Card';
import { Agent, AgentStatus } from '../../../types/professional';
import { colors, typography, spacing } from '../../../constants/theme';

// Props interface with comprehensive type safety
interface AgentCardProps {
  /** Agent data to display */
  agent: Agent;
  /** Optional click handler for card interaction */
  onClick?: () => void;
  /** Whether to show analytics section */
  showAnalytics?: boolean;
  /** Optional additional CSS classes for white-label styling */
  className?: string;
  /** Data test ID for testing purposes */
  testId?: string;
}

// Styled components with proper accessibility and responsive design
const AgentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${spacing.md}px;
  flex-wrap: wrap;
  gap: ${spacing.xs}px;
`;

const AgentName = styled.h3`
  font-family: ${typography.fontFamilyUI};
  font-size: ${typography.fontSizeH3};
  font-weight: ${typography.fontWeightBold};
  margin: 0;
  color: ${colors.textPrimary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const AgentStatus = styled.span<{ status: AgentStatus }>`
  padding: ${spacing.xxs}px ${spacing.xs}px;
  border-radius: 12px;
  font-size: ${typography.fontSizeSmall};
  font-weight: ${typography.fontWeightMedium};
  background-color: ${({ status }) => getStatusColor(status)};
  color: ${colors.backgroundPrimary};
  display: inline-flex;
  align-items: center;
  gap: ${spacing.xxs}px;
`;

const AgentDescription = styled.p`
  font-size: ${typography.fontSizeBody};
  color: ${colors.textSecondary};
  margin-bottom: ${spacing.md}px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const PricingSection = styled.div`
  margin-top: ${spacing.md}px;
  padding-top: ${spacing.md}px;
  border-top: 1px solid ${colors.backgroundSecondary};
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: ${spacing.xs}px;
`;

const AnalyticsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: ${spacing.md}px;
  margin-top: ${spacing.md}px;

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const MetricItem = styled.div`
  text-align: center;
`;

const MetricValue = styled.div`
  font-size: ${typography.fontSizeH3};
  font-weight: ${typography.fontWeightBold};
  color: ${colors.textPrimary};
`;

const MetricLabel = styled.div`
  font-size: ${typography.fontSizeSmall};
  color: ${colors.textSecondary};
  margin-top: ${spacing.xxs}px;
`;

// Helper function to get status color with proper contrast
const getStatusColor = (status: AgentStatus): string => {
  switch (status) {
    case AgentStatus.PUBLISHED:
      return colors.success;
    case AgentStatus.DRAFT:
      return colors.warning;
    case AgentStatus.ARCHIVED:
      return colors.textSecondary;
    default:
      return colors.textSecondary;
  }
};

// Helper function for currency formatting with localization
const formatCurrency = (amount: number, currency: string, locale: string = 'en-US'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * AgentCard component for displaying AI agent information
 * Implements accessibility features and responsive design
 */
export const AgentCard: React.FC<AgentCardProps> = memo(({
  agent,
  onClick,
  showAnalytics = false,
  className,
  testId = 'agent-card',
}) => {
  const { t } = useTranslation();
  
  const handleClick = useCallback(() => {
    if (onClick) onClick();
  }, [onClick]);

  return (
    <Card
      elevation={2}
      padding={spacing.md}
      onClick={handleClick}
      className={className}
      role="article"
      data-testid={testId}
    >
      <AgentHeader>
        <AgentName>{agent.name}</AgentName>
        <AgentStatus 
          status={agent.status}
          role="status"
          aria-label={t(`agent.status.${agent.status.toLowerCase()}`)}
        >
          {t(`agent.status.${agent.status.toLowerCase()}`)}
        </AgentStatus>
      </AgentHeader>

      <AgentDescription>{agent.description}</AgentDescription>

      <PricingSection>
        <div>
          <strong>{t('agent.pricing.from')}</strong>
          {' '}
          {formatCurrency(agent.pricing.basePrice, agent.pricing.currency)}
          {agent.pricing.subscriptionEnabled && (
            <span>
              {' / '}
              {formatCurrency(agent.pricing.subscriptionPrice, agent.pricing.currency)}
              {' '}
              {t('agent.pricing.perMonth')}
            </span>
          )}
        </div>
      </PricingSection>

      {showAnalytics && (
        <AnalyticsGrid role="group" aria-label={t('agent.analytics.title')}>
          <MetricItem>
            <MetricValue>{agent.analytics.totalSessions}</MetricValue>
            <MetricLabel>{t('agent.analytics.sessions')}</MetricLabel>
          </MetricItem>
          <MetricItem>
            <MetricValue>{agent.analytics.averageRating.toFixed(1)}</MetricValue>
            <MetricLabel>{t('agent.analytics.rating')}</MetricLabel>
          </MetricItem>
          <MetricItem>
            <MetricValue>
              {formatCurrency(agent.analytics.totalRevenue, agent.pricing.currency)}
            </MetricValue>
            <MetricLabel>{t('agent.analytics.revenue')}</MetricLabel>
          </MetricItem>
          <MetricItem>
            <MetricValue>{agent.analytics.activeSubscribers}</MetricValue>
            <MetricLabel>{t('agent.analytics.subscribers')}</MetricLabel>
          </MetricItem>
        </AnalyticsGrid>
      )}
    </Card>
  );
});

AgentCard.displayName = 'AgentCard';

export default AgentCard;