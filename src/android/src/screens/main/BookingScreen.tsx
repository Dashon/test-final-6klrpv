/**
 * @fileoverview Main booking screen component for Android mobile app
 * Implements comprehensive booking management with offline support,
 * split payments, and real-time inventory validation
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Alert,
  RefreshControl,
  VirtualizedList,
  useColorScheme,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import { useErrorBoundary } from 'react-error-boundary';
import { useNetworkStatus } from '@react-native-community/netinfo';

// Internal imports
import BookingCard from '../../components/booking/BookingCard';
import PaymentSplit from '../../components/booking/PaymentSplit';
import { useBooking } from '../../hooks/useBooking';
import { colors } from '../../constants/colors';
import { textStyles } from '../../constants/typography';
import { Booking, BookingStatus } from '../../types/booking';
import { formatCurrency } from '../../utils/formatting';

/**
 * Props interface for BookingScreen component
 */
interface BookingScreenProps {
  navigation: NavigationProp<MainStackParamList>;
  route: RouteProp<MainStackParamList, 'Booking'>;
}

/**
 * Main booking screen component with enhanced offline support and accessibility
 */
const BookingScreen: React.FC<BookingScreenProps> = ({ navigation, route }) => {
  // Hooks and state
  const {
    bookings,
    loading,
    error,
    isOffline,
    pendingSyncs,
    createBooking,
    updateBooking,
    cancelBooking,
    validateInventory,
    processSplitPayment,
  } = useBooking();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const listRef = useRef<VirtualizedList<Booking>>(null);
  const { showBoundary } = useErrorBoundary();
  const { isConnected } = useNetworkStatus();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  /**
   * Handles booking selection with accessibility feedback
   */
  const handleBookingPress = useCallback(async (booking: Booking) => {
    try {
      setSelectedBooking(booking);

      // Check inventory status if online
      if (isConnected) {
        const status = await validateInventory(booking.id);
        if (status === 'unavailable') {
          Alert.alert(
            'Booking Unavailable',
            'This booking is no longer available. Please try another option.'
          );
          return;
        }
      }

      // Provide accessibility feedback
      if (Platform.OS === 'android') {
        AccessibilityInfo.announceForAccessibility(
          `Selected booking for ${booking.totalAmount} ${booking.currency}`
        );
      }

      navigation.navigate('BookingDetails', { bookingId: booking.id });
    } catch (error) {
      showBoundary(error);
    }
  }, [isConnected, navigation, validateInventory]);

  /**
   * Handles booking cancellation with offline support
   */
  const handleCancelBooking = useCallback(async (booking: Booking) => {
    try {
      Alert.alert(
        'Cancel Booking',
        'Are you sure you want to cancel this booking?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            style: 'destructive',
            onPress: async () => {
              await cancelBooking(booking.id);
              AccessibilityInfo.announceForAccessibility('Booking cancelled successfully');
            },
          },
        ]
      );
    } catch (error) {
      showBoundary(error);
    }
  }, [cancelBooking]);

  /**
   * Handles pull-to-refresh with offline sync
   */
  const handleRefresh = useCallback(async () => {
    if (!isConnected) {
      Alert.alert('Offline Mode', 'Unable to refresh while offline');
      return;
    }

    setRefreshing(true);
    try {
      await Promise.all([
        fetchBookings(),
        pendingSyncs > 0 ? syncOfflineBookings() : Promise.resolve(),
      ]);
    } catch (error) {
      showBoundary(error);
    } finally {
      setRefreshing(false);
    }
  }, [isConnected, pendingSyncs]);

  /**
   * Renders individual booking item with optimization
   */
  const renderBookingItem = useCallback(({ item }: { item: Booking }) => (
    <BookingCard
      booking={item}
      onPress={handleBookingPress}
      onCancelPress={handleCancelBooking}
      testID={`booking-card-${item.id}`}
      accessibilityLabel={`Booking for ${formatCurrency(item.totalAmount, item.currency)}`}
    />
  ), [handleBookingPress, handleCancelBooking]);

  /**
   * Memoized empty state component
   */
  const EmptyState = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Text
        style={[
          styles.emptyText,
          isDarkMode && styles.darkMode.text,
        ]}
        accessibilityRole="text"
      >
        {isOffline
          ? 'Bookings will sync when back online'
          : 'No bookings found. Start planning your trip!'}
      </Text>
    </View>
  ), [isOffline, isDarkMode]);

  /**
   * Offline indicator component
   */
  const OfflineIndicator = useMemo(() => (
    isOffline ? (
      <View style={styles.offlineIndicator}>
        <Text style={styles.offlineText} accessibilityRole="alert">
          Offline Mode - Changes will sync when connected
        </Text>
      </View>
    ) : null
  ), [isOffline]);

  return (
    <View style={[
      styles.container,
      isDarkMode && styles.darkMode.container,
    ]}>
      {OfflineIndicator}

      <VirtualizedList
        ref={listRef}
        data={bookings}
        renderItem={renderBookingItem}
        keyExtractor={(item: Booking) => item.id}
        getItem={(data, index) => data[index]}
        getItemCount={(data) => data.length}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary.default]}
          />
        }
        ListEmptyComponent={EmptyState}
        contentContainerStyle={styles.listContent}
        initialNumToRender={5}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        testID="booking-list"
        accessibilityRole="list"
        accessibilityLabel="List of bookings"
      />

      {error && (
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  listContent: {
    padding: 16,
    minHeight: '100%',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  errorText: {
    ...textStyles.body,
    color: colors.error.default,
    textAlign: 'center',
    padding: 16,
  },
  offlineIndicator: {
    backgroundColor: colors.warning.surface,
    padding: 8,
    alignItems: 'center',
  },
  offlineText: {
    ...textStyles.caption,
    color: colors.warning.text,
  },
  darkMode: {
    container: {
      backgroundColor: colors.background.darkMode.primary,
    },
    text: {
      color: colors.text.darkMode.primary,
    },
  },
});

export default BookingScreen;