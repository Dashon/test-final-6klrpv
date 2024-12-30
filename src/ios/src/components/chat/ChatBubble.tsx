import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AccessibilityInfo,
  useColorScheme,
  Platform,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';

import { ChatMessage, MessageType, MessageStatus } from '../../types/chat';
import { colors } from '../../constants/colors';
import { textStyles, getScaledFontSize } from '../../constants/typography';

interface ChatBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  onPress?: (message: ChatMessage) => void;
  onLongPress?: (message: ChatMessage) => void;
  isRTL?: boolean;
  accessibilityLabel?: string;
}

const getBubbleStyle = (
  type: MessageType,
  isOwnMessage: boolean,
  isDarkMode: boolean,
  isRTL: boolean
): StyleProp<ViewStyle> => {
  const baseStyle: ViewStyle = {
    maxWidth: '80%',
    minHeight: 44, // Minimum touch target size
    borderRadius: 16,
    padding: 12,
    marginVertical: 4,
    marginHorizontal: 12,
    alignSelf: isRTL ? (isOwnMessage ? 'flex-start' : 'flex-end') 
                    : (isOwnMessage ? 'flex-end' : 'flex-start'),
  };

  // Platform-specific shadow properties
  if (Platform.OS === 'ios') {
    Object.assign(baseStyle, {
      shadowColor: isDarkMode ? colors.background.dark.primary : colors.text.primary,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
    });
  } else {
    Object.assign(baseStyle, {
      elevation: 2,
    });
  }

  // Type-specific styles
  switch (type) {
    case MessageType.AI_RESPONSE:
      return {
        ...baseStyle,
        backgroundColor: isDarkMode ? colors.background.dark.secondary : colors.secondary.light,
        borderBottomLeftRadius: isOwnMessage ? 16 : 4,
        borderBottomRightRadius: isOwnMessage ? 4 : 16,
      };
    case MessageType.SYSTEM:
      return {
        ...baseStyle,
        backgroundColor: isDarkMode ? colors.background.dark.tertiary : colors.background.tertiary,
        alignSelf: 'center',
        maxWidth: '90%',
      };
    case MessageType.TRAVEL_PLAN:
      return {
        ...baseStyle,
        backgroundColor: isDarkMode ? colors.background.dark.secondary : colors.primary.light,
        borderRadius: 12,
      };
    default:
      return {
        ...baseStyle,
        backgroundColor: isOwnMessage
          ? (isDarkMode ? colors.primary.dark : colors.primary.default)
          : (isDarkMode ? colors.background.dark.secondary : colors.background.secondary),
      };
  }
};

const getTextStyle = (
  type: MessageType,
  isDarkMode: boolean,
  isOwnMessage: boolean
): StyleProp<TextStyle> => {
  const baseStyle: TextStyle = {
    ...textStyles.body,
    fontSize: getScaledFontSize(16),
    lineHeight: 22,
  };

  switch (type) {
    case MessageType.SYSTEM:
      return {
        ...baseStyle,
        color: isDarkMode ? colors.text.dark.secondary : colors.text.secondary,
        textAlign: 'center',
        fontStyle: 'italic',
      };
    case MessageType.AI_RESPONSE:
      return {
        ...baseStyle,
        color: isDarkMode ? colors.text.dark.primary : colors.text.primary,
      };
    case MessageType.TRAVEL_PLAN:
      return {
        ...baseStyle,
        color: isDarkMode ? colors.text.dark.primary : colors.text.primary,
        fontWeight: Platform.select({ ios: '600', default: 'bold' }),
      };
    default:
      return {
        ...baseStyle,
        color: isOwnMessage
          ? colors.primary.contrast
          : (isDarkMode ? colors.text.dark.primary : colors.text.primary),
      };
  }
};

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isOwnMessage,
  onPress,
  onLongPress,
  isRTL = false,
  accessibilityLabel,
}) => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const bubbleStyle = useMemo(
    () => getBubbleStyle(message.type, isOwnMessage, isDarkMode, isRTL),
    [message.type, isOwnMessage, isDarkMode, isRTL]
  );

  const textStyle = useMemo(
    () => getTextStyle(message.type, isDarkMode, isOwnMessage),
    [message.type, isDarkMode, isOwnMessage]
  );

  const renderMessageStatus = () => {
    if (!isOwnMessage) return null;

    const statusStyle = [
      styles.status,
      { alignSelf: isRTL ? 'flex-start' : 'flex-end' },
    ];

    let statusText = '';
    switch (message.status) {
      case MessageStatus.SENT:
        statusText = '✓';
        break;
      case MessageStatus.DELIVERED:
        statusText = '✓✓';
        break;
      case MessageStatus.READ:
        statusText = '✓✓';
        statusStyle.push(styles.statusRead);
        break;
      case MessageStatus.FAILED:
        statusText = '!';
        statusStyle.push(styles.statusFailed);
        break;
    }

    return (
      <Text
        style={statusStyle}
        accessibilityLabel={`Message ${message.status.toLowerCase()}`}
        accessibilityRole="text"
      >
        {statusText}
      </Text>
    );
  };

  const renderMessageContent = () => {
    const content = message.content.text;
    
    if (message.type === MessageType.TRAVEL_PLAN) {
      return (
        <View>
          <Text style={textStyle} accessibilityRole="text">
            {content}
          </Text>
          {message.content.metadata?.location && (
            <Text
              style={[textStyle, styles.metadata]}
              accessibilityRole="text"
            >
              📍 {message.content.metadata.location}
            </Text>
          )}
        </View>
      );
    }

    return (
      <Text style={textStyle} accessibilityRole="text">
        {content}
      </Text>
    );
  };

  return (
    <TouchableOpacity
      onPress={() => onPress?.(message)}
      onLongPress={() => onLongPress?.(message)}
      activeOpacity={0.7}
      accessibilityLabel={accessibilityLabel || `Message: ${message.content.text}`}
      accessibilityRole="button"
      accessibilityHint={onPress ? "Double tap to interact with message" : undefined}
      accessible={true}
    >
      <View style={bubbleStyle}>
        {renderMessageContent()}
        {renderMessageStatus()}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  status: {
    ...textStyles.caption,
    fontSize: getScaledFontSize(12),
    marginTop: 4,
    marginHorizontal: 2,
    color: colors.text.secondary,
  },
  statusRead: {
    color: colors.primary.default,
  },
  statusFailed: {
    color: colors.error.default,
  },
  metadata: {
    marginTop: 4,
    fontSize: getScaledFontSize(14),
    color: colors.text.secondary,
  },
});

export default ChatBubble;