/**
 * @fileoverview iOS-optimized BookingCard component for displaying booking information
 * with enhanced accessibility support and native platform features.
 * @version 1.0.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Animated,
  AccessibilityInfo,
  AccessibilityRole,
  ViewStyle,
  Platform,
  LayoutAnimation,
} from 'react-native';

import {
  Booking,
  BookingStatus,
  PaymentStatus,
  isBookingModifiable,
} from '../../types/booking';

interface BookingCardProps {
  booking: Booking;
  onStatusChange?: (bookingId: string, status: BookingStatus) => void;
  onPaymentComplete?: (bookingId: string, success: boolean) => void;
  style?: ViewStyle;
  testID?: string;
}

/**
 * Custom hook for managing component animations
 */
const useAnimatedValues = () => {
  const scale = useMemo(() => new Animated.Value(1), []);
  const opacity = useMemo(() => new Animated.Value(1), []);

  const animatePress = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 0.98,
        useNativeDriver: true,
        tension: 100,
        friction: 7,
      }),
      Animated.timing(opacity, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, opacity]);

  const animateRelease = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 7,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, opacity]);

  return { scale, opacity, animatePress, animateRelease };
};

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onStatusChange,
  onPaymentComplete,
  style,
  testID,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { scale, opacity, animatePress, animateRelease } = useAnimatedValues();

  const handleStatusChange = useCallback(async (newStatus: BookingStatus) => {
    if (!isBookingModifiable(booking.status)) {
      Alert.alert(
        'Status Change Error',
        'This booking cannot be modified in its current state.'
      );
      return;
    }

    try {
      setIsLoading(true);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      
      // Notify screen readers of the status change
      AccessibilityInfo.announceForAccessibility(
        `Booking status changing to ${newStatus}`
      );

      onStatusChange?.(booking.id, newStatus);
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to update booking status. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [booking, onStatusChange]);

  const getStatusColor = useMemo(() => {
    const colors = {
      [BookingStatus.PENDING]: '#FFA500',
      [BookingStatus.CONFIRMED]: '#4CAF50',
      [BookingStatus.CANCELLED]: '#F44336',
      [BookingStatus.COMPLETED]: '#2196F3',
    };
    return colors[booking.status];
  }, [booking.status]);

  const formatCurrency = useCallback((amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }, []);

  const accessibilityLabel = useMemo(() => {
    return `Booking ${booking.amadeusPNR}, Status: ${booking.status}, 
    Amount: ${formatCurrency(booking.totalAmount, booking.currency)}, 
    Destination: ${booking.bookingDetails.destination}`;
  }, [booking, formatCurrency]);

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        { transform: [{ scale }], opacity },
      ]}
      testID={testID}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ busy: isLoading }}
    >
      <TouchableOpacity
        onPressIn={animatePress}
        onPressOut={animateRelease}
        disabled={isLoading}
        style={styles.touchable}
      >
        <View style={styles.header}>
          <Text
            style={[styles.pnr, styles.dynamicText]}
            accessibilityRole="text"
          >
            {booking.amadeusPNR}
          </Text>
          <View
            style={[styles.statusBadge, { backgroundColor: getStatusColor }]}
          >
            <Text style={styles.statusText}>{booking.status}</Text>
          </View>
        </View>

        <View style={styles.details}>
          <Text
            style={[styles.destination, styles.dynamicText]}
            accessibilityRole="text"
          >
            {`${booking.bookingDetails.origin} → ${booking.bookingDetails.destination}`}
          </Text>
          <Text
            style={[styles.date, styles.dynamicText]}
            accessibilityRole="text"
          >
            {new Date(booking.bookingDetails.departureDate).toLocaleDateString()}
          </Text>
          <Text
            style={[styles.amount, styles.dynamicText]}
            accessibilityRole="text"
          >
            {formatCurrency(booking.totalAmount, booking.currency)}
          </Text>
        </View>

        {booking.paymentStatus === PaymentStatus.PENDING && (
          <TouchableOpacity
            style={styles.paymentButton}
            onPress={() => onPaymentComplete?.(booking.id, true)}
            accessibilityRole="button"
            accessibilityLabel="Complete payment"
          >
            <Text style={styles.paymentButtonText}>Complete Payment</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  touchable: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pnr: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  details: {
    gap: 8,
  },
  destination: {
    fontSize: 16,
    fontWeight: '500',
  },
  date: {
    fontSize: 14,
    color: '#666666',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  paymentButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  paymentButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dynamicText: {
    fontSize: Platform.select({ ios: 16, android: 14 }),
    fontWeight: '500',
    color: '#000000',
  },
});

export default BookingCard;