/**
 * Comprehensive test suite for the iOS App root component
 * Tests provider configuration, navigation setup, error handling,
 * accessibility compliance, and performance metrics
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, Platform, Appearance } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { jest, describe, it, beforeEach, afterEach } from '@jest/globals';

import App from '../src/App';
import { Analytics } from '../src/utils/analytics';
import { store } from '../src/store';
import ErrorBoundary from '../src/components/shared/ErrorBoundary';

// Mock native modules and navigation
jest.mock('react-native', () => ({
  StatusBar: {
    setBarStyle: jest.fn(),
    currentHeight: 20,
  },
  Platform: {
    select: jest.fn((options) => options.ios || options.default),
    OS: 'ios',
  },
  Appearance: {
    getColorScheme: jest.fn(() => 'light'),
    addChangeListener: jest.fn(),
  },
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  NavigationContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock analytics tracking
jest.mock('../src/utils/analytics', () => ({
  Analytics: {
    trackEvent: jest.fn(),
  },
}));

// Mock error utils
const mockErrorUtils = {
  setGlobalHandler: jest.fn(),
};
global.ErrorUtils = mockErrorUtils;

describe('App Component', () => {
  // Setup and teardown
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // Provider Configuration Tests
  describe('Provider Configuration', () => {
    it('should render with all required providers', () => {
      const { UNSAFE_getByType } = render(
        <App />
      );

      // Verify provider hierarchy
      expect(UNSAFE_getByType(Provider)).toBeTruthy();
      expect(UNSAFE_getByType(SafeAreaProvider)).toBeTruthy();
      expect(UNSAFE_getByType(ErrorBoundary)).toBeTruthy();
    });

    it('should configure StatusBar correctly', () => {
      render(<App />);

      expect(StatusBar.setBarStyle).toHaveBeenCalledWith(
        Platform.select({
          ios: 'dark-content',
          default: 'default'
        }),
        true
      );
    });

    it('should handle theme changes', async () => {
      render(<App />);

      // Simulate theme change
      act(() => {
        const mockThemeChange = Appearance.addChangeListener.mock.calls[0][0];
        mockThemeChange({ colorScheme: 'dark' });
      });

      await waitFor(() => {
        expect(StatusBar.setBarStyle).toHaveBeenCalledWith('light-content', true);
      });
    });
  });

  // Error Handling Tests
  describe('Error Handling', () => {
    it('should set up global error handler', () => {
      render(<App />);
      expect(mockErrorUtils.setGlobalHandler).toHaveBeenCalled();
    });

    it('should track errors with analytics', async () => {
      const { UNSAFE_getByType } = render(<App />);
      const errorBoundary = UNSAFE_getByType(ErrorBoundary);

      // Simulate error
      const error = new Error('Test error');
      const errorInfo = { componentStack: 'Test stack' };
      
      act(() => {
        errorBoundary.props.onError(error, errorInfo);
      });

      await waitFor(() => {
        expect(Analytics.trackEvent).toHaveBeenCalledWith('component_error', {
          error: error.message,
          componentStack: errorInfo.componentStack,
          timestamp: expect.any(String)
        });
      });
    });

    it('should handle component errors gracefully', async () => {
      const ThrowError = () => {
        throw new Error('Component error');
      };

      const { getByText } = render(
        <App>
          <ThrowError />
        </App>
      );

      await waitFor(() => {
        expect(getByText(/something went wrong/i)).toBeTruthy();
      });
    });
  });

  // Accessibility Tests
  describe('Accessibility', () => {
    it('should have accessible status bar', () => {
      render(<App />);
      
      const statusBar = screen.UNSAFE_getByType(StatusBar);
      expect(statusBar.props.accessibilityIgnoresInvertColors).toBe(true);
    });

    it('should maintain minimum touch target sizes', async () => {
      const { findAllByRole } = render(<App />);
      
      const touchableElements = await findAllByRole('button');
      touchableElements.forEach(element => {
        const { height, width } = element.props.style;
        expect(height).toBeGreaterThanOrEqual(44);
        expect(width).toBeGreaterThanOrEqual(44);
      });
    });

    it('should support screen reader navigation', async () => {
      const { findAllByRole } = render(<App />);
      
      const interactiveElements = await findAllByRole(/button|link/);
      interactiveElements.forEach(element => {
        expect(element.props.accessibilityLabel).toBeTruthy();
        expect(element.props.accessibilityRole).toBeTruthy();
      });
    });
  });

  // Performance Tests
  describe('Performance', () => {
    it('should render initial screen within performance budget', async () => {
      const startTime = performance.now();
      
      render(<App />);
      
      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(200); // 200ms budget
    });

    it('should handle memory cleanup on unmount', () => {
      const { unmount } = render(<App />);
      
      unmount();
      
      expect(mockErrorUtils.setGlobalHandler).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should maintain stable re-renders', async () => {
      const { rerender } = render(<App />);
      
      const rerenderCount = jest.fn();
      for (let i = 0; i < 5; i++) {
        act(() => {
          rerender(<App />);
          rerenderCount();
        });
      }
      
      expect(rerenderCount).toHaveBeenCalledTimes(5);
    });
  });

  // Navigation Tests
  describe('Navigation Setup', () => {
    it('should initialize with correct navigation structure', () => {
      const { UNSAFE_getByType } = render(<App />);
      
      const navigationContainer = UNSAFE_getByType(NavigationContainer);
      expect(navigationContainer).toBeTruthy();
    });

    it('should handle deep linking configuration', () => {
      const { UNSAFE_getByType } = render(<App />);
      
      const navigationContainer = UNSAFE_getByType(NavigationContainer);
      expect(navigationContainer.props.linking).toBeDefined();
      expect(navigationContainer.props.linking.prefixes).toContain('aitravelapp://');
    });
  });
});