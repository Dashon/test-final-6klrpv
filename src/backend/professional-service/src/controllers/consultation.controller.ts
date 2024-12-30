/**
 * @fileoverview Controller handling professional consultation management with enhanced security and monitoring
 * @module professional-service/controllers/consultation
 * @version 1.0.0
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  HttpStatus,
  BadRequestException,
  NotFoundException
} from '@nestjs/common'; // v9.x
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiBearerAuth
} from '@nestjs/swagger'; // v6.x
import { RateLimit } from '@nestjs/throttler'; // v4.x

import { ConsultationService } from '../services/consultation.service';
import { IConsultation, ConsultationStatus } from '../interfaces/consultation.interface';
import { logger } from '../../../shared/utils/logger.util';
import { ErrorCode } from '../../../shared/constants/error-codes';
import { BaseFilter } from '../../../shared/interfaces/base.interface';

/**
 * Controller handling all consultation-related HTTP endpoints
 * Implements comprehensive security, monitoring, and error handling
 */
@Controller('consultations')
@ApiTags('consultations')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@RateLimit({ ttl: 60, limit: 100 })
export class ConsultationController {
  constructor(
    private readonly consultationService: ConsultationService
  ) {}

  /**
   * Creates a new consultation with enhanced validation and security
   */
  @Post()
  @ApiOperation({ summary: 'Create new consultation' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Consultation created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid consultation data' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  @ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS, description: 'Rate limit exceeded' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async createConsultation(@Body() consultationData: IConsultation): Promise<IConsultation> {
    try {
      logger.info('Creating new consultation', { data: consultationData });
      
      // Validate consultation data
      this.consultationService.validateConsultationData(consultationData);
      
      const consultation = await this.consultationService.createConsultation(consultationData);
      
      logger.info('Consultation created successfully', { consultationId: consultation.id });
      return consultation;
      
    } catch (error) {
      logger.error('Failed to create consultation', error as Error, { data: consultationData });
      throw error;
    }
  }

  /**
   * Updates an existing consultation with security checks
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update consultation' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Consultation updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Consultation not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid update data' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateConsultation(
    @Param('id') id: string,
    @Body() updateData: Partial<IConsultation>
  ): Promise<IConsultation> {
    try {
      logger.info('Updating consultation', { id, updateData });
      
      const consultation = await this.consultationService.updateConsultation(id, updateData);
      
      logger.info('Consultation updated successfully', { id });
      return consultation;
      
    } catch (error) {
      logger.error('Failed to update consultation', error as Error, { id, updateData });
      throw error;
    }
  }

  /**
   * Retrieves consultation details with security validation
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get consultation details' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Consultation details retrieved' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Consultation not found' })
  async getConsultation(@Param('id') id: string): Promise<IConsultation> {
    try {
      logger.info('Retrieving consultation', { id });
      
      const consultation = await this.consultationService.getConsultation(id);
      if (!consultation) {
        throw new NotFoundException('Consultation not found');
      }
      
      return consultation;
      
    } catch (error) {
      logger.error('Failed to retrieve consultation', error as Error, { id });
      throw error;
    }
  }

  /**
   * Lists consultations with filtering and pagination
   */
  @Get()
  @ApiOperation({ summary: 'List consultations' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Consultations retrieved successfully' })
  async listConsultations(@Query() filters: BaseFilter): Promise<IConsultation[]> {
    try {
      logger.info('Listing consultations', { filters });
      
      // Apply default filters if not provided
      const defaultedFilters = {
        page: filters.page || 1,
        limit: filters.limit || 10,
        sortBy: filters.sortBy || 'scheduledStartTime',
        sortOrder: filters.sortOrder || 'desc',
        ...filters
      };

      const consultations = await this.consultationService.listConsultations(defaultedFilters);
      
      logger.info('Consultations retrieved successfully', { 
        count: consultations.length,
        filters: defaultedFilters 
      });
      
      return consultations;
      
    } catch (error) {
      logger.error('Failed to list consultations', error as Error, { filters });
      throw error;
    }
  }

  /**
   * Cancels a scheduled consultation with refund handling
   */
  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel consultation' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Consultation cancelled successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot cancel consultation' })
  async cancelConsultation(
    @Param('id') id: string,
    @Body('reason') reason: string
  ): Promise<IConsultation> {
    try {
      logger.info('Cancelling consultation', { id, reason });
      
      const updateData: Partial<IConsultation> = {
        status: ConsultationStatus.CANCELLED,
        cancellationReason: reason
      };
      
      const consultation = await this.consultationService.updateConsultation(id, updateData);
      
      logger.info('Consultation cancelled successfully', { id });
      return consultation;
      
    } catch (error) {
      logger.error('Failed to cancel consultation', error as Error, { id });
      throw error;
    }
  }
}