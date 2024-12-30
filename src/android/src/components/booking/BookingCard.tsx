/**
 * @fileoverview Enhanced BookingCard component for Android mobile app
 * Displays booking information with split payment visualization and group coordination
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  AccessibilityInfo,
  Platform,
} from 'react-native'; // v0.71.x

// Internal imports
import Card from '../shared/Card';
import { colors } from '../../constants/colors';
import { Booking, BookingStatus, PaymentStatus } from '../../types/booking';
import { useBooking } from '../../hooks/useBooking';

/**
 * Props interface for BookingCard component
 */
interface BookingCardProps {
  booking: Booking;
  onPress: (booking: Booking) => void;
  onCancelPress?: (booking: Booking) => void;
  onSplitPaymentUpdate?: (bookingId: string, splitPayment: any) => void;
  testID?: string;
  accessibilityLabel?: string;
}

/**
 * Helper function to determine status color based on booking and payment status
 */
const getStatusColor = (status: BookingStatus, paymentStatus: PaymentStatus): string => {
  if (paymentStatus === PaymentStatus.FAILED) {
    return colors.error.default;
  }
  
  switch (status) {
    case BookingStatus.CONFIRMED:
      return colors.success.default;
    case BookingStatus.PENDING:
      return colors.warning.default;
    case BookingStatus.CANCELLED:
      return colors.error.default;
    default:
      return colors.text.secondary;
  }
};

/**
 * Helper function to format split payment information
 */
const formatSplitPayment = (paymentSplits: any[], currency: string): string => {
  const totalPaid = paymentSplits.reduce((sum, split) => 
    sum + (split.status === PaymentStatus.COMPLETED ? split.amount : 0), 0
  );
  const totalAmount = paymentSplits.reduce((sum, split) => sum + split.amount, 0);
  return `${totalPaid}/${totalAmount} ${currency}`;
};

/**
 * Enhanced BookingCard component with split payment and accessibility support
 */
export const BookingCard = React.memo<BookingCardProps>(({
  booking,
  onPress,
  onCancelPress,
  onSplitPaymentUpdate,
  testID = 'booking-card',
  accessibilityLabel,
}) => {
  const { cancelBooking, updateSplitPayment } = useBooking();

  // Memoized status color calculation
  const statusColor = useMemo(() => 
    getStatusColor(booking.status, booking.paymentStatus),
    [booking.status, booking.paymentStatus]
  );

  // Memoized split payment formatting
  const splitPaymentInfo = useMemo(() => 
    booking.paymentSplits ? formatSplitPayment(booking.paymentSplits, booking.currency) : null,
    [booking.paymentSplits, booking.currency]
  );

  /**
   * Handles card press with accessibility feedback
   */
  const handlePress = async () => {
    if (Platform.OS === 'android') {
      AccessibilityInfo.announceForAccessibility(
        `Booking ${booking.id} selected. Status: ${booking.status}`
      );
    }
    onPress(booking);
  };

  /**
   * Handles booking cancellation with confirmation
   */
  const handleCancel = async () => {
    try {
      await cancelBooking(booking.id);
      if (onCancelPress) {
        onCancelPress(booking);
      }
    } catch (error) {
      console.error('Failed to cancel booking:', error);
    }
  };

  return (
    <Card
      testID={testID}
      onPress={handlePress}
      accessibilityLabel={accessibilityLabel || `Booking ${booking.id}`}
      accessibilityRole="button"
      accessibilityHint="Double tap to view booking details"
    >
      <View style={styles.container}>
        {/* Header with status */}
        <View style={styles.header}>
          <View style={[styles.status, { backgroundColor: statusColor }]}>
            <Text
              style={[styles.statusText, { color: colors.text.inverse }]}
              accessibilityRole="text"
            >
              {booking.status}
            </Text>
          </View>
          <Text style={styles.amount} accessibilityRole="text">
            {booking.totalAmount} {booking.currency}
          </Text>
        </View>

        {/* Split payment information */}
        {splitPaymentInfo && (
          <View style={styles.splitPayment}>
            <Text style={styles.splitPaymentText} accessibilityRole="text">
              Split Payment Progress: {splitPaymentInfo}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(booking.paymentSplits?.reduce((sum, split) =>
                      sum + (split.status === PaymentStatus.COMPLETED ? split.amount : 0), 0) /
                      booking.totalAmount) * 100}%`,
                    backgroundColor: colors.success.default,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Group size indicator */}
        {booking.groupSize > 1 && (
          <View style={styles.groupInfo}>
            <Text style={styles.groupText} accessibilityRole="text">
              Group Booking: {booking.groupSize} travelers
            </Text>
          </View>
        )}

        {/* Cancel button for eligible bookings */}
        {booking.status === BookingStatus.PENDING && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel booking"
            accessibilityHint="Double tap to cancel this booking"
          >
            <Text style={styles.cancelButtonText}>Cancel Booking</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
});

// Display name for debugging
BookingCard.displayName = 'BookingCard';

/**
 * Styles for the BookingCard component
 */
const styles = StyleSheet.create({
  container: {
    padding: 16,
    minHeight: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  status: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  splitPayment: {
    marginTop: 8,
    padding: 8,
    borderRadius: 4,
    backgroundColor: colors.background.secondary,
  },
  splitPaymentText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.background.tertiary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  groupInfo: {
    marginTop: 8,
    padding: 8,
    borderRadius: 4,
    backgroundColor: colors.background.tertiary,
  },
  groupText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  cancelButton: {
    marginTop: 12,
    padding: 8,
    borderRadius: 4,
    backgroundColor: colors.error.surface,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: colors.error.default,
    fontWeight: '500',
    fontSize: 16,
  },
});

export default BookingCard;