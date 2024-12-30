/**
 * @fileoverview Main screen component for managing AI personas in the Android mobile app
 * Implements comprehensive persona management with offline support and accessibility
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
  AccessibilityInfo,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import analytics from '@react-native-firebase/analytics'; // ^18.0.0
import { usePersona } from '../../hooks/usePersona';
import ErrorBoundary from '../../components/shared/ErrorBoundary';
import { Persona, PersonaType } from '../../types/persona';
import { config } from '../../config/development';

// Constants
const MAX_PERSONAS = config.PERSONA_CONFIG.MAX_PERSONAS;
const SYNC_INTERVAL = config.PERSONA_CONFIG.MODEL_UPDATE_INTERVAL;

/**
 * Enhanced PersonaScreen component with offline support and accessibility
 */
const PersonaScreen: React.FC = React.memo(() => {
  // State and hooks
  const {
    personas,
    activePersona,
    loading,
    error,
    createPersona,
    updatePersona,
    deletePersona,
    syncNow
  } = usePersona();

  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  /**
   * Initialize accessibility features
   */
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility('Persona management screen loaded');
  }, []);

  /**
   * Track screen view
   */
  useEffect(() => {
    analytics().logScreenView({
      screen_name: 'PersonaScreen',
      screen_class: 'PersonaScreen'
    });
  }, []);

  /**
   * Handle pull-to-refresh
   */
  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await syncNow();
      AccessibilityInfo.announceForAccessibility('Personas synchronized successfully');
    } catch (error) {
      Alert.alert('Sync Failed', 'Unable to synchronize personas. Please try again later.');
    } finally {
      setRefreshing(false);
    }
  }, [syncNow]);

  /**
   * Handle persona creation with validation
   */
  const handleCreatePersona = useCallback(async () => {
    try {
      if (personas.length >= MAX_PERSONAS) {
        Alert.alert(
          'Maximum Personas Reached',
          `You can only create up to ${MAX_PERSONAS} personas.`
        );
        return;
      }

      const result = await createPersona({
        name: `Persona ${personas.length + 1}`,
        type: PersonaType.EXPLORER,
        preferences: {
          destinations: [],
          activities: [],
          budget: {
            min: 0,
            max: 1000,
            currency: 'USD',
            preferredRange: [0, 1000]
          },
          travelStyle: [],
          accommodation: [],
          seasonalPreferences: {},
          dietaryRestrictions: []
        }
      });

      if (result.error) {
        throw result.error;
      }

      AccessibilityInfo.announceForAccessibility('New persona created successfully');
      analytics().logEvent('persona_created', {
        persona_type: PersonaType.EXPLORER
      });
    } catch (error: any) {
      Alert.alert('Creation Failed', error.message);
    }
  }, [personas.length, createPersona]);

  /**
   * Handle persona deletion with confirmation
   */
  const handleDeletePersona = useCallback(async (persona: Persona) => {
    Alert.alert(
      'Delete Persona',
      `Are you sure you want to delete ${persona.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePersona(persona.id);
              AccessibilityInfo.announceForAccessibility(`${persona.name} deleted successfully`);
              analytics().logEvent('persona_deleted', {
                persona_type: persona.type
              });
            } catch (error: any) {
              Alert.alert('Deletion Failed', error.message);
            }
          }
        }
      ]
    );
  }, [deletePersona]);

  /**
   * Render offline indicator
   */
  const renderOfflineIndicator = () => (
    <View style={styles.offlineIndicator} accessibilityRole="alert">
      <Text style={styles.offlineText}>
        You're offline. Changes will sync when connection is restored.
      </Text>
    </View>
  );

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText} accessibilityRole="text">
          Loading personas...
        </Text>
      </View>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRefresh}
          accessibilityRole="button"
          accessibilityLabel="Retry loading personas"
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        {isOffline && renderOfflineIndicator()}
        
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              accessibilityLabel="Pull to refresh personas"
            />
          }
        >
          {/* Active Persona Section */}
          {activePersona && (
            <View style={styles.activePersonaContainer}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Active Persona
              </Text>
              <View style={styles.personaCard}>
                <Text style={styles.personaName}>{activePersona.name}</Text>
                <Text style={styles.personaType}>{activePersona.type}</Text>
              </View>
            </View>
          )}

          {/* Persona List Section */}
          <View style={styles.personaListContainer}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              Your Personas ({personas.length}/{MAX_PERSONAS})
            </Text>
            {personas.map((persona) => (
              <TouchableOpacity
                key={persona.id}
                style={styles.personaCard}
                onPress={() => updatePersona(persona.id, { isActive: true })}
                accessibilityRole="button"
                accessibilityLabel={`Select ${persona.name}`}
                accessibilityHint="Double tap to activate this persona"
              >
                <View style={styles.personaHeader}>
                  <Text style={styles.personaName}>{persona.name}</Text>
                  <TouchableOpacity
                    onPress={() => handleDeletePersona(persona)}
                    accessibilityLabel={`Delete ${persona.name}`}
                    hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                  >
                    <Text style={styles.deleteButton}>×</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.personaType}>{persona.type}</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${persona.state.learningProgress * 100}%` }
                    ]}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Create Persona Button */}
        {personas.length < MAX_PERSONAS && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreatePersona}
            accessibilityRole="button"
            accessibilityLabel="Create new persona"
            accessibilityHint="Creates a new AI travel persona"
          >
            <Text style={styles.createButtonText}>Create New Persona</Text>
          </TouchableOpacity>
        )}
      </View>
    </ErrorBoundary>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollView: {
    flex: 1
  },
  offlineIndicator: {
    backgroundColor: '#FFD700',
    padding: 8,
    alignItems: 'center'
  },
  offlineText: {
    color: '#000',
    fontSize: 14
  },
  activePersonaContainer: {
    padding: 16
  },
  personaListContainer: {
    padding: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333'
  },
  personaCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2
  },
  personaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  personaName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000'
  },
  personaType: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginTop: 8
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2
  },
  createButton: {
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  },
  deleteButton: {
    fontSize: 24,
    color: '#FF3B30',
    fontWeight: 'bold'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16
  },
  retryButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8
  },
  retryText: {
    color: '#FFF',
    fontSize: 16
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666'
  }
});

export default PersonaScreen;