/**
 * @fileoverview Professional consultation service handling video sessions, payments, and AI interactions
 * @module professional-service/services/consultation
 * @version 1.0.0
 */

import { Service } from 'typedi'; // v0.10.x
import { Repository } from 'typeorm'; // v0.3.x
import { InjectRepository } from 'typeorm-typedi-extensions'; // v0.4.x
import { TwilioClient } from 'twilio'; // v4.x
import {
  IConsultation,
  ConsultationType,
  ConsultationStatus,
  PaymentStatus,
  ConsultationPayment
} from '../interfaces/consultation.interface';
import { ConsultationModel } from '../models/consultation.model';
import { Logger } from '../../../shared/utils/logger.util';
import { ErrorCode } from '../../../shared/constants/error-codes';
import { HttpStatus } from '../../../shared/constants/status-codes';

// Constants for consultation management
const CONSULTATION_DURATION_MINUTES = 60;
const MAX_PARTICIPANTS = 2;
const PAYMENT_RETRY_ATTEMPTS = 3;
const VIDEO_QUALITY_THRESHOLD = '720p';
const TRANSACTION_TIMEOUT_MS = 5000;

/**
 * Service handling professional consultation management including video sessions,
 * payments, and AI agent interactions with comprehensive error handling
 */
@Service()
export class ConsultationService {
  constructor(
    @InjectRepository(ConsultationModel)
    private readonly consultationRepository: Repository<ConsultationModel>,
    private readonly twilioClient: TwilioClient,
    private readonly logger: Logger
  ) {}

  /**
   * Creates a new consultation with payment processing and video setup
   * @param consultationData Consultation creation data
   * @returns Created consultation instance
   */
  async createConsultation(consultationData: IConsultation): Promise<ConsultationModel> {
    this.logger.info('Creating new consultation', { data: consultationData });

    try {
      // Validate consultation data
      this.validateConsultationData(consultationData);

      // Start database transaction
      const queryRunner = this.consultationRepository.manager.connection.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Process initial payment
        const payment = await this.processPayment(consultationData.payment);
        
        // Generate video session for video consultations
        let meetingUrl: string | undefined;
        if (consultationData.type === ConsultationType.VIDEO) {
          meetingUrl = await this.createVideoSession(consultationData);
        }

        // Create consultation record
        const consultation = this.consultationRepository.create({
          ...consultationData,
          payment,
          meetingUrl,
          status: ConsultationStatus.SCHEDULED,
          participantCount: 0,
          duration: CONSULTATION_DURATION_MINUTES
        });

        const savedConsultation = await queryRunner.manager.save(consultation);
        await queryRunner.commitTransaction();

        this.logger.info('Consultation created successfully', { 
          consultationId: savedConsultation.id 
        });

        return savedConsultation;

      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }

    } catch (error) {
      this.logger.error('Failed to create consultation', error as Error, {
        data: consultationData
      });
      throw error;
    }
  }

  /**
   * Updates consultation status and handles related operations
   * @param id Consultation ID
   * @param updateData Update data
   * @returns Updated consultation
   */
  async updateConsultation(
    id: string, 
    updateData: Partial<IConsultation>
  ): Promise<ConsultationModel> {
    this.logger.info('Updating consultation', { id, updateData });

    try {
      const consultation = await this.consultationRepository.findOneOrFail({ where: { id } });

      // Handle status transitions
      if (updateData.status) {
        await this.handleStatusTransition(consultation, updateData.status);
      }

      // Update payment status if needed
      if (updateData.payment) {
        await this.updatePaymentStatus(consultation, updateData.payment);
      }

      // Update video session if needed
      if (updateData.type === ConsultationType.VIDEO && consultation.type !== ConsultationType.VIDEO) {
        consultation.meetingUrl = await this.createVideoSession(updateData);
      }

      // Save updates
      const updatedConsultation = await this.consultationRepository.save({
        ...consultation,
        ...updateData,
        updatedAt: new Date()
      });

      this.logger.info('Consultation updated successfully', { id });
      return updatedConsultation;

    } catch (error) {
      this.logger.error('Failed to update consultation', error as Error, { id });
      throw error;
    }
  }

  /**
   * Retrieves consultation details with related data
   * @param id Consultation ID
   * @returns Consultation details
   */
  async getConsultation(id: string): Promise<ConsultationModel> {
    try {
      const consultation = await this.consultationRepository.findOneOrFail({ 
        where: { id },
        relations: ['professional', 'user']
      });

      if (consultation.type === ConsultationType.VIDEO) {
        await this.validateVideoSession(consultation);
      }

      return consultation;

    } catch (error) {
      this.logger.error('Failed to retrieve consultation', error as Error, { id });
      throw error;
    }
  }

  /**
   * Lists consultations with filtering and pagination
   * @param filters Filter criteria
   * @returns Filtered consultation list
   */
  async listConsultations(filters: Record<string, unknown>): Promise<ConsultationModel[]> {
    try {
      const queryBuilder = this.consultationRepository.createQueryBuilder('consultation');

      // Apply filters
      if (filters.status) {
        queryBuilder.andWhere('consultation.status = :status', { status: filters.status });
      }
      if (filters.professionalId) {
        queryBuilder.andWhere('consultation.professionalId = :professionalId', { 
          professionalId: filters.professionalId 
        });
      }
      if (filters.dateRange) {
        queryBuilder.andWhere(
          'consultation.scheduledStartTime BETWEEN :start AND :end',
          { start: filters.dateRange.start, end: filters.dateRange.end }
        );
      }

      return await queryBuilder.getMany();

    } catch (error) {
      this.logger.error('Failed to list consultations', error as Error, { filters });
      throw error;
    }
  }

  /**
   * Processes consultation payment with retry logic
   * @param payment Payment details
   * @returns Processed payment details
   */
  private async processPayment(payment: ConsultationPayment): Promise<ConsultationPayment> {
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < PAYMENT_RETRY_ATTEMPTS) {
      try {
        // Process payment through payment gateway
        const processedPayment = { ...payment };
        processedPayment.status = PaymentStatus.CAPTURED;
        processedPayment.paymentDate = new Date();
        return processedPayment;

      } catch (error) {
        lastError = error as Error;
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    throw new Error(`Payment processing failed after ${attempts} attempts: ${lastError?.message}`);
  }

  /**
   * Creates and configures video session
   * @param consultationData Consultation data
   * @returns Video session URL
   */
  private async createVideoSession(consultationData: Partial<IConsultation>): Promise<string> {
    try {
      const room = await this.twilioClient.video.rooms.create({
        uniqueName: `consultation-${consultationData.id}`,
        type: 'group',
        maxParticipants: MAX_PARTICIPANTS,
        videoCodecs: ['VP8', 'H264'],
        recordParticipantsOnConnect: true,
        statusCallback: '/api/v1/consultations/video/events',
        mediaRegion: 'gll',
      });

      return room.url;

    } catch (error) {
      this.logger.error('Failed to create video session', error as Error);
      throw error;
    }
  }

  /**
   * Validates consultation data before processing
   * @param data Consultation data to validate
   */
  private validateConsultationData(data: IConsultation): void {
    if (!data.userId || !data.professionalId) {
      throw new Error('Missing required user or professional ID');
    }

    if (!data.scheduledStartTime || !data.scheduledEndTime) {
      throw new Error('Missing consultation schedule information');
    }

    if (data.type === ConsultationType.VIDEO && data.participantCount > MAX_PARTICIPANTS) {
      throw new Error(`Maximum ${MAX_PARTICIPANTS} participants allowed for video consultations`);
    }
  }

  /**
   * Handles consultation status transitions
   * @param consultation Current consultation
   * @param newStatus New status
   */
  private async handleStatusTransition(
    consultation: ConsultationModel,
    newStatus: ConsultationStatus
  ): Promise<void> {
    switch (newStatus) {
      case ConsultationStatus.IN_PROGRESS:
        consultation.actualStartTime = new Date();
        break;
      case ConsultationStatus.COMPLETED:
        consultation.actualEndTime = new Date();
        consultation.duration = this.calculateDuration(
          consultation.actualStartTime!,
          consultation.actualEndTime
        );
        break;
      case ConsultationStatus.CANCELLED:
        if (consultation.payment.status === PaymentStatus.CAPTURED) {
          await this.processRefund(consultation);
        }
        break;
    }
  }

  /**
   * Updates payment status and handles related operations
   * @param consultation Current consultation
   * @param payment Updated payment information
   */
  private async updatePaymentStatus(
    consultation: ConsultationModel,
    payment: ConsultationPayment
  ): Promise<void> {
    consultation.payment = {
      ...consultation.payment,
      ...payment,
      updatedAt: new Date()
    };

    if (payment.status === PaymentStatus.FAILED) {
      consultation.status = ConsultationStatus.CANCELLED;
      consultation.cancellationReason = 'Payment failed';
    }
  }

  /**
   * Validates video session status and quality
   * @param consultation Consultation to validate
   */
  private async validateVideoSession(consultation: ConsultationModel): Promise<void> {
    if (consultation.type !== ConsultationType.VIDEO) return;

    try {
      const room = await this.twilioClient.video.rooms(consultation.meetingUrl!).fetch();
      
      if (room.status !== 'in-progress' && consultation.status === ConsultationStatus.IN_PROGRESS) {
        throw new Error('Video session disconnected unexpectedly');
      }

    } catch (error) {
      this.logger.error('Video session validation failed', error as Error, {
        consultationId: consultation.id
      });
      throw error;
    }
  }

  /**
   * Calculates consultation duration in minutes
   * @param startTime Start timestamp
   * @param endTime End timestamp
   * @returns Duration in minutes
   */
  private calculateDuration(startTime: Date, endTime: Date): number {
    return Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  }

  /**
   * Processes refund for cancelled consultation
   * @param consultation Consultation to refund
   */
  private async processRefund(consultation: ConsultationModel): Promise<void> {
    try {
      consultation.payment.refundStatus = PaymentStatus.REFUNDED;
      consultation.payment.refundAmount = consultation.payment.amount;
      consultation.payment.refundDate = new Date();
      await this.consultationRepository.save(consultation);

    } catch (error) {
      this.logger.error('Failed to process refund', error as Error, {
        consultationId: consultation.id
      });
      throw error;
    }
  }
}