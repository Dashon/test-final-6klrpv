/**
 * @fileoverview Advanced booking controller with comprehensive validation, monitoring, and security
 * @module booking-service/controllers/booking
 * @version 1.0.0
 */

import { 
    Controller, 
    Get, 
    Post, 
    Put, 
    Delete, 
    Body, 
    Param,
    UseGuards,
    UseInterceptors,
    UsePipes,
    Headers
} from '@nestjs/common'; // v9.x
import { 
    ApiTags, 
    ApiOperation, 
    ApiResponse,
    ApiBearerAuth,
    ApiHeader 
} from '@nestjs/swagger'; // v6.x
import { BookingService } from '../services/booking.service';
import { IBooking, BookingStatus, PaymentStatus } from '../interfaces/booking.interface';
import { logger } from '../../../shared/utils/logger.util';
import { ErrorCode } from '../../../shared/constants/error-codes';
import { HttpStatus } from '../../../shared/constants/status-codes';
import { AuthGuard } from '../../../shared/guards/auth.guard';
import { ThrottleGuard } from '../../../shared/guards/throttle.guard';
import { LoggingInterceptor } from '../../../shared/interceptors/logging.interceptor';
import { MetricsService } from '../../../shared/services/metrics.service';
import { CircuitBreakerInterceptor } from '../../../shared/interceptors/circuit-breaker.interceptor';

@Controller('bookings')
@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(AuthGuard, ThrottleGuard)
@UseInterceptors(LoggingInterceptor, CircuitBreakerInterceptor)
export class BookingController {
    constructor(
        private readonly bookingService: BookingService,
        private readonly metricsService: MetricsService
    ) {}

    /**
     * Create a new booking with comprehensive validation
     */
    @Post()
    @ApiOperation({ summary: 'Create new booking' })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Booking created successfully' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid booking data' })
    @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
    @ApiHeader({ name: 'x-correlation-id', required: true })
    async createBooking(
        @Body() bookingData: IBooking,
        @Headers('x-correlation-id') correlationId: string
    ): Promise<IBooking> {
        try {
            // Start performance monitoring
            const startTime = Date.now();
            
            // Log request
            logger.info('Creating new booking', {
                correlationId,
                userId: bookingData.userId,
                travellerCount: bookingData.travellerDetails?.length
            });

            // Create booking with service
            const booking = await this.bookingService.createBooking(bookingData);

            // Record metrics
            this.metricsService.recordBookingCreation({
                duration: Date.now() - startTime,
                status: 'success',
                amount: booking.totalAmount
            });

            return booking;
        } catch (error) {
            // Record failure metrics
            this.metricsService.recordBookingCreation({
                status: 'failure',
                errorCode: (error as Error).name
            });

            logger.error('Failed to create booking', error as Error, {
                correlationId,
                userId: bookingData.userId,
                errorCode: ErrorCode.GDS_ERROR
            });

            throw error;
        }
    }

    /**
     * Retrieve booking details with security checks
     */
    @Get(':id')
    @ApiOperation({ summary: 'Get booking details' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Booking details retrieved' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Booking not found' })
    async getBooking(
        @Param('id') bookingId: string,
        @Headers('x-correlation-id') correlationId: string
    ): Promise<IBooking> {
        try {
            const booking = await this.bookingService.getBooking(bookingId);

            logger.info('Booking details retrieved', {
                correlationId,
                bookingId,
                status: booking.status
            });

            return booking;
        } catch (error) {
            logger.error('Failed to retrieve booking', error as Error, {
                correlationId,
                bookingId
            });
            throw error;
        }
    }

    /**
     * Update booking status with validation
     */
    @Put(':id/status')
    @ApiOperation({ summary: 'Update booking status' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Booking status updated' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid status transition' })
    async updateBookingStatus(
        @Param('id') bookingId: string,
        @Body('status') status: BookingStatus,
        @Headers('x-correlation-id') correlationId: string
    ): Promise<IBooking> {
        try {
            const booking = await this.bookingService.updateBookingStatus(bookingId, status);

            logger.info('Booking status updated', {
                correlationId,
                bookingId,
                oldStatus: booking.status,
                newStatus: status
            });

            return booking;
        } catch (error) {
            logger.error('Failed to update booking status', error as Error, {
                correlationId,
                bookingId,
                status
            });
            throw error;
        }
    }

    /**
     * Cancel booking with refund handling
     */
    @Delete(':id')
    @ApiOperation({ summary: 'Cancel booking' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Booking cancelled successfully' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot cancel booking' })
    async cancelBooking(
        @Param('id') bookingId: string,
        @Headers('x-correlation-id') correlationId: string
    ): Promise<IBooking> {
        try {
            const startTime = Date.now();
            
            const booking = await this.bookingService.cancelBooking(bookingId);

            // Record cancellation metrics
            this.metricsService.recordBookingCancellation({
                duration: Date.now() - startTime,
                status: 'success',
                bookingAge: Date.now() - booking.createdAt.getTime()
            });

            logger.info('Booking cancelled successfully', {
                correlationId,
                bookingId,
                refundStatus: booking.paymentStatus === PaymentStatus.REFUNDED
            });

            return booking;
        } catch (error) {
            // Record failure metrics
            this.metricsService.recordBookingCancellation({
                status: 'failure',
                errorCode: (error as Error).name
            });

            logger.error('Failed to cancel booking', error as Error, {
                correlationId,
                bookingId
            });
            throw error;
        }
    }
}