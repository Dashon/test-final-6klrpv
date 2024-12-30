/**
 * Card Component Test Suite
 * Comprehensive tests for Card component functionality, styling, and accessibility
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, describe, it, beforeEach, afterEach } from '@jest/globals';
import { Card } from './Card';
import { colors, shadows, spacing } from '../../constants/theme';
import type { ResponsiveConfig } from '../../utils/responsive';

// Mock matchMedia for responsive testing
window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: () => {},
    removeListener: () => {}
  };
};

// Helper function to render Card with default test props
const renderCard = (props: Partial<React.ComponentProps<typeof Card>> = {}) => {
  const defaultProps = {
    children: <div data-testid="card-content">Test Content</div>,
    elevation: 1,
    padding: spacing.md,
    role: 'region',
  };

  return render(<Card {...defaultProps} {...props} />);
};

// Helper to setup responsive testing environment
const setupResponsiveTest = (viewport: { width: number; height: number }) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: viewport.width,
  });
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: viewport.height,
  });

  window.dispatchEvent(new Event('resize'));
};

describe('Card Component', () => {
  // Cleanup after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering Tests', () => {
    it('should render children content correctly', () => {
      renderCard();
      expect(screen.getByTestId('card-content')).toBeInTheDocument();
      expect(screen.getByTestId('card-content')).toHaveTextContent('Test Content');
    });

    it('should apply custom className when provided', () => {
      const customClass = 'custom-card';
      renderCard({ className: customClass });
      const card = screen.getByRole('region');
      expect(card).toHaveClass(customClass);
    });

    it('should render with default props when none provided', () => {
      renderCard({});
      const card = screen.getByRole('region');
      expect(card).toHaveStyle({
        backgroundColor: colors.backgroundPrimary,
        borderRadius: '8px',
        padding: `${spacing.md}px`,
      });
    });

    it('should have correct accessibility attributes', () => {
      renderCard({ role: 'article' });
      expect(screen.getByRole('article')).toBeInTheDocument();
    });
  });

  describe('Style Tests', () => {
    it('should apply correct elevation shadow', () => {
      const { rerender } = renderCard({ elevation: 1 });
      let card = screen.getByRole('region');
      expect(card).toHaveStyle(`box-shadow: ${shadows.sm}`);

      rerender(<Card elevation={3}>Test Content</Card>);
      card = screen.getByRole('region');
      expect(card).toHaveStyle(`box-shadow: ${shadows.lg}`);
    });

    it('should apply static padding correctly', () => {
      renderCard({ padding: spacing.lg });
      const card = screen.getByRole('region');
      expect(card).toHaveStyle(`padding: ${spacing.lg}px`);
    });

    it('should handle responsive padding configuration', () => {
      const responsivePadding: ResponsiveConfig<number> = {
        mobile: spacing.sm,
        tablet: spacing.md,
        desktop: spacing.lg,
      };

      renderCard({ padding: responsivePadding });
      
      // Test mobile viewport
      setupResponsiveTest({ width: 320, height: 568 });
      expect(screen.getByRole('region')).toHaveStyle(`padding: ${spacing.sm}px`);

      // Test desktop viewport
      setupResponsiveTest({ width: 1024, height: 768 });
      expect(screen.getByRole('region')).toHaveStyle(`padding: ${spacing.lg}px`);
    });
  });

  describe('Interaction Tests', () => {
    it('should handle click events when onClick provided', async () => {
      const handleClick = jest.fn();
      renderCard({ onClick: handleClick });
      
      const card = screen.getByRole('region');
      await userEvent.click(card);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should have correct cursor style based on onClick prop', () => {
      const { rerender } = renderCard({});
      let card = screen.getByRole('region');
      expect(card).toHaveStyle('cursor: default');

      rerender(<Card onClick={() => {}}>Test Content</Card>);
      card = screen.getByRole('region');
      expect(card).toHaveStyle('cursor: pointer');
    });

    it('should have correct focus handling when interactive', async () => {
      renderCard({ onClick: () => {} });
      const card = screen.getByRole('region');
      
      expect(card).toHaveAttribute('tabIndex', '0');
      
      await userEvent.tab();
      expect(card).toHaveFocus();
    });
  });

  describe('Accessibility Tests', () => {
    it('should have appropriate ARIA attributes', () => {
      renderCard({ role: 'article', 'aria-label': 'Test Card' });
      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', 'Test Card');
    });

    it('should maintain focus visibility', async () => {
      renderCard({ onClick: () => {} });
      const card = screen.getByRole('region');
      
      await userEvent.tab();
      expect(card).toHaveStyleRule('outline', `2px solid ${colors.primary}`, {
        modifier: ':focus-visible'
      });
    });

    it('should support high contrast mode', () => {
      renderCard({});
      const card = screen.getByRole('region');
      
      expect(card).toHaveStyleRule('border', '1px solid ButtonText', {
        media: '(forced-colors: active)'
      });
    });
  });

  describe('Error Handling', () => {
    it('should clamp elevation values to valid range', () => {
      const { rerender } = renderCard({ elevation: -1 });
      let card = screen.getByRole('region');
      expect(card).toHaveStyle(`box-shadow: ${shadows.sm}`);

      rerender(<Card elevation={5}>Test Content</Card>);
      card = screen.getByRole('region');
      expect(card).toHaveStyle(`box-shadow: ${shadows.lg}`);
    });

    it('should handle missing responsive breakpoint values', () => {
      const responsivePadding: ResponsiveConfig<number> = {
        desktop: spacing.lg,
      };

      renderCard({ padding: responsivePadding });
      
      // Test mobile viewport with missing mobile value
      setupResponsiveTest({ width: 320, height: 568 });
      expect(screen.getByRole('region')).toHaveStyle(`padding: ${spacing.lg}px`);
    });
  });
});