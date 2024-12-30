/**
 * Babel Configuration for Android React Native Application
 * 
 * @version 1.0.0
 * @requires @babel/core ^7.20.0
 * @requires @babel/preset-env ^7.20.0
 * @requires metro-react-native-babel-preset 0.73.7
 * @requires react-native-reanimated ^2.14.0
 * @requires babel-plugin-transform-remove-console ^6.9.4
 */

module.exports = function(api) {
  // Cache the returned value forever and don't call this function again
  api.cache(true);

  // Return Babel configuration object
  return {
    // Base preset for React Native development
    presets: ['module:metro-react-native-babel-preset'],

    // Global plugins that apply to all environments
    plugins: [
      // Plugin for optimizing React Native animations
      'react-native-reanimated/plugin'
    ],

    // Environment-specific configurations
    env: {
      production: {
        plugins: [
          // Remove console.* statements in production for better performance
          'transform-remove-console'
        ]
      }
    }
  };
};