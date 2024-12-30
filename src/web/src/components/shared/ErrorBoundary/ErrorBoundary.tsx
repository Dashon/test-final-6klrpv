import React from 'react'; // v18.x
import { Toast } from '../Toast/Toast';
import { Button } from '../Button/Button';

/**
 * Props interface for ErrorBoundary component
 */
interface ErrorBoundaryProps {
  /** Child components to be rendered */
  children: React.ReactNode;
  /** Optional custom fallback UI to display when an error occurs */
  fallback?: React.ReactNode;
  /** Optional test ID for testing purposes */
  testId?: string;
}

/**
 * State interface for ErrorBoundary component
 */
interface ErrorBoundaryState {
  /** Indicates if an error has occurred */
  hasError: boolean;
  /** The error object if one exists */
  error: Error | null;
  /** Additional error information */
  errorInfo: string;
  /** Controls visibility of error toast notification */
  isToastVisible: boolean;
}

/**
 * ErrorBoundary component that catches JavaScript errors in child components,
 * logs them, and displays a fallback UI with error details and recovery options.
 * Implements comprehensive error handling with user notifications and accessibility support.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: '',
      isToastVisible: false
    };

    // Bind methods
    this.resetError = this.resetError.bind(this);
    this.handleToastClose = this.handleToastClose.bind(this);
  }

  /**
   * Static method to update state when an error occurs
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      isToastVisible: true
    };
  }

  /**
   * Lifecycle method called when an error is caught
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to error monitoring service
    console.error('Error caught by ErrorBoundary:', {
      error,
      errorInfo: errorInfo.componentStack
    });

    this.setState({
      error,
      errorInfo: errorInfo.componentStack || '',
      isToastVisible: true
    });
  }

  /**
   * Handles resetting the error state and attempting recovery
   */
  resetError(): void {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: '',
      isToastVisible: false
    });
  }

  /**
   * Handles closing the error toast notification
   */
  handleToastClose(): void {
    this.setState({ isToastVisible: false });
  }

  render(): React.ReactNode {
    const { children, fallback, testId = 'error-boundary' } = this.props;
    const { hasError, error, isToastVisible } = this.state;

    if (hasError) {
      // Render custom fallback UI or default error UI
      const errorFallback = fallback || (
        <div
          role="alert"
          aria-live="assertive"
          data-testid={`${testId}-fallback`}
          style={{
            padding: '20px',
            margin: '20px',
            borderRadius: '8px',
            backgroundColor: '#FFF3F3',
            border: '1px solid #FFD7D7'
          }}
        >
          <h2 style={{ color: '#D93025', marginBottom: '16px' }}>
            Something went wrong
          </h2>
          
          <p style={{ marginBottom: '16px' }}>
            {error?.message || 'An unexpected error occurred'}
          </p>

          <Button
            onClick={this.resetError}
            variant="primary"
            size="medium"
            ariaLabel="Try again"
            data-testid={`${testId}-retry-button`}
          >
            Try Again
          </Button>
        </div>
      );

      return (
        <div data-testid={testId}>
          {errorFallback}
          
          {isToastVisible && (
            <Toast
              message="An error occurred. Please try again or contact support if the problem persists."
              type="error"
              duration={8000}
              position="top-right"
              onClose={this.handleToastClose}
              testId={`${testId}-toast`}
            />
          )}
        </div>
      );
    }

    // Render children if no error
    return children;
  }
}

export default ErrorBoundary;
```

This implementation includes:

1. Comprehensive TypeScript interfaces for props and state
2. Proper error catching and handling using React's error boundary lifecycle methods
3. Integration with Toast component for user notifications
4. Accessible fallback UI with proper ARIA attributes
5. Retry mechanism using Button component
6. Test IDs for testing support
7. Error logging for monitoring
8. Clean error recovery through state reset
9. Support for custom fallback UI through props
10. Proper error message display and formatting
11. Styled error presentation using design system colors
12. Toast notification management with auto-dismiss
13. Proper type safety throughout the component
14. Documentation for all methods and interfaces

The component follows all the requirements from the technical specification including error handling strategy and alert types. It's production-ready with proper error handling, accessibility support, and integration with the design system components.

Usage example:
```typescript
<ErrorBoundary
  fallback={<CustomErrorUI />}
  testId="my-error-boundary"
>
  <MyComponent />
</ErrorBoundary>