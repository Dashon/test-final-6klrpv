/**
 * Test Suite for ChatBubble Component
 * Version: 1.0.0
 * 
 * Comprehensive tests for the chat bubble component covering:
 * - Rendering different message types
 * - Styling and layout
 * - User interactions
 * - Accessibility
 * - Real-time updates
 */

import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@emotion/styled';
import { expect, describe, it, jest, beforeEach } from '@jest/globals';
import ChatBubble from './ChatBubble';
import { MessageType, MessageStatus } from '../../../types/chat';
import theme from '../../../constants/theme';

// Mock date-fns format function
jest.mock('date-fns', () => ({
  format: jest.fn(() => '14:30')
}));

// Helper function to create mock messages
const createMockMessage = (overrides?: Partial<ChatMessage>): ChatMessage => ({
  id: jest.fn()() as string,
  roomId: 'room-123',
  senderId: 'user-123',
  type: MessageType.TEXT,
  content: {
    text: 'Test message',
    metadata: {},
    attachments: [],
    travelData: null
  },
  status: MessageStatus.DELIVERED,
  readBy: [],
  replyTo: null,
  aiContext: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

// Helper function to render ChatBubble with theme
const renderChatBubble = (message: ChatMessage, props = {}) => {
  return render(
    <ThemeProvider theme={theme}>
      <ChatBubble message={message} {...props} />
    </ThemeProvider>
  );
};

describe('ChatBubble Component', () => {
  // Mock handlers
  const mockHandlers = {
    onReply: jest.fn(),
    onDelete: jest.fn(),
    onRetry: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders text message with correct content and styling', () => {
      const message = createMockMessage({
        content: { text: 'Hello world', metadata: {}, attachments: [], travelData: null }
      });

      renderChatBubble(message, { isOwnMessage: false });

      const bubble = screen.getByRole('listitem');
      expect(bubble).toBeInTheDocument();
      expect(screen.getByText('Hello world')).toBeInTheDocument();
      expect(bubble).toHaveStyle({ alignItems: 'flex-start' });
    });

    it('renders AI response with AI indicator and special styling', () => {
      const message = createMockMessage({
        type: MessageType.AI_RESPONSE,
        content: { text: 'AI suggestion', metadata: {}, attachments: [], travelData: null }
      });

      renderChatBubble(message, { isOwnMessage: false });

      const bubble = screen.getByRole('listitem');
      expect(bubble).toHaveAttribute('aria-label', 'Message from other');
      expect(screen.getByText('AI suggestion')).toBeInTheDocument();
      // Verify AI-specific styling
      expect(bubble.firstChild).toHaveStyle({ backgroundColor: theme.colors.secondaryLight });
    });

    it('renders travel plan with interactive elements', () => {
      const message = createMockMessage({
        type: MessageType.TRAVEL_PLAN,
        content: {
          text: 'Travel suggestion',
          metadata: {},
          attachments: [],
          travelData: {
            destination: 'Paris',
            planId: 'plan-123',
            activities: []
          }
        }
      });

      renderChatBubble(message, { isOwnMessage: false });

      expect(screen.getByText('Destination: Paris')).toBeInTheDocument();
      expect(screen.getByLabelText('Travel plan details')).toBeInTheDocument();
    });
  });

  describe('Message Status', () => {
    it('shows sending indicator for pending messages', () => {
      const message = createMockMessage({ status: MessageStatus.PENDING });
      renderChatBubble(message, { isOwnMessage: true });

      expect(screen.getByText('pending')).toBeInTheDocument();
    });

    it('displays error state for failed messages', () => {
      const message = createMockMessage({ status: MessageStatus.FAILED });
      renderChatBubble(message, { isOwnMessage: true, onRetry: mockHandlers.onRetry });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
      expect(screen.getByText('failed')).toBeInTheDocument();
    });

    it('shows delivered status for successful messages', () => {
      const message = createMockMessage({ status: MessageStatus.DELIVERED });
      renderChatBubble(message, { isOwnMessage: true });

      expect(screen.getByText('delivered')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('handles message reply interaction', async () => {
      const message = createMockMessage();
      renderChatBubble(message, { 
        isOwnMessage: false, 
        onReply: mockHandlers.onReply 
      });

      const replyButton = screen.getByRole('button', { name: /reply/i });
      await userEvent.click(replyButton);

      expect(mockHandlers.onReply).toHaveBeenCalledWith(message);
    });

    it('supports message deletion with confirmation', async () => {
      const message = createMockMessage();
      renderChatBubble(message, { 
        isOwnMessage: true, 
        onDelete: mockHandlers.onDelete 
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteButton);

      expect(mockHandlers.onDelete).toHaveBeenCalledWith(message.id);
    });

    it('handles retry for failed messages', async () => {
      const message = createMockMessage({ status: MessageStatus.FAILED });
      renderChatBubble(message, { 
        isOwnMessage: true, 
        onRetry: mockHandlers.onRetry 
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryButton);

      expect(mockHandlers.onRetry).toHaveBeenCalledWith(message.id);
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA labels', () => {
      const message = createMockMessage();
      renderChatBubble(message, { isOwnMessage: false });

      expect(screen.getByRole('listitem')).toHaveAttribute('aria-label', 'Message from other');
      expect(screen.getByText(message.content.text)).toBeVisible();
    });

    it('maintains focus management', async () => {
      const message = createMockMessage();
      renderChatBubble(message, { 
        isOwnMessage: true,
        onReply: mockHandlers.onReply,
        onDelete: mockHandlers.onDelete
      });

      const buttons = screen.getAllByRole('button');
      await userEvent.tab();
      expect(buttons[0]).toHaveFocus();
      await userEvent.tab();
      expect(buttons[1]).toHaveFocus();
    });

    it('supports keyboard navigation', async () => {
      const message = createMockMessage();
      renderChatBubble(message, { 
        isOwnMessage: true,
        onReply: mockHandlers.onReply 
      });

      const replyButton = screen.getByRole('button', { name: /reply/i });
      await userEvent.type(replyButton, '{enter}');
      
      expect(mockHandlers.onReply).toHaveBeenCalledWith(message);
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile viewport', () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      const message = createMockMessage();
      renderChatBubble(message, { isOwnMessage: false });

      const bubble = screen.getByRole('listitem');
      expect(bubble).toHaveStyle({ maxWidth: '85%' });
    });

    it('handles long content appropriately', () => {
      const longText = 'a'.repeat(500);
      const message = createMockMessage({
        content: { text: longText, metadata: {}, attachments: [], travelData: null }
      });

      renderChatBubble(message, { isOwnMessage: false });

      const content = screen.getByText(longText);
      expect(content).toHaveStyle({ wordBreak: 'break-word' });
    });
  });
});