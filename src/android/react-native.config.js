// React Native Configuration v0.71.x
// Defines project-wide settings and native module dependencies for Android platform

module.exports = {
  project: {
    // iOS configuration placeholder for cross-platform compatibility
    ios: {},
    
    // Android-specific configuration
    android: {
      // Root directory for Android project
      sourceDir: './android',
      
      // Path to Android manifest file
      manifestPath: './android/app/src/main/AndroidManifest.xml',
      
      // Application package name
      packageName: 'com.aitravelplatform',
      
      // Asset directories to include in the build
      assets: [
        // Custom fonts directory for Design System typography (Roboto, Playfair Display)
        './assets/fonts'
      ],
      
      // Native module dependencies with specific versions
      dependencies: {
        // Biometric authentication support
        'androidx.biometric:biometric': '1.1.0',
        
        // Location services for travel features
        'com.google.android.gms:play-services-location': '21.0.1',
        
        // Stripe payment integration
        'com.stripe:stripe-android': '20.25.8'
      }
    }
  },
  
  // Additional project-wide asset configurations
  assets: [
    './assets/fonts'
  ],
  
  // Custom Gradle commands
  commands: [
    './android/gradlew'
  ],
  
  // Platform-specific dependency configurations
  dependencies: {
    platforms: {
      android: {},
      ios: {}
    }
  }
};