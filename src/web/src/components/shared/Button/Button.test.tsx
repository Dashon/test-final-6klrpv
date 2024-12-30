import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, describe, it, beforeEach, afterEach } from '@jest/globals';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';
import Button from './Button';
import { ThemeProvider } from '@emotion/react';
import theme from '../../../constants/theme';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock ResizeObserver for responsive tests
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock;

// Helper function to render button with theme
const renderButton = (props = {}, options = {}) => {
  const utils = render(
    <ThemeProvider theme={theme}>
      <Button {...props} />
    </ThemeProvider>,
    options
  );
  return {
    ...utils,
    button: screen.getByRole('button'),
  };
};

describe('Button Component', () => {
  // Mock click handler
  const mockOnClick = jest.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Visual Styling', () => {
    it('renders with default primary variant styling', () => {
      const { button } = renderButton({ children: 'Click me' });
      expect(button).toHaveStyle({
        backgroundColor: theme.colors.primary,
        color: 'white',
      });
    });

    it('applies correct styling for secondary variant', () => {
      const { button } = renderButton({ 
        children: 'Click me',
        variant: 'secondary'
      });
      expect(button).toHaveStyle({
        backgroundColor: theme.colors.secondary,
        color: 'white',
      });
    });

    it('applies correct styling for text variant', () => {
      const { button } = renderButton({ 
        children: 'Click me',
        variant: 'text'
      });
      expect(button).toHaveStyle({
        backgroundColor: 'transparent',
        color: theme.colors.textPrimary,
      });
    });

    it('applies correct size dimensions', () => {
      const sizes = {
        small: '32px',
        medium: '40px',
        large: '48px',
      };

      Object.entries(sizes).forEach(([size, height]) => {
        const { button, rerender } = renderButton({ 
          children: 'Click me',
          size: size as 'small' | 'medium' | 'large'
        });
        expect(button).toHaveStyle({ minHeight: height });
        rerender(
          <ThemeProvider theme={theme}>
            <Button size={size as 'small' | 'medium' | 'large'}>Click me</Button>
          </ThemeProvider>
        );
      });
    });

    it('applies full width styling when fullWidth prop is true', () => {
      const { button } = renderButton({ 
        children: 'Click me',
        fullWidth: true
      });
      expect(button).toHaveStyle({ width: '100%' });
    });
  });

  describe('Interaction States', () => {
    it('handles click events when enabled', async () => {
      const { button } = renderButton({ 
        children: 'Click me',
        onClick: mockOnClick
      });
      await userEvent.click(button);
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('prevents click events when disabled', async () => {
      const { button } = renderButton({ 
        children: 'Click me',
        onClick: mockOnClick,
        disabled: true
      });
      await userEvent.click(button);
      expect(mockOnClick).not.toHaveBeenCalled();
      expect(button).toHaveStyle({ opacity: '0.5' });
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('displays loading state correctly', () => {
      const { button } = renderButton({ 
        children: 'Click me',
        loading: true
      });
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(button).toHaveStyle({ opacity: '0.5' });
    });

    it('maintains focus styles when focused', async () => {
      const { button } = renderButton({ children: 'Click me' });
      button.focus();
      expect(button).toHaveFocus();
      // Note: CSS pseudo-classes like :focus-visible cannot be directly tested
      // Focus ring visibility is handled by the browser
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG accessibility guidelines', async () => {
      const { container } = renderButton({ 
        children: 'Click me',
        ariaLabel: 'Action button'
      });
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', () => {
      const { button } = renderButton({ 
        children: 'Click me',
        tabIndex: 0
      });
      expect(button).toHaveAttribute('tabIndex', '0');
    });

    it('provides appropriate ARIA attributes', () => {
      const { button } = renderButton({ 
        children: 'Click me',
        ariaLabel: 'Action button',
        disabled: true
      });
      expect(button).toHaveAttribute('aria-label', 'Action button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('maintains proper contrast ratio for text variants', () => {
      const { button } = renderButton({ 
        children: 'Click me',
        variant: 'text'
      });
      // Note: Actual contrast checking would require additional tools
      expect(button).toHaveStyle({ color: theme.colors.textPrimary });
    });
  });

  describe('Responsive Behavior', () => {
    it('adapts font size based on button size', () => {
      const { button: smallButton } = renderButton({ 
        children: 'Click me',
        size: 'small'
      });
      expect(smallButton).toHaveStyle({ fontSize: '14px' });

      const { button: mediumButton } = renderButton({ 
        children: 'Click me',
        size: 'medium'
      });
      expect(mediumButton).toHaveStyle({ fontSize: '16px' });
    });

    it('supports RTL text direction', () => {
      const { container } = render(
        <div dir="rtl">
          <ThemeProvider theme={theme}>
            <Button>Click me</Button>
          </ThemeProvider>
        </div>
      );
      const button = container.querySelector('button');
      expect(button).toHaveStyle({ direction: 'rtl' });
    });
  });

  describe('Props Validation', () => {
    it('accepts custom className', () => {
      const { button } = renderButton({ 
        children: 'Click me',
        className: 'custom-class'
      });
      expect(button).toHaveClass('custom-class');
    });

    it('handles different button types', () => {
      const { button } = renderButton({ 
        children: 'Click me',
        type: 'submit'
      });
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('renders children correctly', () => {
      const { button } = renderButton({ 
        children: <span data-testid="child">Child Content</span>
      });
      expect(within(button).getByTestId('child')).toBeInTheDocument();
    });
  });
});