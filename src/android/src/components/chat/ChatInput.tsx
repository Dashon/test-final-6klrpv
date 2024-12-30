/**
 * @fileoverview Chat input component with travel planning support
 * @version 1.0.0
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Text,
  NativeSyntheticEvent,
  TextInputSubmitEditingEvent,
  TextInputContentSizeChangeEvent,
} from 'react-native';
import { MessageType } from '../../types/chat';
import { ChatService } from '../../services/chat';
import { Layout, Spacing } from '../../constants/layout';

// Constants for the component
const MAX_MESSAGE_LENGTH = 4000;
const TYPING_DEBOUNCE_MS = 500;
const RETRY_ATTEMPTS = 3;

interface ChatInputProps {
  /** Room identifier for the chat */
  roomId: string;
  /** Callback fired when a message is sent successfully */
  onMessageSent?: () => void;
  /** Disables the input when true */
  disabled?: boolean;
  /** Type of message being composed */
  messageType?: MessageType;
  /** Placeholder text for the input */
  placeholder?: string;
}

/**
 * Chat input component that handles message composition and sending
 * Supports both regular text messages and travel planning messages
 */
export const ChatInput: React.FC<ChatInputProps> = ({
  roomId,
  onMessageSent,
  disabled = false,
  messageType = MessageType.TEXT,
  placeholder = 'Type a message...',
}) => {
  // State management
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [inputHeight, setInputHeight] = useState<number>(Layout.INPUT_HEIGHT);

  // Refs
  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const chatService = useRef(new ChatService());

  /**
   * Handles the sending of messages with retry logic
   */
  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || disabled) {
      return;
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      setError(`Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`);
      return;
    }

    setError('');
    let attempts = 0;

    while (attempts < RETRY_ATTEMPTS) {
      try {
        await chatService.current.sendMessage(
          roomId,
          { text: message.trim(), metadata: {}, attachments: [] },
          messageType
        );

        setMessage('');
        setInputHeight(Layout.INPUT_HEIGHT);
        onMessageSent?.();
        break;
      } catch (error) {
        attempts++;
        if (attempts === RETRY_ATTEMPTS) {
          setError('Failed to send message. Please try again.');
          console.error('Failed to send message:', error);
        }
      }
    }
  }, [message, roomId, messageType, disabled, onMessageSent]);

  /**
   * Handles typing indicator with debounce
   */
  const handleTypingStart = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (!isTyping) {
      setIsTyping(true);
      try {
        chatService.current.emitTypingStart(roomId);
      } catch (error) {
        console.warn('Failed to emit typing start:', error);
      }
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleTypingEnd();
    }, TYPING_DEBOUNCE_MS);
  }, [roomId, isTyping]);

  /**
   * Handles typing end event
   */
  const handleTypingEnd = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (isTyping) {
      setIsTyping(false);
      try {
        chatService.current.emitTypingEnd(roomId);
      } catch (error) {
        console.warn('Failed to emit typing end:', error);
      }
    }
  }, [roomId, isTyping]);

  /**
   * Handles input content size changes for auto-growing input
   */
  const handleContentSizeChange = (event: TextInputContentSizeChangeEvent) => {
    const { height } = event.nativeEvent.contentSize;
    const newHeight = Math.min(Math.max(height, Layout.INPUT_HEIGHT), Layout.INPUT_HEIGHT * 3);
    setInputHeight(newHeight);
  };

  /**
   * Handles submit editing event
   */
  const handleSubmitEditing = (event: NativeSyntheticEvent<TextInputSubmitEditingEvent>) => {
    handleSendMessage();
  };

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          { height: inputHeight }
        ]}
        value={message}
        onChangeText={(text) => {
          setMessage(text);
          handleTypingStart();
        }}
        onContentSizeChange={handleContentSizeChange}
        onSubmitEditing={handleSubmitEditing}
        placeholder={placeholder}
        placeholderTextColor="#999999"
        multiline
        maxLength={MAX_MESSAGE_LENGTH}
        editable={!disabled}
        blurOnSubmit={false}
        autoCapitalize="sentences"
        autoCorrect={true}
        returnKeyType="send"
      />
      <TouchableOpacity
        style={[
          styles.sendButton,
          (!message.trim() || disabled) && styles.sendButtonDisabled
        ]}
        onPress={handleSendMessage}
        disabled={!message.trim() || disabled}
      >
        <Text style={styles.sendButtonText}>Send</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    minHeight: Layout.INPUT_HEIGHT + Spacing.md * 2,
  },
  input: {
    flex: 1,
    height: Layout.INPUT_HEIGHT,
    paddingHorizontal: Spacing.sm,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    marginRight: Spacing.sm,
    fontFamily: 'Roboto-Regular',
    fontSize: 16,
  },
  sendButton: {
    width: Layout.INPUT_HEIGHT,
    height: Layout.INPUT_HEIGHT,
    borderRadius: Layout.INPUT_HEIGHT / 2,
    backgroundColor: '#1A73E8',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 48,
  },
  sendButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
  },
  errorText: {
    position: 'absolute',
    bottom: -20,
    left: Spacing.md,
    color: '#DC3545',
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
  },
});

export default ChatInput;