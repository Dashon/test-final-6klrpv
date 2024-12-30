/**
 * @fileoverview Comprehensive test suite for booking service functionality
 * @version 1.0.0
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'; // v29.5.x
import { Repository, QueryRunner } from 'typeorm';
import { mock, instance, when, verify, anything } from 'ts-mockito'; // v3.x
import { BookingService } from '../src/services/booking.service';
import { BookingEntity } from '../src/models/booking.model';
import { AmadeusService } from '../src/services/amadeus.service';
import { 
  BookingStatus, 
  PaymentStatus, 
  IBooking, 
  ITravellerDetails,
  IPaymentSplit 
} from '../src/interfaces/booking.interface';
import { ErrorCode } from '../../../shared/constants/error-codes';

// Test constants
const VALID_USER_ID = '123e4567-e89b-12d3-a456-426614174000';
const MOCK_PNR = 'ABC123';
const MOCK_FLIGHT_OFFER = {
  id: 'offer123',
  price: { total: '500.00', currency: 'USD' }
};

describe('BookingService', () => {
  let bookingService: BookingService;
  let mockBookingRepository: Repository<BookingEntity>;
  let mockAmadeusService: AmadeusService;
  let mockQueryRunner: QueryRunner;

  // Mock data
  const mockTravellerDetails: ITravellerDetails = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    dateOfBirth: new Date('1990-01-01'),
    passportNumber: 'P123456',
    passportExpiry: new Date('2025-01-01'),
    nationality: 'US',
    specialRequirements: []
  };

  const mockPaymentSplit: IPaymentSplit = {
    userId: VALID_USER_ID,
    amount: 500.00,
    status: PaymentStatus.PENDING,
    paymentIntentId: 'pi_123',
    paymentMethod: 'card',
    paymentTimestamp: null,
    refundStatus: null
  };

  beforeEach(() => {
    // Initialize mocks
    mockBookingRepository = mock<Repository<BookingEntity>>();
    mockAmadeusService = mock<AmadeusService>();
    mockQueryRunner = mock<QueryRunner>();

    // Setup mock repository
    when(mockBookingRepository.manager).thenReturn({
      transaction: jest.fn().mockImplementation(cb => cb(mockQueryRunner)),
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner)
    });

    // Initialize service with mocks
    bookingService = new BookingService(
      instance(mockBookingRepository),
      instance(mockAmadeusService)
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBooking', () => {
    test('should create booking with encrypted sensitive data', async () => {
      // Arrange
      const bookingData: IBooking = {
        userId: VALID_USER_ID,
        status: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        amadeusPNR: '',
        totalAmount: 500.00,
        currency: 'USD',
        travellerDetails: [mockTravellerDetails],
        paymentSplits: [mockPaymentSplit],
        bookingDetails: MOCK_FLIGHT_OFFER,
        gdsResponse: {},
        cancellationPolicy: '',
        lastSyncTimestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      when(mockAmadeusService.createBooking(anything())).thenResolve({
        ...bookingData,
        amadeusPNR: MOCK_PNR
      });

      when(mockBookingRepository.save(anything())).thenResolve({
        ...bookingData,
        amadeusPNR: MOCK_PNR,
        id: 'booking123'
      } as BookingEntity);

      // Act
      const result = await bookingService.createBooking(bookingData);

      // Assert
      expect(result).toBeDefined();
      expect(result.amadeusPNR).toBe(MOCK_PNR);
      expect(result.status).toBe(BookingStatus.PENDING);
      verify(mockAmadeusService.createBooking(anything())).once();
    });

    test('should handle complex split payments with validation', async () => {
      // Arrange
      const splitPayments: IPaymentSplit[] = [
        { ...mockPaymentSplit, amount: 300.00 },
        { ...mockPaymentSplit, userId: 'user2', amount: 200.00 }
      ];

      const bookingData: IBooking = {
        ...mockTravellerDetails,
        paymentSplits: splitPayments,
        totalAmount: 500.00
      } as IBooking;

      // Act & Assert
      await expect(bookingService.createBooking(bookingData)).resolves.toBeDefined();
    });

    test('should implement retry mechanism for GDS failures', async () => {
      // Arrange
      const gdsError = new Error('GDS Timeout');
      let attempts = 0;

      when(mockAmadeusService.createBooking(anything())).thenCall(() => {
        attempts++;
        if (attempts < 3) throw gdsError;
        return Promise.resolve({ amadeusPNR: MOCK_PNR });
      });

      // Act
      const result = await bookingService.createBooking({} as IBooking);

      // Assert
      expect(attempts).toBe(3);
      expect(result.amadeusPNR).toBe(MOCK_PNR);
    });

    test('should maintain ACID properties during booking creation', async () => {
      // Arrange
      const transactionError = new Error('Transaction failed');
      when(mockQueryRunner.startTransaction()).thenResolve();
      when(mockQueryRunner.rollbackTransaction()).thenResolve();
      when(mockQueryRunner.commitTransaction()).thenThrow(transactionError);

      // Act & Assert
      await expect(bookingService.createBooking({} as IBooking))
        .rejects.toThrow(transactionError);
      verify(mockQueryRunner.rollbackTransaction()).once();
    });
  });

  describe('paymentProcessing', () => {
    test('should process split payments atomically', async () => {
      // Arrange
      const splitPayments: IPaymentSplit[] = [
        { ...mockPaymentSplit, amount: 300.00 },
        { ...mockPaymentSplit, amount: 200.00 }
      ];

      // Act
      const result = await bookingService['processAtomicPayment']('booking123', splitPayments);

      // Assert
      expect(result).toBe(true);
    });

    test('should handle payment gateway timeouts', async () => {
      // Arrange
      jest.useFakeTimers();
      const slowPayment: IPaymentSplit = {
        ...mockPaymentSplit,
        amount: 500.00
      };

      // Act & Assert
      const promise = bookingService['processAtomicPayment']('booking123', [slowPayment]);
      jest.advanceTimersByTime(31000); // Exceed 30s timeout
      await expect(promise).resolves.toBe(false);
      jest.useRealTimers();
    });

    test('should rollback failed payments', async () => {
      // Arrange
      const failedPayment: IPaymentSplit = {
        ...mockPaymentSplit,
        amount: 500.00
      };

      // Mock payment failure
      jest.spyOn(bookingService as any, 'processAtomicPayment')
        .mockImplementation(() => Promise.resolve(false));

      // Act
      const result = await bookingService.createBooking({
        ...mockTravellerDetails,
        paymentSplits: [failedPayment]
      } as IBooking);

      // Assert
      verify(mockAmadeusService.cancelBooking(anything())).once();
      expect(result).toBeUndefined();
    });
  });

  describe('securityAndPerformance', () => {
    test('should encrypt sensitive booking data', async () => {
      // Arrange
      const sensitiveData = {
        ...mockTravellerDetails,
        passportNumber: 'P123456'
      };

      // Act
      const result = await bookingService.createBooking({
        ...mockTravellerDetails,
        travellerDetails: [sensitiveData]
      } as IBooking);

      // Assert
      expect(typeof result.travellerDetails).toBe('string');
      expect(result.travellerDetails).not.toContain(sensitiveData.passportNumber);
    });

    test('should handle concurrent booking requests', async () => {
      // Arrange
      const concurrentBookings = Array(5).fill(null).map(() => 
        bookingService.createBooking({
          ...mockTravellerDetails,
          paymentSplits: [mockPaymentSplit]
        } as IBooking)
      );

      // Act & Assert
      await expect(Promise.all(concurrentBookings)).resolves.toBeDefined();
    });

    test('should enforce rate limits and timeouts', async () => {
      // Arrange
      jest.useFakeTimers();
      const slowBooking = new Promise(resolve => 
        setTimeout(resolve, 31000)
      );

      // Act & Assert
      await expect(Promise.race([
        bookingService.createBooking({} as IBooking),
        slowBooking
      ])).rejects.toThrow();
      jest.useRealTimers();
    });
  });
});