/**
 * @fileoverview Core interfaces and types for backend services
 * @module shared/interfaces/base
 * @version 1.0.0
 */

import { ErrorCode } from '../constants/error-codes';
import { HttpStatus } from '../constants/status-codes';

/**
 * Base interface for all database entities
 * Provides standard tracking fields for data consistency
 */
export interface BaseEntity {
  /** Unique identifier using UUID v4 */
  id: string;
  
  /** Timestamp of entity creation */
  createdAt: Date;
  
  /** Timestamp of last entity update */
  updatedAt: Date;
  
  /** Optional deletion timestamp for soft deletes */
  deletedAt?: Date;
  
  /** Version number for optimistic locking */
  version?: number;
}

/**
 * Generic base interface for successful API responses
 * @template T - Type of the response data
 */
export interface BaseResponse<T> {
  /** Indicates successful response */
  success: boolean;
  
  /** HTTP status code */
  status: HttpStatus;
  
  /** Response payload */
  data: T;
  
  /** Optional metadata */
  meta?: Record<string, unknown>;
}

/**
 * Interface for error responses with validation details
 */
export interface ErrorResponse {
  /** Indicates error response */
  success: false;
  
  /** HTTP status code */
  status: HttpStatus;
  
  /** Standardized error code */
  error: ErrorCode;
  
  /** User-friendly error message */
  message: string;
  
  /** Detailed validation errors by field */
  details?: Record<string, string[]>;
  
  /** Error reference ID for tracking */
  referenceId?: string;
  
  /** Stack trace (development only) */
  stack?: string;
}

/**
 * Sort order enum for query filtering
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

/**
 * Base interface for query filters
 */
export interface BaseFilter {
  /** Page number (1-based) */
  page?: number;
  
  /** Items per page */
  limit?: number;
  
  /** Field to sort by */
  sortBy?: string;
  
  /** Sort direction */
  sortOrder?: SortOrder;
  
  /** Search query string */
  search?: string;
  
  /** Filter by date range */
  dateRange?: {
    start: Date;
    end: Date;
  };
  
  /** Custom filters */
  filters?: Record<string, unknown>;
}

/**
 * Generic interface for paginated responses
 * @template T - Type of the items in the response
 */
export interface PaginatedResponse<T> extends BaseResponse<T[]> {
  /** Pagination metadata */
  meta: {
    /** Total number of items */
    total: number;
    
    /** Current page number */
    page: number;
    
    /** Items per page */
    limit: number;
    
    /** Total number of pages */
    totalPages: number;
    
    /** Indicates if more pages exist */
    hasMore: boolean;
  };
}

/**
 * Interface for API rate limit metadata
 */
export interface RateLimitInfo {
  /** Maximum requests allowed */
  limit: number;
  
  /** Remaining requests */
  remaining: number;
  
  /** Reset timestamp */
  reset: number;
}

/**
 * Type for tracking changes in entity updates
 */
export type EntityChanges<T> = {
  /** Previous value */
  before: Partial<T>;
  
  /** New value */
  after: Partial<T>;
  
  /** Fields that were modified */
  modifiedFields: (keyof T)[];
};

/**
 * Interface for soft-deletable entities
 */
export interface SoftDeletable {
  /** Soft deletion timestamp */
  deletedAt?: Date;
  
  /** Deletion reason */
  deleteReason?: string;
  
  /** User who performed the deletion */
  deletedBy?: string;
}

/**
 * Interface for auditable entities
 */
export interface Auditable {
  /** Creation user ID */
  createdBy: string;
  
  /** Last update user ID */
  updatedBy: string;
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Type guard to check if response is an error
 */
export const isErrorResponse = (response: BaseResponse<unknown> | ErrorResponse): response is ErrorResponse => {
  return !response.success;
};

/**
 * Type guard to check if entity is soft deleted
 */
export const isSoftDeleted = (entity: BaseEntity & Partial<SoftDeletable>): boolean => {
  return !!entity.deletedAt && entity.deletedAt <= new Date();
};