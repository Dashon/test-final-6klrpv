/**
 * @fileoverview Comprehensive test suite for PersonaCard component
 * Tests persona display, interactions, state management, accessibility, and performance
 * @version 1.0.0
 */

import React from 'react';
import { render, fireEvent, waitFor, act, within } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import PersonaCard, { PersonaCardProps } from '../../src/components/persona/PersonaCard';
import { Persona, PersonaType } from '../../src/types/persona';
import { usePersona } from '../../src/hooks/usePersona';
import { colors } from '../../src/constants/colors';

// Mock the hooks and native modules
jest.mock('../../src/hooks/usePersona');
jest.mock('@react-native-community/hooks', () => ({
  useColorScheme: () => 'light'
}));
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn()
}));

// Mock AccessibilityInfo
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  AccessibilityInfo: {
    announceForAccessibility: jest.fn(),
    isScreenReaderEnabled: jest.fn().mockResolvedValue(false)
  }
}));

// Test data
const mockPersona: Persona = {
  id: 'test-persona-id',
  userId: 'test-user-id',
  name: 'Test Persona',
  type: PersonaType.EXPLORER,
  isActive: false,
  isPaid: false,
  state: {
    adaptationLevel: 0.5,
    lastInteraction: new Date('2024-01-01'),
    learningProgress: 0.7,
    interactionCount: 10,
    modelVersion: '1.0.0',
    lastSyncTimestamp: Date.now()
  },
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
  },
  modelVersion: '1.0.0',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
};

// Mock hook implementation
const mockSetActivePersona = jest.fn();
const mockDeletePersona = jest.fn();
const mockUpdatePersonaState = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (usePersona as jest.Mock).mockReturnValue({
    setActivePersona: mockSetActivePersona,
    deletePersona: mockDeletePersona,
    updatePersonaState: mockUpdatePersonaState
  });
});

describe('PersonaCard', () => {
  it('renders persona details correctly', async () => {
    const { getByText, getByTestId } = render(
      <PersonaCard persona={mockPersona} testID="test-persona-card" />
    );

    // Verify basic content rendering
    expect(getByText(mockPersona.name)).toBeTruthy();
    expect(getByText(mockPersona.type)).toBeTruthy();
    expect(getByTestId('test-persona-card-card')).toBeTruthy();

    // Verify learning progress display
    const progressBar = getByTestId('test-persona-card-progress');
    expect(progressBar.props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 70 // 0.7 * 100
    });
  });

  it('handles real-time learning updates', async () => {
    const { rerender, getByTestId } = render(
      <PersonaCard persona={mockPersona} testID="test-persona-card" />
    );

    // Update persona with new learning progress
    const updatedPersona = {
      ...mockPersona,
      state: {
        ...mockPersona.state,
        learningProgress: 0.8
      }
    };

    // Rerender with updated progress
    rerender(<PersonaCard persona={updatedPersona} testID="test-persona-card" />);

    // Verify progress bar updates
    await waitFor(() => {
      const progressBar = getByTestId('test-persona-card-progress');
      expect(progressBar.props.accessibilityValue.now).toBe(80);
    });
  });

  it('manages persona state transitions', async () => {
    const { getByTestId } = render(
      <PersonaCard persona={mockPersona} testID="test-persona-card" />
    );

    // Trigger activation
    const activateButton = getByTestId('test-persona-card-activate');
    fireEvent.press(activateButton);

    // Verify activation call
    expect(mockSetActivePersona).toHaveBeenCalledWith(mockPersona.id);

    // Verify visual feedback
    await waitFor(() => {
      const statusIndicator = getByTestId('test-persona-card-status');
      expect(statusIndicator.props.style).toContainEqual(
        expect.objectContaining({ backgroundColor: colors.success.default })
      );
    });
  });

  it('handles accessibility requirements', async () => {
    // Mock screen reader enabled
    (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);

    const { getByRole } = render(
      <PersonaCard persona={mockPersona} testID="test-persona-card" />
    );

    // Verify accessibility labels
    expect(getByRole('header')).toHaveTextContent(mockPersona.name);
    
    // Verify accessibility announcements
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      expect.stringContaining(mockPersona.name)
    );
  });

  it('optimizes performance with memoization', async () => {
    const onPress = jest.fn();
    const { rerender, getByTestId } = render(
      <PersonaCard 
        persona={mockPersona} 
        onPress={onPress}
        testID="test-persona-card" 
      />
    );

    // First render
    const initialRender = getByTestId('test-persona-card').props.children;

    // Rerender with same props
    rerender(
      <PersonaCard 
        persona={mockPersona} 
        onPress={onPress}
        testID="test-persona-card" 
      />
    );

    // Verify component wasn't re-rendered
    const secondRender = getByTestId('test-persona-card').props.children;
    expect(initialRender).toBe(secondRender);
  });

  it('handles error states gracefully', async () => {
    // Mock activation error
    mockSetActivePersona.mockRejectedValueOnce(new Error('Activation failed'));

    const { getByTestId } = render(
      <PersonaCard persona={mockPersona} testID="test-persona-card" />
    );

    // Trigger activation
    const activateButton = getByTestId('test-persona-card-activate');
    fireEvent.press(activateButton);

    // Verify error handling
    await waitFor(() => {
      const errorState = getByTestId('test-persona-card-error');
      expect(errorState).toBeTruthy();
    });
  });

  it('cleans up resources on unmount', async () => {
    const { unmount } = render(
      <PersonaCard persona={mockPersona} testID="test-persona-card" />
    );

    // Unmount component
    unmount();

    // Verify cleanup
    await waitFor(() => {
      expect(mockUpdatePersonaState).not.toHaveBeenCalled();
    });
  });
});