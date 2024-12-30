// Jest configuration for web application
// Version: jest ^29.5.0

import type { Config } from 'jest';

const config: Config = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Set jsdom environment for browser-like testing
  testEnvironment: 'jsdom',

  // Setup files to run after jest is initialized
  setupFilesAfterEnv: ['<rootDir>/src/tests/setupTests.ts'],

  // Module name mapping for path aliases and static assets
  moduleNameMapper: {
    // Path aliases matching tsconfig.json paths
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',

    // Static asset mocks
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/src/tests/__mocks__/fileMock.ts'
  },

  // Coverage configuration
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/tests/**/*',
    '!src/types/**/*'
  ],

  // Coverage thresholds enforcement
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Test file patterns
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],

  // TypeScript transformation configuration
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },

  // TypeScript configuration for ts-jest
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json'
    }
  },

  // Supported file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Watch plugins for better development experience
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ]
};

export default config;