/**
 * @fileoverview Enhanced persona card component for Android mobile app
 * Displays and manages AI personas with real-time learning state updates
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
  AccessibilityInfo
} from 'react-native'; // v0.71.x
import { useColorScheme } from '@react-native-community/hooks'; // v2.x
import useHapticFeedback from 'react-native-haptic-feedback'; // v1.x

import { Persona } from '../../types/persona';
import Card from '../shared/Card';
import { usePersona } from '../../hooks/usePersona';
import { colors } from '../../constants/colors';
import { getResponsiveSpacing } from '../../utils/responsive';

/**
 * Props interface for the PersonaCard component
 */
interface PersonaCardProps {
  persona: Persona;
  onPress?: (persona: Persona) => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  accessible?: boolean;
}

/**
 * Enhanced card component for displaying and managing personas
 */
const PersonaCard: React.FC<PersonaCardProps> = React.memo(({
  persona,
  onPress,
  testID = 'persona-card',
  style,
  accessible = true
}) => {
  // Hooks
  const { setActivePersona, deletePersona, retrySync } = usePersona();
  const colorScheme = useColorScheme();
  const { trigger: triggerHaptic } = useHapticFeedback();
  
  // Animations
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;

  // Memoized values
  const isDarkMode = useMemo(() => colorScheme === 'dark', [colorScheme]);
  const progressBarColor = useMemo(() => 
    isDarkMode ? colors.primary.darkMode.default : colors.primary.default,
  [isDarkMode]);

  // Format last sync time
  const formattedLastSync = useMemo(() => {
    const lastSync = new Date(persona.state.lastSyncTimestamp);
    return lastSync.toLocaleTimeString();
  }, [persona.state.lastSyncTimestamp]);

  /**
   * Handle card press with haptic feedback
   */
  const handlePress = useCallback(() => {
    triggerHaptic('impactMedium');
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();

    if (onPress) {
      onPress(persona);
    }
  }, [onPress, persona, scaleAnimation, triggerHaptic]);

  /**
   * Handle persona activation
   */
  const handleActivate = useCallback(async () => {
    try {
      triggerHaptic('impactLight');
      await setActivePersona(persona.id);
    } catch (error) {
      console.error('Failed to activate persona:', error);
    }
  }, [persona.id, setActivePersona, triggerHaptic]);

  /**
   * Animate learning progress
   */
  useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: persona.state.learningProgress,
      duration: 500,
      useNativeDriver: false
    }).start();
  }, [persona.state.learningProgress, progressAnimation]);

  /**
   * Update accessibility announcements
   */
  useEffect(() => {
    if (accessible) {
      const announcement = `Persona ${persona.name}, ${
        persona.isActive ? 'Active' : 'Inactive'
      }, Learning progress ${Math.round(persona.state.learningProgress * 100)}%`;
      AccessibilityInfo.announceForAccessibility(announcement);
    }
  }, [persona, accessible]);

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale: scaleAnimation }] },
        style
      ]}
      testID={testID}
    >
      <Card
        elevation={persona.isActive ? 4 : 2}
        onPress={handlePress}
        testID={`${testID}-card`}
        accessible={accessible}
        accessibilityLabel={`${persona.name} persona card`}
        accessibilityHint="Double tap to view persona details"
      >
        <View style={styles.content}>
          <View style={styles.personaInfo}>
            <Text
              style={[
                styles.name,
                isDarkMode && styles.darkText
              ]}
              numberOfLines={1}
              accessibilityRole="header"
            >
              {persona.name}
            </Text>
            <Text
              style={[
                styles.type,
                isDarkMode && styles.darkSecondaryText
              ]}
              accessibilityRole="text"
            >
              {persona.type}
            </Text>
            <Text
              style={[
                styles.syncTime,
                isDarkMode && styles.darkSecondaryText
              ]}
              accessibilityRole="text"
            >
              Last sync: {formattedLastSync}
            </Text>
          </View>

          <View style={styles.controls}>
            {persona.state.lastSyncTimestamp ? (
              <TouchableOpacity
                onPress={handleActivate}
                disabled={persona.isActive}
                accessibilityRole="button"
                accessibilityLabel={
                  persona.isActive ? "Current active persona" : "Activate persona"
                }
                accessibilityState={{ disabled: persona.isActive }}
              >
                <View
                  style={[
                    styles.statusIndicator,
                    persona.isActive && styles.activeIndicator
                  ]}
                />
              </TouchableOpacity>
            ) : (
              <ActivityIndicator
                size="small"
                color={progressBarColor}
                accessibilityLabel="Syncing persona"
              />
            )}
          </View>
        </View>

        <Animated.View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                backgroundColor: progressBarColor,
                width: progressAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%']
                })
              }
            ]}
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 0,
              max: 100,
              now: Math.round(persona.state.learningProgress * 100)
            }}
          />
        </Animated.View>
      </Card>
    </Animated.View>
  );
});

// Display name for debugging
PersonaCard.displayName = 'PersonaCard';

const styles = StyleSheet.create({
  container: {
    marginVertical: getResponsiveSpacing(1),
    width: '100%',
    overflow: 'hidden'
  },
  content: {
    padding: getResponsiveSpacing(2),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  personaInfo: {
    flex: 1,
    marginRight: getResponsiveSpacing(2)
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary
  },
  type: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: getResponsiveSpacing(0.5)
  },
  syncTime: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: getResponsiveSpacing(0.5)
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSpacing(1)
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border.default
  },
  activeIndicator: {
    backgroundColor: colors.success.default
  },
  progressContainer: {
    height: 2,
    backgroundColor: colors.background.secondary,
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary.default
  },
  darkText: {
    color: colors.text.darkMode.primary
  },
  darkSecondaryText: {
    color: colors.text.darkMode.secondary
  }
});

export default PersonaCard;