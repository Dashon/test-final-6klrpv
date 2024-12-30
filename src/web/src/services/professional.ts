/**
 * Professional Service Module
 * Version: 1.0.0
 * 
 * Implements API calls and business logic for professional features including
 * AI agent management, consultation scheduling, and analytics tracking.
 * 
 * @packageDocumentation
 */

import { apiService } from '../services/api';
import { z } from 'zod'; // ^3.21.4
import dayjs from 'dayjs'; // ^1.11.9
import type { AxiosResponse } from 'axios'; // ^1.4.0

import {
  Agent,
  AgentStatus,
  AgentSchema,
  AgentPricingSchema,
  AgentCapabilitiesSchema,
  Consultation,
  ConsultationType,
  ConsultationStatus,
  ConsultationSchema,
  AgentAnalytics
} from '../types/professional';

// Cache TTL configurations
const CACHE_CONFIG = {
  AGENT_LIST: 300000, // 5 minutes
  ANALYTICS: 60000,   // 1 minute
  CONSULTATION: 180000 // 3 minutes
} as const;

/**
 * Interface for analytics time range filtering
 */
interface AnalyticsTimeRange {
  startDate: Date;
  endDate: Date;
  granularity: 'hour' | 'day' | 'week' | 'month';
}

/**
 * Creates a new AI agent for a professional with enhanced validation
 * @param agentData Partial agent data for creation
 * @returns Promise resolving to the created agent
 */
export async function createAgent(agentData: Partial<Agent>): Promise<Agent> {
  try {
    // Validate agent data using zod schema
    const validatedData = await AgentSchema.partial().parseAsync({
      ...agentData,
      status: AgentStatus.DRAFT,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Additional validation for pricing and capabilities
    await AgentPricingSchema.parseAsync(validatedData.pricing);
    await AgentCapabilitiesSchema.parseAsync(validatedData.capabilities);

    const response = await apiService.request<Agent>(
      'POST',
      '/professional/agents',
      validatedData,
      { cache: false }
    );

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

/**
 * Updates an existing AI agent with validation
 * @param agentId ID of the agent to update
 * @param updateData Partial update data
 * @returns Promise resolving to the updated agent
 */
export async function updateAgent(
  agentId: string,
  updateData: Partial<Agent>
): Promise<Agent> {
  try {
    // Validate update data
    const validatedData = await AgentSchema.partial().parseAsync({
      ...updateData,
      updatedAt: new Date()
    });

    const response = await apiService.request<Agent>(
      'PUT',
      `/professional/agents/${agentId}`,
      validatedData,
      { cache: false }
    );

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

/**
 * Retrieves real-time analytics data for an AI agent
 * @param agentId ID of the agent
 * @param timeRange Analytics time range parameters
 * @returns Promise resolving to analytics data
 */
export async function getAgentAnalytics(
  agentId: string,
  timeRange: AnalyticsTimeRange
): Promise<AgentAnalytics> {
  try {
    // Validate time range
    if (timeRange.startDate > timeRange.endDate) {
      throw new Error('Start date must be before end date');
    }

    const response = await apiService.request<AgentAnalytics>(
      'GET',
      `/professional/agents/${agentId}/analytics`,
      {
        startDate: dayjs(timeRange.startDate).toISOString(),
        endDate: dayjs(timeRange.endDate).toISOString(),
        granularity: timeRange.granularity
      },
      {
        cache: true,
        cacheTTL: CACHE_CONFIG.ANALYTICS
      }
    );

    return response;
  } catch (error) {
    throw error;
  }
}

/**
 * Creates a new consultation booking
 * @param consultationData Consultation booking details
 * @returns Promise resolving to the created consultation
 */
export async function createConsultation(
  consultationData: Partial<Consultation>
): Promise<Consultation> {
  try {
    // Validate consultation data
    const validatedData = await ConsultationSchema.partial().parseAsync({
      ...consultationData,
      status: ConsultationStatus.SCHEDULED,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Validate scheduling constraints
    if (dayjs(validatedData.scheduledStartTime).isBefore(dayjs())) {
      throw new Error('Cannot schedule consultation in the past');
    }

    const response = await apiService.request<Consultation>(
      'POST',
      '/professional/consultations',
      validatedData,
      { cache: false }
    );

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

/**
 * Updates the status of an existing consultation
 * @param consultationId ID of the consultation
 * @param status New consultation status
 * @returns Promise resolving to the updated consultation
 */
export async function updateConsultationStatus(
  consultationId: string,
  status: ConsultationStatus
): Promise<Consultation> {
  try {
    const response = await apiService.request<Consultation>(
      'PUT',
      `/professional/consultations/${consultationId}/status`,
      { status },
      { cache: false }
    );

    return response;
  } catch (error) {
    throw error;
  }
}

/**
 * Retrieves a list of AI agents for a professional
 * @param professionalId ID of the professional
 * @param status Optional filter by agent status
 * @returns Promise resolving to array of agents
 */
export async function getAgentsList(
  professionalId: string,
  status?: AgentStatus
): Promise<Agent[]> {
  try {
    const response = await apiService.request<Agent[]>(
      'GET',
      '/professional/agents',
      { professionalId, status },
      {
        cache: true,
        cacheTTL: CACHE_CONFIG.AGENT_LIST
      }
    );

    return response;
  } catch (error) {
    throw error;
  }
}

/**
 * Archives an AI agent
 * @param agentId ID of the agent to archive
 * @returns Promise resolving to the archived agent
 */
export async function archiveAgent(agentId: string): Promise<Agent> {
  try {
    const response = await apiService.request<Agent>(
      'PUT',
      `/professional/agents/${agentId}/archive`,
      { status: AgentStatus.ARCHIVED },
      { cache: false }
    );

    return response;
  } catch (error) {
    throw error;
  }
}

/**
 * Retrieves consultation schedule for a professional
 * @param professionalId ID of the professional
 * @param startDate Schedule start date
 * @param endDate Schedule end date
 * @returns Promise resolving to array of consultations
 */
export async function getConsultationSchedule(
  professionalId: string,
  startDate: Date,
  endDate: Date
): Promise<Consultation[]> {
  try {
    const response = await apiService.request<Consultation[]>(
      'GET',
      '/professional/consultations/schedule',
      {
        professionalId,
        startDate: dayjs(startDate).toISOString(),
        endDate: dayjs(endDate).toISOString()
      },
      {
        cache: true,
        cacheTTL: CACHE_CONFIG.CONSULTATION
      }
    );

    return response;
  } catch (error) {
    throw error;
  }
}