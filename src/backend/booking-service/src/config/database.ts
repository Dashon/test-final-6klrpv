/**
 * @fileoverview Database configuration for the booking service with comprehensive security and performance settings
 * @module booking-service/config/database
 * @version 1.0.0
 */

import dotenv from 'dotenv'; // v16.3.x
import { DataSourceOptions } from 'typeorm'; // v0.3.x
import { ConnectionOptions } from 'pg'; // v8.11.x
import { Logger } from '../../../shared/utils/logger.util';
import { BookingEntity } from '../models/booking.model';
import { ErrorCode } from '../../../shared/constants/error-codes';

// Load environment variables
dotenv.config();

// Environment variables with defaults
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');
const DB_USERNAME = process.env.DB_USERNAME || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_DATABASE = process.env.DB_DATABASE || 'booking_service';
const DB_SSL = process.env.DB_SSL === 'true';
const DB_POOL_SIZE = parseInt(process.env.DB_POOL_SIZE || '10');
const DB_TIMEOUT = parseInt(process.env.DB_TIMEOUT || '30000');
const DB_ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY;

/**
 * Validates database configuration parameters
 * @returns {boolean} Configuration validation status
 */
const validateDatabaseConfig = (): boolean => {
  try {
    // Required environment variables
    if (!DB_PASSWORD) {
      throw new Error('Database password is required');
    }

    if (!DB_ENCRYPTION_KEY) {
      throw new Error('Database encryption key is required');
    }

    // Validate connection parameters
    if (DB_POOL_SIZE < 1 || DB_POOL_SIZE > 100) {
      throw new Error('Invalid pool size configuration');
    }

    if (DB_TIMEOUT < 1000 || DB_TIMEOUT > 60000) {
      throw new Error('Invalid timeout configuration');
    }

    Logger.info('Database configuration validated successfully');
    return true;
  } catch (error) {
    Logger.error('Database configuration validation failed', error as Error, {
      errorCode: ErrorCode.DATABASE_ERROR
    });
    return false;
  }
};

/**
 * Configures database connection pool settings
 * @param {number} poolSize - Maximum number of connections
 * @param {number} timeout - Connection timeout in milliseconds
 */
const configureConnectionPool = (poolSize: number, timeout: number) => {
  return {
    min: Math.floor(poolSize / 4), // Minimum 25% of max pool size
    max: poolSize,
    idleTimeoutMillis: timeout,
    connectionTimeoutMillis: timeout,
    allowExitOnIdle: false,
    application_name: 'booking_service'
  };
};

// Validate configuration before proceeding
if (!validateDatabaseConfig()) {
  throw new Error('Invalid database configuration');
}

/**
 * SSL configuration for secure database connections
 */
const sslConfig = DB_SSL ? {
  rejectUnauthorized: true,
  ca: process.env.DB_SSL_CA,
  key: process.env.DB_SSL_KEY,
  cert: process.env.DB_SSL_CERT
} : false;

/**
 * Database configuration object for TypeORM
 */
export const databaseConfig: DataSourceOptions = {
  type: 'postgres',
  host: DB_HOST,
  port: DB_PORT,
  username: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  
  // Entity configuration
  entities: [BookingEntity],
  migrations: ['src/migrations/*.ts'],
  
  // Security settings
  ssl: sslConfig,
  synchronize: false, // Disabled for production safety
  
  // Logging configuration
  logging: process.env.NODE_ENV !== 'production',
  logger: 'advanced-console',
  
  // Connection pool configuration
  poolSize: DB_POOL_SIZE,
  connectTimeoutMS: DB_TIMEOUT,
  
  // Extra PostgreSQL configurations
  extra: {
    ...configureConnectionPool(DB_POOL_SIZE, DB_TIMEOUT),
    max_prepared_transactions: 0, // Disable distributed transactions
    
    // Statement timeout to prevent long-running queries
    statement_timeout: '30s',
    
    // SSL mode for encrypted connections
    ssl: DB_SSL ? { rejectUnauthorized: true } : false,
    
    // Connection parameters
    application_name: 'booking_service',
    TimeZone: 'UTC'
  },
  
  // Cache configuration
  cache: {
    type: 'redis',
    options: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: 0
    },
    duration: 60000 // 1 minute cache duration
  },
  
  // Replication configuration for read/write splitting
  replication: process.env.DB_REPLICATION === 'true' ? {
    master: {
      host: DB_HOST,
      port: DB_PORT,
      username: DB_USERNAME,
      password: DB_PASSWORD,
      database: DB_DATABASE
    },
    slaves: [
      {
        host: process.env.DB_REPLICA_HOST || DB_HOST,
        port: parseInt(process.env.DB_REPLICA_PORT || DB_PORT.toString()),
        username: process.env.DB_REPLICA_USERNAME || DB_USERNAME,
        password: process.env.DB_REPLICA_PASSWORD || DB_PASSWORD,
        database: DB_DATABASE
      }
    ]
  } : undefined,
  
  // Encryption configuration for sensitive data
  encryption: {
    key: DB_ENCRYPTION_KEY,
    algorithm: 'aes-256-gcm',
    ivLength: 16
  }
};

// Export connection options for native pg driver
export const pgConnectionConfig: ConnectionOptions = {
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  ssl: sslConfig,
  
  // Connection management
  connectionTimeoutMillis: DB_TIMEOUT,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  
  // Statement timeout
  statement_timeout: 30000,
  
  // Application name for monitoring
  application_name: 'booking_service'
};

// Log database configuration status
Logger.info('Database configuration initialized', {
  host: DB_HOST,
  port: DB_PORT,
  database: DB_DATABASE,
  poolSize: DB_POOL_SIZE,
  ssl: DB_SSL,
  replication: !!databaseConfig.replication
});