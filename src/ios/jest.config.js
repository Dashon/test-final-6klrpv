// Jest configuration for iOS React Native application
// Using react-native v0.71.x preset

/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  // Use React Native specific Jest preset as base configuration
  preset: 'react-native',

  // Supported file extensions for test files and modules
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],

  // Test environment configuration
  testEnvironment: 'node',

  // Pattern for test file matching
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',

  // Setup files to run before tests
  setupFiles: [
    './jest.setup.js'
  ],

  // Transform configuration for node_modules
  // Ensures React Native and related packages are properly transformed
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation)/)'
  ],

  // Asset file mocking configuration
  moduleNameMapper: {
    // Mock all asset files to prevent test failures
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 
      '<rootDir>/__mocks__/fileMock.js'
  },

  // Coverage collection configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    // Exclude type declaration files
    '!src/**/*.d.ts',
    // Exclude story files
    '!src/**/*.stories.{ts,tsx}',
    // Exclude style files
    '!src/**/*.styles.{ts,tsx}'
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

  // Global variables available in test environment
  globals: {
    __DEV__: true
  },

  // Reporter configuration for test results
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './coverage/junit',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ],

  // Timeout configuration
  testTimeout: 10000,

  // Verbose output for detailed test results
  verbose: true,

  // Clear mock calls and instances between every test
  clearMocks: true,

  // Reset mocks between every test
  resetMocks: true,

  // Restore mocks between every test
  restoreMocks: true
};