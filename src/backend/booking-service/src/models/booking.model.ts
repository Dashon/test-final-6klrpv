/**
 * @fileoverview TypeORM entity model for booking records with comprehensive management features
 * @module booking-service/models/booking
 * @version 1.0.0
 */

import { 
  Entity, 
  Column, 
  Index, 
  BaseEntity,
  BeforeInsert,
  BeforeUpdate,
  AfterLoad,
  Check
} from 'typeorm'; // v0.3.x
import { EncryptedColumn } from 'typeorm-encrypted'; // v0.8.x
import { 
  IBooking, 
  BookingStatus, 
  PaymentStatus, 
  ITravellerDetails,
  IPaymentSplit,
  MAX_TRAVELLERS,
  MAX_PAYMENT_SPLITS,
  MIN_BOOKING_AMOUNT,
  MAX_BOOKING_AMOUNT,
  DEFAULT_CURRENCY,
  isValidPaymentSplit,
  isTravellerDetailsComplete
} from '../interfaces/booking.interface';
import { ErrorCode } from '../../../shared/constants/error-codes';

/**
 * TypeORM entity class for booking records with comprehensive validation and encryption
 */
@Entity('bookings')
@Index('IDX_BOOKING_USER', ['userId'])
@Index('IDX_BOOKING_STATUS', ['status', 'paymentStatus'])
@Index('IDX_BOOKING_PNR', ['amadeusPNR'], { unique: true })
@Index('IDX_BOOKING_DATES', ['createdAt', 'updatedAt'])
@Index('IDX_BOOKING_PARTITION', ['partitionKey'])
@Check(`"totalAmount" >= ${MIN_BOOKING_AMOUNT} AND "totalAmount" <= ${MAX_BOOKING_AMOUNT}`)
export class BookingEntity extends BaseEntity implements IBooking {
  @Column({ type: 'uuid', nullable: false })
  userId: string;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING
  })
  status: BookingStatus;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING
  })
  paymentStatus: PaymentStatus;

  @Column({ type: 'varchar', length: 6, unique: true })
  amadeusPNR: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value)
    }
  })
  totalAmount: number;

  @Column({ 
    type: 'varchar', 
    length: 3, 
    default: DEFAULT_CURRENCY 
  })
  currency: string;

  @EncryptedColumn({
    type: 'jsonb',
    encrypt: {
      key: process.env.TRAVELLER_ENCRYPTION_KEY,
      algorithm: 'aes-256-gcm',
      ivLength: 16
    }
  })
  travellerDetails: ITravellerDetails[];

  @Column({ type: 'jsonb' })
  paymentSplits: IPaymentSplit[];

  @Column({ type: 'jsonb' })
  bookingDetails: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  gdsResponse: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  cancellationPolicy: string;

  @Column({ type: 'timestamp with time zone' })
  lastSyncTimestamp: Date;

  @Column({ type: 'timestamp with time zone' })
  expiryDate: Date;

  @Column({ type: 'varchar', length: 7 })
  partitionKey: string;

  @Column({ type: 'timestamp with time zone' })
  createdAt: Date;

  @Column({ type: 'timestamp with time zone' })
  updatedAt: Date;

  /**
   * Validates payment splits against business rules
   * @throws {Error} If validation fails
   */
  validatePaymentSplits(): boolean {
    if (!this.paymentSplits || this.paymentSplits.length === 0) {
      throw new Error(ErrorCode.VALIDATION_ERROR);
    }

    if (this.paymentSplits.length > MAX_PAYMENT_SPLITS) {
      throw new Error(`Maximum ${MAX_PAYMENT_SPLITS} payment splits allowed`);
    }

    const totalSplitAmount = this.paymentSplits.reduce(
      (sum, split) => sum + split.amount,
      0
    );

    if (Math.abs(totalSplitAmount - this.totalAmount) > 0.01) {
      throw new Error('Payment splits total must equal booking amount');
    }

    return isValidPaymentSplit(this.paymentSplits);
  }

  /**
   * Updates booking status with validation
   * @param newStatus New booking status
   * @param reason Reason for status change
   */
  async updateStatus(newStatus: BookingStatus, reason: string): Promise<void> {
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
      [BookingStatus.CONFIRMED]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
      [BookingStatus.CANCELLED]: [],
      [BookingStatus.COMPLETED]: []
    };

    if (!validTransitions[this.status].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
    }

    this.status = newStatus;
    this.updatedAt = new Date();

    // Log status change for audit
    await this.logStatusChange(reason);
  }

  /**
   * Calculates partition key for time-based partitioning
   * Format: YYYY-MM
   */
  calculatePartitionKey(): string {
    const date = this.createdAt || new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Validates traveller details before save
   */
  @BeforeInsert()
  @BeforeUpdate()
  validateTravellerDetails(): void {
    if (!this.travellerDetails || 
        this.travellerDetails.length === 0 || 
        this.travellerDetails.length > MAX_TRAVELLERS) {
      throw new Error(`Invalid number of travellers. Maximum ${MAX_TRAVELLERS} allowed`);
    }

    if (!this.travellerDetails.every(isTravellerDetailsComplete)) {
      throw new Error('Incomplete traveller details');
    }
  }

  /**
   * Sets partition key before insert
   */
  @BeforeInsert()
  setPartitionKey(): void {
    this.partitionKey = this.calculatePartitionKey();
  }

  /**
   * Updates timestamps before save
   */
  @BeforeInsert()
  @BeforeUpdate()
  updateTimestamps(): void {
    this.updatedAt = new Date();
    if (!this.createdAt) {
      this.createdAt = new Date();
    }
  }

  /**
   * Logs status changes for audit purposes
   */
  private async logStatusChange(reason: string): Promise<void> {
    // Implementation of audit logging
    // This would typically write to a separate audit log table
    console.log(`Booking ${this.amadeusPNR} status changed to ${this.status}: ${reason}`);
  }
}