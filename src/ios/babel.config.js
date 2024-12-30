// babel.config.js
// Babel configuration for iOS React Native application
// Dependencies versions:
// - metro-react-native-babel-preset: ^0.73.x
// - @babel/preset-typescript: ^7.20.x
// - react-native-reanimated: ^2.x
// - babel-plugin-transform-remove-console: ^6.x

module.exports = {
  // Base presets for React Native and TypeScript support
  presets: [
    [
      'module:metro-react-native-babel-preset',
      {
        // Enable latest JavaScript features and React Native specific transforms
        unstable_transformProfile: 'hermes-stable',
      },
    ],
    [
      '@babel/preset-typescript',
      {
        // TypeScript specific configuration
        allowNamespaces: true,
        allowDeclareFields: true,
        onlyRemoveTypeImports: true,
      },
    ],
  ],

  // Plugin configurations
  plugins: [
    // React Native Reanimated plugin for optimized animations
    [
      'react-native-reanimated/plugin',
      {
        // Optimize animation performance
        relativeSourceLocation: true,
      },
    ],
  ],

  // Environment-specific configurations
  env: {
    production: {
      plugins: [
        // Remove console statements in production for better performance
        'transform-remove-console',
      ],
    },
    development: {
      // Development-specific settings
      retainLines: true,
    },
  },

  // Additional configuration options
  assumptions: {
    // Optimize output based on common React Native patterns
    setPublicClassFields: true,
    privateFieldsAsProperties: true,
    constantSuper: true,
  },

  // Source type configuration
  sourceType: 'unambiguous',

  // Compact output in production
  compact: process.env.NODE_ENV === 'production',
}