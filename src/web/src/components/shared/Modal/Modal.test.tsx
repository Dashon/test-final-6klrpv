import React, { createRef } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { Modal } from './Modal';
import { theme } from '../../../constants/theme';

// Helper function to render components with theme
const renderWithTheme = (ui: React.ReactNode) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

// Mock IntersectionObserver for responsive tests
const setupIntersectionObserverMock = () => {
  const mock = jest.fn();
  mock.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null
  });
  window.IntersectionObserver = mock;
};

// Common test props
const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  title: 'Test Modal',
  children: <div>Modal content</div>
};

describe('Modal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupIntersectionObserverMock();
    // Mock portal container
    const portalRoot = document.createElement('div');
    portalRoot.setAttribute('id', 'portal-root');
    document.body.appendChild(portalRoot);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Rendering', () => {
    it('renders modal with correct title and content when open', () => {
      renderWithTheme(<Modal {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      renderWithTheme(<Modal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('applies different size variants correctly', () => {
      const { rerender } = renderWithTheme(
        <Modal {...defaultProps} size="small" />
      );
      
      let dialog = screen.getByRole('dialog');
      expect(dialog).toHaveStyle({ width: '400px' });

      rerender(
        <ThemeProvider theme={theme}>
          <Modal {...defaultProps} size="large" />
        </ThemeProvider>
      );
      
      dialog = screen.getByRole('dialog');
      expect(dialog).toHaveStyle({ width: '800px' });
    });

    it('renders footer content when provided', () => {
      const footer = <button>Footer Button</button>;
      renderWithTheme(<Modal {...defaultProps} footer={footer} />);
      
      expect(screen.getByText('Footer Button')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('sets correct ARIA attributes', () => {
      const ariaLabel = 'Test Modal Dialog';
      const ariaDescribedby = 'modal-desc';
      
      renderWithTheme(
        <Modal 
          {...defaultProps} 
          ariaLabel={ariaLabel}
          ariaDescribedby={ariaDescribedby}
        />
      );
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-label', ariaLabel);
      expect(dialog).toHaveAttribute('aria-describedby', ariaDescribedby);
    });

    it('traps focus within modal', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <Modal {...defaultProps}>
          <button>First</button>
          <button>Second</button>
        </Modal>
      );

      const firstButton = screen.getByText('First');
      const secondButton = screen.getByText('Second');
      const closeButton = screen.getByLabelText('Close modal');

      // Initial focus should be on first focusable element
      expect(firstButton).toHaveFocus();

      // Tab navigation should cycle through focusable elements
      await user.tab();
      expect(secondButton).toHaveFocus();
      
      await user.tab();
      expect(closeButton).toHaveFocus();
      
      await user.tab();
      expect(firstButton).toHaveFocus();
    });

    it('supports custom initial focus element', () => {
      const initialFocusRef = createRef<HTMLButtonElement>();
      renderWithTheme(
        <Modal {...defaultProps} initialFocusRef={initialFocusRef}>
          <button>First</button>
          <button ref={initialFocusRef}>Focus Me</button>
        </Modal>
      );

      expect(screen.getByText('Focus Me')).toHaveFocus();
    });
  });

  describe('Interactions', () => {
    it('calls onClose when clicking overlay', async () => {
      const onClose = jest.fn();
      renderWithTheme(<Modal {...defaultProps} onClose={onClose} />);
      
      const overlay = screen.getByRole('presentation');
      fireEvent.click(overlay);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('respects closeOnOverlayClick prop', () => {
      const onClose = jest.fn();
      renderWithTheme(
        <Modal {...defaultProps} onClose={onClose} closeOnOverlayClick={false} />
      );
      
      const overlay = screen.getByRole('presentation');
      fireEvent.click(overlay);
      
      expect(onClose).not.toHaveBeenCalled();
    });

    it('calls onClose when pressing escape key', () => {
      const onClose = jest.fn();
      renderWithTheme(<Modal {...defaultProps} onClose={onClose} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('respects closeOnEsc prop', () => {
      const onClose = jest.fn();
      renderWithTheme(
        <Modal {...defaultProps} onClose={onClose} closeOnEsc={false} />
      );
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(onClose).not.toHaveBeenCalled();
    });

    it('prevents background scroll when open', () => {
      renderWithTheme(<Modal {...defaultProps} />);
      
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores background scroll when closed', () => {
      const { rerender } = renderWithTheme(<Modal {...defaultProps} />);
      
      rerender(
        <ThemeProvider theme={theme}>
          <Modal {...defaultProps} isOpen={false} />
        </ThemeProvider>
      );
      
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Responsive Behavior', () => {
    it('adjusts padding on mobile viewport', () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));
      
      renderWithTheme(<Modal {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      
      expect(dialog).toHaveStyle({ padding: '16px' });
    });

    it('adjusts border radius for large modals on mobile', () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));
      
      renderWithTheme(<Modal {...defaultProps} size="large" />);
      const dialog = screen.getByRole('dialog');
      
      expect(dialog).toHaveStyle({ borderRadius: '0' });
    });

    it('maintains max-width constraint on larger viewports', () => {
      global.innerWidth = 1200;
      global.dispatchEvent(new Event('resize'));
      
      renderWithTheme(<Modal {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      
      expect(dialog).toHaveStyle({ maxWidth: '90vw' });
    });

    it('adjusts footer layout on mobile viewport', async () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));
      
      renderWithTheme(
        <Modal {...defaultProps} footer={
          <>
            <button>Cancel</button>
            <button>Confirm</button>
          </>
        } />
      );
      
      const footer = screen.getByRole('contentinfo');
      expect(footer).toHaveStyle({ flexDirection: 'column-reverse' });
    });
  });
});