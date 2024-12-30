/**
 * @fileoverview NestJS controller for AI persona management with real-time learning capabilities
 * @module persona-service/controllers/persona
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
  Req,
  HttpException,
  HttpStatus,
  Query
} from '@nestjs/common'; // v9.0.x
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody
} from '@nestjs/swagger'; // v6.0.x
import { Request } from 'express';
import {
  IPersona,
  PersonaType,
  PersonaPreferences,
  PersonaState
} from '../interfaces/persona.interface';
import { PersonaService } from '../services/persona.service';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { Logger } from '../../../shared/utils/logger.util';
import { ErrorCode } from '../../../shared/constants/error-codes';

// Constants for request validation
const MAX_PERSONAS_PER_USER = 5;
const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 50;

/**
 * DTO for creating a new persona
 */
class CreatePersonaDto {
  name: string;
  type: PersonaType;
  preferences: PersonaPreferences;
  isPaid: boolean;
}

/**
 * DTO for updating an existing persona
 */
class UpdatePersonaDto {
  name?: string;
  preferences?: Partial<PersonaPreferences>;
  state?: Partial<PersonaState>;
}

/**
 * DTO for pagination query parameters
 */
class PaginationQueryDto {
  page?: number = 1;
  limit?: number = 10;
}

/**
 * Response DTO for persona data
 */
class PersonaResponseDto implements Partial<IPersona> {
  id: string;
  name: string;
  type: PersonaType;
  state: PersonaState;
  preferences: PersonaPreferences;
  isActive: boolean;
  isPaid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Response DTO for paginated persona list
 */
class PaginatedPersonaResponse {
  items: PersonaResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Controller handling all HTTP endpoints for AI persona management
 */
@Controller('personas')
@ApiTags('personas')
@UseGuards(authMiddleware)
export class PersonaController {
  private readonly logger = Logger.getInstance();

  constructor(private readonly personaService: PersonaService) {}

  /**
   * Creates a new AI persona for the authenticated user
   */
  @Post()
  @ApiOperation({ summary: 'Create new persona' })
  @ApiBody({ type: CreatePersonaDto })
  @ApiResponse({ status: 201, description: 'Persona created successfully', type: PersonaResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request or persona limit reached' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createPersona(
    @Req() req: Request,
    @Body() personaData: CreatePersonaDto
  ): Promise<IPersona> {
    try {
      // Validate user's persona limit
      const userId = req.user!.userId;
      const existingPersonas = await this.personaService.getUserPersonas(userId);
      
      if (existingPersonas.length >= MAX_PERSONAS_PER_USER) {
        throw new HttpException(
          `Maximum personas (${MAX_PERSONAS_PER_USER}) reached`,
          HttpStatus.BAD_REQUEST
        );
      }

      // Validate persona name
      if (!personaData.name || 
          personaData.name.length < MIN_NAME_LENGTH || 
          personaData.name.length > MAX_NAME_LENGTH) {
        throw new HttpException(
          `Name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters`,
          HttpStatus.BAD_REQUEST
        );
      }

      // Create persona with initial state
      const persona = await this.personaService.createPersona(userId, {
        ...personaData,
        isActive: existingPersonas.length === 0, // First persona is active by default
      });

      this.logger.info('Persona created successfully', {
        personaId: persona.id,
        userId,
        type: persona.type
      });

      return persona;
    } catch (error) {
      this.logger.error('Failed to create persona', error as Error, {
        userId: req.user!.userId,
        errorCode: ErrorCode.VALIDATION_ERROR
      });
      throw error;
    }
  }

  /**
   * Updates an existing persona's properties and learning state
   */
  @Put(':personaId')
  @ApiOperation({ summary: 'Update persona' })
  @ApiParam({ name: 'personaId', type: 'string' })
  @ApiBody({ type: UpdatePersonaDto })
  @ApiResponse({ status: 200, description: 'Persona updated successfully', type: PersonaResponseDto })
  @ApiResponse({ status: 404, description: 'Persona not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updatePersona(
    @Param('personaId') personaId: string,
    @Body() updateData: UpdatePersonaDto,
    @Req() req: Request
  ): Promise<IPersona> {
    try {
      // Verify persona ownership
      const persona = await this.personaService.getPersonaById(personaId);
      if (persona.userId !== req.user!.userId) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }

      // Update preferences if provided
      if (updateData.preferences) {
        await this.personaService.updatePersonaPreferences(
          personaId,
          updateData.preferences
        );
      }

      // Update state if provided
      if (updateData.state) {
        await this.personaService.updatePersonaState(personaId, updateData.state);
      }

      const updatedPersona = await this.personaService.getPersonaById(personaId);

      this.logger.info('Persona updated successfully', {
        personaId,
        userId: req.user!.userId
      });

      return updatedPersona;
    } catch (error) {
      this.logger.error('Failed to update persona', error as Error, {
        personaId,
        userId: req.user!.userId
      });
      throw error;
    }
  }

  /**
   * Retrieves a specific persona by ID
   */
  @Get(':personaId')
  @ApiOperation({ summary: 'Get persona by ID' })
  @ApiParam({ name: 'personaId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Persona found', type: PersonaResponseDto })
  @ApiResponse({ status: 404, description: 'Persona not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPersonaById(
    @Param('personaId') personaId: string,
    @Req() req: Request
  ): Promise<IPersona> {
    try {
      const persona = await this.personaService.getPersonaById(personaId);
      
      // Verify persona ownership
      if (persona.userId !== req.user!.userId) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }

      return persona;
    } catch (error) {
      this.logger.error('Failed to retrieve persona', error as Error, {
        personaId,
        userId: req.user!.userId
      });
      throw error;
    }
  }

  /**
   * Retrieves all personas for the authenticated user
   */
  @Get()
  @ApiOperation({ summary: 'Get user personas' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Personas retrieved successfully', type: PaginatedPersonaResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserPersonas(
    @Req() req: Request,
    @Query() query: PaginationQueryDto
  ): Promise<PaginatedPersonaResponse> {
    try {
      const userId = req.user!.userId;
      const personas = await this.personaService.getUserPersonas(userId);

      // Apply pagination
      const page = query.page || 1;
      const limit = Math.min(query.limit || 10, 50); // Max 50 items per page
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      const paginatedPersonas = personas.slice(startIndex, endIndex);
      const total = personas.length;

      return {
        items: paginatedPersonas,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      this.logger.error('Failed to retrieve user personas', error as Error, {
        userId: req.user!.userId
      });
      throw error;
    }
  }

  /**
   * Deletes a specific persona
   */
  @Delete(':personaId')
  @ApiOperation({ summary: 'Delete persona' })
  @ApiParam({ name: 'personaId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Persona deleted successfully' })
  @ApiResponse({ status: 404, description: 'Persona not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deletePersona(
    @Param('personaId') personaId: string,
    @Req() req: Request
  ): Promise<void> {
    try {
      const persona = await this.personaService.getPersonaById(personaId);
      
      // Verify persona ownership
      if (persona.userId !== req.user!.userId) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }

      await this.personaService.deletePersona(personaId);

      this.logger.info('Persona deleted successfully', {
        personaId,
        userId: req.user!.userId
      });
    } catch (error) {
      this.logger.error('Failed to delete persona', error as Error, {
        personaId,
        userId: req.user!.userId
      });
      throw error;
    }
  }
}