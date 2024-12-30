import type { JestConfigWithTsJest } from 'ts-jest';

/**
 * Root Jest configuration for backend microservices architecture
 * Version compatibility:
 * - jest: ^29.5.x
 * - ts-jest: ^29.1.x
 */
const config: JestConfigWithTsJest = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',
  
  // Set Node.js as the test environment
  testEnvironment: 'node',
  
  // Define test roots for each microservice
  roots: [
    '<rootDir>/booking-service/tests',
    '<rootDir>/persona-service/tests',
    '<rootDir>/professional-service/tests',
    '<rootDir>/social-service/tests',
    '<rootDir>/ml-service/tests',
  ],
  
  // Configure module path aliases for better import resolution
  moduleNameMapper: {
    '@shared/(.*)': '<rootDir>/shared/$1',
    '@booking/(.*)': '<rootDir>/booking-service/src/$1',
    '@persona/(.*)': '<rootDir>/persona-service/src/$1',
    '@professional/(.*)': '<rootDir>/professional-service/src/$1',
    '@social/(.*)': '<rootDir>/social-service/src/$1',
    '@ml/(.*)': '<rootDir>/ml-service/src/$1',
  },
  
  // Setup file to run after Jest is loaded
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  
  // Pattern matching for test files
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  
  // Transform TypeScript files using ts-jest
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  
  // Configure coverage collection
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
  ],
  
  // Set coverage thresholds for CI/CD pipeline
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // TypeScript and ts-jest specific configuration
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
      diagnostics: true,
    },
  },
  
  // Supported file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Enable verbose output for detailed test results
  verbose: true,
  
  // Set timeout for long-running tests (30 seconds)
  testTimeout: 30000,
  
  // Optimize test execution in CI/CD pipeline
  maxWorkers: '50%',
};

/**
 * Factory function to get Jest configuration
 * @returns {JestConfigWithTsJest} Configured Jest object
 */
export const getJestConfig = (): JestConfigWithTsJest => {
  return config;
};

// Export default configuration
export default config;