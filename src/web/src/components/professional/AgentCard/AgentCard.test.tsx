import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { axe, toHaveNoViolations } from 'jest-axe';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '@mui/material';
import AgentCard from './AgentCard';
import { Agent, AgentStatus } from '../../../types/professional';
import theme from '../../../constants/theme';
import i18n from '../../../i18n'; // Assuming i18n configuration exists

// Add jest-axe matcher
expect.extend(toHaveNoViolations);

// Mock agent data factory
const createMockAgent = (overrides?: Partial<Agent>): Agent => ({
  id: 'test-agent-1',
  professionalId: 'prof-1',
  name: 'Test Agent',
  description: 'A test AI agent for travel planning',
  status: AgentStatus.PUBLISHED,
  pricing: {
    basePrice: 99.99,
    currency: 'USD',
    subscriptionEnabled: true,
    subscriptionPrice: 49.99,
    customPricing: {}
  },
  analytics: {
    totalSessions: 100,
    averageRating: 4.5,
    totalRevenue: 5000,
    activeSubscribers: 25,
    metrics: {}
  },
  capabilities: {
    languages: ['en', 'es'],
    specialties: ['adventure', 'luxury'],
    availableHours: {},
    maxConcurrentChats: 5,
    supportedFeatures: new Set(['chat', 'booking'])
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  settings: {},
  ...overrides
});

// Helper to render with providers
const renderWithProviders = (ui: React.ReactElement, options = {}) => {
  return render(
    <ThemeProvider theme={theme}>
      <I18nextProvider i18n={i18n}>
        {ui}
      </I18nextProvider>
    </ThemeProvider>,
    options
  );
};

describe('AgentCard Component', () => {
  describe('Rendering', () => {
    it('renders basic agent information correctly', () => {
      const mockAgent = createMockAgent();
      renderWithProviders(<AgentCard agent={mockAgent} />);

      expect(screen.getByText(mockAgent.name)).toBeInTheDocument();
      expect(screen.getByText(mockAgent.description)).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Published');
    });

    it('formats pricing information correctly', () => {
      const mockAgent = createMockAgent();
      renderWithProviders(<AgentCard agent={mockAgent} />);

      const pricingSection = screen.getByText(/from/i).closest('div');
      expect(pricingSection).toHaveTextContent('$99.99');
      expect(pricingSection).toHaveTextContent('$49.99');
      expect(pricingSection).toHaveTextContent(/per month/i);
    });

    it('renders analytics section when showAnalytics is true', () => {
      const mockAgent = createMockAgent();
      renderWithProviders(<AgentCard agent={mockAgent} showAnalytics />);

      const analyticsSection = screen.getByRole('group', { name: /analytics/i });
      expect(analyticsSection).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument(); // totalSessions
      expect(screen.getByText('4.5')).toBeInTheDocument(); // averageRating
      expect(screen.getByText('$5,000')).toBeInTheDocument(); // totalRevenue
      expect(screen.getByText('25')).toBeInTheDocument(); // activeSubscribers
    });

    it('handles different agent statuses with correct styling', () => {
      const statuses = [
        { status: AgentStatus.PUBLISHED, expectedColor: theme.colors.success },
        { status: AgentStatus.DRAFT, expectedColor: theme.colors.warning },
        { status: AgentStatus.ARCHIVED, expectedColor: theme.colors.textSecondary }
      ];

      statuses.forEach(({ status, expectedColor }) => {
        const mockAgent = createMockAgent({ status });
        const { container } = renderWithProviders(<AgentCard agent={mockAgent} />);
        
        const statusElement = screen.getByRole('status');
        expect(statusElement).toHaveStyle(`background-color: ${expectedColor}`);
      });
    });
  });

  describe('Interactions', () => {
    it('calls onClick handler when clicked', async () => {
      const handleClick = jest.fn();
      const mockAgent = createMockAgent();
      
      renderWithProviders(
        <AgentCard agent={mockAgent} onClick={handleClick} />
      );

      await userEvent.click(screen.getByRole('article'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('supports keyboard navigation', async () => {
      const handleClick = jest.fn();
      const mockAgent = createMockAgent();
      
      renderWithProviders(
        <AgentCard agent={mockAgent} onClick={handleClick} />
      );

      const card = screen.getByRole('article');
      card.focus();
      expect(card).toHaveFocus();

      await userEvent.keyboard('{enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG accessibility guidelines', async () => {
      const mockAgent = createMockAgent();
      const { container } = renderWithProviders(<AgentCard agent={mockAgent} />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides appropriate ARIA labels', () => {
      const mockAgent = createMockAgent();
      renderWithProviders(<AgentCard agent={mockAgent} showAnalytics />);

      expect(screen.getByRole('status')).toHaveAttribute('aria-label');
      expect(screen.getByRole('group')).toHaveAttribute('aria-label');
    });
  });

  describe('Internationalization', () => {
    beforeEach(() => {
      // Reset i18n instance before each test
      i18n.changeLanguage('en');
    });

    it('displays translated content correctly', () => {
      const mockAgent = createMockAgent();
      renderWithProviders(<AgentCard agent={mockAgent} />);

      expect(screen.getByText(/from/i)).toBeInTheDocument();
      expect(screen.getByText(/per month/i)).toBeInTheDocument();
    });

    it('formats currency according to locale', () => {
      const mockAgent = createMockAgent();
      
      // Test English locale
      renderWithProviders(<AgentCard agent={mockAgent} />);
      expect(screen.getByText(/\$99\.99/)).toBeInTheDocument();

      // Test Euro locale
      i18n.changeLanguage('de');
      renderWithProviders(<AgentCard agent={mockAgent} />);
      expect(screen.getByText(/99,99\s*\$/)).toBeInTheDocument();
    });

    it('translates status text correctly', () => {
      const mockAgent = createMockAgent({ status: AgentStatus.PUBLISHED });
      
      // Test English
      renderWithProviders(<AgentCard agent={mockAgent} />);
      expect(screen.getByRole('status')).toHaveTextContent(/published/i);

      // Test German
      i18n.changeLanguage('de');
      renderWithProviders(<AgentCard agent={mockAgent} />);
      expect(screen.getByRole('status')).toHaveTextContent(/veröffentlicht/i);
    });
  });

  describe('Edge Cases', () => {
    it('handles missing analytics data gracefully', () => {
      const mockAgent = createMockAgent({
        analytics: {
          totalSessions: 0,
          averageRating: 0,
          totalRevenue: 0,
          activeSubscribers: 0,
          metrics: {}
        }
      });

      renderWithProviders(<AgentCard agent={mockAgent} showAnalytics />);
      
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('0.0')).toBeInTheDocument();
      expect(screen.getByText('$0')).toBeInTheDocument();
    });

    it('handles long text content with ellipsis', () => {
      const longText = 'A'.repeat(300);
      const mockAgent = createMockAgent({
        name: longText,
        description: longText
      });

      const { container } = renderWithProviders(<AgentCard agent={mockAgent} />);
      
      const nameElement = screen.getByRole('heading');
      const descriptionElement = container.querySelector('p');

      expect(nameElement).toHaveStyle('text-overflow: ellipsis');
      expect(descriptionElement).toHaveStyle('-webkit-line-clamp: 3');
    });
  });
});