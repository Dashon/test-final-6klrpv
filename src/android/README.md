# AI Travel Platform - Android Application

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Security Configuration](#security-configuration)
- [Development](#development)
- [Testing](#testing)
- [Performance](#performance)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Version Compatibility](#version-compatibility)

## Overview

The AI Travel Platform Android application is a React Native-based mobile client that provides an AI-enhanced social travel experience. The application integrates advanced features including biometric authentication, secure payment processing, and real-time location services.

**Key Features:**
- AI-powered travel recommendations
- Real-time social interactions
- Secure payment processing
- Biometric authentication
- Offline data synchronization
- Multi-language support

## Prerequisites

### Required Software
- Node.js ≥18.0.0
- Java Development Kit (JDK) 11
- Android Studio Flamingo | 2022.2.1
- Android SDK (API Level 33)
- React Native CLI 0.71.x
- Kotlin 1.7.20

### Development Environment Setup

1. **System Configuration**
```bash
# Install Android SDK Platform Tools
sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0"

# Configure environment variables
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

## Installation

1. **Clone and Install Dependencies**
```bash
# Install project dependencies
npm install

# Install pods for native modules
npx jetify
```

2. **Configure Native Modules**
```bash
# Generate debug keystore
cd android/app
keytool -genkey -v -keystore debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000
```

## Security Configuration

### Keystore Management
```bash
# Generate production keystore
keytool -genkey -v -keystore release.keystore -alias release -keyalg RSA -keysize 4096 -validity 10000
```

### Security Features
- SSL Certificate Pinning
- Biometric Authentication
- Secure Storage Implementation
- ProGuard Configuration
- Root Detection

### Environment Variables
```bash
export KEYSTORE_PASSWORD="your-secure-password"
export KEY_ALIAS="release"
export KEY_PASSWORD="your-key-password"
```

## Development

### Available Scripts
```bash
# Start Metro bundler
npm start

# Run on Android device/emulator
npm run android

# Run tests
npm run test

# Type checking
npm run type-check

# Lint code
npm run lint
```

### Code Structure
```
android/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   ├── res/
│   │   │   └── AndroidManifest.xml
│   ├── build.gradle
│   └── proguard-rules.pro
├── gradle/
└── build.gradle
```

## Testing

### Unit Tests
```bash
# Run unit tests with coverage
npm run test

# Run E2E tests
npm run e2e:build
npm run e2e:test
```

### Security Testing
```bash
# Run security scan
npm run security-scan
```

## Performance

### Optimization Guidelines
- Enable ProGuard for release builds
- Implement image caching
- Configure network request timeouts
- Enable Hermes engine
- Implement lazy loading

### Build Configuration
```gradle
android {
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

## Deployment

### Release Build
```bash
# Generate release build
npm run build:android

# Location: android/app/build/outputs/apk/release/app-release.apk
```

### Release Checklist
- [ ] Update version numbers
- [ ] Test ProGuard configuration
- [ ] Verify signing configuration
- [ ] Run security scan
- [ ] Test on multiple devices
- [ ] Verify API endpoints
- [ ] Check analytics integration

## Troubleshooting

### Common Issues

1. **Build Failures**
```bash
# Clean project
cd android && ./gradlew clean
cd .. && npm run metro:clean
```

2. **Native Module Issues**
```bash
npm run postinstall
cd android && ./gradlew clean
```

### Security Issues
- Certificate pinning failures
- Biometric authentication errors
- Keystore access problems
- ProGuard configuration issues

## Version Compatibility

### Dependencies
- React Native: 0.71.8
- Kotlin: 1.7.20
- AndroidX Biometric: 1.1.0
- Play Services Location: 21.0.1
- Stripe Android: 20.25.8

### Supported Android Versions
- Minimum SDK: 21 (Android 5.0)
- Target SDK: 33 (Android 13)
- Build Tools: 33.0.0

### Native Module Versions
- @react-native-community/biometrics: 2.x
- @react-native-firebase/analytics: 18.0.0
- @react-navigation/native: 6.x

## License

Copyright © 2023 AI Travel Platform. All rights reserved.