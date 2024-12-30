/**
 * @fileoverview Comprehensive test suite for consultation management functionality
 * @module professional-service/tests/consultation
 * @version 1.0.0
 */

import { jest } from '@jest/globals'; // v29.5.x
import { Test, TestingModule } from '@nestjs/testing'; // v9.x
import { Repository } from 'typeorm'; // v0.3.x
import { TwilioClient } from 'twilio'; // v4.x

import { ConsultationService } from '../src/services/consultation.service';
import { ConsultationModel } from '../src/models/consultation.model';
import { 
  IConsultation, 
  ConsultationType, 
  ConsultationStatus, 
  PaymentStatus 
} from '../src/interfaces/consultation.interface';
import { Logger } from '../../../shared/utils/logger.util';

// Mock data for testing
const mockConsultationData: IConsultation = {
  id: 'test-consultation-id',
  userId: 'test-user-id',
  professionalId: 'test-professional-id',
  type: ConsultationType.VIDEO,
  status: ConsultationStatus.SCHEDULED,
  scheduledStartTime: new Date('2024-01-01T10:00:00Z'),
  scheduledEndTime: new Date('2024-01-01T11:00:00Z'),
  payment: {
    amount: 150,
    currency: 'USD',
    status: PaymentStatus.PENDING,
    transactionId: 'test-transaction-id',
    paymentMethod: 'card',
    paymentDate: new Date()
  },
  participantCount: 2,
  duration: 60,
  createdAt: new Date(),
  updatedAt: new Date()
};

// Mock repository implementation
class MockConsultationRepository {
  private consultations: ConsultationModel[] = [];

  async find(): Promise<ConsultationModel[]> {
    return this.consultations;
  }

  async findOne(): Promise<ConsultationModel | undefined> {
    return this.consultations[0];
  }

  async findOneOrFail(): Promise<ConsultationModel> {
    const consultation = this.consultations[0];
    if (!consultation) throw new Error('Consultation not found');
    return consultation;
  }

  async save(consultation: ConsultationModel): Promise<ConsultationModel> {
    const index = this.consultations.findIndex(c => c.id === consultation.id);
    if (index >= 0) {
      this.consultations[index] = consultation;
    } else {
      this.consultations.push(consultation);
    }
    return consultation;
  }

  async create(data: Partial<ConsultationModel>): Promise<ConsultationModel> {
    return { ...mockConsultationData, ...data } as ConsultationModel;
  }

  createQueryBuilder = jest.fn().mockReturnThis();
  andWhere = jest.fn().mockReturnThis();
  getMany = jest.fn().mockResolvedValue([mockConsultationData]);
}

describe('ConsultationService', () => {
  let service: ConsultationService;
  let repository: MockConsultationRepository;
  let twilioClient: jest.Mocked<TwilioClient>;
  let module: TestingModule;

  beforeEach(async () => {
    // Setup mocks
    repository = new MockConsultationRepository();
    twilioClient = {
      video: {
        rooms: {
          create: jest.fn().mockResolvedValue({ url: 'https://test-video-url' }),
          get: jest.fn(),
          end: jest.fn()
        }
      }
    } as unknown as jest.Mocked<TwilioClient>;

    // Create testing module
    module = await Test.createTestingModule({
      providers: [
        ConsultationService,
        {
          provide: 'ConsultationModelRepository',
          useValue: repository
        },
        {
          provide: TwilioClient,
          useValue: twilioClient
        },
        {
          provide: Logger,
          useValue: {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
          }
        }
      ]
    }).compile();

    service = module.get<ConsultationService>(ConsultationService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  describe('createConsultation', () => {
    it('should create a video consultation successfully', async () => {
      const result = await service.createConsultation(mockConsultationData);

      expect(result).toBeDefined();
      expect(result.type).toBe(ConsultationType.VIDEO);
      expect(result.status).toBe(ConsultationStatus.SCHEDULED);
      expect(twilioClient.video.rooms.create).toHaveBeenCalledWith({
        uniqueName: expect.stringContaining('consultation-'),
        type: 'group',
        maxParticipants: 2,
        videoCodecs: ['VP8', 'H264'],
        recordParticipantsOnConnect: true,
        statusCallback: '/api/v1/consultations/video/events',
        mediaRegion: 'gll'
      });
    });

    it('should handle payment processing during creation', async () => {
      const consultationWithPayment = {
        ...mockConsultationData,
        payment: {
          ...mockConsultationData.payment,
          status: PaymentStatus.PENDING
        }
      };

      const result = await service.createConsultation(consultationWithPayment);

      expect(result.payment.status).toBe(PaymentStatus.CAPTURED);
      expect(result.payment.paymentDate).toBeDefined();
    });

    it('should throw error for invalid consultation data', async () => {
      const invalidData = { ...mockConsultationData, userId: undefined };

      await expect(service.createConsultation(invalidData as IConsultation))
        .rejects
        .toThrow('Missing required user or professional ID');
    });
  });

  describe('updateConsultation', () => {
    it('should update consultation status successfully', async () => {
      const updateData = {
        status: ConsultationStatus.IN_PROGRESS
      };

      const result = await service.updateConsultation(
        mockConsultationData.id,
        updateData
      );

      expect(result.status).toBe(ConsultationStatus.IN_PROGRESS);
      expect(result.actualStartTime).toBeDefined();
    });

    it('should handle payment status updates', async () => {
      const updateData = {
        payment: {
          status: PaymentStatus.FAILED
        }
      };

      const result = await service.updateConsultation(
        mockConsultationData.id,
        updateData
      );

      expect(result.status).toBe(ConsultationStatus.CANCELLED);
      expect(result.cancellationReason).toBe('Payment failed');
    });

    it('should process refund when cancelling paid consultation', async () => {
      const paidConsultation = {
        ...mockConsultationData,
        payment: {
          ...mockConsultationData.payment,
          status: PaymentStatus.CAPTURED
        }
      };

      const updateData = {
        status: ConsultationStatus.CANCELLED
      };

      const result = await service.updateConsultation(
        paidConsultation.id,
        updateData
      );

      expect(result.payment.refundStatus).toBe(PaymentStatus.REFUNDED);
      expect(result.payment.refundAmount).toBe(paidConsultation.payment.amount);
    });
  });

  describe('getConsultation', () => {
    it('should retrieve consultation with all related data', async () => {
      const result = await service.getConsultation(mockConsultationData.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockConsultationData.id);
    });

    it('should validate video session for video consultations', async () => {
      twilioClient.video.rooms = jest.fn().mockReturnValue({
        fetch: jest.fn().mockResolvedValue({ status: 'in-progress' })
      });

      const result = await service.getConsultation(mockConsultationData.id);

      expect(result.type).toBe(ConsultationType.VIDEO);
      expect(twilioClient.video.rooms).toHaveBeenCalled();
    });
  });

  describe('listConsultations', () => {
    it('should list consultations with filters', async () => {
      const filters = {
        status: ConsultationStatus.SCHEDULED,
        professionalId: 'test-professional-id',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      };

      const result = await service.listConsultations(filters);

      expect(result).toBeInstanceOf(Array);
      expect(repository.createQueryBuilder).toHaveBeenCalled();
      expect(repository.andWhere).toHaveBeenCalledTimes(3);
    });

    it('should handle empty filters', async () => {
      const result = await service.listConsultations({});

      expect(result).toBeInstanceOf(Array);
      expect(repository.createQueryBuilder).toHaveBeenCalled();
      expect(repository.andWhere).not.toHaveBeenCalled();
    });
  });
});