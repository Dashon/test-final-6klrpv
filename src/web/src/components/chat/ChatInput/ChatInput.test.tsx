import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { jest } from '@jest/globals';

import ChatInput from './ChatInput';
import { useChat } from '../../../hooks/useChat';
import { MessageType } from '../../../types/chat';

// Add jest-axe custom matcher
expect.extend(toHaveNoViolations);

// Mock useChat hook
jest.mock('../../../hooks/useChat', () => ({
  useChat: jest.fn()
}));

// Mock constants
const MOCK_ROOM_ID = 'test-room-id';
const MOCK_USER_ID = 'test-user-id';
const MESSAGE_MAX_LENGTH = 1000;

// Mock hook implementations
const mockSendMessage = jest.fn().mockImplementation((message) => 
  Promise.resolve({ id: 'msg-123', status: 'sent' })
);
const mockSetTyping = jest.fn().mockImplementation((status) => Promise.resolve());
const mockRetryMessage = jest.fn().mockImplementation((messageId) => 
  Promise.resolve({ status: 'sent' })
);
const mockGetNetworkStatus = jest.fn().mockReturnValue({ isOnline: true, latency: 50 });

describe('ChatInput Component', () => {
  // Setup before all tests
  beforeAll(() => {
    // Configure performance observer
    window.PerformanceObserver = class {
      observe() {}
      disconnect() {}
    };
  });

  // Reset before each test
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    // Setup default hook mocks
    (useChat as jest.Mock).mockImplementation(() => ({
      sendMessage: mockSendMessage,
      setTyping: mockSetTyping,
      retryMessage: mockRetryMessage,
      getNetworkStatus: mockGetNetworkStatus,
      networkQuality: 'optimal'
    }));
  });

  describe('Accessibility', () => {
    it('should meet WCAG accessibility guidelines', async () => {
      const { container } = render(
        <ChatInput roomId={MOCK_ROOM_ID} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      render(<ChatInput roomId={MOCK_ROOM_ID} />);
      
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Test tab navigation
      expect(document.body).toHaveFocus();
      userEvent.tab();
      expect(input).toHaveFocus();
      userEvent.tab();
      expect(sendButton).toHaveFocus();
    });

    it('should provide appropriate ARIA labels', () => {
      render(<ChatInput roomId={MOCK_ROOM_ID} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-label', 'Chat message input');
      expect(input).toHaveAttribute('id', `chat-input-${MOCK_ROOM_ID}`);
    });
  });

  describe('Real-time Messaging', () => {
    it('should handle message submission successfully', async () => {
      render(<ChatInput roomId={MOCK_ROOM_ID} />);
      
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await userEvent.type(input, 'Hello World');
      expect(input).toHaveValue('Hello World');

      await userEvent.click(sendButton);

      expect(mockSendMessage).toHaveBeenCalledWith({
        text: 'Hello World',
        metadata: {},
        attachments: [],
        travelData: null
      });

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('should handle typing indicators with network-aware debouncing', async () => {
      render(<ChatInput roomId={MOCK_ROOM_ID} />);
      
      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'Hello');

      await waitFor(() => {
        expect(mockSetTyping).toHaveBeenCalledWith(true);
      }, { timeout: 1100 }); // Account for debounce

      // Clear input
      await userEvent.clear(input);

      await waitFor(() => {
        expect(mockSetTyping).toHaveBeenCalledWith(false);
      }, { timeout: 1100 });
    });

    it('should persist draft messages in localStorage', async () => {
      const { rerender } = render(<ChatInput roomId={MOCK_ROOM_ID} />);
      
      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'Draft message');

      // Simulate component unmount/remount
      rerender(<ChatInput roomId={MOCK_ROOM_ID} />);

      expect(screen.getByRole('textbox')).toHaveValue('Draft message');
    });
  });

  describe('Network Resilience', () => {
    it('should handle offline state gracefully', async () => {
      mockGetNetworkStatus.mockReturnValue({ isOnline: false, latency: Infinity });
      
      render(<ChatInput roomId={MOCK_ROOM_ID} />);
      
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await userEvent.type(input, 'Offline message');
      await userEvent.click(sendButton);

      expect(mockSendMessage).toHaveBeenCalled();
      expect(localStorage.getItem(`chat_draft_${MOCK_ROOM_ID}`)).toBe('Offline message');
    });

    it('should implement retry logic for failed messages', async () => {
      mockSendMessage.mockRejectedValueOnce(new Error('Network error'))
                    .mockResolvedValueOnce({ id: 'msg-123', status: 'sent' });

      render(<ChatInput roomId={MOCK_ROOM_ID} />);
      
      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'Retry message');
      await userEvent.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Performance', () => {
    it('should maintain input responsiveness under load', async () => {
      render(<ChatInput roomId={MOCK_ROOM_ID} />);
      
      const input = screen.getByRole('textbox');
      const longText = 'a'.repeat(500);
      
      const startTime = performance.now();
      await userEvent.type(input, longText);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Input should remain responsive
    });

    it('should handle rapid message submissions', async () => {
      render(<ChatInput roomId={MOCK_ROOM_ID} />);
      
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send/i });

      for (let i = 0; i < 5; i++) {
        await userEvent.type(input, `Message ${i}`);
        await userEvent.click(sendButton);
      }

      expect(mockSendMessage).toHaveBeenCalledTimes(5);
    });
  });

  describe('Error Handling', () => {
    it('should validate message length', async () => {
      render(<ChatInput roomId={MOCK_ROOM_ID} />);
      
      const input = screen.getByRole('textbox');
      const longText = 'a'.repeat(MESSAGE_MAX_LENGTH + 1);

      await userEvent.type(input, longText);

      expect(screen.getByText(/message too long/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
    });

    it('should handle empty message submission', async () => {
      render(<ChatInput roomId={MOCK_ROOM_ID} />);
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeDisabled();

      await userEvent.type(screen.getByRole('textbox'), ' ');
      expect(sendButton).toBeDisabled();
    });

    it('should display error messages appropriately', async () => {
      mockSendMessage.mockRejectedValueOnce(new Error('Failed to send message'));

      render(<ChatInput roomId={MOCK_ROOM_ID} />);
      
      await userEvent.type(screen.getByRole('textbox'), 'Test message');
      await userEvent.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to send message/i)).toBeInTheDocument();
      });
    });
  });
});