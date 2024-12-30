import React from 'react';
import { render, fireEvent, waitFor, within } from '@testing-library/react-native';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import ChatBubble from '../../../src/components/chat/ChatBubble';
import { ChatMessage, MessageType, MessageStatus } from '../../../src/types/chat';
import { colors } from '../../../src/constants/colors';

// Helper function to create mock messages with proper typing
const createMockMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => {
  const defaultMessage: ChatMessage = {
    id: 'test-id',
    roomId: 'room-1',
    senderId: 'sender-1',
    type: MessageType.TEXT,
    content: {
      text: 'Test message',
      metadata: {},
    },
    status: MessageStatus.SENT,
    readBy: [],
    replyTo: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return { ...defaultMessage, ...overrides };
};

describe('ChatBubble Component', () => {
  // Mock handlers
  const mockOnPress = jest.fn();
  const mockOnLongPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Message Type Rendering', () => {
    test('renders text message correctly', () => {
      const message = createMockMessage({
        type: MessageType.TEXT,
        content: { text: 'Hello world', metadata: {} },
      });

      const { getByText, getByRole } = render(
        <ChatBubble
          message={message}
          isOwnMessage={true}
          onPress={mockOnPress}
          onLongPress={mockOnLongPress}
        />
      );

      expect(getByText('Hello world')).toBeTruthy();
      expect(getByRole('button')).toBeTruthy();
    });

    test('renders AI response with confidence score', () => {
      const message = createMockMessage({
        type: MessageType.AI_RESPONSE,
        content: {
          text: 'AI suggestion',
          metadata: { confidence: 0.95 },
        },
      });

      const { getByText, getByTestId } = render(
        <ChatBubble message={message} isOwnMessage={false} />
      );

      expect(getByText('AI suggestion')).toBeTruthy();
      // Verify AI-specific styling
      const bubble = getByTestId('chat-bubble');
      expect(bubble.props.style).toMatchObject({
        backgroundColor: expect.any(String),
      });
    });

    test('renders system message with correct styling', () => {
      const message = createMockMessage({
        type: MessageType.SYSTEM,
        content: { text: 'System notification', metadata: {} },
      });

      const { getByText, getByTestId } = render(
        <ChatBubble message={message} isOwnMessage={false} />
      );

      const systemMessage = getByText('System notification');
      expect(systemMessage.props.style).toMatchObject({
        textAlign: 'center',
        fontStyle: 'italic',
      });
    });

    test('renders travel plan with metadata', () => {
      const message = createMockMessage({
        type: MessageType.TRAVEL_PLAN,
        content: {
          text: 'Trip to Paris',
          metadata: {
            location: 'Paris, France',
            dates: { start: '2024-06-15', end: '2024-06-20' },
          },
        },
      });

      const { getByText } = render(
        <ChatBubble message={message} isOwnMessage={true} />
      );

      expect(getByText('Trip to Paris')).toBeTruthy();
      expect(getByText('📍 Paris, France')).toBeTruthy();
    });
  });

  describe('Interaction Handling', () => {
    test('handles press events correctly', () => {
      const message = createMockMessage();
      const { getByRole } = render(
        <ChatBubble
          message={message}
          isOwnMessage={true}
          onPress={mockOnPress}
          onLongPress={mockOnLongPress}
        />
      );

      const bubble = getByRole('button');
      fireEvent.press(bubble);
      expect(mockOnPress).toHaveBeenCalledWith(message);
    });

    test('handles long press events correctly', () => {
      const message = createMockMessage();
      const { getByRole } = render(
        <ChatBubble
          message={message}
          isOwnMessage={true}
          onPress={mockOnPress}
          onLongPress={mockOnLongPress}
        />
      );

      const bubble = getByRole('button');
      fireEvent(bubble, 'longPress');
      expect(mockOnLongPress).toHaveBeenCalledWith(message);
    });

    test('displays correct message status for own messages', () => {
      const message = createMockMessage({
        status: MessageStatus.DELIVERED,
      });

      const { getByLabelText } = render(
        <ChatBubble message={message} isOwnMessage={true} />
      );

      expect(getByLabelText('Message delivered')).toBeTruthy();
    });
  });

  describe('Accessibility Support', () => {
    test('provides correct accessibility labels', () => {
      const message = createMockMessage({
        content: { text: 'Accessible message', metadata: {} },
      });

      const { getByRole } = render(
        <ChatBubble
          message={message}
          isOwnMessage={true}
          accessibilityLabel="Custom label"
        />
      );

      const bubble = getByRole('button');
      expect(bubble.props.accessibilityLabel).toBe('Custom label');
    });

    test('supports screen reader hints for interactive messages', () => {
      const message = createMockMessage();
      const { getByRole } = render(
        <ChatBubble message={message} isOwnMessage={true} onPress={mockOnPress} />
      );

      const bubble = getByRole('button');
      expect(bubble.props.accessibilityHint).toBe(
        'Double tap to interact with message'
      );
    });
  });

  describe('Internationalization Support', () => {
    test('supports RTL layout', () => {
      const message = createMockMessage();
      const { getByTestId } = render(
        <ChatBubble message={message} isOwnMessage={true} isRTL={true} />
      );

      const bubble = getByTestId('chat-bubble');
      expect(bubble.props.style).toMatchObject({
        alignSelf: 'flex-start',
      });
    });

    test('renders status indicators correctly in RTL', () => {
      const message = createMockMessage({
        status: MessageStatus.READ,
      });

      const { getByLabelText } = render(
        <ChatBubble message={message} isOwnMessage={true} isRTL={true} />
      );

      const status = getByLabelText('Message read');
      expect(status.props.style).toContainEqual({
        alignSelf: 'flex-start',
      });
    });
  });

  describe('Theme Support', () => {
    test('applies correct colors in light mode', () => {
      jest.spyOn(React, 'useColorScheme').mockReturnValue('light');
      const message = createMockMessage();

      const { getByTestId } = render(
        <ChatBubble message={message} isOwnMessage={true} />
      );

      const bubble = getByTestId('chat-bubble');
      expect(bubble.props.style).toMatchObject({
        backgroundColor: colors.primary.default,
      });
    });

    test('applies correct colors in dark mode', () => {
      jest.spyOn(React, 'useColorScheme').mockReturnValue('dark');
      const message = createMockMessage();

      const { getByTestId } = render(
        <ChatBubble message={message} isOwnMessage={true} />
      );

      const bubble = getByTestId('chat-bubble');
      expect(bubble.props.style).toMatchObject({
        backgroundColor: colors.primary.dark,
      });
    });
  });
});