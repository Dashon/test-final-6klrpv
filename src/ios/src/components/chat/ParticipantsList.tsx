/**
 * @fileoverview A React Native component that displays a list of participants in a chat room
 * Supports both human users and AI personas with real-time typing indicators
 * @version 1.0.0
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ViewStyle
} from 'react-native';
import { Participant, ParticipantRole } from '../../types/chat';
import { useChat } from '../../hooks/useChat';
import LoadingSpinner from '../shared/LoadingSpinner';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/layout';

/**
 * Props interface for the ParticipantsList component
 */
interface ParticipantsListProps {
  /** Unique identifier of the chat room */
  roomId: string;
  /** Callback function when a participant is pressed */
  onParticipantPress: (participant: Participant) => void;
  /** Optional custom styles for the container */
  style?: ViewStyle;
  /** Test ID for automated testing */
  testID?: string;
}

/**
 * Renders an individual participant item with role indicator and typing status
 */
const ParticipantItem = React.memo<{
  item: Participant;
  onPress: (participant: Participant) => void;
  isTyping: boolean;
}>(({ item, onPress, isTyping }) => {
  const isAI = item.role === ParticipantRole.AI_PERSONA;
  const roleText = isAI ? 'AI Assistant' : item.role.toLowerCase();

  const accessibilityLabel = `${item.userId}${isTyping ? ', currently typing' : ''}${
    isAI ? ', AI Assistant' : `, ${roleText}`
  }`;

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      style={styles.participantItem}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ busy: isTyping }}
      testID={`participant-${item.userId}`}
    >
      <View style={styles.participantInfo}>
        <Text style={styles.participantName} numberOfLines={1}>
          {item.userId}
        </Text>
        <Text
          style={[
            styles.roleIndicator,
            isAI && styles.aiRoleIndicator
          ]}
        >
          {roleText}
        </Text>
      </View>
      {isTyping && (
        <Text style={styles.typingIndicator}>
          typing...
        </Text>
      )}
    </TouchableOpacity>
  );
});

ParticipantItem.displayName = 'ParticipantItem';

/**
 * A component that displays a list of chat room participants with real-time updates
 */
export const ParticipantsList = React.memo<ParticipantsListProps>(({
  roomId,
  onParticipantPress,
  style,
  testID = 'participants-list'
}) => {
  // Get room data and typing status from chat hook
  const { room, typingUsers } = useChat(roomId);

  // Memoized key extractor for FlatList optimization
  const keyExtractor = useCallback((item: Participant) => item.userId, []);

  // Memoized render function for participant items
  const renderItem = useCallback(({ item }: { item: Participant }) => (
    <ParticipantItem
      item={item}
      onPress={onParticipantPress}
      isTyping={typingUsers?.includes(item.userId) || false}
    />
  ), [onParticipantPress, typingUsers]);

  // Show loading state while room data is being fetched
  if (!room) {
    return (
      <View style={[styles.container, style]}>
        <LoadingSpinner
          size="large"
          color={colors.primary.default}
          accessibilityLabel="Loading participants"
        />
      </View>
    );
  }

  return (
    <FlatList
      testID={testID}
      data={room.participants}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      style={[styles.container, style]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={true}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={true}
      accessibilityLabel="Participants list"
      accessibilityRole="list"
    />
  );
});

ParticipantsList.displayName = 'ParticipantsList';

/**
 * Styles optimized with StyleSheet.create
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary
  },
  contentContainer: {
    paddingVertical: spacing.small
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.medium,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.default
  },
  participantInfo: {
    flex: 1,
    marginRight: spacing.small
  },
  participantName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: spacing.small / 2
  },
  roleIndicator: {
    fontSize: 12,
    color: colors.text.secondary,
    textTransform: 'capitalize'
  },
  aiRoleIndicator: {
    color: colors.secondary.default
  },
  typingIndicator: {
    fontSize: 12,
    color: colors.primary.default,
    fontStyle: 'italic'
  }
});

export default ParticipantsList;