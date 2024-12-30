/**
 * ChatInput Component for iOS
 * @version 1.0.0
 * 
 * A highly optimized chat input component with real-time messaging,
 * offline support, accessibility features, and haptic feedback.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  Platform,
  TextInput,
  AccessibilityInfo,
  EmitterSubscription
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // ^7.0.0
import NetInfo from '@react-native-community/netinfo'; // ^9.0.0
import * as haptics from 'expo-haptics'; // ^12.0.0

import Input from '../shared/Input';
import { MessageType } from '../../types/chat';
import { useChat } from '../../hooks/useChat';
import { colors } from '../../constants/colors';
import { fontSizes } from '../../constants/typography';

// Constants
const DEFAULT_MAX_LENGTH = 4000;
const TYPING_DEBOUNCE = 500;
const MIN_MESSAGE_LENGTH = 1;

/**
 * Props interface for ChatInput component
 */
interface ChatInputProps {
  roomId: string;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  onError?: (error: Error) => void;
  testID?: string;
}

/**
 * ChatInput component with real-time messaging capabilities
 */
const ChatInput = React.forwardRef<TextInput, ChatInputProps>((props, ref) => {
  const {
    roomId,
    placeholder = 'Type a message...',
    disabled = false,
    maxLength = DEFAULT_MAX_LENGTH,
    onError,
    testID = 'chat-input'
  } = props;

  // State
  const [inputValue, setInputValue] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  // Refs
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const screenReaderSubscriptionRef = useRef<EmitterSubscription>();

  // Hooks
  const { sendMessage, isTyping, queueMessage } = useChat(roomId);

  /**
   * Initialize accessibility and network listeners
   */
  useEffect(() => {
    const initializeComponent = async () => {
      // Check screen reader status
      const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      setIsScreenReaderEnabled(screenReaderEnabled);

      // Subscribe to screen reader changes
      screenReaderSubscriptionRef.current = AccessibilityInfo.addEventListener(
        'screenReaderChanged',
        setIsScreenReaderEnabled
      );

      // Subscribe to network status
      const unsubscribe = NetInfo.addEventListener(state => {
        setIsOnline(state.isConnected ?? false);
      });

      return () => {
        screenReaderSubscriptionRef.current?.remove();
        unsubscribe();
      };
    };

    initializeComponent();
  }, []);

  /**
   * Handles message sending with offline support
   */
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || disabled) return;

    try {
      // Trigger haptic feedback
      await haptics.impactAsync(haptics.ImpactFeedbackStyle.Medium);

      const messageContent = {
        text: inputValue.trim(),
        metadata: {
          timestamp: Date.now(),
          isOffline: !isOnline
        }
      };

      // Handle offline/online sending
      if (isOnline) {
        await sendMessage(messageContent);
      } else {
        await queueMessage(messageContent);
        if (isScreenReaderEnabled) {
          AccessibilityInfo.announceForAccessibility('Message queued for sending');
        }
      }

      // Clear input after successful send/queue
      setInputValue('');
      
      // Clear typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      onError?.(error as Error);
      
      if (isScreenReaderEnabled) {
        AccessibilityInfo.announceForAccessibility('Failed to send message');
      }
    }
  }, [inputValue, disabled, isOnline, sendMessage, queueMessage, isScreenReaderEnabled, onError]);

  /**
   * Handles text input changes with typing indicator
   */
  const handleTextChange = useCallback((text: string) => {
    // Validate input length
    if (text.length > maxLength) return;

    setInputValue(text);

    // Handle typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (text.length >= MIN_MESSAGE_LENGTH) {
        handleTyping();
      }
    }, TYPING_DEBOUNCE);
  }, [maxLength]);

  /**
   * Handles keyboard dismissal
   */
  const handleKeyboardDismiss = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  return (
    <View 
      style={styles.container}
      accessibilityRole="group"
      accessibilityLabel="Message input area"
    >
      <Input
        ref={ref}
        value={inputValue}
        onChangeText={handleTextChange}
        placeholder={placeholder}
        maxLength={maxLength}
        editable={!disabled}
        returnKeyType="send"
        multiline
        blurOnSubmit={false}
        style={styles.input}
        accessibilityLabel="Message input field"
        accessibilityHint="Enter your message here"
        testID={`${testID}-input`}
      />
      
      <TouchableOpacity
        onPress={handleSendMessage}
        disabled={disabled || !inputValue.trim()}
        style={[
          styles.sendButton,
          (!inputValue.trim() || disabled) && styles.sendButtonDisabled
        ]}
        accessibilityLabel="Send message"
        accessibilityHint={isOnline ? "Send message now" : "Queue message for later"}
        accessibilityRole="button"
        testID={`${testID}-send-button`}
      >
        <Ionicons
          name="send"
          size={24}
          color={(!inputValue.trim() || disabled) ? colors.text.disabled : colors.text.primary}
        />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.background.primary,
    ...Platform.select({
      ios: {
        shadowColor: colors.overlay.light,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }
    })
  },
  input: {
    flex: 1,
    marginRight: 8,
    minHeight: 36,
    maxHeight: 100,
    paddingVertical: 8,
    fontSize: fontSizes.md,
    lineHeight: 20,
    color: colors.text.primary
  },
  sendButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.primary.default,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 36,
    minHeight: 36
  },
  sendButtonDisabled: {
    backgroundColor: colors.background.secondary
  }
});

ChatInput.displayName = 'ChatInput';

export default ChatInput;