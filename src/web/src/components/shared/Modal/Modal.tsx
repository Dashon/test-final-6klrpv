import React, { useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import { createPortal } from 'react-dom';
import FocusTrap from 'focus-trap-react';
import { colors, transitions } from '../../../constants/theme';
import { Button } from '../Button/Button';

// Props interface with comprehensive accessibility options
interface ModalProps {
  /** Controls modal visibility */
  isOpen: boolean;
  /** Callback function when modal should close */
  onClose: () => void;
  /** Modal title for accessibility and header */
  title: string;
  /** Modal content */
  children: React.ReactNode;
  /** Optional footer content */
  footer?: React.ReactNode;
  /** Modal size variant */
  size?: 'small' | 'medium' | 'large';
  /** Enable closing on overlay click */
  closeOnOverlayClick?: boolean;
  /** Enable closing on escape key */
  closeOnEsc?: boolean;
  /** Reference to element that should receive focus when modal opens */
  initialFocusRef?: React.RefObject<HTMLElement>;
  /** Reference to element that should receive focus when modal closes */
  returnFocusRef?: React.RefObject<HTMLElement>;
  /** Accessibility label */
  ariaLabel?: string;
  /** ID of element describing modal content */
  ariaDescribedby?: string;
}

// Styled components with enhanced accessibility and responsive design
const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: ${props => props.isOpen ? 1 : 0};
  transition: opacity ${transitions.default};
  touch-action: none;
  
  @supports (backdrop-filter: blur(4px)) {
    backdrop-filter: blur(4px);
  }
`;

const ModalContent = styled.div<{ size: ModalProps['size'] }>`
  background: ${colors.backgroundPrimary};
  border-radius: 8px;
  padding: 24px;
  position: relative;
  width: ${props => 
    props.size === 'small' ? '400px' : 
    props.size === 'large' ? '800px' : '600px'
  };
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  color: ${colors.textPrimary};
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transform: scale(${props => props.isOpen ? 1 : 0.95});
  transition: transform ${transitions.default};

  @media (max-width: 768px) {
    padding: 16px;
    max-height: 100vh;
    border-radius: ${props => props.size === 'large' ? '0' : '8px'};
  }
`;

const ModalHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${colors.textPrimary};
`;

const ModalBody = styled.div`
  margin-bottom: ${props => props.footer ? '16px' : 0};
`;

const ModalFooter = styled.footer`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;

  @media (max-width: 768px) {
    flex-direction: column-reverse;
    margin-top: 16px;
  }
`;

/**
 * Modal component implementing an accessible dialog with enhanced features
 * Supports keyboard interactions, focus management, and responsive design
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'medium',
  closeOnOverlayClick = true,
  closeOnEsc = true,
  initialFocusRef,
  returnFocusRef,
  ariaLabel,
  ariaDescribedby,
}) => {
  // Handle escape key press
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (closeOnEsc && event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }, [closeOnEsc, onClose]);

  // Handle overlay click
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      event.stopPropagation();
      onClose();
    }
  };

  // Add/remove event listeners
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscapeKey]);

  if (!isOpen) return null;

  const modalContent = (
    <FocusTrap
      focusTrapOptions={{
        initialFocus: initialFocusRef?.current || undefined,
        returnFocus: returnFocusRef?.current || undefined,
        escapeDeactivates: closeOnEsc,
        allowOutsideClick: true,
      }}
    >
      <ModalOverlay 
        isOpen={isOpen} 
        onClick={handleOverlayClick}
        role="presentation"
      >
        <ModalContent
          size={size}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel || title}
          aria-describedby={ariaDescribedby}
        >
          <ModalHeader>
            <ModalTitle id="modal-title">{title}</ModalTitle>
            <Button
              variant="text"
              size="small"
              onClick={onClose}
              ariaLabel="Close modal"
            >
              ✕
            </Button>
          </ModalHeader>
          
          <ModalBody footer={!!footer}>
            {children}
          </ModalBody>

          {footer && (
            <ModalFooter>
              {footer}
            </ModalFooter>
          )}
        </ModalContent>
      </ModalOverlay>
    </FocusTrap>
  );

  return createPortal(
    modalContent,
    document.body
  );
};

export default Modal;