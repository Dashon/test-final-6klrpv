import React from 'react';
import { render, fireEvent, waitFor, within } from '@testing-library/react-native';
import { Animated, AccessibilityInfo, I18nManager } from 'react-native';
import { jest } from '@jest/globals';

import ChatBubble from '../../../src/components/chat/ChatBubble';
import { MessageType, MessageStatus, ChatMessage } from '../../../src/types/chat';
import { formatMessagePreview } from '../../../src/utils/formatting';

// Mock external dependencies
jest.mock('react-native/Libraries/Animated/Animated', () => ({
  View: 'Animated.View',
  Value: jest.fn(() => ({
    setValue: jest.fn(),
    interpolate: jest.fn(),
  })),
  timing: jest.fn(() => ({
    start: jest.fn(cb => cb?.()),
  })),
  spring: jest.fn(() => ({
    start: jest.fn(cb => cb?.()),
  })),
  parallel: jest.fn(animations => ({
    start: jest.fn(cb => cb?.()),
  })),
}));

jest.mock('react-native/Libraries/Components/AccessibilityInfo/AccessibilityInfo', () => ({
  isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

jest.mock('../../../src/utils/formatting', () => ({
  formatMessagePreview: jest.fn(text => text),
}));

// Test utilities
const createMockMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'test-message-id',
  roomId: 'test-room-id',
  senderId: 'test-sender-id',
  type: MessageType.TEXT,
  content: {
    text: 'Test message content',
    metadata: {},
    attachments: [],
  },
  status: MessageStatus.SENT,
  readBy: [],
  replyTo: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  localId: 'test-local-id',
  offline: false,
  ...overrides,
});

const setupAnimationMocks = () => {
  const animationMock = {
    setValue: jest.fn(),
    interpolate: jest.fn(),
  };
  (Animated.Value as jest.Mock).mockImplementation(() => animationMock);
  return animationMock;
};

describe('ChatBubble Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAnimationMocks();
  });

  describe('Message Type Rendering', () => {
    it('renders text message with correct styling', () => {
      const message = createMockMessage();
      const { getByText, getByRole } = render(
        <ChatBubble message={message} isCurrentUser={false} />
      );

      const messageText = getByText('Test message content');
      const messageContainer = getByRole('button');

      expect(messageText).toBeTruthy();
      expect(messageContainer).toHaveStyle({
        maxWidth: '80%',
      });
    });

    it('renders AI response with correct indicator and styling', () => {
      const message = createMockMessage({
        type: MessageType.AI_RESPONSE,
        content: { text: 'AI response', metadata: {}, attachments: [] },
      });
      const { getByText } = render(
        <ChatBubble message={message} isCurrentUser={false} />
      );

      expect(formatMessagePreview).toHaveBeenCalledWith(
        'AI response',
        undefined,
        MessageType.AI_RESPONSE
      );
    });

    it('renders travel plan message with interactive elements', () => {
      const message = createMockMessage({
        type: MessageType.TRAVEL_PLAN,
        content: { text: 'Travel plan details', metadata: {}, attachments: [] },
      });
      const { getByText } = render(
        <ChatBubble message={message} isCurrentUser={false} />
      );

      expect(formatMessagePreview).toHaveBeenCalledWith(
        'Travel plan details',
        undefined,
        MessageType.TRAVEL_PLAN
      );
    });

    it('handles RTL text content correctly', () => {
      const originalIsRTL = I18nManager.isRTL;
      I18nManager.isRTL = true;

      const message = createMockMessage({
        content: { text: 'RTL content', metadata: {}, attachments: [] },
      });
      const { getByRole } = render(
        <ChatBubble message={message} isCurrentUser={false} />
      );

      const container = getByRole('button');
      expect(container).toHaveStyle({
        alignSelf: 'flex-start',
      });

      I18nManager.isRTL = originalIsRTL;
    });
  });

  describe('Animation Behavior', () => {
    it('triggers entry animation on mount', async () => {
      const message = createMockMessage();
      render(<ChatBubble message={message} isCurrentUser={false} />);

      expect(Animated.parallel).toHaveBeenCalled();
      expect(Animated.timing).toHaveBeenCalledTimes(2);
    });

    it('handles swipe gesture correctly', async () => {
      const onSwipe = jest.fn();
      const message = createMockMessage();
      const { getByRole } = render(
        <ChatBubble message={message} isCurrentUser={false} onSwipe={onSwipe} />
      );

      const bubble = getByRole('button');
      fireEvent(bubble, 'responderMove', { dx: 100 });
      fireEvent(bubble, 'responderRelease');

      expect(Animated.spring).toHaveBeenCalled();
      expect(onSwipe).toHaveBeenCalledWith(message, 'right');
    });
  });

  describe('Accessibility Features', () => {
    it('provides correct accessibility labels', async () => {
      const message = createMockMessage();
      const { getByRole } = render(
        <ChatBubble message={message} isCurrentUser={false} />
      );

      const bubble = getByRole('button');
      expect(bubble).toHaveAccessibilityLabel(
        expect.stringContaining('Chat message from other')
      );
    });

    it('supports screen reader announcements for message status', async () => {
      const message = createMockMessage({ status: MessageStatus.READ });
      const { getByLabelText } = render(
        <ChatBubble message={message} isCurrentUser={true} />
      );

      expect(getByLabelText('Read')).toBeTruthy();
    });
  });

  describe('Theme Support', () => {
    it('applies correct colors in light mode', () => {
      const message = createMockMessage();
      const { getByRole } = render(
        <ChatBubble message={message} isCurrentUser={false} isDarkMode={false} />
      );

      const container = within(getByRole('button')).getByText('Test message content');
      expect(container.props.style).toHaveProperty('color', expect.any(String));
    });

    it('applies correct colors in dark mode', () => {
      const message = createMockMessage();
      const { getByRole } = render(
        <ChatBubble message={message} isCurrentUser={false} isDarkMode={true} />
      );

      const container = within(getByRole('button')).getByText('Test message content');
      expect(container.props.style).toHaveProperty('color', expect.any(String));
    });
  });

  describe('Interaction Handling', () => {
    it('calls onPress handler when message is tapped', () => {
      const onPress = jest.fn();
      const message = createMockMessage();
      const { getByRole } = render(
        <ChatBubble message={message} isCurrentUser={false} onPress={onPress} />
      );

      fireEvent.press(getByRole('button'));
      expect(onPress).toHaveBeenCalledWith(message);
    });

    it('calls onLongPress handler when message is long pressed', () => {
      const onLongPress = jest.fn();
      const message = createMockMessage();
      const { getByRole } = render(
        <ChatBubble message={message} isCurrentUser={false} onLongPress={onLongPress} />
      );

      fireEvent.longPress(getByRole('button'));
      expect(onLongPress).toHaveBeenCalledWith(message);
    });

    it('displays correct status indicator for current user messages', () => {
      const message = createMockMessage({ status: MessageStatus.DELIVERED });
      const { getByLabelText } = render(
        <ChatBubble message={message} isCurrentUser={true} />
      );

      expect(getByLabelText('Delivered')).toBeTruthy();
    });
  });
});