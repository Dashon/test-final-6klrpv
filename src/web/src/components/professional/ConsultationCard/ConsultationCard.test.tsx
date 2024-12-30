import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import { ConsultationCard, ConsultationStatus, VideoServiceStatus, type IConsultation } from './ConsultationCard';
import theme from '../../../constants/theme';

// Mock date-fns to ensure consistent date formatting across tests
jest.mock('date-fns', () => ({
  format: jest.fn().mockReturnValue('June 15, 2024 10:00 AM'),
}));

// Mock console.error to keep test output clean
console.error = jest.fn();

describe('ConsultationCard Component', () => {
  // Mock consultation data
  const mockConsultation: IConsultation = {
    id: 'test-consultation-id',
    title: 'Travel Planning Session',
    scheduledTime: new Date('2024-06-15T10:00:00Z'),
    duration: 60,
    status: ConsultationStatus.SCHEDULED,
    videoStatus: VideoServiceStatus.READY,
    professional: {
      id: 'prof-id',
      name: 'Jane Expert',
      isAiAgent: false
    },
    client: {
      id: 'client-id',
      name: 'John Smith'
    },
    price: 100,
    timezone: 'UTC'
  };

  // Mock handlers
  const mockHandlers = {
    onJoin: jest.fn(),
    onCancel: jest.fn(),
    onReschedule: jest.fn()
  };

  // Helper function to render component with theme
  const renderConsultationCard = (props = {}) => {
    const defaultProps = {
      consultation: mockConsultation,
      ...mockHandlers
    };

    return render(
      <ThemeProvider theme={theme}>
        <ConsultationCard {...defaultProps} {...props} />
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders consultation details correctly', () => {
      renderConsultationCard();

      // Verify basic consultation information
      expect(screen.getByText('Travel Planning Session')).toBeInTheDocument();
      expect(screen.getByText('Jane Expert')).toBeInTheDocument();
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('60 minutes')).toBeInTheDocument();
      expect(screen.getByText('$100.00')).toBeInTheDocument();
      expect(screen.getByText('scheduled')).toBeInTheDocument();
    });

    it('renders AI agent indicator when professional is an AI agent', () => {
      const aiConsultation = {
        ...mockConsultation,
        professional: { ...mockConsultation.professional, isAiAgent: true }
      };
      renderConsultationCard({ consultation: aiConsultation });

      expect(screen.getByText(/\(AI Agent\)/)).toBeInTheDocument();
    });

    it('formats date and timezone correctly', () => {
      renderConsultationCard();
      
      const timeDisplay = screen.getByText(/June 15, 2024 10:00 AM \(UTC\)/);
      expect(timeDisplay).toBeInTheDocument();
    });
  });

  describe('Video Status', () => {
    it('displays correct video status indicator', () => {
      renderConsultationCard();
      
      const statusElement = screen.getByText('ready');
      expect(statusElement).toHaveStyle(`color: ${theme.colors.success}`);
    });

    it('disables join button when video status is ERROR', () => {
      const errorConsultation = {
        ...mockConsultation,
        videoStatus: VideoServiceStatus.ERROR
      };
      renderConsultationCard({ consultation: errorConsultation });

      const joinButton = screen.getByRole('button', { name: /join/i });
      expect(joinButton).toBeDisabled();
    });
  });

  describe('Action Buttons', () => {
    it('renders action buttons for SCHEDULED status', () => {
      renderConsultationCard();

      expect(screen.getByRole('button', { name: /join/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reschedule/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('hides action buttons for COMPLETED status', () => {
      const completedConsultation = {
        ...mockConsultation,
        status: ConsultationStatus.COMPLETED
      };
      renderConsultationCard({ consultation: completedConsultation });

      expect(screen.queryByRole('button', { name: /join/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /reschedule/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });

    it('calls onJoin handler with correct parameters', async () => {
      renderConsultationCard();
      
      const joinButton = screen.getByRole('button', { name: /join/i });
      await userEvent.click(joinButton);

      expect(mockHandlers.onJoin).toHaveBeenCalledWith(
        'test-consultation-id',
        expect.objectContaining({
          serviceId: expect.any(String),
          roomId: expect.any(String),
          token: expect.any(String)
        })
      );
    });

    it('calls onCancel handler when cancel button is clicked', async () => {
      renderConsultationCard();
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);

      expect(mockHandlers.onCancel).toHaveBeenCalledWith('test-consultation-id');
    });

    it('calls onReschedule handler when reschedule button is clicked', async () => {
      renderConsultationCard();
      
      const rescheduleButton = screen.getByRole('button', { name: /reschedule/i });
      await userEvent.click(rescheduleButton);

      expect(mockHandlers.onReschedule).toHaveBeenCalledWith('test-consultation-id');
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA labels and roles', () => {
      renderConsultationCard();

      expect(screen.getByRole('article')).toHaveAttribute(
        'aria-label',
        'Consultation: Travel Planning Session'
      );
    });

    it('maintains focus management for keyboard navigation', async () => {
      renderConsultationCard();

      const buttons = screen.getAllByRole('button');
      
      // Test tab order
      await userEvent.tab();
      expect(buttons[0]).toHaveFocus(); // Join button

      await userEvent.tab();
      expect(buttons[1]).toHaveFocus(); // Reschedule button

      await userEvent.tab();
      expect(buttons[2]).toHaveFocus(); // Cancel button
    });

    it('handles keyboard interactions correctly', async () => {
      renderConsultationCard();

      const joinButton = screen.getByRole('button', { name: /join/i });
      
      // Test keyboard activation
      joinButton.focus();
      await userEvent.keyboard('{Enter}');
      expect(mockHandlers.onJoin).toHaveBeenCalled();

      await userEvent.keyboard(' '); // Space key
      expect(mockHandlers.onJoin).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('handles failed join attempt gracefully', async () => {
      const onJoinError = jest.fn().mockRejectedValue(new Error('Failed to join'));
      renderConsultationCard({ onJoin: onJoinError });

      const joinButton = screen.getByRole('button', { name: /join/i });
      await userEvent.click(joinButton);

      expect(console.error).toHaveBeenCalledWith(
        'Failed to join consultation:',
        expect.any(Error)
      );
    });

    it('handles failed cancel attempt gracefully', async () => {
      const onCancelError = jest.fn().mockRejectedValue(new Error('Failed to cancel'));
      renderConsultationCard({ onCancel: onCancelError });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);

      expect(console.error).toHaveBeenCalledWith(
        'Failed to cancel consultation:',
        expect.any(Error)
      );
    });
  });
});