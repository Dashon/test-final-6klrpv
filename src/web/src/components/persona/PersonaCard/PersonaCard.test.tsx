/**
 * PersonaCard Component Test Suite
 * Version: 1.0.0
 * 
 * Comprehensive test coverage for the PersonaCard component including:
 * - Rendering and styling
 * - User interactions
 * - Accessibility compliance
 * - Learning progress visualization
 * - State management
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from '@emotion/react';
import PersonaCard, { PersonaCardProps } from './PersonaCard';
import { Persona, PersonaType } from '../../../types/persona';
import theme from '../../../constants/theme';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock usePersona hook
jest.mock('../../../hooks/usePersona', () => ({
  usePersona: () => ({
    activatePersona: jest.fn().mockResolvedValue({ success: true }),
    loadingState: { activating: false }
  })
}));

describe('PersonaCard Component', () => {
  // Mock data setup
  const mockPersona: Persona = {
    id: 'test-persona-1',
    name: 'Explorer',
    type: PersonaType.EXPLORER,
    isActive: false,
    state: {
      adaptationLevel: 3,
      lastInteraction: new Date('2023-01-01'),
      learningProgress: 75,
      interactionCount: 42,
      confidenceScore: 0.8,
      specializations: ['Travel Planning']
    },
    userId: 'user-1',
    isPaid: true,
    preferences: {
      destinations: ['Paris'],
      activities: ['Sightseeing'],
      budget: { min: 1000, max: 5000, currency: 'USD' },
      travelStyle: ['BALANCED'],
      accommodation: ['HOTEL']
    },
    modelVersion: '1.0.0',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  };

  // Default props
  const defaultProps: PersonaCardProps = {
    persona: mockPersona,
    isActive: false,
    onActivate: jest.fn(),
    testId: 'persona-card'
  };

  // Custom render function with theme provider
  const renderWithTheme = (props: Partial<PersonaCardProps> = {}) => {
    return render(
      <ThemeProvider theme={theme}>
        <PersonaCard {...defaultProps} {...props} />
      </ThemeProvider>
    );
  };

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      renderWithTheme();
      expect(screen.getByTestId('persona-card')).toBeInTheDocument();
    });

    it('displays correct persona information', () => {
      renderWithTheme();
      expect(screen.getByText(mockPersona.name)).toBeInTheDocument();
      expect(screen.getByText(mockPersona.type)).toBeInTheDocument();
    });

    it('shows proper learning progress visualization', () => {
      renderWithTheme();
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      expect(screen.getByText('Learning Progress: 75%')).toBeInTheDocument();
    });

    it('applies active state styles correctly', () => {
      renderWithTheme({ isActive: true });
      const card = screen.getByTestId('persona-card');
      expect(card).toHaveStyle(`background-color: ${theme.colors.primary}10`);
      expect(card).toHaveStyle(`border: 2px solid ${theme.colors.primary}`);
    });

    it('handles RTL layout correctly', () => {
      render(
        <ThemeProvider theme={theme}>
          <div dir="rtl">
            <PersonaCard {...defaultProps} />
          </div>
        </ThemeProvider>
      );
      const card = screen.getByTestId('persona-card');
      expect(card).toHaveStyle('transform-origin: center');
    });
  });

  describe('Interactions', () => {
    it('handles click activation correctly', async () => {
      const onActivate = jest.fn();
      renderWithTheme({ onActivate });

      const card = screen.getByTestId('persona-card');
      await userEvent.click(card);

      await waitFor(() => {
        expect(onActivate).toHaveBeenCalledWith(mockPersona.id);
      });
    });

    it('prevents activation when already loading', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error logging
      
      const onActivate = jest.fn();
      renderWithTheme({ onActivate });
      
      // Mock loading state
      jest.spyOn(require('../../../hooks/usePersona'), 'usePersona').mockImplementation(() => ({
        activatePersona: jest.fn(),
        loadingState: { activating: true }
      }));

      const card = screen.getByTestId('persona-card');
      await userEvent.click(card);

      expect(onActivate).not.toHaveBeenCalled();
    });

    it('handles keyboard navigation correctly', async () => {
      const onActivate = jest.fn();
      renderWithTheme({ onActivate });

      const card = screen.getByTestId('persona-card');
      card.focus();
      expect(card).toHaveFocus();

      fireEvent.keyDown(card, { key: 'Enter' });
      await waitFor(() => {
        expect(onActivate).toHaveBeenCalledWith(mockPersona.id);
      });
    });
  });

  describe('Learning Progress', () => {
    it('displays correct progress percentage', () => {
      renderWithTheme();
      const progressText = screen.getByText(/Learning Progress:/);
      expect(progressText).toHaveTextContent('75%');
    });

    it('shows loading state during activation', () => {
      jest.spyOn(require('../../../hooks/usePersona'), 'usePersona').mockImplementation(() => ({
        activatePersona: jest.fn(),
        loadingState: { activating: true }
      }));

      renderWithTheme();
      expect(screen.getByText(/\(Activating\.\.\.\)/)).toBeInTheDocument();
    });

    it('updates progress bar attributes correctly', () => {
      renderWithTheme();
      const progressBar = screen.getByRole('progressbar');
      
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG accessibility guidelines', async () => {
      const { container } = renderWithTheme();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper ARIA labels and roles', () => {
      renderWithTheme();
      const card = screen.getByTestId('persona-card');
      
      expect(card).toHaveAttribute('role', 'button');
      expect(card).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('maintains focus visibility', () => {
      renderWithTheme();
      const card = screen.getByTestId('persona-card');
      
      card.focus();
      expect(card).toHaveStyle(`outline: 2px solid ${theme.colors.primary}`);
    });
  });

  describe('Error Handling', () => {
    it('handles activation errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      jest.spyOn(require('../../../hooks/usePersona'), 'usePersona').mockImplementation(() => ({
        activatePersona: jest.fn().mockRejectedValue(new Error('Activation failed')),
        loadingState: { activating: false }
      }));

      renderWithTheme();
      const card = screen.getByTestId('persona-card');
      await userEvent.click(card);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to activate persona:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});