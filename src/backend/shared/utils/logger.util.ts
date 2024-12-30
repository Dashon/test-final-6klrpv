/**
 * @fileoverview Centralized logging utility for the AI-Enhanced Social Travel Platform
 * @module shared/utils/logger
 * @version 1.0.0
 */

import winston from 'winston'; // v3.8.x
import DailyRotateFile from 'winston-daily-rotate-file'; // v4.7.x
import { v4 as uuidv4 } from 'uuid'; // v9.0.x
import { ErrorCode } from '../constants/error-codes';

// Environment configuration with defaults
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || 'logs';
const LOG_MAX_SIZE = process.env.LOG_MAX_SIZE || '20m';
const LOG_MAX_FILES = process.env.LOG_MAX_FILES || '14d';
const LOG_FORMAT = process.env.LOG_FORMAT || 'json';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Interface for structured log metadata
 */
interface LogMetadata {
    [key: string]: any;
    referenceId?: string;
    timestamp?: string;
    service?: string;
    environment?: string;
    correlationId?: string;
}

/**
 * Singleton logger class providing centralized logging functionality
 */
class Logger {
    private static instance: Logger;
    private logger: winston.Logger;
    private readonly logLevel: string;
    private readonly logFilePath: string;
    private fileTransport: DailyRotateFile;
    private errorTransport: DailyRotateFile;

    private constructor() {
        this.logLevel = LOG_LEVEL;
        this.logFilePath = LOG_FILE_PATH;

        // Configure file transport for regular logs
        this.fileTransport = new DailyRotateFile({
            filename: `${this.logFilePath}/application-%DATE%.log`,
            datePattern: 'YYYY-MM-DD',
            maxSize: LOG_MAX_SIZE,
            maxFiles: LOG_MAX_FILES,
            zippedArchive: true,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        });

        // Configure separate transport for error logs
        this.errorTransport = new DailyRotateFile({
            filename: `${this.logFilePath}/error-%DATE%.log`,
            datePattern: 'YYYY-MM-DD',
            maxSize: LOG_MAX_SIZE,
            maxFiles: LOG_MAX_FILES,
            level: 'error',
            zippedArchive: true,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        });

        // Initialize Winston logger with all transports
        this.logger = winston.createLogger({
            level: this.logLevel,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                LOG_FORMAT === 'json' ? winston.format.json() : winston.format.simple()
            ),
            defaultMeta: {
                service: 'travel-platform',
                environment: NODE_ENV
            },
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                }),
                this.fileTransport,
                this.errorTransport
            ]
        });
    }

    /**
     * Get singleton instance of Logger
     */
    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    /**
     * Sanitize sensitive data from logs
     */
    private sanitizeData(data: any): any {
        if (!data) return data;
        
        const sensitiveFields = ['password', 'token', 'creditCard', 'ssn'];
        const sanitized = { ...data };

        sensitiveFields.forEach(field => {
            if (field in sanitized) {
                sanitized[field] = '[REDACTED]';
            }
        });

        return sanitized;
    }

    /**
     * Generate base metadata for all log entries
     */
    private getBaseMetadata(metadata: LogMetadata = {}): LogMetadata {
        return {
            referenceId: uuidv4(),
            timestamp: new Date().toISOString(),
            service: 'travel-platform',
            environment: NODE_ENV,
            ...metadata
        };
    }

    /**
     * Log information level messages
     */
    public info(message: string, metadata: LogMetadata = {}): void {
        const enrichedMetadata = this.getBaseMetadata(metadata);
        this.logger.info(message, this.sanitizeData(enrichedMetadata));
    }

    /**
     * Log error level messages with comprehensive error tracking
     */
    public error(message: string, error: Error, metadata: LogMetadata = {}): void {
        const errorMetadata = {
            ...this.getBaseMetadata(metadata),
            errorCode: error.name || ErrorCode.INTERNAL_SERVER_ERROR,
            stackTrace: error.stack,
            errorMessage: error.message
        };

        this.logger.error(message, this.sanitizeData(errorMetadata));
    }

    /**
     * Log warning level messages
     */
    public warn(message: string, metadata: LogMetadata = {}): void {
        const enrichedMetadata = this.getBaseMetadata(metadata);
        this.logger.warn(message, this.sanitizeData(enrichedMetadata));
    }

    /**
     * Log debug level messages with detailed debugging information
     */
    public debug(message: string, metadata: LogMetadata = {}): void {
        if (this.logLevel === 'debug') {
            const enrichedMetadata = {
                ...this.getBaseMetadata(metadata),
                debugContext: {
                    memoryUsage: process.memoryUsage(),
                    uptime: process.uptime()
                }
            };
            this.logger.debug(message, this.sanitizeData(enrichedMetadata));
        }
    }

    /**
     * Gracefully close logger and flush any pending logs
     */
    public async close(): Promise<void> {
        await Promise.all([
            new Promise(resolve => this.fileTransport.on('finish', resolve)),
            new Promise(resolve => this.errorTransport.on('finish', resolve))
        ]);
        await this.logger.close();
    }
}

// Export singleton instance
export const logger = Logger.getInstance();
```

This implementation provides:

1. Singleton pattern for centralized logging
2. Multiple log levels (info, error, warn, debug)
3. Structured logging with JSON format
4. Log rotation and compression
5. Separate error log files
6. Sensitive data sanitization
7. Unique reference IDs for tracking
8. Environment-aware configuration
9. Performance metrics in debug mode
10. ELK Stack compatible JSON output
11. Graceful shutdown support
12. Comprehensive error tracking with stack traces

The logger can be used across the application like this:

```typescript
// Basic info logging
logger.info('User login successful', { userId: '123', action: 'login' });

// Error logging with stack trace
try {
  // ... some operation
} catch (error) {
  logger.error('Failed to process payment', error, { orderId: '456' });
}

// Warning with metadata
logger.warn('Rate limit approaching', { currentRate: 95, threshold: 100 });

// Debug information
logger.debug('Processing request', { requestId: '789', payload: requestData });