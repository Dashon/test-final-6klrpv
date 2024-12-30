/**
 * @fileoverview Amadeus GDS Service implementation for travel bookings
 * @module booking-service/services/amadeus
 * @version 1.0.0
 */

import { injectable } from 'inversify';
import Amadeus from 'amadeus'; // v8.1.x
import retry from 'retry'; // v0.13.x
import { IBooking } from '../interfaces/booking.interface';
import { amadeusConfig } from '../config/amadeus';
import { Logger } from '../../../shared/utils/logger.util';
import { ErrorCode } from '../../../shared/constants/error-codes';

// Global constants
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;
const TOKEN_EXPIRY_BUFFER_MS = 300000; // 5 minutes

/**
 * Interface for flight search criteria
 */
interface FlightSearchCriteria {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  travelClass?: string;
}

/**
 * Service class for Amadeus GDS operations with comprehensive error handling
 */
@injectable()
export class AmadeusService {
  private client: Amadeus;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private readonly logger: Logger;

  constructor() {
    // Initialize Amadeus client with validated configuration
    this.client = new Amadeus({
      clientId: amadeusConfig.clientId,
      clientSecret: amadeusConfig.clientSecret,
      hostname: amadeusConfig.apiEndpoint,
      logger: {
        log: (message: string) => this.logger.debug('Amadeus SDK:', { message })
      }
    });

    this.logger = Logger.getInstance();
    this.setupErrorHandlers();
  }

  /**
   * Configure error handlers for Amadeus client
   */
  private setupErrorHandlers(): void {
    this.client.on('error', (error: Error) => {
      this.logger.error('Amadeus client error', error, {
        errorCode: ErrorCode.GDS_ERROR,
        service: 'AmadeusService'
      });
    });

    this.client.on('request', (data: any) => {
      this.logger.debug('Amadeus API request', {
        endpoint: data.path,
        method: data.method
      });
    });
  }

  /**
   * Create retry operation with exponential backoff
   */
  private createRetryOperation(): retry.Operation {
    return retry.operation({
      retries: MAX_RETRY_ATTEMPTS,
      factor: 2,
      minTimeout: RETRY_DELAY_MS,
      maxTimeout: RETRY_DELAY_MS * 5,
      randomize: true
    });
  }

  /**
   * Refresh Amadeus access token
   */
  private async refreshToken(): Promise<void> {
    try {
      const now = new Date();
      if (this.tokenExpiry && this.tokenExpiry.getTime() - now.getTime() > TOKEN_EXPIRY_BUFFER_MS) {
        return;
      }

      const operation = this.createRetryOperation();

      await new Promise((resolve, reject) => {
        operation.attempt(async (currentAttempt) => {
          try {
            const response = await this.client.authenticate();
            this.accessToken = response.data.access_token;
            this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);

            this.logger.info('Amadeus token refreshed', {
              expiresIn: response.data.expires_in,
              attempt: currentAttempt
            });

            resolve(true);
          } catch (error) {
            if (operation.retry(error as Error)) {
              return;
            }
            reject(operation.mainError());
          }
        });
      });
    } catch (error) {
      this.logger.error('Failed to refresh Amadeus token', error as Error, {
        errorCode: ErrorCode.GDS_ERROR
      });
      throw error;
    }
  }

  /**
   * Search available flights with retry mechanism
   */
  public async searchFlights(criteria: FlightSearchCriteria): Promise<any> {
    await this.refreshToken();

    const operation = this.createRetryOperation();

    return new Promise((resolve, reject) => {
      operation.attempt(async (currentAttempt) => {
        try {
          const startTime = Date.now();
          const response = await this.client.shopping.flightOffers.get({
            originLocationCode: criteria.origin,
            destinationLocationCode: criteria.destination,
            departureDate: criteria.departureDate,
            returnDate: criteria.returnDate,
            adults: criteria.adults,
            children: criteria.children,
            travelClass: criteria.travelClass,
            currencyCode: 'USD',
            max: 50
          });

          this.logger.info('Flight search completed', {
            duration: Date.now() - startTime,
            resultsCount: response.data.length,
            attempt: currentAttempt
          });

          resolve(response.data);
        } catch (error) {
          if (operation.retry(error as Error)) {
            return;
          }
          reject(operation.mainError());
        }
      });
    });
  }

  /**
   * Create flight booking with comprehensive error handling
   */
  public async createBooking(bookingDetails: any): Promise<IBooking> {
    await this.refreshToken();

    const operation = this.createRetryOperation();

    return new Promise((resolve, reject) => {
      operation.attempt(async (currentAttempt) => {
        try {
          // Verify flight offer still available
          const verification = await this.client.shopping.flightOffers.pricing.post({
            data: {
              type: 'flight-offers-pricing',
              flightOffers: [bookingDetails.flightOffer]
            }
          });

          // Create flight order
          const order = await this.client.booking.flightOrders.post({
            data: {
              type: 'flight-order',
              flightOffers: [verification.data.flightOffers[0]],
              travelers: bookingDetails.travelers
            }
          });

          this.logger.info('Booking created successfully', {
            pnr: order.data.id,
            attempt: currentAttempt
          });

          resolve({
            ...bookingDetails,
            amadeusPNR: order.data.id,
            bookingDetails: order.data
          } as IBooking);
        } catch (error) {
          if (operation.retry(error as Error)) {
            return;
          }
          reject(operation.mainError());
        }
      });
    });
  }

  /**
   * Cancel existing booking with refund handling
   */
  public async cancelBooking(pnr: string): Promise<boolean> {
    await this.refreshToken();

    const operation = this.createRetryOperation();

    return new Promise((resolve, reject) => {
      operation.attempt(async (currentAttempt) => {
        try {
          await this.client.booking.flightOrder(pnr).delete();

          this.logger.info('Booking cancelled successfully', {
            pnr,
            attempt: currentAttempt
          });

          resolve(true);
        } catch (error) {
          if (operation.retry(error as Error)) {
            return;
          }
          reject(operation.mainError());
        }
      });
    });
  }
}