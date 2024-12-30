import React, { useState, useCallback, useEffect, useRef } from 'react';
import { debounce } from 'lodash';
import Input from '../../shared/Input/Input';
import { useChat } from '../../../hooks/useChat';
import { MessageType } from '../../../types/chat';
import { colors, typography } from '../../../constants/theme';
import { CHAT_VALIDATION, VALIDATION_MESSAGES } from '../../../constants/validation';

// Constants for chat input behavior
const TYPING_DEBOUNCE_MS = 1000;
const MAX_MESSAGE_LENGTH = CHAT_VALIDATION.maxMessageLength;
const RETRY_ATTEMPTS = 3;
const DRAFT_STORAGE_KEY = 'chat_draft_';

interface ChatInputProps {
  roomId: string;
  placeholder?: string;
  disabled?: boolean;
  onTypingStart?: () => void;
  onTypingEnd?: () => void;
}

/**
 * Enhanced chat input component with real-time features, typing indicators,
 * and network-aware optimizations.
 *
 * @component
 * @example
 * ```tsx
 * <ChatInput
 *   roomId="room-123"
 *   placeholder="Type a message..."
 *   onTypingStart={() => console.log('Started typing')}
 *   onTypingEnd={() => console.log('Stopped typing')}
 * />
 * ```
 */
const ChatInput: React.FC<ChatInputProps> = ({
  roomId,
  placeholder = 'Type a message...',
  disabled = false,
  onTypingStart,
  onTypingEnd,
}) => {
  // State management
  const [inputValue, setInputValue] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Chat hook integration
  const { sendMessage, setTyping, networkQuality } = useChat(roomId);

  // Load draft message from storage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(`${DRAFT_STORAGE_KEY}${roomId}`);
    if (savedDraft) {
      setInputValue(savedDraft);
    }
    return () => {
      // Clear typing indicator on unmount
      setTyping(false);
    };
  }, [roomId, setTyping]);

  // Save draft message to storage
  useEffect(() => {
    if (inputValue) {
      localStorage.setItem(`${DRAFT_STORAGE_KEY}${roomId}`, inputValue);
    } else {
      localStorage.removeItem(`${DRAFT_STORAGE_KEY}${roomId}`);
    }
  }, [inputValue, roomId]);

  // Network-aware debounced typing indicator
  const debouncedTyping = useCallback(
    debounce((typing: boolean) => {
      setTyping(typing);
      if (typing) {
        onTypingStart?.();
      } else {
        onTypingEnd?.();
      }
    }, networkQuality === 'optimal' ? TYPING_DEBOUNCE_MS : TYPING_DEBOUNCE_MS * 2),
    [setTyping, onTypingStart, onTypingEnd, networkQuality]
  );

  // Handle input changes with validation
  const handleInputChange = useCallback((value: string) => {
    setError(null);
    setInputValue(value);

    // Validate message length
    if (value.length > MAX_MESSAGE_LENGTH) {
      setError(VALIDATION_MESSAGES.chat.messageTooLong);
      return;
    }

    // Update typing indicator
    if (!isTyping && value.length > 0) {
      setIsTyping(true);
      debouncedTyping(true);
    } else if (isTyping && value.length === 0) {
      setIsTyping(false);
      debouncedTyping(false);
    }
  }, [isTyping, debouncedTyping]);

  // Handle message submission
  const handleMessageSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validate input
    if (!inputValue.trim()) {
      setError(VALIDATION_MESSAGES.required);
      return;
    }

    if (inputValue.length > MAX_MESSAGE_LENGTH) {
      setError(VALIDATION_MESSAGES.chat.messageTooLong);
      return;
    }

    try {
      // Create message object
      const messageContent = {
        text: inputValue.trim(),
        metadata: {},
        attachments: [],
        travelData: null
      };

      // Send message with retry logic
      let attempts = 0;
      while (attempts < RETRY_ATTEMPTS) {
        try {
          await sendMessage(messageContent);
          break;
        } catch (error) {
          attempts++;
          if (attempts === RETRY_ATTEMPTS) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }

      // Clear input and typing indicator on success
      setInputValue('');
      setIsTyping(false);
      debouncedTyping(false);
      localStorage.removeItem(`${DRAFT_STORAGE_KEY}${roomId}`);
      
      // Focus input for next message
      inputRef.current?.focus();
    } catch (error) {
      setError((error as Error).message);
    }
  }, [inputValue, roomId, sendMessage, debouncedTyping]);

  return (
    <form
      onSubmit={handleMessageSubmit}
      className="chat-input-container"
      style={{
        padding: '16px',
        borderTop: `1px solid ${colors.backgroundSecondary}`,
        backgroundColor: colors.backgroundPrimary
      }}
    >
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled}
        error={error || undefined}
        maxLength={MAX_MESSAGE_LENGTH}
        aria-label="Chat message input"
        id={`chat-input-${roomId}`}
        name="message"
        autoComplete="off"
        required
        style={{
          fontFamily: typography.fontFamilyUI,
          fontSize: typography.fontSizeBody
        }}
      />
      <div className="chat-input-actions" style={{ marginTop: '8px' }}>
        <button
          type="submit"
          disabled={disabled || !!error || !inputValue.trim()}
          className="send-button"
          aria-label="Send message"
          style={{
            backgroundColor: colors.primary,
            color: colors.backgroundPrimary,
            padding: '8px 16px',
            borderRadius: '4px',
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled || !inputValue.trim() ? 0.5 : 1
          }}
        >
          Send
        </button>
      </div>
    </form>
  );
};

export default ChatInput;