/**
 * @fileoverview Database configuration for the persona service with advanced features
 * @module persona-service/config/database
 * @version 1.0.0
 */

import { DataSource, DataSourceOptions, LoggerOptions } from 'typeorm'; // v0.3.x
import { BaseEntity } from '../../../shared/interfaces/base.interface';
import { encrypt } from '../../../shared/utils/encryption.util';
import { logger } from '../../../shared/utils/logger.util';

// Environment-specific database configuration
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');
const DB_USERNAME = process.env.DB_USERNAME || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const DB_DATABASE = process.env.DB_DATABASE || 'persona_service';
const DB_SCHEMA = process.env.DB_SCHEMA || 'public';
const DB_SSL_CA = process.env.DB_SSL_CA;
const DB_SSL_KEY = process.env.DB_SSL_KEY;
const DB_SSL_CERT = process.env.DB_SSL_CERT;
const DB_POOL_MIN = parseInt(process.env.DB_POOL_MIN || '5');
const DB_POOL_MAX = parseInt(process.env.DB_POOL_MAX || '20');
const DB_TIMEOUT = parseInt(process.env.DB_TIMEOUT || '5000');

/**
 * Generates TypeORM connection options based on environment
 * @param env Current environment (development, staging, production)
 * @returns DataSourceOptions Configuration object for TypeORM
 */
const getConnectionOptions = (env: string): DataSourceOptions => {
  // Base configuration shared across environments
  const baseConfig: DataSourceOptions = {
    type: 'postgres',
    host: DB_HOST,
    port: DB_PORT,
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_DATABASE,
    schema: DB_SCHEMA,
    entities: [BaseEntity],
    synchronize: false,
    logging: ['error', 'warn', 'schema'] as LoggerOptions,
    logger: 'advanced-console',

    // Connection pool configuration
    pool: {
      min: DB_POOL_MIN,
      max: DB_POOL_MAX,
      acquireTimeoutMillis: DB_TIMEOUT,
      idleTimeoutMillis: 60000,
      reapIntervalMillis: 30000,
      createTimeoutMillis: 30000,
      createRetryIntervalMillis: 2000,
      propagateCreateError: false
    },

    // Entity configuration
    entityPrefix: 'persona_',
    entitySkipConstructor: true,
    subscribers: [],
    migrations: ['dist/migrations/*.js'],
    migrationsRun: true,
    migrationsTableName: 'persona_migrations',

    // Cache configuration
    cache: {
      type: 'redis',
      options: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: 0,
        duration: 60000 // 1 minute
      }
    }
  };

  // Environment-specific configurations
  switch (env) {
    case 'production':
      return {
        ...baseConfig,
        ssl: {
          ca: DB_SSL_CA,
          key: DB_SSL_KEY,
          cert: DB_SSL_CERT,
          rejectUnauthorized: true
        },
        logging: ['error'] as LoggerOptions,
        maxQueryExecutionTime: 5000,
        extra: {
          max: DB_POOL_MAX * 2, // Double pool size for production
          ssl: true,
          statement_timeout: 10000,
          idle_in_transaction_session_timeout: 30000,
          application_name: 'persona_service_prod'
        },
        replication: {
          master: {
            host: DB_HOST,
            port: DB_PORT,
            username: DB_USERNAME,
            password: DB_PASSWORD,
            database: DB_DATABASE
          },
          slaves: [
            {
              host: process.env.DB_REPLICA_HOST_1,
              port: parseInt(process.env.DB_REPLICA_PORT_1 || '5432'),
              username: process.env.DB_REPLICA_USER_1,
              password: process.env.DB_REPLICA_PASS_1,
              database: DB_DATABASE
            }
          ]
        }
      };

    case 'staging':
      return {
        ...baseConfig,
        ssl: {
          rejectUnauthorized: false
        },
        logging: ['error', 'warn'] as LoggerOptions,
        maxQueryExecutionTime: 10000,
        extra: {
          application_name: 'persona_service_staging'
        }
      };

    default: // development
      return {
        ...baseConfig,
        logging: ['query', 'error', 'warn', 'schema', 'migration'] as LoggerOptions,
        maxQueryExecutionTime: 30000,
        extra: {
          application_name: 'persona_service_dev'
        }
      };
  }
};

// Environment-specific configurations
export const databaseConfig = {
  development: getConnectionOptions('development'),
  staging: getConnectionOptions('staging'),
  production: getConnectionOptions('production')
};

// Initialize data source
const env = process.env.NODE_ENV || 'development';
export const dataSource = new DataSource(databaseConfig[env]);

// Add event listeners for connection monitoring
dataSource.initialize()
  .then(() => {
    logger.info('Database connection initialized', {
      host: DB_HOST,
      database: DB_DATABASE,
      schema: DB_SCHEMA
    });
  })
  .catch(error => {
    logger.error('Database connection failed', error, {
      host: DB_HOST,
      database: DB_DATABASE,
      schema: DB_SCHEMA
    });
  });

// Handle connection events
dataSource.queryResultCache?.on('hit', (key) => {
  logger.debug('Cache hit', { cacheKey: key });
});

dataSource.queryResultCache?.on('miss', (key) => {
  logger.debug('Cache miss', { cacheKey: key });
});

process.on('SIGINT', async () => {
  try {
    await dataSource.destroy();
    logger.info('Database connection closed gracefully');
    process.exit(0);
  } catch (error) {
    logger.error('Error closing database connection', error instanceof Error ? error : new Error('Unknown error'));
    process.exit(1);
  }
});