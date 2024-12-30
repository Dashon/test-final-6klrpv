/**
 * @fileoverview Enhanced profile screen component for Android mobile app
 * @version 1.0.0
 * 
 * Implements comprehensive user profile management with advanced security features,
 * biometric authentication, and offline access configuration.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Switch,
  Alert,
  Platform
} from 'react-native';
import ReactNativeBiometrics from 'react-native-biometrics';

// Internal imports
import Button from '../../components/shared/Button';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { colors } from '../../constants/colors';
import { Spacing } from '../../constants/layout';
import { BiometricStatus, User } from '../../types/auth';
import { ErrorCode } from '../../../../backend/shared/constants/error-codes';

/**
 * Props interface for ProfileScreen component
 */
interface ProfileScreenProps {
  navigation: any;
  route: any;
}

/**
 * Enhanced profile screen component with security features
 */
const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  // Auth hook for user state and operations
  const { 
    isAuthenticated, 
    user, 
    handleLogout,
    handleMFASetup,
    handleBiometricSetup
  } = useAuth();

  // Local state management
  const [loading, setLoading] = useState<boolean>(false);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus>('checking');
  const [localUser, setLocalUser] = useState<User | null>(user);

  /**
   * Handles MFA toggle with enhanced error handling
   */
  const handleMFAToggle = useCallback(async (enabled: boolean) => {
    try {
      setLoading(true);
      
      if (!isAuthenticated || !localUser) {
        throw new Error('Authentication required');
      }

      await handleMFASetup(enabled);
      
      setLocalUser(prev => prev ? {
        ...prev,
        mfaEnabled: enabled
      } : null);

      Alert.alert(
        'MFA Status Updated',
        `Multi-factor authentication has been ${enabled ? 'enabled' : 'disabled'}.`
      );
    } catch (error: any) {
      Alert.alert(
        'MFA Setup Failed',
        error.code === ErrorCode.AUTHENTICATION_ERROR
          ? 'Please verify your identity to modify security settings.'
          : 'Unable to update MFA settings. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, localUser, handleMFASetup]);

  /**
   * Handles biometric authentication toggle
   */
  const handleBiometricToggle = useCallback(async (enabled: boolean) => {
    try {
      setLoading(true);

      const biometricAuth = new ReactNativeBiometrics();
      const { available, biometryType } = await biometricAuth.isSensorAvailable();

      if (!available) {
        throw new Error('Biometric authentication not available on this device');
      }

      await handleBiometricSetup(enabled);
      
      setLocalUser(prev => prev ? {
        ...prev,
        biometricEnabled: enabled
      } : null);

      Alert.alert(
        'Biometric Authentication Updated',
        `${biometryType} authentication has been ${enabled ? 'enabled' : 'disabled'}.`
      );
    } catch (error: any) {
      Alert.alert(
        'Biometric Setup Failed',
        error.message || 'Unable to configure biometric authentication'
      );
    } finally {
      setLoading(false);
    }
  }, [handleBiometricSetup]);

  /**
   * Handles offline access configuration
   */
  const handleOfflineToggle = useCallback(async (enabled: boolean) => {
    try {
      setLoading(true);

      if (enabled) {
        Alert.alert(
          'Enable Offline Access',
          'This will store encrypted data on your device. Continue?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => setLocalUser(prev => prev ? {
                ...prev,
                preferences: {
                  ...prev.preferences,
                  offlineAccess: false
                }
              } : null)
            },
            {
              text: 'Enable',
              onPress: async () => {
                setLocalUser(prev => prev ? {
                  ...prev,
                  preferences: {
                    ...prev.preferences,
                    offlineAccess: true
                  }
                } : null);
              }
            }
          ]
        );
      } else {
        setLocalUser(prev => prev ? {
          ...prev,
          preferences: {
            ...prev.preferences,
            offlineAccess: false
          }
        } : null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update offline access settings');
    } finally {
      setLoading(false);
    }
  }, []);

  // Check biometric capability on mount
  useEffect(() => {
    const checkBiometric = async () => {
      try {
        const biometricAuth = new ReactNativeBiometrics();
        const { available } = await biometricAuth.isSensorAvailable();
        setBiometricStatus(available ? 'available' : 'unavailable');
      } catch {
        setBiometricStatus('noHardware');
      }
    };
    checkBiometric();
  }, []);

  if (!localUser) {
    return <LoadingSpinner fullscreen />;
  }

  return (
    <ScrollView style={styles.container}>
      {/* User Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Information</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{localUser.email}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>{localUser.role}</Text>
        </View>
      </View>

      {/* Security Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security Settings</Text>
        
        <View style={[styles.row, styles.securityRow]}>
          <Text style={styles.label}>Multi-Factor Authentication</Text>
          <Switch
            value={localUser.mfaEnabled}
            onValueChange={handleMFAToggle}
            disabled={loading}
            trackColor={{ 
              false: colors.background.tertiary, 
              true: colors.primary.default 
            }}
          />
        </View>

        {biometricStatus === 'available' && (
          <View style={[styles.row, styles.securityRow]}>
            <Text style={styles.label}>Biometric Authentication</Text>
            <Switch
              value={localUser.biometricEnabled}
              onValueChange={handleBiometricToggle}
              disabled={loading}
              trackColor={{ 
                false: colors.background.tertiary, 
                true: colors.primary.default 
              }}
            />
          </View>
        )}
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        
        <View style={[styles.row, styles.securityRow]}>
          <Text style={styles.label}>Offline Access</Text>
          <Switch
            value={localUser.preferences.offlineAccess}
            onValueChange={handleOfflineToggle}
            disabled={loading}
            trackColor={{ 
              false: colors.background.tertiary, 
              true: colors.primary.default 
            }}
          />
        </View>
      </View>

      {/* Logout Button */}
      <Button
        label="Logout"
        onPress={handleLogout}
        style={styles.logoutButton}
        variant="outline"
        disabled={loading}
      />

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    padding: Spacing.md
  },
  section: {
    marginBottom: Spacing.xl,
    borderRadius: 8,
    backgroundColor: colors.background.secondary,
    padding: Spacing.md
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    marginBottom: Spacing.md,
    color: colors.primary.default
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default
  },
  label: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: colors.text.primary
  },
  value: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: colors.text.secondary
  },
  securityRow: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 4,
    marginBottom: Spacing.xs
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)'
  },
  logoutButton: {
    marginTop: Spacing.xl,
    backgroundColor: colors.error.surface,
    borderColor: colors.error.default
  }
});

export default ProfileScreen;