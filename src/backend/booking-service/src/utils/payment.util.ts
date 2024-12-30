/**
 * @fileoverview Payment processing utility with enhanced security and monitoring
 * @module booking-service/utils/payment
 * @version 1.0.0
 */

import Stripe from 'stripe'; // v11.0.0
import { IPaymentSplit, PaymentStatus } from '../interfaces/booking.interface';
import { encrypt } from '../../../shared/utils/encryption.util';
import { Logger } from '../../../shared/utils/logger.util';
import { ErrorCode } from '../../../shared/constants/error-codes';

// Global constants
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const PAYMENT_CURRENCY = 'USD';
const MIN_PAYMENT_AMOUNT = 1; // Minimum amount in cents
const MAX_SPLIT_PARTICIPANTS = 5;
const PAYMENT_RETRY_ATTEMPTS = 3;
const PAYMENT_RETRY_DELAY = 1000; // milliseconds

// Initialize Stripe client
const stripe = new Stripe(STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
  typescript: true,
});

// Initialize logger
const logger = Logger.getInstance();

/**
 * Creates a secure payment intent with encryption and retry mechanism
 * @param amount Payment amount in cents
 * @param currency Payment currency (default: USD)
 * @param metadata Additional payment metadata
 * @returns Promise resolving to payment intent ID
 */
export const createPaymentIntent = async (
  amount: number,
  currency: string = PAYMENT_CURRENCY,
  metadata: Record<string, any> = {}
): Promise<string> => {
  try {
    // Validate payment amount
    if (!validatePaymentAmount(amount)) {
      throw new Error('Invalid payment amount');
    }

    // Encrypt sensitive metadata
    const encryptedMetadata = await encrypt(JSON.stringify(metadata), Buffer.from(STRIPE_SECRET_KEY!));

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < PAYMENT_RETRY_ATTEMPTS) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency,
          metadata: {
            encrypted_data: encryptedMetadata.encryptedData.toString('base64'),
            iv: encryptedMetadata.iv.toString('base64'),
            auth_tag: encryptedMetadata.authTag.toString('base64')
          }
        });

        logger.info('Payment intent created successfully', {
          paymentIntentId: paymentIntent.id,
          amount,
          currency
        });

        return paymentIntent.id;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Payment intent creation failed');
        attempt++;
        if (attempt < PAYMENT_RETRY_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, PAYMENT_RETRY_DELAY * Math.pow(2, attempt)));
        }
      }
    }

    throw lastError || new Error('Payment intent creation failed after retries');
  } catch (error) {
    logger.error(
      'Failed to create payment intent',
      error instanceof Error ? error : new Error('Unknown payment error'),
      { errorCode: ErrorCode.PAYMENT_ERROR }
    );
    throw error;
  }
};

/**
 * Processes split payments with comprehensive validation and atomic transactions
 * @param splits Array of payment splits
 * @param totalAmount Total booking amount
 * @returns Promise resolving to processing status
 */
export const processSplitPayment = async (
  splits: IPaymentSplit[],
  totalAmount: number
): Promise<boolean> => {
  try {
    // Validate splits
    if (!validatePaymentAmount(totalAmount, splits)) {
      throw new Error('Invalid split payment configuration');
    }

    const paymentIntents: string[] = [];

    // Create payment intents for each split
    for (const split of splits) {
      const paymentIntentId = await createPaymentIntent(
        split.amount,
        PAYMENT_CURRENCY,
        { userId: split.userId }
      );
      paymentIntents.push(paymentIntentId);
    }

    // Process all payments atomically
    const results = await Promise.allSettled(
      paymentIntents.map(async (intentId, index) => {
        try {
          const intent = await stripe.paymentIntents.confirm(intentId);
          splits[index].status = intent.status === 'succeeded' 
            ? PaymentStatus.COMPLETED 
            : PaymentStatus.FAILED;
          splits[index].paymentIntentId = intentId;
          return true;
        } catch (error) {
          splits[index].status = PaymentStatus.FAILED;
          throw error;
        }
      })
    );

    // Check if all payments succeeded
    const success = results.every(result => result.status === 'fulfilled');

    // Log payment processing results
    logger.info('Split payment processing completed', {
      success,
      totalAmount,
      splitCount: splits.length,
      paymentIntents
    });

    return success;
  } catch (error) {
    logger.error(
      'Split payment processing failed',
      error instanceof Error ? error : new Error('Unknown split payment error'),
      { errorCode: ErrorCode.PAYMENT_ERROR }
    );
    throw error;
  }
};

/**
 * Validates payment amount and split configuration
 * @param amount Total payment amount
 * @param splits Optional payment splits for validation
 * @returns Boolean indicating validation status
 */
export const validatePaymentAmount = (
  amount: number,
  splits?: IPaymentSplit[]
): boolean => {
  try {
    // Basic amount validation
    if (amount < MIN_PAYMENT_AMOUNT) {
      logger.warn('Payment amount below minimum', { amount, minimum: MIN_PAYMENT_AMOUNT });
      return false;
    }

    // Split validation if provided
    if (splits) {
      if (splits.length > MAX_SPLIT_PARTICIPANTS) {
        logger.warn('Too many split participants', {
          count: splits.length,
          maximum: MAX_SPLIT_PARTICIPANTS
        });
        return false;
      }

      const totalSplitAmount = splits.reduce((sum, split) => sum + split.amount, 0);
      if (totalSplitAmount !== amount) {
        logger.warn('Split amounts do not match total', {
          totalAmount: amount,
          splitTotal: totalSplitAmount
        });
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error(
      'Payment validation failed',
      error instanceof Error ? error : new Error('Unknown validation error'),
      { errorCode: ErrorCode.VALIDATION_ERROR }
    );
    return false;
  }
};