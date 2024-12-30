/**
 * @fileoverview Production-grade database configuration for professional service
 * @module professional-service/config/database
 * @version 1.0.0
 */

import { DataSourceOptions } from 'typeorm'; // v0.3.x
import * as dotenv from 'dotenv'; // v16.3.x
import { Logger } from '../../../shared/utils/logger.util';
import { Agent } from '../models/agent.model';
import { ConsultationModel } from '../models/consultation.model';

// Load environment variables
dotenv.config();

// Environment variables with type-safe defaults
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');
const DB_USERNAME = process.env.DB_USERNAME || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_DATABASE = process.env.DB_DATABASE || 'professional_service';
const DB_SSL = process.env.DB_SSL === 'true';
const DB_POOL_SIZE = parseInt(process.env.DB_POOL_SIZE || '10');
const DB_IDLE_TIMEOUT = parseInt(process.env.DB_IDLE_TIMEOUT || '30000');
const DB_MAX_RETRIES = parseInt(process.env.DB_MAX_RETRIES || '5');
const DB_RETRY_INTERVAL = parseInt(process.env.DB_RETRY_INTERVAL || '5000');

/**
 * Interface defining comprehensive database configuration options
 */
interface IDatabaseConfig extends DataSourceOptions {
  replication?: {
    master: {
      host: string;
      port: number;
      username: string;
      password: string;
      database: string;
    };
    slaves?: Array<{
      host: string;
      port: number;
      username: string;
      password: string;
      database: string;
    }>;
  };
  extra?: {
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
    statement_timeout?: number;
    query_timeout?: number;
    ssl?: {
      rejectUnauthorized: boolean;
      ca?: string;
      cert?: string;
      key?: string;
    };
  };
}

/**
 * Validates database configuration parameters
 * @returns boolean indicating if configuration is valid
 */
const validateDatabaseConfig = (): boolean => {
  try {
    // Check required environment variables
    if (!DB_PASSWORD) {
      Logger.error('Database password not configured', new Error('Missing DB_PASSWORD'));
      return false;
    }

    // Validate port number range
    if (DB_PORT < 1024 || DB_PORT > 65535) {
      Logger.error('Invalid database port', new Error(`Port ${DB_PORT} out of range`));
      return false;
    }

    // Validate pool configuration
    if (DB_POOL_SIZE < 1 || DB_POOL_SIZE > 100) {
      Logger.warn('Pool size outside recommended range', { poolSize: DB_POOL_SIZE });
    }

    // Validate timeout settings
    if (DB_IDLE_TIMEOUT < 1000 || DB_IDLE_TIMEOUT > 300000) {
      Logger.warn('Idle timeout outside recommended range', { timeout: DB_IDLE_TIMEOUT });
    }

    // Validate retry configuration
    if (DB_MAX_RETRIES < 1 || DB_RETRY_INTERVAL < 1000) {
      Logger.warn('Retry configuration may be insufficient', {
        maxRetries: DB_MAX_RETRIES,
        retryInterval: DB_RETRY_INTERVAL
      });
    }

    Logger.info('Database configuration validated successfully');
    return true;
  } catch (error) {
    Logger.error('Database configuration validation failed', error as Error);
    return false;
  }
};

/**
 * Creates TypeORM connection options with production-grade settings
 * @returns Configured database connection options
 */
const createConnectionOptions = (): IDatabaseConfig => {
  const baseConfig: IDatabaseConfig = {
    type: 'postgres',
    host: DB_HOST,
    port: DB_PORT,
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_DATABASE,
    
    // Entity configuration
    entities: [Agent, ConsultationModel],
    migrations: ['src/backend/professional-service/src/migrations/*.ts'],
    migrationsRun: true,
    
    // Connection pool settings
    poolSize: DB_POOL_SIZE,
    
    // Logging configuration
    logging: process.env.NODE_ENV !== 'production',
    logger: 'advanced-console',
    
    // SSL configuration
    ssl: DB_SSL ? {
      rejectUnauthorized: false // Override in production with proper cert validation
    } : false,
    
    // Advanced configuration
    extra: {
      max: DB_POOL_SIZE,
      idleTimeoutMillis: DB_IDLE_TIMEOUT,
      connectionTimeoutMillis: 10000,
      statement_timeout: 30000,
      query_timeout: 30000
    },
    
    // Retry configuration
    retryAttempts: DB_MAX_RETRIES,
    retryDelay: DB_RETRY_INTERVAL,
    
    // Performance optimizations
    cache: {
      duration: 60000 // 1 minute cache
    },
    synchronize: false, // Disable in production
    dropSchema: false, // Safety measure
    maxQueryExecutionTime: 5000, // Log slow queries
  };

  // Add replication configuration if slaves are configured
  if (process.env.DB_SLAVES) {
    try {
      const slaves = JSON.parse(process.env.DB_SLAVES);
      if (Array.isArray(slaves) && slaves.length > 0) {
        baseConfig.replication = {
          master: {
            host: DB_HOST,
            port: DB_PORT,
            username: DB_USERNAME,
            password: DB_PASSWORD,
            database: DB_DATABASE
          },
          slaves: slaves
        };
        Logger.info('Configured database replication', { slaveCount: slaves.length });
      }
    } catch (error) {
      Logger.error('Failed to parse database slaves configuration', error as Error);
    }
  }

  return baseConfig;
};

// Validate configuration before creating connection options
if (!validateDatabaseConfig()) {
  throw new Error('Invalid database configuration');
}

// Export the database configuration
export const databaseConfig = createConnectionOptions();