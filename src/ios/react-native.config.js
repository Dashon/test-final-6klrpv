// @react-native v0.71.x

/**
 * React Native Configuration
 * Platform: iOS
 * 
 * This configuration file defines project-wide settings for native dependencies,
 * assets, and build configurations specific to the iOS platform. It includes
 * custom font configurations, native module settings, and platform-specific
 * optimizations for the AI Travel Platform.
 */

module.exports = {
  // Project configuration
  project: {
    ios: {
      // Source directory for iOS native code
      sourceDir: './ios',
      
      // Podfile configuration
      podfile: {
        path: './ios/Podfile',
        platforms: {
          ios: '13.0', // Minimum iOS version supported
        },
      },
      
      // Xcode project configuration
      xcodeproj: {
        path: './ios/AITravelPlatform.xcodeproj',
        buildSettings: {
          ENABLE_BITCODE: 'NO', // Disabled as per React Native recommendations
          SWIFT_VERSION: '5.0', // Latest stable Swift version
        },
      },
    },
  },

  // Asset configuration for fonts and images
  assets: [
    // Custom fonts directory containing Roboto and Playfair Display
    './ios/Fonts',
    // System assets including app icons and launch screens
    './ios/Assets.xcassets',
  ],

  // Native dependencies configuration
  dependencies: {
    // Async Storage for persistent data
    '@react-native-async-storage/async-storage': {
      platforms: {
        ios: {
          podspecPath: './node_modules/@react-native-async-storage/async-storage/ios/RNCAsyncStorage.podspec',
        },
      },
    },

    // Animation library for smooth UI transitions
    'react-native-reanimated': {
      platforms: {
        ios: {
          sourceDir: './node_modules/react-native-reanimated/ios',
          enableSwift: true, // Enable Swift support for enhanced performance
        },
      },
    },

    // Gesture handling for interactive UI elements
    'react-native-gesture-handler': {
      platforms: {
        ios: {
          sourceDir: './node_modules/react-native-gesture-handler/ios',
        },
      },
    },

    // Safe area handling for notched devices
    'react-native-safe-area-context': {
      platforms: {
        ios: {
          sourceDir: './node_modules/react-native-safe-area-context/ios',
        },
      },
    },

    // Native navigation container
    'react-native-screens': {
      platforms: {
        ios: {
          sourceDir: './node_modules/react-native-screens/ios',
          enableSwift: true, // Enable Swift support for better performance
        },
      },
    },
  },
};