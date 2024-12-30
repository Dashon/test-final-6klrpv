import React, { useState, useCallback, useEffect } from 'react';
import classnames from 'classnames';
import { PaymentSplit as IPaymentSplit, PaymentStatus } from '../../../types/booking';
import Input from '../../shared/Input/Input';
import { formatCurrency } from '../../../utils/formatting';
import { useBooking } from '../../../hooks/useBooking';
import { BOOKING_VALIDATION } from '../../../constants/validation';
import { colors, typography } from '../../../constants/theme';

export interface PaymentSplitProps {
  bookingId: string;
  totalAmount: number;
  currency: string;
  participants: Array<{ id: string; name: string; status: PaymentStatus }>;
  onSplitComplete: (splits: IPaymentSplit[], status: PaymentStatus) => void;
  minPaymentAmount?: number;
}

/**
 * PaymentSplit Component
 * 
 * A comprehensive component for managing split payments in group bookings.
 * Supports real-time validation, multiple currencies, and status tracking.
 *
 * @version 1.0.0
 */
const PaymentSplit: React.FC<PaymentSplitProps> = ({
  bookingId,
  totalAmount,
  currency,
  participants,
  onSplitComplete,
  minPaymentAmount = BOOKING_VALIDATION.minPaymentAmount
}) => {
  // State management
  const [splits, setSplits] = useState<IPaymentSplit[]>(() =>
    participants.map(p => ({
      userId: p.id,
      amount: 0,
      currency,
      status: PaymentStatus.PENDING,
      paymentIntentId: '',
      paymentMethod: '',
      splitPercentage: 0,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    }))
  );

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [remainingAmount, setRemainingAmount] = useState(totalAmount);

  // Custom hook for booking operations
  const { processSplitPayment, loading, error } = useBooking();

  // Validation helper
  const validateSplits = useCallback(() => {
    const errors: Record<string, string> = {};
    const totalSplit = splits.reduce((sum, split) => sum + split.amount, 0);

    if (Math.abs(totalSplit - totalAmount) > 0.01) {
      errors.total = `Total split must equal ${formatCurrency(totalAmount, currency)}`;
    }

    splits.forEach(split => {
      if (split.amount < minPaymentAmount) {
        errors[split.userId] = `Minimum payment amount is ${formatCurrency(minPaymentAmount, currency)}`;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [splits, totalAmount, currency, minPaymentAmount]);

  // Handle split amount changes
  const handleSplitChange = useCallback((userId: string, amount: number) => {
    setSplits(prevSplits => {
      const newSplits = prevSplits.map(split => {
        if (split.userId === userId) {
          return {
            ...split,
            amount,
            splitPercentage: (amount / totalAmount) * 100
          };
        }
        return split;
      });

      const newTotal = newSplits.reduce((sum, split) => sum + split.amount, 0);
      setRemainingAmount(totalAmount - newTotal);

      return newSplits;
    });
  }, [totalAmount]);

  // Handle split payment submission
  const handleSplitSubmit = async () => {
    if (!validateSplits()) {
      return;
    }

    try {
      await processSplitPayment(bookingId, splits);
      onSplitComplete(splits, PaymentStatus.COMPLETED);
    } catch (err) {
      // Error handling is managed by useBooking hook
      console.error('Split payment failed:', err);
    }
  };

  // Equal split helper
  const handleEqualSplit = useCallback(() => {
    const equalAmount = Number((totalAmount / participants.length).toFixed(2));
    const roundingDiff = totalAmount - (equalAmount * participants.length);

    setSplits(prevSplits =>
      prevSplits.map((split, index) => ({
        ...split,
        amount: index === 0 ? equalAmount + roundingDiff : equalAmount,
        splitPercentage: (equalAmount / totalAmount) * 100
      }))
    );
    setRemainingAmount(0);
  }, [totalAmount, participants.length]);

  return (
    <div className="payment-split-container p-4 rounded-lg border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold" style={{ fontFamily: typography.fontFamilyUI }}>
          Split Payment
        </h3>
        <button
          onClick={handleEqualSplit}
          className="text-sm text-primary hover:text-primaryDark transition-colors"
          style={{ color: colors.primary }}
        >
          Split Equally
        </button>
      </div>

      <div className="space-y-4">
        {splits.map((split, index) => {
          const participant = participants.find(p => p.id === split.userId);
          return (
            <div key={split.userId} className="flex items-center space-x-4">
              <div className="flex-1">
                <Input
                  type="number"
                  label={participant?.name}
                  value={split.amount.toString()}
                  onChange={(value) => handleSplitChange(split.userId, Number(value))}
                  error={validationErrors[split.userId]}
                  placeholder="0.00"
                  required
                  inputMode="decimal"
                />
              </div>
              <div className="text-sm text-gray-500">
                {formatCurrency(split.amount, currency)}
                <div className="text-xs">
                  {split.splitPercentage.toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {remainingAmount > 0 && (
        <div className="mt-4 p-2 bg-warningLight bg-opacity-10 rounded">
          <span className="text-sm text-warning">
            Remaining: {formatCurrency(remainingAmount, currency)}
          </span>
        </div>
      )}

      {error?.payment && (
        <div className="mt-4 p-2 bg-errorLight bg-opacity-10 rounded">
          <span className="text-sm text-error">
            {error.payment.message}
          </span>
        </div>
      )}

      <div className="mt-6">
        <button
          onClick={handleSplitSubmit}
          disabled={loading.payment || Object.keys(validationErrors).length > 0}
          className={classnames(
            'w-full py-2 px-4 rounded transition-colors',
            'text-white font-medium',
            {
              'bg-primary hover:bg-primaryDark': !loading.payment,
              'bg-gray-400 cursor-not-allowed': loading.payment
            }
          )}
          style={{
            backgroundColor: loading.payment ? colors.textSecondary : colors.primary
          }}
        >
          {loading.payment ? 'Processing...' : 'Confirm Split Payment'}
        </button>
      </div>
    </div>
  );
};

export default PaymentSplit;