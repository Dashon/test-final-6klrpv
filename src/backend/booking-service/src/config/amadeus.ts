/**
 * @fileoverview Amadeus GDS Configuration with enhanced resilience features
 * @module booking-service/config/amadeus
 * @version 1.0.0
 * 
 * Manages API credentials, endpoints, and connection settings for the Amadeus GDS
 * integration with comprehensive validation and monitoring capabilities.
 */

import { config as dotenv } from 'dotenv'; // v16.3.x
import { logger } from '../../../shared/utils/logger.util';
import { ErrorCode } from '../../../shared/constants/error-codes';

// Load environment variables
dotenv();

/**
 * Interface defining the structure of Amadeus configuration
 * with comprehensive resilience parameters
 */
interface IAmadeusConfig {
    clientId: string;
    clientSecret: string;
    apiEndpoint: string;
    environment: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
    configVersion: string;
    isValid: boolean;
}

// Configuration constants with environment variable fallbacks
const AMADEUS_CLIENT_ID = process.env.AMADEUS_CLIENT_ID;
const AMADEUS_CLIENT_SECRET = process.env.AMADEUS_CLIENT_SECRET;
const AMADEUS_API_ENDPOINT = process.env.AMADEUS_API_ENDPOINT || 'https://test.api.amadeus.com';
const AMADEUS_ENVIRONMENT = process.env.NODE_ENV === 'production' ? 'production' : 'test';
const AMADEUS_TIMEOUT = parseInt(process.env.AMADEUS_TIMEOUT || '30000');
const AMADEUS_RETRY_ATTEMPTS = parseInt(process.env.AMADEUS_RETRY_ATTEMPTS || '3');
const AMADEUS_RETRY_DELAY = parseInt(process.env.AMADEUS_RETRY_DELAY || '1000');
const AMADEUS_CONFIG_VERSION = '1.0.0';

/**
 * Validates Amadeus configuration parameters with comprehensive checks
 * @returns {boolean} Configuration validation status
 */
const validateAmadeusConfig = (): boolean => {
    try {
        // Client ID validation
        if (!AMADEUS_CLIENT_ID || AMADEUS_CLIENT_ID.length < 32) {
            logger.error(
                'Invalid Amadeus Client ID configuration',
                new Error(ErrorCode.VALIDATION_ERROR),
                { configItem: 'clientId' }
            );
            return false;
        }

        // Client Secret validation
        if (!AMADEUS_CLIENT_SECRET || AMADEUS_CLIENT_SECRET.length < 32) {
            logger.error(
                'Invalid Amadeus Client Secret configuration',
                new Error(ErrorCode.VALIDATION_ERROR),
                { configItem: 'clientSecret' }
            );
            return false;
        }

        // API Endpoint validation
        const urlPattern = /^https:\/\/[a-zA-Z0-9-_.]+\.(api\.amadeus\.com)$/;
        if (!urlPattern.test(AMADEUS_API_ENDPOINT)) {
            logger.error(
                'Invalid Amadeus API endpoint format',
                new Error(ErrorCode.VALIDATION_ERROR),
                { configItem: 'apiEndpoint' }
            );
            return false;
        }

        // Environment validation
        if (!['production', 'test'].includes(AMADEUS_ENVIRONMENT)) {
            logger.error(
                'Invalid Amadeus environment configuration',
                new Error(ErrorCode.VALIDATION_ERROR),
                { configItem: 'environment' }
            );
            return false;
        }

        // Timeout validation (5s - 60s range)
        if (AMADEUS_TIMEOUT < 5000 || AMADEUS_TIMEOUT > 60000) {
            logger.error(
                'Invalid Amadeus timeout configuration',
                new Error(ErrorCode.VALIDATION_ERROR),
                { configItem: 'timeout' }
            );
            return false;
        }

        // Retry attempts validation (1-5 range)
        if (AMADEUS_RETRY_ATTEMPTS < 1 || AMADEUS_RETRY_ATTEMPTS > 5) {
            logger.error(
                'Invalid Amadeus retry attempts configuration',
                new Error(ErrorCode.VALIDATION_ERROR),
                { configItem: 'retryAttempts' }
            );
            return false;
        }

        // Retry delay validation (1s - 5s range)
        if (AMADEUS_RETRY_DELAY < 1000 || AMADEUS_RETRY_DELAY > 5000) {
            logger.error(
                'Invalid Amadeus retry delay configuration',
                new Error(ErrorCode.VALIDATION_ERROR),
                { configItem: 'retryDelay' }
            );
            return false;
        }

        logger.info('Amadeus configuration validation successful', {
            environment: AMADEUS_ENVIRONMENT,
            configVersion: AMADEUS_CONFIG_VERSION
        });

        return true;
    } catch (error) {
        logger.error(
            'Amadeus configuration validation failed',
            error as Error,
            { configVersion: AMADEUS_CONFIG_VERSION }
        );
        return false;
    }
};

/**
 * Hot-reload function for updating configuration during runtime
 * @returns {Promise<boolean>} Success status of configuration reload
 */
const reloadAmadeusConfig = async (): Promise<boolean> => {
    try {
        // Reload environment variables
        dotenv();

        // Create temporary configuration
        const tempConfig: IAmadeusConfig = {
            clientId: process.env.AMADEUS_CLIENT_ID || AMADEUS_CLIENT_ID,
            clientSecret: process.env.AMADEUS_CLIENT_SECRET || AMADEUS_CLIENT_SECRET,
            apiEndpoint: process.env.AMADEUS_API_ENDPOINT || AMADEUS_API_ENDPOINT,
            environment: process.env.NODE_ENV === 'production' ? 'production' : 'test',
            timeout: parseInt(process.env.AMADEUS_TIMEOUT || String(AMADEUS_TIMEOUT)),
            retryAttempts: parseInt(process.env.AMADEUS_RETRY_ATTEMPTS || String(AMADEUS_RETRY_ATTEMPTS)),
            retryDelay: parseInt(process.env.AMADEUS_RETRY_DELAY || String(AMADEUS_RETRY_DELAY)),
            configVersion: AMADEUS_CONFIG_VERSION,
            isValid: false
        };

        // Validate new configuration
        const isValid = validateAmadeusConfig();
        if (!isValid) {
            logger.warn('Amadeus configuration reload failed - keeping existing configuration');
            return false;
        }

        // Update active configuration
        Object.assign(amadeusConfig, tempConfig, { isValid });
        
        logger.info('Amadeus configuration reloaded successfully', {
            configVersion: AMADEUS_CONFIG_VERSION,
            environment: amadeusConfig.environment
        });

        return true;
    } catch (error) {
        logger.error(
            'Failed to reload Amadeus configuration',
            error as Error,
            { configVersion: AMADEUS_CONFIG_VERSION }
        );
        return false;
    }
};

/**
 * Amadeus configuration object with resilience features
 */
export const amadeusConfig: IAmadeusConfig = {
    clientId: AMADEUS_CLIENT_ID,
    clientSecret: AMADEUS_CLIENT_SECRET,
    apiEndpoint: AMADEUS_API_ENDPOINT,
    environment: AMADEUS_ENVIRONMENT,
    timeout: AMADEUS_TIMEOUT,
    retryAttempts: AMADEUS_RETRY_ATTEMPTS,
    retryDelay: AMADEUS_RETRY_DELAY,
    configVersion: AMADEUS_CONFIG_VERSION,
    isValid: validateAmadeusConfig()
};

// Export configuration management functions
export { validateAmadeusConfig, reloadAmadeusConfig };