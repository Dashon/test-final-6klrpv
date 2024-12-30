/**
 * ProfileScreen Component for iOS
 * Implements user profile management with enhanced security and accessibility
 * @version 1.0.0
 */

import React, { useCallback, useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import TouchID from 'react-native-touch-id';
import { useForm, Controller } from 'react-hook-form';

// Internal imports
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import Input from '../../components/shared/Input';
import { useAuth } from '../../hooks/useAuth';
import { usePersona } from '../../hooks/usePersona';
import { colors } from '../../constants/colors';
import { textStyles } from '../../constants/typography';
import { getResponsiveSpacing } from '../../utils/responsive';
import { Analytics } from '../../utils/analytics';

// Profile form interface
interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

/**
 * ProfileScreen component with enhanced security and accessibility features
 */
const ProfileScreen: React.FC = () => {
  const { user, updateProfile, logout } = useAuth();
  const { personas } = usePersona();
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form handling
  const { control, handleSubmit, formState: { errors } } = useForm<ProfileFormData>({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
    }
  });

  // Check biometric availability on mount
  useEffect(() => {
    const checkBiometric = async () => {
      try {
        const biometryType = await TouchID.isSupported();
        setIsBiometricEnabled(!!biometryType);
      } catch (error) {
        setIsBiometricEnabled(false);
      }
    };
    checkBiometric();
  }, []);

  /**
   * Handles profile update with validation and security checks
   */
  const handleUpdateProfile = useCallback(async (data: ProfileFormData) => {
    setIsLoading(true);
    try {
      // Request biometric authentication for profile changes
      if (isBiometricEnabled) {
        const biometricAuth = await TouchID.authenticate('Confirm profile changes', {
          fallbackLabel: 'Use Passcode',
        });
        if (!biometricAuth) {
          throw new Error('Biometric authentication failed');
        }
      }

      await updateProfile(data);
      await Analytics.trackEvent('profile_updated', {
        hasPhoneNumber: !!data.phone,
      });

      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  }, [isBiometricEnabled, updateProfile]);

  /**
   * Handles secure logout with confirmation
   */
  const handleLogout = useCallback(async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await Analytics.trackEvent('user_logout');
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  }, [logout]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      accessible={true}
      accessibilityLabel="Profile Screen"
    >
      {/* Profile Information Section */}
      <Card style={styles.section}>
        <Text style={[textStyles.h2, styles.sectionTitle]}>
          Profile Information
        </Text>
        <Controller
          control={control}
          name="firstName"
          rules={{ required: 'First name is required' }}
          render={({ field: { onChange, value } }) => (
            <Input
              value={value}
              onChangeText={onChange}
              placeholder="First Name"
              error={errors.firstName?.message}
              accessibilityLabel="First Name Input"
              testID="profile-firstname-input"
            />
          )}
        />
        <Controller
          control={control}
          name="lastName"
          rules={{ required: 'Last name is required' }}
          render={({ field: { onChange, value } }) => (
            <Input
              value={value}
              onChangeText={onChange}
              placeholder="Last Name"
              error={errors.lastName?.message}
              accessibilityLabel="Last Name Input"
              testID="profile-lastname-input"
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          rules={{
            required: 'Email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Invalid email format',
            },
          }}
          render={({ field: { onChange, value } }) => (
            <Input
              value={value}
              onChangeText={onChange}
              placeholder="Email"
              keyboardType="email-address"
              error={errors.email?.message}
              accessibilityLabel="Email Input"
              testID="profile-email-input"
            />
          )}
        />
      </Card>

      {/* Persona Management Section */}
      <Card style={styles.section}>
        <Text style={[textStyles.h2, styles.sectionTitle]}>
          AI Personas ({personas.length}/5)
        </Text>
        <Text style={styles.label}>
          Active personas and learning progress
        </Text>
        {personas.map(persona => (
          <View key={persona.id} style={styles.personaInfo}>
            <Text style={textStyles.body}>
              {persona.name} - {persona.state.learningProgress}% trained
            </Text>
          </View>
        ))}
      </Card>

      {/* Security Settings Section */}
      <Card style={styles.section}>
        <Text style={[textStyles.h2, styles.sectionTitle]}>
          Security Settings
        </Text>
        <Button
          variant="outline"
          onPress={() => setIsBiometricEnabled(!isBiometricEnabled)}
          accessibilityLabel="Toggle Biometric Authentication"
          style={styles.buttonContainer}
        >
          {`${isBiometricEnabled ? 'Disable' : 'Enable'} Biometric Auth`}
        </Button>
      </Card>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <Button
          variant="primary"
          onPress={handleSubmit(handleUpdateProfile)}
          loading={isLoading}
          accessibilityLabel="Update Profile Button"
          testID="profile-update-button"
        >
          Update Profile
        </Button>
        <Button
          variant="outline"
          onPress={handleLogout}
          style={{ marginTop: getResponsiveSpacing(2) }}
          accessibilityLabel="Logout Button"
          testID="profile-logout-button"
        >
          Logout
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    padding: getResponsiveSpacing(4),
  },
  section: {
    marginBottom: getResponsiveSpacing(6),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: getResponsiveSpacing(4),
    color: colors.text.primary,
    accessibilityRole: 'header',
  },
  personaInfo: {
    marginBottom: getResponsiveSpacing(2),
  },
  label: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: getResponsiveSpacing(1),
    accessibilityRole: 'text',
  },
  buttonContainer: {
    marginTop: getResponsiveSpacing(6),
  },
  errorText: {
    color: colors.error.default,
    fontSize: 12,
    marginTop: getResponsiveSpacing(1),
    accessibilityRole: 'alert',
  },
});

export default ProfileScreen;