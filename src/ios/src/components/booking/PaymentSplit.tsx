/**
 * @fileoverview Enhanced payment split component for iOS booking system
 * Implements split payment functionality with accessibility and validation
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AccessibilityInfo,
  Animated,
  Platform,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// Internal imports
import { PaymentSplit as IPaymentSplit, PaymentStatus } from '../../types/booking';
import { useBooking } from '../../hooks/useBooking';
import Input from '../shared/Input';
import { colors } from '../../constants/colors';
import { fontSizes, textStyles } from '../../constants/typography';

/**
 * Props interface for the PaymentSplit component
 */
interface PaymentSplitProps {
  bookingId: string;
  totalAmount: number;
  participants: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  onSplitComplete: (success: boolean, data?: PaymentResult) => void;
  maxSplitLimit?: number;
}

/**
 * Interface for payment validation result
 */
interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Interface for payment result data
 */
interface PaymentResult {
  success: boolean;
  transactionId?: string;
  splits: IPaymentSplit[];
}

/**
 * Enhanced PaymentSplit component with accessibility and validation
 */
const PaymentSplit: React.FC<PaymentSplitProps> = ({
  bookingId,
  totalAmount,
  participants,
  onSplitComplete,
  maxSplitLimit = 5
}) => {
  // State management
  const [splits, setSplits] = useState<IPaymentSplit[]>([]);
  const [remainingAmount, setRemainingAmount] = useState(totalAmount);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [shakeAnimation] = useState(new Animated.Value(0));

  // Custom hooks
  const { processPayment } = useBooking();

  /**
   * Initialize splits based on participants
   */
  useEffect(() => {
    const initialSplits = participants.map(participant => ({
      userId: participant.id,
      amount: 0,
      status: PaymentStatus.PENDING,
      paymentIntentId: '',
      paymentMethod: '',
      processingFee: 0
    }));
    setSplits(initialSplits);
  }, [participants]);

  /**
   * Validates split amounts with comprehensive checks
   */
  const validateSplits = useMemo(() => {
    return (currentSplits: IPaymentSplit[]): ValidationResult => {
      const errors: Record<string, string> = {};
      const totalSplit = currentSplits.reduce((sum, split) => sum + split.amount, 0);

      // Check total amount
      if (Math.abs(totalSplit - totalAmount) > 0.01) {
        errors.total = `Total split amount must equal ${totalAmount}`;
      }

      // Validate individual splits
      currentSplits.forEach((split, index) => {
        if (split.amount < 0) {
          errors[`split_${index}`] = 'Amount cannot be negative';
        }
        if (split.amount === 0) {
          errors[`split_${index}`] = 'Amount is required';
        }
      });

      // Check split limit
      if (currentSplits.filter(split => split.amount > 0).length > maxSplitLimit) {
        errors.limit = `Maximum ${maxSplitLimit} splits allowed`;
      }

      return {
        isValid: Object.keys(errors).length === 0,
        errors
      };
    };
  }, [totalAmount, maxSplitLimit]);

  /**
   * Handles amount change with validation and haptic feedback
   */
  const handleAmountChange = useCallback((userId: string, amount: string) => {
    const numericAmount = parseFloat(amount) || 0;

    ReactNativeHapticFeedback.trigger('impactLight', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false
    });

    setSplits(prevSplits => {
      const updatedSplits = prevSplits.map(split =>
        split.userId === userId ? { ...split, amount: numericAmount } : split
      );
      
      const newTotal = updatedSplits.reduce((sum, split) => sum + split.amount, 0);
      setRemainingAmount(totalAmount - newTotal);
      
      return updatedSplits;
    });

    // Announce remaining amount for accessibility
    AccessibilityInfo.announceForAccessibility(
      `Remaining amount: ${remainingAmount.toFixed(2)}`
    );
  }, [totalAmount, remainingAmount]);

  /**
   * Triggers error animation with haptic feedback
   */
  const triggerErrorAnimation = useCallback(() => {
    ReactNativeHapticFeedback.trigger('notificationError', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false
    });

    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();
  }, [shakeAnimation]);

  /**
   * Handles payment submission with validation
   */
  const handleSubmit = useCallback(async () => {
    const validation = validateSplits(splits);

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      triggerErrorAnimation();
      return;
    }

    setIsLoading(true);
    try {
      await processPayment(bookingId, splits);
      
      ReactNativeHapticFeedback.trigger('notificationSuccess', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false
      });

      onSplitComplete(true, {
        success: true,
        transactionId: `${bookingId}-${Date.now()}`,
        splits
      });
    } catch (error) {
      triggerErrorAnimation();
      onSplitComplete(false);
    } finally {
      setIsLoading(false);
    }
  }, [bookingId, splits, validateSplits, processPayment, onSplitComplete]);

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Split Payment
      </Text>

      <Animated.View style={[styles.splitContainer, { transform: [{ translateX: shakeAnimation }] }]}>
        {participants.map((participant, index) => (
          <View 
            key={participant.id}
            style={styles.participantRow}
            accessibilityRole="group"
            accessibilityLabel={`Payment split for ${participant.name}`}
          >
            <Text style={styles.participantName}>{participant.name}</Text>
            <Input
              value={splits[index]?.amount.toString() || ''}
              onChangeText={(value) => handleAmountChange(participant.id, value)}
              keyboardType="decimal-pad"
              placeholder="0.00"
              error={validationErrors[`split_${index}`]}
              accessibilityLabel={`Enter amount for ${participant.name}`}
              accessibilityHint="Enter the split amount in dollars"
              testID={`split-input-${participant.id}`}
            />
          </View>
        ))}

        {remainingAmount > 0 && (
          <Text style={styles.remainingText} accessibilityRole="text">
            Remaining: ${remainingAmount.toFixed(2)}
          </Text>
        )}

        {Object.keys(validationErrors).length > 0 && (
          <Text style={styles.errorText} accessibilityRole="alert">
            {Object.values(validationErrors)[0]}
          </Text>
        )}
      </Animated.View>

      <TouchableOpacity
        style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityLabel="Confirm split payment"
        accessibilityState={{ disabled: isLoading }}
      >
        <Text style={styles.submitButtonText}>
          {isLoading ? 'Processing...' : 'Confirm Split'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: colors.overlay.light,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
      }
    })
  },
  title: {
    ...textStyles.h2,
    marginBottom: 24
  },
  splitContainer: {
    marginBottom: 24
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  participantName: {
    ...textStyles.body,
    flex: 1,
    marginRight: 16
  },
  remainingText: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginTop: 8
  },
  errorText: {
    ...textStyles.caption,
    color: colors.error.default,
    marginTop: 8
  },
  submitButton: {
    backgroundColor: colors.primary.default,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  submitButtonDisabled: {
    backgroundColor: colors.primary.light,
    opacity: 0.7
  },
  submitButtonText: {
    ...textStyles.body,
    color: colors.primary.contrast,
    fontWeight: '600'
  }
});

export default PaymentSplit;