/**
 * @fileoverview Payment split component for group bookings in Android app
 * Implements secure payment splitting with offline support and validation
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  useColorScheme,
} from 'react-native';
import Input from '../shared/Input';
import { PaymentStatus } from '../../types/booking';
import { colors } from '../../constants/colors';
import { fontSizes, textStyles } from '../../constants/typography';
import { formatCurrency } from '../../utils/formatting';

// Constants for payment validation
const MIN_SPLIT_AMOUNT = 0.01;
const MAX_PROCESSING_FEE_RATE = 0.05;
const OFFLINE_SYNC_INTERVAL = 300000; // 5 minutes

interface PaymentSplitProps {
  totalAmount: number;
  participants: Array<{ id: string; name: string }>;
  onSplitUpdate: (splits: PaymentSplit[]) => void;
  currency?: string;
  processingFeeRate?: number;
  dueDate?: Date;
  isOffline?: boolean;
}

/**
 * PaymentSplit component handles the distribution of payment amounts
 * among multiple participants with validation and processing fee calculation
 */
const PaymentSplit: React.FC<PaymentSplitProps> = ({
  totalAmount,
  participants,
  onSplitUpdate,
  currency = 'USD',
  processingFeeRate = 0.029,
  dueDate,
  isOffline = false,
}) => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  // State for split amounts and validation
  const [splits, setSplits] = useState<PaymentSplit[]>(() =>
    participants.map((participant) => ({
      userId: participant.id,
      amount: 0,
      currency,
      status: PaymentStatus.PENDING,
      processingFee: 0,
      dueDate: dueDate?.toISOString() || new Date().toISOString(),
      paymentIntentId: '',
      paymentMethod: '',
    }))
  );

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Calculate remaining amount to be split
  const remainingAmount = useMemo(() => {
    const totalSplit = splits.reduce((sum, split) => sum + split.amount, 0);
    return Number((totalAmount - totalSplit).toFixed(2));
  }, [splits, totalAmount]);

  /**
   * Validates payment splits with enhanced checks
   */
  const validateSplits = useCallback((updatedSplits: PaymentSplit[]): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    // Calculate total split amount
    const totalSplit = updatedSplits.reduce((sum, split) => sum + split.amount, 0);

    // Validate total amount
    if (Math.abs(totalSplit - totalAmount) > 0.01) {
      errors.total = `Total split must equal ${formatCurrency(totalAmount, currency)}`;
      isValid = false;
    }

    // Validate individual splits
    updatedSplits.forEach((split, index) => {
      if (split.amount < MIN_SPLIT_AMOUNT) {
        errors[split.userId] = `Minimum amount is ${formatCurrency(MIN_SPLIT_AMOUNT, currency)}`;
        isValid = false;
      }

      // Validate processing fee calculation
      const expectedFee = Number((split.amount * processingFeeRate).toFixed(2));
      if (Math.abs(split.processingFee - expectedFee) > 0.01) {
        errors[`${split.userId}_fee`] = 'Invalid processing fee';
        isValid = false;
      }
    });

    setValidationErrors(errors);
    return isValid;
  }, [totalAmount, currency, processingFeeRate]);

  /**
   * Handles changes to individual split amounts
   */
  const handleSplitChange = useCallback((userId: string, amount: string) => {
    const numericAmount = Number(amount) || 0;

    setSplits((prevSplits) => {
      const updatedSplits = prevSplits.map((split) => {
        if (split.userId === userId) {
          const processingFee = Number((numericAmount * processingFeeRate).toFixed(2));
          return {
            ...split,
            amount: numericAmount,
            processingFee,
            status: PaymentStatus.PENDING,
          };
        }
        return split;
      });

      // Validate and update splits
      if (validateSplits(updatedSplits)) {
        onSplitUpdate(updatedSplits);
      }

      return updatedSplits;
    });
  }, [processingFeeRate, validateSplits, onSplitUpdate]);

  /**
   * Handles equal split calculation
   */
  const handleEqualSplit = useCallback(() => {
    const equalAmount = Number((totalAmount / participants.length).toFixed(2));
    const lastAmount = Number((totalAmount - (equalAmount * (participants.length - 1))).toFixed(2));

    setSplits((prevSplits) => {
      const updatedSplits = prevSplits.map((split, index) => ({
        ...split,
        amount: index === prevSplits.length - 1 ? lastAmount : equalAmount,
        processingFee: Number(((index === prevSplits.length - 1 ? lastAmount : equalAmount) * processingFeeRate).toFixed(2)),
        status: PaymentStatus.PENDING,
      }));

      if (validateSplits(updatedSplits)) {
        onSplitUpdate(updatedSplits);
      }

      return updatedSplits;
    });
  }, [totalAmount, participants.length, processingFeeRate, validateSplits, onSplitUpdate]);

  // Handle offline sync
  useEffect(() => {
    let syncInterval: NodeJS.Timeout;

    if (isOffline) {
      syncInterval = setInterval(() => {
        // Attempt to sync with server
        if (validateSplits(splits)) {
          onSplitUpdate(splits);
        }
      }, OFFLINE_SYNC_INTERVAL);
    }

    return () => {
      if (syncInterval) {
        clearInterval(syncInterval);
      }
    };
  }, [isOffline, splits, validateSplits, onSplitUpdate]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[
          textStyles.h3,
          isDarkMode && styles.darkMode.text
        ]}>
          Split Payment
        </Text>
        <TouchableOpacity
          onPress={handleEqualSplit}
          style={styles.equalSplitButton}
          accessibilityLabel="Split equally between all participants"
        >
          <Text style={styles.equalSplitButtonText}>Split Equally</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.totalAmount}>
        <Text style={[
          styles.totalAmountText,
          isDarkMode && styles.darkMode.text
        ]}>
          Total: {formatCurrency(totalAmount, currency)}
        </Text>
        <Text style={[
          styles.remainingText,
          remainingAmount > 0 && styles.remainingPositive,
          remainingAmount < 0 && styles.remainingNegative,
          isDarkMode && styles.darkMode.text
        ]}>
          Remaining: {formatCurrency(remainingAmount, currency)}
        </Text>
      </View>

      {participants.map((participant) => {
        const split = splits.find((s) => s.userId === participant.id);
        const error = validationErrors[participant.id];

        return (
          <View key={participant.id} style={styles.splitRow}>
            <Text style={[
              styles.participantName,
              isDarkMode && styles.darkMode.text
            ]}>
              {participant.name}
            </Text>
            <View style={styles.inputContainer}>
              <Input
                value={split?.amount.toString() || ''}
                onChangeText={(text) => handleSplitChange(participant.id, text)}
                label=""
                error={error}
                type="text"
                placeholder="0.00"
                testID={`split-input-${participant.id}`}
                accessibilityLabel={`Payment amount for ${participant.name}`}
              />
              <Text style={[
                styles.processingFee,
                isDarkMode && styles.darkMode.text
              ]}>
                Fee: {formatCurrency(split?.processingFee || 0, currency)}
              </Text>
            </View>
          </View>
        );
      })}

      {Object.keys(validationErrors).length > 0 && (
        <Text style={styles.errorSummary}>
          Please correct the errors above to continue
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  equalSplitButton: {
    backgroundColor: colors.primary.default,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  equalSplitButtonText: {
    color: colors.text.inverse,
    fontSize: fontSizes.sm,
    fontWeight: '500',
  },
  totalAmount: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
  },
  totalAmountText: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.text.primary,
  },
  remainingText: {
    fontSize: fontSizes.md,
    marginTop: 8,
    color: colors.text.secondary,
  },
  remainingPositive: {
    color: colors.success.default,
  },
  remainingNegative: {
    color: colors.error.default,
  },
  splitRow: {
    marginBottom: 16,
  },
  participantName: {
    fontSize: fontSizes.md,
    marginBottom: 8,
    color: colors.text.primary,
  },
  inputContainer: {
    flexDirection: 'column',
  },
  processingFee: {
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
    marginTop: 4,
  },
  errorSummary: {
    color: colors.error.default,
    fontSize: fontSizes.sm,
    marginTop: 16,
    textAlign: 'center',
  },
  darkMode: {
    text: {
      color: colors.text.darkMode.primary,
    },
  },
});

export default PaymentSplit;