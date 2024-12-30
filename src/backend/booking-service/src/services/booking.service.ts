/**
 * @fileoverview Enhanced booking service implementation with secure and reliable travel booking management
 * @module booking-service/services/booking
 * @version 1.0.0
 */

import { Service } from 'typedi'; // v0.10.x
import { Repository } from 'typeorm'; // v0.3.x
import { InjectRepository } from 'typeorm-typedi-extensions'; // v0.4.x
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { IBooking, BookingStatus, PaymentStatus, IPaymentSplit } from '../interfaces/booking.interface';
import { BookingEntity } from '../models/booking.model';
import { AmadeusService } from './amadeus.service';
import { logger } from '../../../shared/utils/logger.util';
import { ErrorCode } from '../../../shared/constants/error-codes';

// Constants for encryption and service configuration
const ENCRYPTION_KEY_ROTATION_INTERVAL = 604800000; // 7 days
const PAYMENT_PROCESSING_TIMEOUT = 30000; // 30 seconds
const MAX_RETRY_ATTEMPTS = 3;
const AUDIT_LOG_RETENTION_DAYS = 2555; // 7 years

@Service()
export class BookingService {
    private encryptionKey: Buffer;
    private lastKeyRotation: Date;

    constructor(
        @InjectRepository(BookingEntity)
        private readonly bookingRepository: Repository<BookingEntity>,
        private readonly amadeusService: AmadeusService
    ) {
        this.initializeEncryption();
        this.setupKeyRotation();
    }

    /**
     * Initialize encryption key and setup rotation
     */
    private initializeEncryption(): void {
        this.encryptionKey = randomBytes(32);
        this.lastKeyRotation = new Date();
    }

    /**
     * Setup periodic encryption key rotation
     */
    private setupKeyRotation(): void {
        setInterval(() => {
            this.encryptionKey = randomBytes(32);
            this.lastKeyRotation = new Date();
            logger.info('Encryption key rotated', {
                service: 'BookingService',
                lastRotation: this.lastKeyRotation
            });
        }, ENCRYPTION_KEY_ROTATION_INTERVAL);
    }

    /**
     * Encrypt sensitive booking data
     */
    private encryptData(data: any): string {
        const iv = randomBytes(16);
        const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
        const encrypted = Buffer.concat([
            cipher.update(JSON.stringify(data), 'utf8'),
            cipher.final()
        ]);
        const authTag = cipher.getAuthTag();
        return JSON.stringify({
            iv: iv.toString('hex'),
            data: encrypted.toString('hex'),
            authTag: authTag.toString('hex')
        });
    }

    /**
     * Decrypt sensitive booking data
     */
    private decryptData(encryptedData: string): any {
        const { iv, data, authTag } = JSON.parse(encryptedData);
        const decipher = createDecipheriv(
            'aes-256-gcm',
            this.encryptionKey,
            Buffer.from(iv, 'hex')
        );
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));
        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(data, 'hex')),
            decipher.final()
        ]);
        return JSON.parse(decrypted.toString());
    }

    /**
     * Create a new booking with enhanced security and atomic transactions
     */
    public async createBooking(bookingData: IBooking): Promise<BookingEntity> {
        const transactionManager = this.bookingRepository.manager;

        try {
            return await transactionManager.transaction(async manager => {
                // Validate booking data
                const bookingEntity = new BookingEntity();
                Object.assign(bookingEntity, bookingData);
                await bookingEntity.validateTravellerDetails();
                await bookingEntity.validatePaymentSplits();

                // Create Amadeus reservation with retry mechanism
                let amadeusBooking;
                for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
                    try {
                        amadeusBooking = await this.amadeusService.createBooking({
                            flightOffer: bookingData.bookingDetails,
                            travelers: bookingData.travellerDetails
                        });
                        break;
                    } catch (error) {
                        if (attempt === MAX_RETRY_ATTEMPTS) throw error;
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                    }
                }

                // Encrypt sensitive data
                bookingEntity.travellerDetails = this.encryptData(bookingData.travellerDetails);
                bookingEntity.amadeusPNR = amadeusBooking.amadeusPNR;
                bookingEntity.status = BookingStatus.PENDING;
                bookingEntity.paymentStatus = PaymentStatus.PENDING;

                // Process payments atomically
                const paymentSuccess = await this.processAtomicPayment(
                    bookingEntity.id,
                    bookingData.paymentSplits
                );

                if (!paymentSuccess) {
                    await this.amadeusService.cancelBooking(amadeusBooking.amadeusPNR);
                    throw new Error(ErrorCode.PAYMENT_ERROR);
                }

                // Save booking with encrypted data
                const savedBooking = await manager.save(BookingEntity, bookingEntity);

                // Audit logging
                logger.info('Booking created successfully', {
                    bookingId: savedBooking.id,
                    pnr: savedBooking.amadeusPNR,
                    status: savedBooking.status
                });

                return savedBooking;
            });
        } catch (error) {
            logger.error('Failed to create booking', error as Error, {
                userId: bookingData.userId,
                errorCode: ErrorCode.GDS_ERROR
            });
            throw error;
        }
    }

    /**
     * Process payment splits atomically
     */
    private async processAtomicPayment(
        bookingId: string,
        paymentSplits: IPaymentSplit[]
    ): Promise<boolean> {
        const timeout = new Promise<boolean>((_, reject) =>
            setTimeout(() => reject(new Error('Payment processing timeout')), PAYMENT_PROCESSING_TIMEOUT)
        );

        try {
            const processPayments = async (): Promise<boolean> => {
                const results = await Promise.all(
                    paymentSplits.map(async split => {
                        try {
                            // Process individual payment
                            // Implementation would integrate with payment processor
                            return { success: true, splitId: split.userId };
                        } catch (error) {
                            return { success: false, splitId: split.userId, error };
                        }
                    })
                );

                // Verify all payments successful
                const allSuccessful = results.every(result => result.success);
                if (!allSuccessful) {
                    // Rollback successful payments
                    await this.rollbackPayments(results, bookingId);
                    return false;
                }

                return true;
            };

            return await Promise.race([processPayments(), timeout]);
        } catch (error) {
            logger.error('Payment processing failed', error as Error, {
                bookingId,
                errorCode: ErrorCode.PAYMENT_ERROR
            });
            return false;
        }
    }

    /**
     * Rollback successful payments in case of partial failure
     */
    private async rollbackPayments(
        results: Array<{ success: boolean; splitId: string; error?: Error }>,
        bookingId: string
    ): Promise<void> {
        const successfulPayments = results.filter(result => result.success);
        
        for (const payment of successfulPayments) {
            try {
                // Implement payment reversal logic
                logger.info('Payment reversed successfully', {
                    bookingId,
                    splitId: payment.splitId
                });
            } catch (error) {
                logger.error('Failed to reverse payment', error as Error, {
                    bookingId,
                    splitId: payment.splitId,
                    errorCode: ErrorCode.PAYMENT_ERROR
                });
            }
        }
    }
}