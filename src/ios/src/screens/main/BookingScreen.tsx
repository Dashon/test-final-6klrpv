/**
 * BookingScreen Component
 * @version 1.0.0
 * 
 * Main booking screen component for iOS that handles travel booking creation,
 * management, and payment processing with enhanced offline support and accessibility.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Vibration,
  AccessibilityInfo,
  Platform
} from 'react-native';
import { useAccessibilityInfo } from '@react-native-community/hooks'; // ^3.0.0
import {
  Booking,
  BookingStatus,
  PaymentStatus,
  TravellerDetails,
  PaymentSplit,
  AmadeusBookingDetails,
  SyncStatus
} from '../../types/booking';
import useBooking from '../../hooks/useBooking';

// Component Props Interface
interface BookingScreenProps {
  navigation: any;
  route: {
    params: {
      bookingDetails?: AmadeusBookingDetails;
      travellerDetails?: TravellerDetails[];
    };
  };
}

/**
 * BookingScreen Component
 * Handles the creation and management of travel bookings with offline support
 */
const BookingScreen: React.FC<BookingScreenProps> = ({ navigation, route }) => {
  // Hooks and State
  const {
    createNewBooking,
    processBookingPayment,
    loading,
    error,
    syncStatus,
    clearBookingError
  } = useBooking();

  const [bookingState, setBookingState] = useState<{
    details: AmadeusBookingDetails | null;
    travellers: TravellerDetails[];
    paymentSplits: PaymentSplit[];
    processingPayment: boolean;
    offlineMode: boolean;
  }>({
    details: route.params?.bookingDetails || null,
    travellers: route.params?.travellerDetails || [],
    paymentSplits: [],
    processingPayment: false,
    offlineMode: false
  });

  const { isScreenReaderEnabled } = useAccessibilityInfo();

  // Memoized Computed Values
  const totalAmount = useMemo(() => {
    return bookingState.paymentSplits.reduce((sum, split) => sum + split.amount, 0);
  }, [bookingState.paymentSplits]);

  const isValidBooking = useMemo(() => {
    return (
      bookingState.details &&
      bookingState.travellers.length > 0 &&
      totalAmount > 0
    );
  }, [bookingState.details, bookingState.travellers, totalAmount]);

  // Effects
  useEffect(() => {
    if (error) {
      Alert.alert(
        'Booking Error',
        error,
        [{ text: 'OK', onPress: clearBookingError }]
      );
    }
  }, [error, clearBookingError]);

  useEffect(() => {
    const checkOfflineStatus = async () => {
      // Implementation would check network status
      setBookingState(prev => ({
        ...prev,
        offlineMode: syncStatus === SyncStatus.PENDING_SYNC
      }));
    };

    checkOfflineStatus();
  }, [syncStatus]);

  // Handlers
  const handleCreateBooking = useCallback(async () => {
    if (!isValidBooking || !bookingState.details) {
      Alert.alert('Invalid Booking', 'Please complete all required fields');
      return;
    }

    try {
      setBookingState(prev => ({ ...prev, processingPayment: true }));

      const booking = await createNewBooking(
        bookingState.details,
        bookingState.travellers,
        { optimistic: true }
      );

      if (booking) {
        // Provide haptic feedback on successful booking
        if (Platform.OS === 'ios') {
          Vibration.vibrate(400);
        }

        if (!bookingState.offlineMode) {
          await processBookingPayment(booking.id, bookingState.paymentSplits);
        }

        navigation.navigate('BookingConfirmation', {
          bookingId: booking.id,
          offlineMode: bookingState.offlineMode
        });
      }
    } catch (error) {
      Alert.alert(
        'Booking Error',
        'Failed to create booking. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setBookingState(prev => ({ ...prev, processingPayment: false }));
    }
  }, [
    isValidBooking,
    bookingState.details,
    bookingState.travellers,
    bookingState.paymentSplits,
    bookingState.offlineMode,
    createNewBooking,
    processBookingPayment,
    navigation
  ]);

  const handlePaymentValidation = useCallback(async (
    paymentDetails: PaymentSplit
  ): Promise<boolean> => {
    if (paymentDetails.amount <= 0) {
      Alert.alert('Invalid Amount', 'Payment amount must be greater than zero');
      return false;
    }

    if (!paymentDetails.paymentMethod) {
      Alert.alert('Invalid Payment', 'Please select a payment method');
      return false;
    }

    return true;
  }, []);

  // Render Methods
  const renderOfflineIndicator = () => {
    if (!bookingState.offlineMode) return null;

    return (
      <View
        style={styles.offlineIndicator}
        accessibilityRole="alert"
        accessibilityLabel="Offline mode active. Booking will be synced when online."
      >
        <Text style={styles.offlineText}>
          Offline Mode - Booking will sync when online
        </Text>
      </View>
    );
  };

  const renderLoadingOverlay = () => {
    if (!loading && !bookingState.processingPayment) return null;

    return (
      <View
        style={styles.loadingContainer}
        accessibilityRole="progressbar"
        accessibilityLabel="Processing booking"
      >
        <ActivityIndicator size="large" color="#1A73E8" />
        <Text style={styles.loadingText}>
          {bookingState.processingPayment
            ? 'Processing Payment...'
            : 'Creating Booking...'}
        </Text>
      </View>
    );
  };

  // Main Render
  return (
    <View style={styles.container}>
      {renderOfflineIndicator()}
      
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        accessibilityRole="scrollbar"
      >
        {/* Booking Details Section */}
        <View
          style={styles.section}
          accessibilityRole="region"
          accessibilityLabel="Booking Details"
        >
          <Text style={styles.sectionTitle}>Booking Details</Text>
          {/* Booking details form components would be rendered here */}
        </View>

        {/* Payment Section */}
        <View
          style={styles.section}
          accessibilityRole="region"
          accessibilityLabel="Payment Details"
        >
          <Text style={styles.sectionTitle}>Payment Details</Text>
          {/* Payment form components would be rendered here */}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <Text
            style={styles.totalAmount}
            accessibilityRole="text"
            accessibilityLabel={`Total amount ${totalAmount} dollars`}
          >
            Total: ${totalAmount.toFixed(2)}
          </Text>
          
          {/* Booking button with accessibility */}
          <View
            accessibilityRole="button"
            accessibilityLabel={
              isValidBooking
                ? 'Confirm booking'
                : 'Booking button disabled. Please complete all required fields'
            }
            accessibilityState={{ disabled: !isValidBooking }}
          >
            {/* Booking button component would be rendered here */}
          </View>
        </View>
      </ScrollView>

      {renderLoadingOverlay()}
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  scrollContainer: {
    flex: 1
  },
  contentContainer: {
    padding: 16
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#000000'
  },
  actionContainer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 16,
    color: '#000000'
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#1A73E8'
  },
  offlineIndicator: {
    backgroundColor: '#FFA000',
    padding: 8,
    alignItems: 'center'
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  }
});

export default BookingScreen;