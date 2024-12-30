/**
 * @fileoverview PersonaSelector component for managing AI personas in the Android mobile app
 * Implements a horizontally scrollable interface with accessibility and analytics
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  AccessibilityInfo,
  I18nManager,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { usePersona } from '../../hooks/usePersona';
import ErrorBoundary from '../shared/ErrorBoundary';
import analytics from '../../utils/analytics';
import type { Persona } from '../../types/persona';

// Constants
const MAX_PERSONAS = 5;
const SCROLL_EVENT_THROTTLE = 16;

/**
 * Props interface for PersonaSelector component
 */
interface PersonaSelectorProps {
  /** Optional callback when persona is selected */
  onPersonaSelect?: (personaId: string) => void;
  /** Test identifier for component */
  testID?: string;
  /** Maximum number of personas allowed */
  maxPersonas?: number;
}

/**
 * PersonaSelector component for managing AI personas
 * Implements horizontally scrollable interface with accessibility support
 */
const PersonaSelector: React.FC<PersonaSelectorProps> = React.memo(({
  onPersonaSelect,
  testID = 'persona-selector',
  maxPersonas = MAX_PERSONAS
}) => {
  // Hooks
  const {
    personas,
    activePersona,
    setActivePersona,
    loading,
    error
  } = usePersona();
  
  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const isRTL = I18nManager.isRTL;

  /**
   * Handle persona selection with analytics tracking
   */
  const handlePersonaSelect = useCallback(async (persona: Persona) => {
    try {
      await analytics.trackEvent('persona_selected', {
        persona_id: persona.id,
        persona_type: persona.type,
        is_paid: persona.isPaid
      });

      setActivePersona(persona.id);
      onPersonaSelect?.(persona.id);

      // Announce selection to screen readers
      AccessibilityInfo.announceForAccessibility(
        `Selected persona ${persona.name}`
      );
    } catch (error) {
      console.error('Failed to track persona selection:', error);
    }
  }, [setActivePersona, onPersonaSelect]);

  /**
   * Setup accessibility focus handling
   */
  useEffect(() => {
    const setupAccessibility = async () => {
      const isScreenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      if (isScreenReaderEnabled && activePersona) {
        AccessibilityInfo.announceForAccessibility(
          `Current active persona is ${activePersona.name}`
        );
      }
    };

    setupAccessibility();
  }, [activePersona]);

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <View style={styles.loadingContainer} testID={`${testID}-loading`}>
        <ActivityIndicator size="large" color="#1A73E8" />
      </View>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <View style={styles.errorContainer} testID={`${testID}-error`}>
        <Text style={styles.errorText}>
          Failed to load personas. Please try again.
        </Text>
      </View>
    );
  }

  /**
   * Validate persona count
   */
  if (personas.length > maxPersonas) {
    console.warn(`Number of personas (${personas.length}) exceeds maximum limit (${maxPersonas})`);
  }

  return (
    <ErrorBoundary>
      <View style={styles.container} testID={testID}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          scrollEventThrottle={SCROLL_EVENT_THROTTLE}
          accessibilityRole="scrollbar"
          accessibilityLabel="Persona selector"
          testID={`${testID}-scroll`}
        >
          {personas.slice(0, maxPersonas).map((persona) => (
            <TouchableOpacity
              key={persona.id}
              style={[
                styles.personaCard,
                persona.id === activePersona?.id && styles.activeCard
              ]}
              onPress={() => handlePersonaSelect(persona)}
              accessibilityRole="button"
              accessibilityLabel={`${persona.name} persona ${persona.isActive ? 'active' : ''}`}
              accessibilityHint="Double tap to select this persona"
              accessibilityState={{ selected: persona.id === activePersona?.id }}
              testID={`${testID}-persona-${persona.id}`}
            >
              <View style={styles.personaContent}>
                <Text style={styles.personaName} numberOfLines={1}>
                  {persona.name}
                </Text>
                <Text style={styles.personaType} numberOfLines={1}>
                  {persona.type}
                </Text>
                {persona.isPaid && (
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumText}>PRO</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </ErrorBoundary>
  );
});

/**
 * Component styles
 */
const styles = StyleSheet.create({
  container: {
    height: 120,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: '#FF0000',
    textAlign: 'center',
    fontFamily: 'Roboto-Regular',
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  personaCard: {
    width: 100,
    height: 100,
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  activeCard: {
    borderColor: '#1A73E8',
    borderWidth: 2,
    backgroundColor: '#E8F0FE',
  },
  personaContent: {
    alignItems: 'center',
    padding: 8,
  },
  personaName: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#202124',
    textAlign: 'center',
    marginBottom: 4,
  },
  personaType: {
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
    color: '#5F6368',
    textAlign: 'center',
  },
  premiumBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFC107',
    borderRadius: 4,
    padding: 2,
  },
  premiumText: {
    fontSize: 10,
    fontFamily: 'Roboto-Bold',
    color: '#202124',
  },
});

export default PersonaSelector;