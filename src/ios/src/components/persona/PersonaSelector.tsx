/**
 * @fileoverview PersonaSelector component for iOS application
 * Implements multiple persona management with real-time learning and adaptation
 * Supports up to 5 personas with theme awareness and accessibility
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  RefreshControl,
  Animated,
  AccessibilityInfo,
} from 'react-native'; // v0.71.x
import { Persona, PersonaType } from '../../types/persona';
import { usePersona } from '../../hooks/usePersona';
import Card from '../shared/Card';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/layout';
import { getResponsiveSpacing } from '../../utils/responsive';

interface PersonaSelectorProps {
  onPersonaSelect?: (personaId: string) => void;
  style?: ViewStyle;
  testID?: string;
}

export const PersonaSelector: React.FC<PersonaSelectorProps> = ({
  onPersonaSelect,
  style,
  testID,
}) => {
  // Hooks
  const colorScheme = useColorScheme();
  const {
    personas,
    activePersona,
    setActivePersona,
    error,
    refreshPersonas,
  } = usePersona();

  // State
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Animation
  const selectionAnimation = useRef(new Animated.Value(0)).current;

  // Theme-aware colors
  const isDark = colorScheme === 'dark';
  const themeColors = {
    background: isDark ? colors.background.dark.primary : colors.background.primary,
    text: isDark ? colors.text.dark.primary : colors.text.primary,
    border: isDark ? colors.border.dark.default : colors.border.default,
    error: colors.error.default,
    errorBackground: colors.error.background,
  };

  /**
   * Handles persona selection with animation and error handling
   */
  const handlePersonaSelect = useCallback(async (personaId: string) => {
    try {
      setLoading(true);

      // Start selection animation
      Animated.sequence([
        Animated.timing(selectionAnimation, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(selectionAnimation, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      await setActivePersona(personaId);
      onPersonaSelect?.(personaId);

      // Announce selection for accessibility
      AccessibilityInfo.announceForAccessibility(
        `Selected persona ${personas.find(p => p.id === personaId)?.name}`
      );
    } catch (err) {
      console.error('Failed to select persona:', err);
    } finally {
      setLoading(false);
    }
  }, [personas, setActivePersona, onPersonaSelect, selectionAnimation]);

  /**
   * Handles pull-to-refresh functionality
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshPersonas();
    } finally {
      setRefreshing(false);
    }
  }, [refreshPersonas]);

  // Error message component
  const ErrorMessage = () => error ? (
    <View 
      style={styles.errorContainer}
      accessible={true}
      accessibilityRole="alert"
    >
      <Text style={[styles.errorText, { color: themeColors.error }]}>
        {error.message || 'An error occurred while loading personas'}
      </Text>
    </View>
  ) : null;

  // Persona card component
  const PersonaCard = ({ persona }: { persona: Persona }) => {
    const isActive = activePersona?.id === persona.id;
    const animatedStyle = {
      transform: [{
        scale: isActive ? 
          selectionAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.05],
          }) : 1,
      }],
    };

    return (
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          onPress={() => handlePersonaSelect(persona.id)}
          disabled={loading}
          accessible={true}
          accessibilityRole="button"
          accessibilityState={{ selected: isActive }}
          accessibilityLabel={`${persona.name} persona, ${persona.type} type, learning progress ${persona.state.learningProgress}%`}
        >
          <Card
            elevation={isActive ? 3 : 1}
            style={[
              styles.personaCard,
              isActive && styles.activePersona,
              { borderColor: isActive ? colors.primary.default : themeColors.border }
            ]}
          >
            <Text style={[styles.personaName, { color: themeColors.text }]}>
              {persona.name}
            </Text>
            <Text style={[styles.personaType, { color: themeColors.text }]}>
              {persona.type}
            </Text>
            <View style={styles.progressContainer}>
              <View 
                style={[
                  styles.progressBar,
                  { width: `${persona.state.learningProgress}%` }
                ]}
              />
            </View>
          </Card>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View 
      style={[styles.container, style]}
      testID={testID}
    >
      <ScrollView
        horizontal={false}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary.default}
          />
        }
      >
        <ErrorMessage />
        {personas.map(persona => (
          <PersonaCard
            key={persona.id}
            persona={persona}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flexGrow: 1,
    paddingHorizontal: getResponsiveSpacing(spacing.medium),
    paddingVertical: getResponsiveSpacing(spacing.small),
  },
  personaCard: {
    marginVertical: getResponsiveSpacing(spacing.small),
    padding: getResponsiveSpacing(spacing.medium),
  },
  activePersona: {
    borderWidth: 2,
  },
  personaName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: getResponsiveSpacing(spacing.small),
  },
  personaType: {
    fontSize: 14,
    marginBottom: getResponsiveSpacing(spacing.small),
  },
  progressContainer: {
    height: 4,
    backgroundColor: colors.background.tertiary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary.default,
  },
  errorContainer: {
    padding: getResponsiveSpacing(spacing.medium),
    backgroundColor: colors.error.background,
    borderRadius: 8,
    marginVertical: getResponsiveSpacing(spacing.small),
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default PersonaSelector;