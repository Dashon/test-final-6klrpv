import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { axe, toHaveNoViolations } from 'jest-axe';
import PersonaSelector, { PersonaSelectorProps } from './PersonaSelector';
import { PersonaType } from '../../../types/persona';
import personaReducer from '../../../store/slices/personaSlice';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock persona data
const mockPersonas = [
  {
    id: '1',
    name: 'Explorer',
    type: PersonaType.EXPLORER,
    isActive: false,
    state: {
      adaptationLevel: 50,
      lastInteraction: new Date(),
      learningProgress: 75,
      interactionCount: 100,
      confidenceScore: 0.8
    }
  },
  {
    id: '2',
    name: 'Luxury',
    type: PersonaType.LUXURY,
    isActive: false,
    state: {
      adaptationLevel: 30,
      lastInteraction: new Date(),
      learningProgress: 45,
      interactionCount: 50,
      confidenceScore: 0.6
    }
  }
];

// Mock usePersona hook
jest.mock('../../../hooks/usePersona', () => ({
  usePersona: () => ({
    personas: mockPersonas,
    activePersona: mockPersonas[0],
    activatePersona: jest.fn().mockResolvedValue({ success: true }),
    loading: false,
    error: null,
    loadingState: {
      activating: false,
      creating: false,
      updating: false,
      fetching: false
    }
  })
}));

// Test store configuration
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      persona: personaReducer
    },
    preloadedState: initialState
  });
};

// Test wrapper component
const renderWithProvider = (
  ui: React.ReactElement,
  { store = createTestStore() } = {}
) => {
  return render(
    <Provider store={store}>
      {ui}
    </Provider>
  );
};

describe('PersonaSelector Component', () => {
  let mockOnError: jest.Mock;

  beforeEach(() => {
    mockOnError = jest.fn();
    jest.clearAllMocks();
  });

  it('renders correctly with personas', async () => {
    const { container } = renderWithProvider(
      <PersonaSelector onError={mockOnError} />
    );

    // Check if all personas are rendered
    expect(screen.getAllByRole('button')).toHaveLength(mockPersonas.length);

    // Check for persona names
    expect(screen.getByText('Explorer')).toBeInTheDocument();
    expect(screen.getByText('Luxury')).toBeInTheDocument();

    // Check for learning progress indicators
    mockPersonas.forEach(persona => {
      const progressBar = screen.getByRole('progressbar', {
        name: new RegExp(persona.name, 'i')
      });
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute(
        'aria-valuenow',
        persona.state.learningProgress.toString()
      );
    });

    // Verify accessibility
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('handles persona activation correctly', async () => {
    const { usePersona } = require('../../../hooks/usePersona');
    const activatePersonaMock = jest.fn().mockResolvedValue({ success: true });
    usePersona.mockImplementation(() => ({
      ...usePersona(),
      activatePersona: activatePersonaMock
    }));

    renderWithProvider(<PersonaSelector onError={mockOnError} />);

    // Click on a persona card
    const personaCard = screen.getByText('Luxury').closest('div[role="button"]');
    await userEvent.click(personaCard!);

    // Verify activation was called
    expect(activatePersonaMock).toHaveBeenCalledWith('2');
    
    // Check for visual feedback during activation
    await waitFor(() => {
      expect(personaCard).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('displays loading state correctly', async () => {
    const { usePersona } = require('../../../hooks/usePersona');
    usePersona.mockImplementation(() => ({
      ...usePersona(),
      loading: true,
      loadingState: { activating: true }
    }));

    renderWithProvider(<PersonaSelector onError={mockOnError} />);

    // Check for loading indicators
    const loadingPlaceholders = screen.getAllByRole('progressbar', {
      name: /loading personas/i
    });
    expect(loadingPlaceholders).toHaveLength(3);

    // Verify loading state accessibility
    loadingPlaceholders.forEach(placeholder => {
      expect(placeholder).toHaveAttribute('aria-label', 'Loading personas');
    });
  });

  it('handles errors appropriately', async () => {
    const errorMessage = 'Failed to load personas';
    const { usePersona } = require('../../../hooks/usePersona');
    usePersona.mockImplementation(() => ({
      ...usePersona(),
      error: errorMessage
    }));

    renderWithProvider(<PersonaSelector onError={mockOnError} />);

    // Check for error message
    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent(errorMessage);

    // Verify error callback
    expect(mockOnError).toHaveBeenCalledWith(new Error(errorMessage));
  });

  it('supports keyboard navigation', async () => {
    renderWithProvider(<PersonaSelector onError={mockOnError} />);

    const personaCards = screen.getAllByRole('button');
    
    // Focus first persona card
    personaCards[0].focus();
    expect(document.activeElement).toBe(personaCards[0]);

    // Navigate with keyboard
    fireEvent.keyDown(personaCards[0], { key: 'ArrowRight' });
    await waitFor(() => {
      expect(document.activeElement).toBe(personaCards[1]);
    });

    // Activate with keyboard
    fireEvent.keyDown(personaCards[1], { key: 'Enter' });
    await waitFor(() => {
      expect(personaCards[1]).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('updates learning progress in real-time', async () => {
    const { usePersona } = require('../../../hooks/usePersona');
    const initialProgress = 75;
    let currentProgress = initialProgress;

    usePersona.mockImplementation(() => ({
      ...usePersona(),
      activePersona: {
        ...mockPersonas[0],
        state: {
          ...mockPersonas[0].state,
          learningProgress: currentProgress
        }
      }
    }));

    renderWithProvider(<PersonaSelector onError={mockOnError} />);

    // Verify initial progress
    const progressBar = screen.getByRole('progressbar', {
      name: /explorer/i
    });
    expect(progressBar).toHaveAttribute('aria-valuenow', initialProgress.toString());

    // Simulate progress update
    currentProgress = 80;
    usePersona.mockImplementation(() => ({
      ...usePersona(),
      activePersona: {
        ...mockPersonas[0],
        state: {
          ...mockPersonas[0].state,
          learningProgress: currentProgress
        }
      }
    }));

    // Verify progress update
    await waitFor(() => {
      expect(progressBar).toHaveAttribute('aria-valuenow', currentProgress.toString());
    });
  });
});