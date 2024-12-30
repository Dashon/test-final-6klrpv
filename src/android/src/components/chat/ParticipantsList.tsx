/**
 * @fileoverview Enhanced participants list component for chat rooms
 * @version 1.0.0
 * 
 * Displays a list of participants in a chat room with real-time updates,
 * role-based indicators, online status, and accessibility features.
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableNativeFeedback,
  AccessibilityInfo,
  Platform,
  ViewStyle
} from 'react-native';
import { useTheme } from '@react-navigation/native'; // ^6.x
import { Participant } from '../../types/chat';
import { useChat } from '../../hooks/useChat';

/**
 * Props interface for the ParticipantsList component
 */
interface ParticipantsListProps {
  roomId: string;
  onParticipantPress?: (participant: Participant) => void;
  showRoles?: boolean;
  isLoading?: boolean;
  onError?: (error: Error) => void;
  ListEmptyComponent?: React.ComponentType | React.ReactElement;
}

/**
 * Enhanced participants list component with real-time updates and accessibility
 */
const ParticipantsList: React.FC<ParticipantsListProps> = ({
  roomId,
  onParticipantPress,
  showRoles = true,
  isLoading: externalLoading,
  onError,
  ListEmptyComponent
}) => {
  // Theme and chat hooks
  const { colors } = useTheme();
  const { participants, loading: internalLoading, error, refreshParticipants } = useChat(roomId);

  // Combine loading states
  const isLoading = externalLoading || internalLoading;

  // Handle errors
  React.useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  /**
   * Generates accessibility label for participant item
   */
  const getParticipantAccessibilityLabel = useCallback((participant: Participant): string => {
    const parts = [
      participant.userId,
      showRoles ? `Role: ${participant.role}` : '',
      participant.isOnline ? 'Online' : 'Offline',
      participant.isTyping ? 'Currently typing' : ''
    ];
    return parts.filter(Boolean).join(', ');
  }, [showRoles]);

  /**
   * Renders individual participant list item
   */
  const renderParticipant = useCallback(({ item: participant }: { item: Participant }) => {
    const lastSeenText = participant.isOnline ? 
      'Online' : 
      `Last seen ${new Date(participant.lastSeen).toLocaleString()}`;

    const rippleColor = Platform.select({
      android: colors.primary + '20',
      default: undefined
    });

    return (
      <TouchableNativeFeedback
        onPress={() => onParticipantPress?.(participant)}
        background={TouchableNativeFeedback.Ripple(rippleColor, false)}
        accessible={true}
        accessibilityLabel={getParticipantAccessibilityLabel(participant)}
        accessibilityRole="button"
      >
        <View style={[styles.participantItem, { borderBottomColor: colors.border }]}>
          {/* Participant basic info */}
          <View style={styles.participantInfo}>
            <Text style={[styles.participantName, { color: colors.text }]}>
              {participant.userId}
            </Text>
            
            {/* Role badge */}
            {showRoles && (
              <View style={[
                styles.roleBadge,
                { backgroundColor: colors.primary + '20' }
              ]}>
                <Text style={[styles.roleText, { color: colors.primary }]}>
                  {participant.role}
                </Text>
              </View>
            )}
          </View>

          {/* Status indicators */}
          <View style={styles.statusContainer}>
            {participant.isTyping && (
              <Text style={[styles.typingIndicator, { color: colors.text }]}>
                Typing...
              </Text>
            )}
            <Text style={[styles.lastSeen, { color: colors.text }]}>
              {lastSeenText}
            </Text>
            <View style={[
              styles.onlineIndicator,
              { backgroundColor: participant.isOnline ? colors.primary : colors.border }
            ]} />
          </View>
        </View>
      </TouchableNativeFeedback>
    );
  }, [colors, onParticipantPress, showRoles, getParticipantAccessibilityLabel]);

  /**
   * Memoized key extractor
   */
  const keyExtractor = useCallback((participant: Participant) => participant.userId, []);

  /**
   * Empty list component
   */
  const renderEmptyComponent = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={{ color: colors.text }}>Loading participants...</Text>
        </View>
      );
    }
    return ListEmptyComponent || (
      <View style={styles.emptyContainer}>
        <Text style={{ color: colors.text }}>No participants found</Text>
      </View>
    );
  }, [isLoading, ListEmptyComponent, colors.text]);

  return (
    <FlatList
      data={participants}
      renderItem={renderParticipant}
      keyExtractor={keyExtractor}
      ListEmptyComponent={renderEmptyComponent}
      onRefresh={refreshParticipants}
      refreshing={isLoading}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      windowSize={5}
      accessibilityRole="list"
      accessibilityLabel="Participants list"
    />
  );
};

/**
 * Component styles
 */
const styles = StyleSheet.create({
  listContainer: {
    flexGrow: 1,
    paddingVertical: 8
  } as ViewStyle,
  participantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth
  } as ViewStyle,
  participantInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  } as ViewStyle,
  participantName: {
    fontSize: 16,
    fontWeight: '500'
  },
  roleBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  } as ViewStyle,
  roleText: {
    fontSize: 12,
    fontWeight: '600'
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  } as ViewStyle,
  typingIndicator: {
    fontSize: 12,
    marginRight: 8,
    fontStyle: 'italic'
  },
  lastSeen: {
    fontSize: 12,
    marginRight: 8
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4
  } as ViewStyle,
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  } as ViewStyle
});

export default ParticipantsList;