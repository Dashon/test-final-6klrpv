/**
 * Jest Configuration for AI-Enhanced Social Travel Platform Android App
 * Version: 29.2.1
 * 
 * This configuration sets up the test environment for the React Native Android application
 * with support for TypeScript, gestures, navigation, and animations. It includes comprehensive
 * test coverage thresholds and module mappings for optimal testing workflow.
 */

module.exports = {
  // Use React Native preset as the base configuration
  preset: 'react-native', // react-native@0.71.x

  // File extensions for test modules
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],

  // Setup files to run before each test
  setupFiles: [
    // react-native-gesture-handler@~2.9.0
    './node_modules/react-native-gesture-handler/jestSetup.js'
  ],

  // Configure module transformations
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|@react-native-community|react-native-reanimated|react-native-gesture-handler)/)'
  ],

  // Module name mapping for @ alias support
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // Test pattern configuration
  testRegex: '(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$',

  // Paths to ignore during testing
  testPathIgnorePatterns: [
    '\\.snap$',
    '<rootDir>/node_modules/',
    '<rootDir>/android/',
    '<rootDir>/ios/'
  ],

  // Cache configuration for faster subsequent runs
  cacheDirectory: '.jest/cache',

  // Coverage collection configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/types.ts',
    '!src/**/index.ts'
  ],

  // Coverage thresholds to maintain code quality
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Global variables available in tests
  globals: {
    __DEV__: true
  },

  // Verbose output for detailed test results
  verbose: true,

  // Clear mock calls and instances between every test
  clearMocks: true,

  // Automatically reset mock state between every test
  resetMocks: true,

  // Indicates whether each individual test should be reported during the run
  silent: false,

  // The maximum amount of workers used to run your tests
  maxWorkers: '50%',

  // Automatically restore mock state between every test
  restoreMocks: true,

  // Timeout for async operations
  testTimeout: 10000,

  // Environment configuration
  testEnvironment: 'node',

  // Reporter configuration
  reporters: ['default'],

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // Coverage report formats
  coverageReporters: [
    'json',
    'lcov',
    'text',
    'clover'
  ]
};