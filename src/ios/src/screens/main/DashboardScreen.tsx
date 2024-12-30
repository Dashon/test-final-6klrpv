/**
 * @fileoverview Main dashboard screen component for iOS mobile app
 * Implements core platform features with enhanced accessibility and performance
 * @version 1.0.0
 */

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  RefreshControl,
  useColorScheme,
  VirtualizedList,
  AccessibilityInfo,
  Platform,
} from 'react-native';

// Internal components
import PersonaCard from '../../components/persona/PersonaCard';
import BookingCard from '../../components/booking/BookingCard';
import ChatBubble from '../../components/chat/ChatBubble';

// Hooks and state management
import { usePersona } from '../../hooks/usePersona';
import { useErrorBoundary } from 'react-error-boundary';

// Types and constants
import { Persona } from '../../types/persona';
import { Booking } from '../../types/booking';
import { ChatMessage } from '../../types/chat';
import { colors } from '../../constants/colors';
import { textStyles, getScaledFontSize } from '../../constants/typography';

interface DashboardScreenProps {
  navigation: any;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  // Theme and accessibility
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { showBoundary } = useErrorBoundary();

  // State management
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [recentChats, setRecentChats] = useState<ChatMessage[]>([]);

  // Persona management
  const {
    personas,
    activePersona,
    setActivePersona,
    loading,
    error,
    clearError
  } = usePersona();

  // Memoized theme colors
  const themeColors = useMemo(() => ({
    background: isDark ? colors.background.dark.primary : colors.background.primary,
    text: isDark ? colors.text.dark.primary : colors.text.primary,
    secondary: isDark ? colors.text.dark.secondary : colors.text.secondary,
  }), [isDark]);

  /**
   * Handles pull-to-refresh functionality with optimistic updates
   */
  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);

      // Parallel data fetching for optimization
      const [personasPromise, bookingsPromise, chatsPromise] = await Promise.allSettled([
        // Fetch latest personas
        new Promise((resolve) => setTimeout(resolve, 1000)), // Simulated API call
        // Fetch recent bookings
        new Promise((resolve) => setTimeout(resolve, 1000)), // Simulated API call
        // Fetch recent chats
        new Promise((resolve) => setTimeout(resolve, 1000)), // Simulated API call
      ]);

      // Handle results and update state
      if (personasPromise.status === 'fulfilled') {
        // Update personas state
      }
      if (bookingsPromise.status === 'fulfilled') {
        // Update bookings state
      }
      if (chatsPromise.status === 'fulfilled') {
        // Update chats state
      }

    } catch (error) {
      showBoundary(error);
    } finally {
      setIsRefreshing(false);
    }
  }, [showBoundary]);

  /**
   * Handles persona selection with accessibility announcement
   */
  const handlePersonaPress = useCallback(async (persona: Persona) => {
    try {
      // Announce change for screen readers
      AccessibilityInfo.announceForAccessibility(
        `Switching to ${persona.name} persona`
      );

      await setActivePersona(persona.id);
      navigation.navigate('PersonaDetail', { personaId: persona.id });
    } catch (error) {
      showBoundary(error);
    }
  }, [setActivePersona, navigation, showBoundary]);

  // Initialize dashboard data
  useEffect(() => {
    handleRefresh();

    // Clear any existing errors on mount
    if (error) {
      clearError();
    }
  }, [handleRefresh, error, clearError]);

  /**
   * Renders the personas section with virtualized list for performance
   */
  const renderPersonasSection = useMemo(() => (
    <View 
      style={styles.section}
      accessibilityRole="region"
      accessibilityLabel="Active Personas"
    >
      <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
        Active Personas
      </Text>
      <VirtualizedList
        data={personas}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item: Persona) => item.id}
        getItem={(data, index) => data[index]}
        getItemCount={(data) => data.length}
        renderItem={({ item }: { item: Persona }) => (
          <PersonaCard
            persona={item}
            isActive={activePersona?.id === item.id}
            onPress={handlePersonaPress}
            isLoading={loading.createPersona}
            error={error?.createPersona ? { message: error.createPersona } : undefined}
          />
        )}
        style={styles.personaList}
        contentContainerStyle={styles.personaListContent}
      />
    </View>
  ), [personas, activePersona, loading, error, handlePersonaPress, themeColors]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={themeColors.text}
        />
      }
      accessibilityRole="scrollView"
      accessibilityLabel="Dashboard"
    >
      <View style={styles.content}>
        {/* Personas Section */}
        {renderPersonasSection}

        {/* Recent Bookings Section */}
        <View 
          style={styles.section}
          accessibilityRole="region"
          accessibilityLabel="Recent Bookings"
        >
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            Recent Bookings
          </Text>
          {recentBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onStatusChange={(id, status) => {
                // Handle booking status change
              }}
            />
          ))}
        </View>

        {/* Recent Chats Section */}
        <View 
          style={styles.section}
          accessibilityRole="region"
          accessibilityLabel="Recent Chats"
        >
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            Recent Chats
          </Text>
          {recentChats.map((message) => (
            <ChatBubble
              key={message.id}
              message={message}
              isOwnMessage={message.senderId === activePersona?.id}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    minHeight: '100%',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...textStyles.h2,
    marginBottom: 12,
  },
  personaList: {
    minHeight: 120,
  },
  personaListContent: {
    paddingHorizontal: 4,
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DashboardScreen;