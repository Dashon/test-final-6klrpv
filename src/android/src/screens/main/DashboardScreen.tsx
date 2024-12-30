/**
 * @fileoverview Main dashboard screen component for Android mobile app
 * Displays active AI personas, recent bookings, and provides quick access to key platform features
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
  AccessibilityInfo,
} from 'react-native'; // v0.71.x
import { useNavigation, useIsFocused } from '@react-navigation/native'; // ^6.x

// Internal imports
import PersonaCard from '../../components/persona/PersonaCard';
import BookingCard from '../../components/booking/BookingCard';
import { usePersona } from '../../hooks/usePersona';
import { useBooking } from '../../hooks/useBooking';
import { colors } from '../../constants/colors';
import { getResponsiveSpacing } from '../../utils/responsive';
import type { Persona } from '../../types/persona';
import type { Booking } from '../../types/booking';

/**
 * Main dashboard screen component with enhanced features and accessibility
 */
const DashboardScreen = React.memo(() => {
  // Hooks
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const dimensions = useWindowDimensions();
  const {
    personas,
    activePersona,
    loading: personaLoading,
    error: personaError,
  } = usePersona();
  const {
    bookings,
    loading: bookingLoading,
    error: bookingError,
    refreshBookings,
  } = useBooking();

  // Local state for refresh control
  const [refreshing, setRefreshing] = React.useState(false);

  /**
   * Handle navigation to persona details screen
   */
  const handlePersonaPress = useCallback((persona: Persona) => {
    navigation.navigate('PersonaDetails', { personaId: persona.id });
  }, [navigation]);

  /**
   * Handle navigation to booking details screen
   */
  const handleBookingPress = useCallback((booking: Booking) => {
    navigation.navigate('BookingDetails', { bookingId: booking.id });
  }, [navigation]);

  /**
   * Handle booking cancellation
   */
  const handleBookingCancel = useCallback(async (booking: Booking) => {
    try {
      await bookingService.cancelBooking(booking.id);
      refreshBookings();
    } catch (error) {
      console.error('Failed to cancel booking:', error);
    }
  }, [refreshBookings]);

  /**
   * Handle pull-to-refresh functionality
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshBookings(),
        personaService.syncNow(),
      ]);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshBookings]);

  /**
   * Update accessibility announcements when data changes
   */
  useEffect(() => {
    if (isFocused) {
      const announcement = `Dashboard loaded with ${personas.length} personas and ${bookings.length} bookings`;
      AccessibilityInfo.announceForAccessibility(announcement);
    }
  }, [isFocused, personas.length, bookings.length]);

  /**
   * Memoized responsive styles
   */
  const responsiveStyles = useMemo(() => ({
    content: {
      padding: getResponsiveSpacing(4),
      paddingBottom: getResponsiveSpacing(8),
    },
    personaSection: {
      marginBottom: getResponsiveSpacing(6),
    },
    bookingSection: {
      marginBottom: getResponsiveSpacing(4),
    },
  }), [dimensions]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={responsiveStyles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary.default]}
          progressBackgroundColor={colors.background.primary}
        />
      }
      accessibilityRole="scrollview"
      accessibilityLabel="Dashboard main content"
    >
      {/* Error states */}
      {(personaError || bookingError) && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {personaError || bookingError}
          </Text>
        </View>
      )}

      {/* Personas section */}
      <View style={responsiveStyles.personaSection}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Your AI Personas
        </Text>
        {personaLoading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Loading personas...</Text>
          </View>
        ) : personas.length > 0 ? (
          personas.map((persona) => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              onPress={handlePersonaPress}
              style={styles.personaCard}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No personas yet. Create your first AI persona to get started!
            </Text>
          </View>
        )}
      </View>

      {/* Recent bookings section */}
      <View style={responsiveStyles.bookingSection}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Recent Bookings
        </Text>
        {bookingLoading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Loading bookings...</Text>
          </View>
        ) : bookings.length > 0 ? (
          bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onPress={handleBookingPress}
              onCancelPress={handleBookingCancel}
              style={styles.bookingCard}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No bookings found. Start planning your next trip!
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
});

// Display name for debugging
DashboardScreen.displayName = 'DashboardScreen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: colors.text.primary,
    accessibilityRole: 'header',
  },
  personaCard: {
    marginBottom: 12,
  },
  bookingCard: {
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: colors.error.surface,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: colors.error.text,
    fontSize: 14,
  },
});

export default DashboardScreen;