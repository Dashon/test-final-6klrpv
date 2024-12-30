import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  PanResponder,
  I18nManager,
  AccessibilityInfo,
  Platform,
  ViewStyle,
  TextStyle,
} from 'react-native';

import { ChatMessage, MessageType, MessageStatus } from '../../types/chat';
import { colors } from '../../constants/colors';
import { formatMessagePreview } from '../../utils/formatting';
import { textStyles, fontSizes } from '../../constants/typography';

// Animation timing constants
const FADE_DURATION = 200;
const SCALE_DURATION = 150;
const SWIPE_THRESHOLD = 50;

interface ChatBubbleProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  onPress?: (message: ChatMessage) => void;
  onLongPress?: (message: ChatMessage) => void;
  onSwipe?: (message: ChatMessage, direction: 'left' | 'right') => void;
  isDarkMode?: boolean;
}

/**
 * Enhanced chat bubble component with animation, gesture support, and accessibility
 */
export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isCurrentUser,
  onPress,
  onLongPress,
  onSwipe,
  isDarkMode = false,
}) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const swipeAnim = useRef(new Animated.Value(0)).current;

  // RTL support
  const isRTL = I18nManager.isRTL;

  // PanResponder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        swipeAnim.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) >= SWIPE_THRESHOLD && onSwipe) {
          const direction = gestureState.dx > 0 ? 'right' : 'left';
          onSwipe(message, direction);
        }
        Animated.spring(swipeAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  // Entry animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: SCALE_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Get message style based on type and user
  const getMessageStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      maxWidth: '80%',
      marginVertical: 2,
      marginHorizontal: 12,
      borderRadius: 16,
      padding: 12,
    };

    const alignment: ViewStyle = {
      alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
      marginLeft: isCurrentUser ? 50 : 12,
      marginRight: isCurrentUser ? 12 : 50,
    };

    let backgroundColor = colors.background.secondary;
    
    switch (message.type) {
      case MessageType.AI_RESPONSE:
        backgroundColor = isDarkMode ? colors.primary.darkMode.surface : colors.primary.surface;
        break;
      case MessageType.SYSTEM:
        backgroundColor = isDarkMode ? colors.background.darkMode.tertiary : colors.background.tertiary;
        break;
      case MessageType.TRAVEL_PLAN:
        backgroundColor = isDarkMode ? colors.secondary.darkMode.surface : colors.secondary.surface;
        break;
      default:
        backgroundColor = isCurrentUser 
          ? (isDarkMode ? colors.primary.darkMode.default : colors.primary.default)
          : (isDarkMode ? colors.background.darkMode.secondary : colors.background.secondary);
    }

    return {
      ...baseStyle,
      ...alignment,
      backgroundColor,
    };
  };

  // Render message content with proper formatting
  const renderMessageContent = () => {
    const textColor = isCurrentUser && message.type === MessageType.TEXT
      ? colors.text.inverse
      : (isDarkMode ? colors.text.darkMode.primary : colors.text.primary);

    const contentStyle: TextStyle = {
      ...textStyles.body,
      color: textColor,
    };

    const formattedContent = formatMessagePreview(
      message.content.text,
      undefined,
      message.type
    );

    return (
      <Text
        style={contentStyle}
        accessible={true}
        accessibilityLabel={`Message: ${formattedContent}`}
        accessibilityRole="text"
      >
        {formattedContent}
      </Text>
    );
  };

  // Render status indicator for sent messages
  const renderStatusIndicator = () => {
    if (!isCurrentUser) return null;

    let statusIcon = '✓';
    let statusLabel = 'Sent';

    switch (message.status) {
      case MessageStatus.DELIVERED:
        statusIcon = '✓✓';
        statusLabel = 'Delivered';
        break;
      case MessageStatus.READ:
        statusIcon = '✓✓';
        statusLabel = 'Read';
        break;
      case MessageStatus.FAILED:
        statusIcon = '!';
        statusLabel = 'Failed to send';
        break;
      case MessageStatus.PENDING:
        statusIcon = '○';
        statusLabel = 'Sending';
        break;
    }

    return (
      <Text
        style={[
          styles.statusIndicator,
          { color: isDarkMode ? colors.text.darkMode.tertiary : colors.text.tertiary }
        ]}
        accessible={true}
        accessibilityLabel={statusLabel}
        accessibilityRole="text"
      >
        {statusIcon}
      </Text>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { translateX: swipeAnim }
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress?.(message)}
        onLongPress={() => onLongPress?.(message)}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Chat message from ${isCurrentUser ? 'you' : 'other'}`}
        accessibilityHint="Double tap to interact with message"
      >
        <View style={getMessageStyle()}>
          {renderMessageContent()}
          {renderStatusIndicator()}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 2,
  },
  statusIndicator: {
    fontSize: fontSizes.xs,
    alignSelf: 'flex-end',
    marginTop: 4,
    marginRight: 4,
  },
});

export default ChatBubble;