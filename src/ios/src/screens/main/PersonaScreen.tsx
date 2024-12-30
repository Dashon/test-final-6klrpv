/**
 * @fileoverview Main screen component for managing AI personas in the iOS mobile app
 * Implements multiple persona management with real-time learning and accessibility
 * @version 1.0.0
 */

import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  ScrollView,
  useColorScheme,
  AccessibilityInfo,
  RefreshControl,
} from 'react-native';
import PersonaCard from '../../components/persona/PersonaCard';
import PersonaSelector from '../../components/persona/PersonaSelector';
import ErrorBoundary from '../../components/shared/ErrorBoundary';
import { useAnalytics } from '@analytics/react-native';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/layout';
import { getResponsiveSpacing } from '../../utils/responsive';
import { usePersona } from '../../hooks/usePersona';
import { Persona } from '../../types/persona';

/**
 * Main persona management screen component
 */
const PersonaScreen: React.FC = () => {
  // Hooks
  const colorScheme = useColorScheme();
  const { trackEvent } = useAnalytics();
  const {
    personas,
    activePersona,
    loading,
    error,
    createPersona,
    setActivePersona,
    clearError
  } = usePersona();

  // State
  const [refreshing, setRefreshing] = useState(false);
  const [isCreatingPersona, setIsCreatingPersona] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Theme-aware colors
  const isDark = colorScheme === 'dark';
  const themeColors = useMemo(() => ({
    background: isDark ? colors.background.dark.primary : colors.background.primary,
    text: isDark ? colors.text.dark.primary : colors.text.primary,
    secondary: isDark ? colors.text.dark.secondary : colors.text.secondary,
  }), [isDark]);

  /**
   * Handles persona creation with analytics tracking
   */
  const handleCreatePersona = useCallback(async () => {
    try {
      if (personas.length >= 5) {
        throw new Error('Maximum number of personas (5) reached');
      }

      setIsCreatingPersona(true);
      trackEvent('persona_creation_started');

      const newPersona = await createPersona({
        name: `Persona ${personas.length + 1}`,
        type: 'EXPLORER',
        isActive: false,
        isPaid: false,
        state: {
          adaptationLevel: 0,
          lastInteraction: new Date().toISOString(),
          learningProgress: 0,
          interactionCount: 0,
          confidenceScore: 0,
          lastTrainingDate: new Date().toISOString()
        }
      });

      trackEvent('persona_creation_success', { personaId: newPersona.id });
      
      // Announce success for accessibility
      AccessibilityInfo.announceForAccessibility('New persona created successfully');
      
      // Scroll to new persona
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (err) {
      trackEvent('persona_creation_error', { error: err.message });
      throw err;
    } finally {
      setIsCreatingPersona(false);
    }
  }, [personas.length, createPersona, trackEvent]);

  /**
   * Handles persona selection with analytics tracking
   */
  const handlePersonaSelect = useCallback(async (personaId: string) => {
    try {
      trackEvent('persona_selection', { personaId });
      await setActivePersona(personaId);
      
      // Announce selection for accessibility
      const selectedPersona = personas.find(p => p.id === personaId);
      if (selectedPersona) {
        AccessibilityInfo.announceForAccessibility(
          `Selected persona ${selectedPersona.name}`
        );
      }
    } catch (err) {
      trackEvent('persona_selection_error', { 
        personaId,
        error: err.message 
      });
      throw err;
    }
  }, [setActivePersona, personas, trackEvent]);

  /**
   * Handles pull-to-refresh functionality
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        // Refresh personas and clear any errors
        usePersona().refreshPersonas(),
        clearError()
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [clearError]);

  // Effect to set up accessibility focus
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      `Persona screen loaded with ${personas.length} personas`
    );
  }, [personas.length]);

  return (
    <ErrorBoundary>
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.header}>
          <Text
            style={[styles.title, { color: themeColors.text }]}
            accessible={true}
            accessibilityRole="header"
          >
            Your Personas
          </Text>
          <Text
            style={[styles.subtitle, { color: themeColors.secondary }]}
            accessible={true}
            accessibilityLabel={`${personas.length} of 5 personas created`}
          >
            {personas.length}/5 Personas
          </Text>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary.default}
            />
          }
        >
          <PersonaSelector
            onPersonaSelect={handlePersonaSelect}
            testID="persona-selector"
          />

          {personas.map((persona: Persona) => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              isActive={activePersona?.id === persona.id}
              onPress={() => handlePersonaSelect(persona.id)}
              isLoading={loading.updatePersona}
              error={error.updatePersona ? { message: error.updatePersona } : undefined}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: getResponsiveSpacing(spacing.medium),
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: getResponsiveSpacing(spacing.small),
  },
  subtitle: {
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: getResponsiveSpacing(spacing.medium),
  },
});

export default PersonaScreen;