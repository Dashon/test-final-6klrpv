import React from 'react';
import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { Toast, ToastProps } from './Toast';

// Helper function to render Toast with default props
const renderToast = (props: Partial<ToastProps> = {}) => {
  const defaultProps: ToastProps = {
    message: 'Test message',
    type: 'info',
    testId: 'toast',
    ...props,
  };
  return render(<Toast {...defaultProps} />);
};

// Helper to create matchMedia mock
const createMatchMedia = (matches: boolean) => {
  return () => ({
    matches,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    media: '',
  });
};

describe('Toast Component', () => {
  beforeAll(() => {
    // Mock window.matchMedia
    window.matchMedia = createMatchMedia(true);
    // Mock RAF and RIC for animations
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('Alert Types', () => {
    it('renders success toast with correct styling and icon', () => {
      renderToast({ type: 'success', message: 'Operation successful' });
      
      const toast = screen.getByTestId('toast');
      const icon = within(toast).getByText('✓');
      
      expect(toast).toHaveClass('toast-success');
      expect(icon).toBeInTheDocument();
      expect(toast).toHaveStyle({ backgroundColor: '#0F9D58' });
      expect(toast).toHaveAttribute('role', 'alert');
    });

    it('renders error toast with correct styling and icon', () => {
      renderToast({ type: 'error', message: 'Operation failed' });
      
      const toast = screen.getByTestId('toast');
      const icon = within(toast).getByText('✕');
      
      expect(toast).toHaveClass('toast-error');
      expect(icon).toBeInTheDocument();
      expect(toast).toHaveStyle({ backgroundColor: '#D93025' });
    });

    it('renders info toast with correct styling and icon', () => {
      renderToast({ type: 'info', message: 'Information message' });
      
      const toast = screen.getByTestId('toast');
      const icon = within(toast).getByText('ℹ');
      
      expect(toast).toHaveClass('toast-info');
      expect(icon).toBeInTheDocument();
      expect(toast).toHaveStyle({ backgroundColor: '#1A73E8' });
    });
  });

  describe('Component States and Animations', () => {
    it('auto-dismisses after specified duration', () => {
      const onClose = jest.fn();
      renderToast({ duration: 3000, onClose });

      expect(onClose).not.toHaveBeenCalled();
      
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('handles manual close via button click', async () => {
      const onClose = jest.fn();
      renderToast({ onClose });

      const closeButton = screen.getByRole('button', { name: /close notification/i });
      await userEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('applies correct animation classes', () => {
      renderToast();
      
      const toast = screen.getByTestId('toast');
      
      expect(toast).toHaveStyle({
        opacity: 1,
        transform: expect.stringContaining('scale(1)'),
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('adjusts width based on viewport size', () => {
      // Mock mobile viewport
      window.matchMedia = createMatchMedia(false);
      const { rerender } = renderToast();
      
      let toast = screen.getByTestId('toast');
      expect(toast).toHaveStyle({ minWidth: '280px' });

      // Mock desktop viewport
      window.matchMedia = createMatchMedia(true);
      rerender(<Toast message="Test" type="info" />);
      
      toast = screen.getByTestId('toast');
      expect(toast).toHaveStyle({ minWidth: '380px' });
    });

    it('adjusts position based on viewport size', () => {
      const positions: Array<'top' | 'bottom' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'> = [
        'top', 'bottom', 'top-right', 'top-left', 'bottom-right', 'bottom-left'
      ];

      positions.forEach(position => {
        const { rerender } = renderToast({ position });
        const toast = screen.getByTestId('toast');
        
        if (position.includes('top')) {
          expect(toast).toHaveStyle({ top: '20px' });
        }
        if (position.includes('bottom')) {
          expect(toast).toHaveStyle({ bottom: '20px' });
        }
        if (position.includes('right')) {
          expect(toast).toHaveStyle({ right: '20px' });
        }
        if (position.includes('left')) {
          expect(toast).toHaveStyle({ left: '20px' });
        }
        
        rerender(<Toast message="Test" type="info" />);
      });
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      renderToast();
      
      const toast = screen.getByTestId('toast');
      expect(toast).toHaveAttribute('role', 'alert');
      expect(toast).toHaveAttribute('aria-live', 'polite');
    });

    it('maintains focus management', async () => {
      renderToast();
      
      const closeButton = screen.getByRole('button', { name: /close notification/i });
      await userEvent.tab();
      
      expect(closeButton).toHaveFocus();
    });

    it('handles keyboard interactions', async () => {
      const onClose = jest.fn();
      renderToast({ onClose });
      
      const closeButton = screen.getByRole('button', { name: /close notification/i });
      await userEvent.type(closeButton, '{enter}');
      
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Custom Styling', () => {
    it('accepts and applies custom className', () => {
      renderToast({ className: 'custom-toast' });
      
      const toast = screen.getByTestId('toast');
      expect(toast).toHaveClass('custom-toast');
    });

    it('maintains theme consistency', () => {
      renderToast({ type: 'success' });
      
      const toast = screen.getByTestId('toast');
      expect(toast).toHaveStyle({
        backgroundColor: '#0F9D58',
        color: '#FFFFFF',
      });
    });
  });
});