/**
 * @fileoverview Comprehensive test suite for PersonaCard component
 * Tests rendering, interactions, accessibility, theming, and performance
 * @version 1.0.0
 */

import React from 'react';
import { render, fireEvent, waitFor, within } from '@testing-library/react-native';
import { jest, expect, describe, it, beforeEach, afterEach } from '@jest/globals';
import { useColorScheme } from 'react-native';

import PersonaCard from '../../../src/components/persona/PersonaCard';
import { Persona, PersonaType, PersonaState } from '../../../src/types/persona';
import { usePersona } from '../../../src/hooks/usePersona';

// Mock hooks
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  useColorScheme: jest.fn(),
  Animated: {
    Value: jest.fn(() => ({
      setValue: jest.fn(),
      interpolate: jest.fn(),
    })),
    timing: jest.fn(() => ({
      start: jest.fn(cb => cb && cb()),
    })),
    View: 'Animated.View',
  },
}));

jest.mock('../../../src/hooks/usePersona');

// Test data
const mockPersona: Persona = {
  id: 'test-persona-1',
  userId: 'user-1',
  name: 'Explorer Persona',
  type: PersonaType.EXPLORER,
  isActive: false,
  isPaid: true,
  state: {
    adaptationLevel: 75,
    lastInteraction: '2024-01-01T00:00:00Z',
    learningProgress: 60,
    interactionCount: 42,
    confidenceScore: 0.8,
    lastTrainingDate: '2024-01-01T00:00:00Z',
  },
  preferences: {
    destinations: [],
    activities: [],
    budget: { min: 0, max: 1000, currency: 'USD' },
    travelStyle: [],
    accommodation: [],
    seasonalPreferences: {},
    dietaryRestrictions: [],
  },
  modelVersion: '1.0.0',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockError = {
  code: 'TEST_ERROR',
  message: 'Test error message',
};

// Setup and cleanup functions
const setup = () => {
  (useColorScheme as jest.Mock).mockReturnValue('light');
  (usePersona as jest.Mock).mockReturnValue({
    setActivePersona: jest.fn(),
  });
};

const cleanup = () => {
  jest.clearAllMocks();
};

describe('PersonaCard Component', () => {
  beforeEach(setup);
  afterEach(cleanup);

  describe('Rendering and Display', () => {
    it('renders correctly with all required props', () => {
      const { getByText, getByTestId } = render(
        <PersonaCard persona={mockPersona} />
      );

      expect(getByText('Explorer Persona')).toBeTruthy();
      expect(getByText('Explorer')).toBeTruthy();
      expect(getByText('Learning: 60%')).toBeTruthy();
    });

    it('handles loading state correctly', () => {
      const { getByTestId, queryByTestId } = render(
        <PersonaCard persona={mockPersona} isLoading={true} />
      );

      const card = getByTestId('persona-card');
      expect(card.props.style).toContainEqual({ opacity: 0.7 });
      expect(queryByTestId('progress-bar')).toBeTruthy();
    });

    it('displays error state when error is provided', () => {
      const { getByText } = render(
        <PersonaCard persona={mockPersona} error={mockError} />
      );

      expect(getByText('Test error message')).toBeTruthy();
    });
  });

  describe('Interaction Handling', () => {
    it('calls onPress handler when card is pressed', async () => {
      const onPressMock = jest.fn();
      const { getByTestId } = render(
        <PersonaCard persona={mockPersona} onPress={onPressMock} />
      );

      fireEvent.press(getByTestId('persona-card-button'));
      expect(onPressMock).toHaveBeenCalledWith(mockPersona);
    });

    it('does not call onPress when loading', () => {
      const onPressMock = jest.fn();
      const { getByTestId } = render(
        <PersonaCard 
          persona={mockPersona} 
          onPress={onPressMock} 
          isLoading={true} 
        />
      );

      fireEvent.press(getByTestId('persona-card-button'));
      expect(onPressMock).not.toHaveBeenCalled();
    });

    it('updates active state when pressed', async () => {
      const setActivePersonaMock = jest.fn();
      (usePersona as jest.Mock).mockReturnValue({
        setActivePersona: setActivePersonaMock,
      });

      const { getByTestId } = render(
        <PersonaCard persona={mockPersona} />
      );

      fireEvent.press(getByTestId('persona-card-button'));
      expect(setActivePersonaMock).toHaveBeenCalledWith(mockPersona.id);
    });
  });

  describe('State Management', () => {
    it('animates learning progress changes', async () => {
      const { rerender, getByTestId } = render(
        <PersonaCard persona={mockPersona} />
      );

      const updatedPersona = {
        ...mockPersona,
        state: { ...mockPersona.state, learningProgress: 75 },
      };

      rerender(<PersonaCard persona={updatedPersona} />);
      
      await waitFor(() => {
        const progressBar = getByTestId('progress-bar');
        expect(progressBar.props.style).toContainEqual({
          transform: [{ scaleX: 0.75 }],
        });
      });
    });

    it('shows active indicator when persona is active', () => {
      const { getByTestId } = render(
        <PersonaCard persona={mockPersona} isActive={true} />
      );

      expect(getByTestId('active-indicator')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility props', () => {
      const { getByRole } = render(<PersonaCard persona={mockPersona} />);
      
      const button = getByRole('button');
      expect(button.props.accessibilityLabel)
        .toBe('Explorer Persona persona, Explorer');
      expect(button.props.accessibilityState)
        .toEqual({ selected: false, disabled: false });
    });

    it('updates accessibility state when loading', () => {
      const { getByRole } = render(
        <PersonaCard persona={mockPersona} isLoading={true} />
      );

      const button = getByRole('button');
      expect(button.props.accessibilityState)
        .toEqual({ selected: false, disabled: true });
    });
  });

  describe('Theming', () => {
    it('applies light theme styles correctly', () => {
      (useColorScheme as jest.Mock).mockReturnValue('light');
      const { getByTestId } = render(<PersonaCard persona={mockPersona} />);

      const card = getByTestId('persona-card');
      expect(card.props.style).toContainEqual({
        backgroundColor: expect.any(String),
      });
    });

    it('applies dark theme styles correctly', () => {
      (useColorScheme as jest.Mock).mockReturnValue('dark');
      const { getByTestId } = render(<PersonaCard persona={mockPersona} />);

      const card = getByTestId('persona-card');
      expect(card.props.style).toContainEqual({
        backgroundColor: expect.any(String),
      });
    });
  });

  describe('Performance', () => {
    it('memoizes theme-dependent styles', () => {
      const { rerender } = render(<PersonaCard persona={mockPersona} />);
      const initialRender = jest.spyOn(React, 'useMemo');

      rerender(<PersonaCard persona={mockPersona} />);
      expect(initialRender).toHaveBeenCalled();
    });

    it('uses callbacks for event handlers', () => {
      const { rerender } = render(<PersonaCard persona={mockPersona} />);
      const callbackSpy = jest.spyOn(React, 'useCallback');

      rerender(<PersonaCard persona={mockPersona} />);
      expect(callbackSpy).toHaveBeenCalled();
    });
  });
});