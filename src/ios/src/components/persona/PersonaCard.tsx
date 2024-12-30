/**
 * @fileoverview Enhanced persona card component for iOS mobile app
 * Implements persona visualization with real-time learning state and interaction controls
 * @version 1.0.0
 */

import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  Animated,
  ViewStyle,
  AccessibilityRole,
} from 'react-native'; // v0.71.x
import Card from '../shared/Card';
import {
  Persona,
  PersonaType,
  PersonaState,
  PersonaError,
} from '../../types/persona';
import { colors } from '../../constants/colors';
import { usePersona } from '../../hooks/usePersona';

/**
 * Props interface for PersonaCard component
 */
interface PersonaCardProps {
  /** Persona data to display */
  persona: Persona;
  /** Whether this persona is currently active */
  isActive?: boolean;
  /** Handler for card press events */
  onPress?: (persona: Persona) => void;
  /** Additional styles for the card */
  style?: ViewStyle;
  /** Loading state indicator */
  isLoading?: boolean;
  /** Error state for the persona */
  error?: PersonaError;
}

/**
 * Enhanced persona card component with theme support and animations
 */
export const PersonaCard: React.FC<PersonaCardProps> = ({
  persona,
  isActive = false,
  onPress,
  style,
  isLoading = false,
  error,
}) => {
  // Theme and animation hooks
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const { setActivePersona } = usePersona();

  // Memoized theme-aware colors
  const themeColors = useMemo(() => ({
    text: isDark ? colors.text.dark : colors.text,
    background: isDark ? colors.background.dark : colors.background,
  }), [isDark]);

  // Animate progress bar when learning progress changes
  useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: persona.state.learningProgress / 100,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [persona.state.learningProgress]);

  // Handle card press with loading state
  const handlePress = useCallback(() => {
    if (!isLoading && onPress) {
      onPress(persona);
      setActivePersona(persona.id);
    }
  }, [isLoading, onPress, persona, setActivePersona]);

  // Get persona type display text
  const getPersonaTypeText = useCallback((type: PersonaType): string => {
    return type.charAt(0) + type.slice(1).toLowerCase();
  }, []);

  // Render error message if present
  const renderError = useCallback(() => {
    if (!error) return null;

    return (
      <View style={styles.errorContainer}>
        <Text
          style={[styles.errorText, { color: colors.error.default }]}
          numberOfLines={2}
        >
          {error.message}
        </Text>
      </View>
    );
  }, [error]);

  return (
    <Card
      elevation={isActive ? 3 : 1}
      style={[
        styles.container,
        { opacity: isLoading ? 0.7 : 1 },
        style,
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        disabled={isLoading}
        accessible={true}
        accessibilityRole="button"
        accessibilityState={{
          selected: isActive,
          disabled: isLoading,
        }}
        accessibilityLabel={`${persona.name} persona, ${getPersonaTypeText(persona.type)}`}
      >
        <View style={styles.content}>
          <View style={styles.personaInfo}>
            <Text
              style={[styles.personaName, { color: themeColors.text.primary }]}
              numberOfLines={1}
            >
              {persona.name}
            </Text>
            <Text
              style={[styles.personaType, { color: themeColors.text.secondary }]}
              numberOfLines={1}
            >
              {getPersonaTypeText(persona.type)}
            </Text>
            
            <View style={styles.stats}>
              <Text
                style={[styles.statsText, { color: themeColors.text.secondary }]}
              >
                {`Learning: ${Math.round(persona.state.learningProgress)}%`}
              </Text>
              {isActive && (
                <View style={[
                  styles.activeIndicator,
                  { backgroundColor: colors.success.default }
                ]} />
              )}
            </View>

            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary.default,
                    transform: [{ scaleX: progressAnimation }],
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
      {renderError()}
    </Card>
  );
};

/**
 * Styles for PersonaCard component
 */
const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  personaInfo: {
    flex: 1,
    marginRight: 16,
  },
  personaName: {
    fontSize: 18,
    fontWeight: '600',
    includeFontPadding: false,
  },
  personaType: {
    fontSize: 14,
    marginTop: 4,
  },
  stats: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.background.tertiary,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    width: '100%',
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  errorContainer: {
    backgroundColor: colors.error.background,
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default PersonaCard;
```

This implementation:

1. Provides a fully typed PersonaCard component with comprehensive props interface
2. Implements theme-aware styling with dark mode support
3. Uses the Card component for consistent elevation and styling
4. Implements animated learning progress visualization
5. Includes proper accessibility support with ARIA roles and states
6. Uses proper error handling and display
7. Implements loading states with visual feedback
8. Uses memoization for performance optimization
9. Follows the design system color scheme
10. Provides proper touch handling with loading state support
11. Implements proper text truncation for long content
12. Uses proper spacing and layout based on the design system
13. Includes comprehensive TypeScript typing
14. Implements proper component documentation
15. Uses proper iOS-specific styling considerations

The component can be used like this:

```typescript
<PersonaCard
  persona={personaData}
  isActive={true}
  onPress={handlePersonaPress}
  isLoading={false}
  error={errorState}
  style={customStyles}
/>