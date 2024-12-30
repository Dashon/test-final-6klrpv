/**
 * @fileoverview MongoDB configuration for the social service with enhanced security and performance
 * @module social-service/config/database
 * @version 1.0.0
 */

import mongoose from 'mongoose'; // v6.0.0
import dotenv from 'dotenv'; // v16.3.x
import { logger } from '../../../shared/utils/logger.util';
import { ErrorCode } from '../../../shared/constants/error-codes';

// Load environment variables
dotenv.config();

/**
 * Interface for time-based partitioning configuration
 */
interface ITimePartitionConfig {
    enabled: boolean;
    interval: string;
    retention: string;
    collections: string[];
}

/**
 * Interface for MongoDB connection options
 */
interface IMongoOptions extends mongoose.ConnectOptions {
    useNewUrlParser: boolean;
    useUnifiedTopology: boolean;
    maxPoolSize: number;
    minPoolSize: number;
    serverSelectionTimeoutMS: number;
    socketTimeoutMS: number;
    family: number;
    keepAlive: boolean;
    keepAliveInitialDelay: number;
    autoIndex: boolean;
    retryWrites: boolean;
}

/**
 * Interface for MongoDB configuration
 */
interface IMongoConfig {
    uri: string;
    options: IMongoOptions;
    ssl: boolean;
    authSource: string;
    retryAttempts: number;
    timePartitionConfig: ITimePartitionConfig;
}

/**
 * Time-based partitioning configuration for chat messages
 */
const timePartitionConfig: ITimePartitionConfig = {
    enabled: true,
    interval: '1d', // Daily partitions
    retention: '12m', // 12 months retention
    collections: ['chatmessages', 'interactions']
};

/**
 * MongoDB connection options with optimized settings
 */
const mongoOptions: IMongoOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 100,
    minPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
    keepAlive: true,
    keepAliveInitialDelay: 300000,
    autoIndex: true,
    retryWrites: true,
    ssl: process.env.MONGO_SSL === 'true',
    authSource: process.env.MONGO_AUTH_SOURCE || 'admin',
    // Enhanced SSL options when SSL is enabled
    ...(process.env.MONGO_SSL === 'true' && {
        sslValidate: true,
        sslCA: process.env.MONGO_SSL_CA,
        sslCert: process.env.MONGO_SSL_CERT,
        sslKey: process.env.MONGO_SSL_KEY,
    })
};

/**
 * Complete MongoDB configuration object
 */
export const databaseConfig: IMongoConfig = {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/social_service',
    options: mongoOptions,
    ssl: process.env.MONGO_SSL === 'true',
    authSource: process.env.MONGO_AUTH_SOURCE || 'admin',
    retryAttempts: Number(process.env.MONGO_RETRY_ATTEMPTS) || 5,
    timePartitionConfig
};

/**
 * Validates MongoDB configuration parameters
 * @returns Promise<boolean>
 */
const validateMongoConfig = async (): Promise<boolean> => {
    try {
        // Validate MongoDB URI format
        if (!databaseConfig.uri.startsWith('mongodb')) {
            throw new Error('Invalid MongoDB URI format');
        }

        // Validate SSL configuration if enabled
        if (databaseConfig.ssl) {
            if (!process.env.MONGO_SSL_CA || !process.env.MONGO_SSL_CERT || !process.env.MONGO_SSL_KEY) {
                throw new Error('SSL certificates not properly configured');
            }
        }

        // Validate connection options
        if (databaseConfig.options.maxPoolSize < databaseConfig.options.minPoolSize) {
            throw new Error('Invalid pool size configuration');
        }

        logger.info('MongoDB configuration validation successful');
        return true;
    } catch (error) {
        logger.error('MongoDB configuration validation failed', error as Error, {
            component: 'database',
            errorCode: ErrorCode.DATABASE_ERROR
        });
        return false;
    }
};

/**
 * Creates and manages MongoDB connection with enhanced retry and monitoring
 * @returns Promise<mongoose.Connection>
 */
export const createMongoConnection = async (): Promise<mongoose.Connection> => {
    try {
        // Validate configuration before attempting connection
        const isValid = await validateMongoConfig();
        if (!isValid) {
            throw new Error('Invalid MongoDB configuration');
        }

        // Configure mongoose connection
        mongoose.set('debug', process.env.NODE_ENV === 'development');

        // Initialize connection with retry mechanism
        let retryCount = 0;
        const connect = async (): Promise<void> => {
            try {
                await mongoose.connect(databaseConfig.uri, databaseConfig.options);
            } catch (error) {
                if (retryCount < databaseConfig.retryAttempts) {
                    retryCount++;
                    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
                    logger.warn(`Retrying MongoDB connection (${retryCount}/${databaseConfig.retryAttempts}) in ${delay}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return connect();
                }
                throw error;
            }
        };

        // Establish initial connection
        await connect();

        // Configure connection event handlers
        mongoose.connection.on('connected', () => {
            logger.info('MongoDB connection established successfully');
        });

        mongoose.connection.on('error', (error) => {
            logger.error('MongoDB connection error', error as Error, {
                component: 'database',
                errorCode: ErrorCode.DATABASE_ERROR
            });
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB connection disconnected');
        });

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            try {
                await mongoose.connection.close();
                logger.info('MongoDB connection closed through app termination');
                process.exit(0);
            } catch (error) {
                logger.error('Error during MongoDB connection closure', error as Error, {
                    component: 'database',
                    errorCode: ErrorCode.DATABASE_ERROR
                });
                process.exit(1);
            }
        });

        return mongoose.connection;
    } catch (error) {
        logger.error('Failed to establish MongoDB connection', error as Error, {
            component: 'database',
            errorCode: ErrorCode.DATABASE_ERROR
        });
        throw error;
    }
};