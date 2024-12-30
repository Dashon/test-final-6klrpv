/**
 * @fileoverview Validation constants and rules for the AI-Enhanced Social Travel Platform
 * Implements comprehensive validation for forms, data integrity, and error handling
 * @version 1.0.0
 */

/**
 * Password validation rules ensuring security compliance
 * Follows OWASP security guidelines for password strength
 */
export const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 32,
  requireSpecialChar: true,
  requireNumber: true,
  requireUppercase: true,
  specialCharRegex: /[!@#$%^&*(),.?":{}|<>]/,
  bannedCharacters: /['`"\\]/
} as const;

/**
 * RFC 5322 compliant email validation
 * Comprehensive email regex that covers all valid email formats
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Username validation rules with reserved name protection
 * Ensures usernames are unique and follow platform guidelines
 */
export const USERNAME_RULES = {
  minLength: 3,
  maxLength: 20,
  allowedCharacters: /^[a-zA-Z0-9_-]+$/,
  reservedNames: [
    'admin',
    'system',
    'support',
    'help',
    'root',
    'administrator',
    'mod',
    'moderator',
    'ai',
    'bot',
    'travel',
    'booking'
  ]
} as const;

/**
 * Booking validation rules for travel arrangements
 * Enforces business rules for travel bookings
 */
export const BOOKING_VALIDATION = {
  minStayDuration: 1,
  maxStayDuration: 30,
  maxTravellers: 20,
  minPaymentAmount: 1,
  maxPaymentAmount: 50000,
  advanceBookingDays: 365,
  maxRooms: 5
} as const;

/**
 * Chat validation rules for messaging and file sharing
 * Ensures proper communication and file sharing constraints
 */
export const CHAT_VALIDATION = {
  maxMessageLength: 1000,
  maxParticipants: 20,
  fileTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  maxFileSize: 10485760, // 10MB in bytes
  urlRegex: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/
} as const;

/**
 * Validation error message templates with i18n support
 * Provides user-friendly error messages for all validation scenarios
 */
export const VALIDATION_MESSAGES = {
  required: 'This field is required',
  email: {
    invalid: 'Please enter a valid email address',
    exists: 'This email is already registered',
    format: 'Email must be in a valid format'
  },
  password: {
    tooShort: `Password must be at least ${PASSWORD_RULES.minLength} characters`,
    tooLong: `Password must be less than ${PASSWORD_RULES.maxLength} characters`,
    requireSpecial: 'Password must contain at least one special character',
    requireNumber: 'Password must contain at least one number',
    requireUppercase: 'Password must contain at least one uppercase letter',
    invalidChars: 'Password contains invalid characters',
    common: 'This password is too common, please choose a stronger password'
  },
  username: {
    tooShort: `Username must be at least ${USERNAME_RULES.minLength} characters`,
    tooLong: `Username must be less than ${USERNAME_RULES.maxLength} characters`,
    invalidChars: 'Username can only contain letters, numbers, underscores, and hyphens',
    reserved: 'This username is reserved and cannot be used',
    exists: 'This username is already taken'
  },
  booking: {
    invalidDates: 'Please select valid travel dates',
    stayTooLong: `Stay duration cannot exceed ${BOOKING_VALIDATION.maxStayDuration} days`,
    stayTooShort: `Stay duration must be at least ${BOOKING_VALIDATION.minStayDuration} day`,
    tooManyTravellers: `Cannot exceed ${BOOKING_VALIDATION.maxTravellers} travellers`,
    invalidAmount: `Payment amount must be between $${BOOKING_VALIDATION.minPaymentAmount} and $${BOOKING_VALIDATION.maxPaymentAmount}`,
    tooManyRooms: `Cannot book more than ${BOOKING_VALIDATION.maxRooms} rooms`,
    advanceBooking: `Cannot book more than ${BOOKING_VALIDATION.advanceBookingDays} days in advance`
  },
  chat: {
    messageTooLong: `Message cannot exceed ${CHAT_VALIDATION.maxMessageLength} characters`,
    tooManyParticipants: `Cannot exceed ${CHAT_VALIDATION.maxParticipants} participants`,
    invalidFileType: 'Invalid file type. Allowed types: JPEG, PNG, GIF, PDF, DOC, DOCX',
    fileTooLarge: `File size cannot exceed ${CHAT_VALIDATION.maxFileSize / 1048576}MB`,
    invalidUrl: 'Please enter a valid URL'
  },
  files: {
    type: 'Invalid file type',
    size: 'File is too large',
    upload: 'Error uploading file',
    corrupt: 'File appears to be corrupt or invalid'
  }
} as const;