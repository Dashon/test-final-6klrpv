/**
 * @fileoverview Enterprise-grade encryption utilities for secure data handling
 * @module shared/utils/encryption
 * @version 1.0.0
 */

import { randomBytes, createCipheriv, createDecipheriv, scrypt } from 'crypto';
import { promisify } from 'util';
import * as bcrypt from 'bcrypt'; // v5.1.0
import { ErrorCode } from '../constants/error-codes';
import { Logger } from './logger.util';

// Constants for encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const AUTH_TAG_LENGTH = 16;
const IV_LENGTH = 12;
const SALT_ROUNDS = 12;
const KEY_LENGTH = 32;
const MEMORY_WIPE_PATTERN = 0x00;

// Promisify scrypt for async key derivation
const scryptAsync = promisify(scrypt);

/**
 * Interface for encrypted data structure
 */
interface EncryptedData {
  iv: Buffer;
  encryptedData: Buffer;
  authTag: Buffer;
}

/**
 * Securely wipes a buffer by overwriting with zeros
 * @param buffer Buffer to be wiped
 */
const secureWipe = (buffer: Buffer): void => {
  buffer.fill(MEMORY_WIPE_PATTERN);
};

/**
 * Validates encryption key length
 * @param key Encryption key to validate
 * @throws Error if key length is invalid
 */
const validateKey = (key: Buffer): void => {
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Invalid key length. Expected ${KEY_LENGTH} bytes.`);
  }
};

/**
 * Encrypts data using AES-256-GCM with secure memory handling
 * @param data String data to encrypt
 * @param encryptionKey Buffer containing the encryption key
 * @returns EncryptedData object containing IV, encrypted data, and auth tag
 */
export const encrypt = async (data: string, encryptionKey: Buffer): Promise<EncryptedData> => {
  try {
    validateKey(encryptionKey);

    // Generate random IV
    const iv = randomBytes(IV_LENGTH);

    // Create cipher with AES-256-GCM
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, encryptionKey, iv);

    // Encrypt data
    const encryptedData = Buffer.concat([
      cipher.update(Buffer.from(data)),
      cipher.final()
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Log encryption operation (without sensitive data)
    Logger.getInstance().info('Data encryption completed', {
      operation: 'encrypt',
      algorithm: ENCRYPTION_ALGORITHM,
      dataLength: data.length
    });

    return { iv, encryptedData, authTag };
  } catch (error) {
    Logger.getInstance().error(
      'Encryption failed',
      error instanceof Error ? error : new Error('Unknown encryption error'),
      { errorCode: ErrorCode.ENCRYPTION_ERROR }
    );
    throw error;
  }
};

/**
 * Decrypts data using AES-256-GCM with authentication
 * @param encryptedData Buffer containing encrypted data
 * @param iv Initialization vector used for encryption
 * @param authTag Authentication tag for integrity verification
 * @param encryptionKey Buffer containing the encryption key
 * @returns Buffer containing decrypted data
 */
export const decrypt = async (
  encryptedData: Buffer,
  iv: Buffer,
  authTag: Buffer,
  encryptionKey: Buffer
): Promise<Buffer> => {
  try {
    validateKey(encryptionKey);

    // Create decipher
    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, encryptionKey, iv);
    decipher.setAuthTag(authTag);

    // Decrypt data
    const decryptedData = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final()
    ]);

    // Log decryption operation
    Logger.getInstance().info('Data decryption completed', {
      operation: 'decrypt',
      algorithm: ENCRYPTION_ALGORITHM,
      dataLength: decryptedData.length
    });

    return decryptedData;
  } catch (error) {
    Logger.getInstance().error(
      'Decryption failed',
      error instanceof Error ? error : new Error('Unknown decryption error'),
      { errorCode: ErrorCode.ENCRYPTION_ERROR }
    );
    throw error;
  } finally {
    // Secure cleanup of sensitive data
    if (encryptionKey) secureWipe(encryptionKey);
  }
};

/**
 * Creates a secure hash of a password using bcrypt
 * @param password Password string to hash
 * @returns Promise resolving to hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);

    Logger.getInstance().info('Password hashing completed', {
      operation: 'hash',
      rounds: SALT_ROUNDS
    });

    return hash;
  } catch (error) {
    Logger.getInstance().error(
      'Password hashing failed',
      error instanceof Error ? error : new Error('Password hashing failed'),
      { errorCode: ErrorCode.INTERNAL_SERVER_ERROR }
    );
    throw error;
  }
};

/**
 * Compares a password with its hash using constant-time comparison
 * @param password Password to verify
 * @param hash Hash to compare against
 * @returns Promise resolving to boolean indicating match
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    const isMatch = await bcrypt.compare(password, hash);

    Logger.getInstance().info('Password comparison completed', {
      operation: 'compare',
      result: 'completed'
    });

    return isMatch;
  } catch (error) {
    Logger.getInstance().error(
      'Password comparison failed',
      error instanceof Error ? error : new Error('Password comparison failed'),
      { errorCode: ErrorCode.INTERNAL_SERVER_ERROR }
    );
    throw error;
  }
};