import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { ErrorBoundary } from './ErrorBoundary';
import { Toast } from '../Toast/Toast';

// Mock Toast component and its showToast function
jest.mock('../Toast/Toast', () => ({
  Toast: jest.fn(({ message, type, onClose }) => (
    <div data-testid="mock-toast" data-message={message} data-type={type}>
      <button onClick={onClose}>Close</button>
    </div>
  ))
}));

// Mock console.error to prevent noise in test output
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Test component that throws different types of errors
class ErrorComponent extends React.Component<{ errorType: string }> {
  render() {
    switch (this.props.errorType) {
      case 'sync':
        throw new Error('Synchronous test error');
      case 'async':
        setTimeout(() => {
          throw new Error('Asynchronous test error');
        }, 0);
        return null;
      case 'render':
        return <div>{undefined.toString()}</div>;
      default:
        return <div>No error</div>;
    }
  }
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders children when no error occurs', () => {
    const testMessage = 'Test content';
    render(
      <ErrorBoundary testId="test-boundary">
        <div>{testMessage}</div>
      </ErrorBoundary>
    );

    expect(screen.getByText(testMessage)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('catches and handles synchronous errors', () => {
    render(
      <ErrorBoundary testId="test-boundary">
        <ErrorComponent errorType="sync" />
      </ErrorBoundary>
    );

    // Verify error UI is displayed
    const errorContainer = screen.getByTestId('test-boundary-fallback');
    expect(errorContainer).toBeInTheDocument();
    expect(errorContainer).toHaveAttribute('role', 'alert');
    
    // Verify error message
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/Synchronous test error/i)).toBeInTheDocument();

    // Verify toast notification
    expect(screen.getByTestId('mock-toast')).toBeInTheDocument();
  });

  test('handles render errors with proper error boundary fallback', () => {
    render(
      <ErrorBoundary testId="test-boundary">
        <ErrorComponent errorType="render" />
      </ErrorBoundary>
    );

    // Verify error UI
    expect(screen.getByTestId('test-boundary-fallback')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  test('supports custom fallback UI', () => {
    const customFallback = <div data-testid="custom-fallback">Custom Error UI</div>;
    
    render(
      <ErrorBoundary testId="test-boundary" fallback={customFallback}>
        <ErrorComponent errorType="sync" />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('test-boundary-fallback')).not.toBeInTheDocument();
  });

  test('provides error recovery through retry button', async () => {
    const { rerender } = render(
      <ErrorBoundary testId="test-boundary">
        <ErrorComponent errorType="sync" />
      </ErrorBoundary>
    );

    // Verify error state
    expect(screen.getByTestId('test-boundary-fallback')).toBeInTheDocument();

    // Click retry button
    fireEvent.click(screen.getByText(/Try Again/i));

    // Verify error state is reset
    await waitFor(() => {
      expect(screen.queryByTestId('test-boundary-fallback')).not.toBeInTheDocument();
    });

    // Rerender with non-error state
    rerender(
      <ErrorBoundary testId="test-boundary">
        <div>Recovered content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Recovered content')).toBeInTheDocument();
  });

  test('handles toast notification dismissal', async () => {
    render(
      <ErrorBoundary testId="test-boundary">
        <ErrorComponent errorType="sync" />
      </ErrorBoundary>
    );

    // Verify toast is shown
    const toast = screen.getByTestId('mock-toast');
    expect(toast).toBeInTheDocument();

    // Close toast
    fireEvent.click(screen.getByText('Close'));

    // Verify toast is removed but error UI remains
    await waitFor(() => {
      expect(screen.queryByTestId('mock-toast')).not.toBeInTheDocument();
      expect(screen.getByTestId('test-boundary-fallback')).toBeInTheDocument();
    });
  });

  test('maintains accessibility attributes in error state', () => {
    render(
      <ErrorBoundary testId="test-boundary">
        <ErrorComponent errorType="sync" />
      </ErrorBoundary>
    );

    const errorContainer = screen.getByTestId('test-boundary-fallback');
    expect(errorContainer).toHaveAttribute('role', 'alert');
    expect(errorContainer).toHaveAttribute('aria-live', 'assertive');

    const retryButton = screen.getByText(/Try Again/i);
    expect(retryButton).toHaveAttribute('aria-label', 'Try again');
  });

  test('logs errors to console in development', () => {
    render(
      <ErrorBoundary testId="test-boundary">
        <ErrorComponent errorType="sync" />
      </ErrorBoundary>
    );

    expect(console.error).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      'Error caught by ErrorBoundary:',
      expect.objectContaining({
        error: expect.any(Error),
        errorInfo: expect.any(String)
      })
    );
  });
});