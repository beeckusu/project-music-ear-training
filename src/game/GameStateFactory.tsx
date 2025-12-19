import React from 'react';
import type {
  BaseGameState,
  ModeType,
  RushModeSettings,
  SurvivalModeSettings,
  SandboxModeSettings,
  NoteTrainingModeSettings,
  GameStats
} from '../types/game';
import { EAR_TRAINING_SUB_MODES } from '../constants';
import { modeRegistry } from './ModeRegistry';

// Game action results
export interface GameActionResult {
  gameCompleted: boolean;
  feedback: string;
  shouldAdvance: boolean;
  stats?: GameStats;
}

// Common props that all mode displays receive
export interface CommonDisplayProps {
  responseTimeLimit: number | null;
  currentNote: boolean;
  isPaused: boolean;
  timeRemaining?: number; // Current time remaining on note timer
  sessionTimeRemaining?: number; // Current time remaining on session timer (for modes that have one)
  // Callbacks for timer events
  onTimeUp?: () => void;
  onTimerUpdate?: (timeRemaining: number, isActive: boolean) => void;
}


/**
 * Enhanced base interface combining game state, display rendering, and game actions.
 *
 * This interface defines the contract that all game mode implementations must fulfill,
 * whether they are Ear Training modes or Note Training modes. It extends BaseGameState
 * with mode-specific display rendering and action handling capabilities.
 *
 * Implementations must provide:
 * - A React display component via modeDisplay()
 * - Handlers for correct/incorrect guesses
 * - State update mechanisms
 * - Timer and feedback strategies
 * - Session management and results formatting
 *
 * @see BaseGameState for core game state properties
 * @see createGameState for the factory that produces instances of this interface
 */
export interface GameStateWithDisplay extends BaseGameState {
  modeDisplay: (props: CommonDisplayProps) => React.ReactElement;
  handleCorrectGuess: () => GameActionResult;
  handleIncorrectGuess: () => GameActionResult;
  updateState: (updates: Partial<BaseGameState>) => void;

  // Hooks for game state to control behavior
  getFeedbackMessage: (currentNote: boolean) => string;
  onStartNewRound: () => void;
  getTimerMode: () => 'count-up' | 'count-down' | 'none';
  getCompletionMessage: () => string;
  getSessionSettings: () => Record<string, any>;
  getSessionResults: (stats: GameStats) => Record<string, any>;
}

/**
 * Factory function to create game state instances for different training modes.
 *
 * This factory uses the mode registry pattern to dynamically create the appropriate
 * game state based on the selected mode. It supports both Ear Training modes
 * (Rush, Survival, Sandbox) and Note Training modes (Show Chord Guess Notes,
 * Show Notes Guess Chord).
 *
 * The factory automatically extracts the correct settings for each mode using
 * the mode's registered settingsKey, ensuring type-safe settings propagation.
 *
 * @param mode - The training mode type (from EarTrainingSubMode or NoteTrainingSubMode)
 * @param modeSettings - Object containing settings for all available modes
 * @returns A game state instance implementing GameStateWithDisplay interface
 *
 * @example
 * ```typescript
 * // Create a Note Training game state
 * const gameState = createGameState(
 *   NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES,
 *   {
 *     rush: rushSettings,
 *     survival: survivalSettings,
 *     sandbox: sandboxSettings,
 *     noteTraining: noteTrainingSettings
 *   }
 * );
 * ```
 *
 * @see modeRegistry for available modes and their configurations
 * @see GameStateWithDisplay for the returned interface contract
 */
export function createGameState(
  mode: ModeType,
  modeSettings: {
    rush: RushModeSettings;
    survival: SurvivalModeSettings;
    sandbox: SandboxModeSettings;
    noteTraining: NoteTrainingModeSettings;
  }
): GameStateWithDisplay {
  const modeMetadata = modeRegistry.get(mode);

  if (!modeMetadata) {
    console.warn(`Unknown mode: ${mode}, falling back to sandbox`);
    const sandboxMetadata = modeRegistry.get(EAR_TRAINING_SUB_MODES.SANDBOX);

    if (!sandboxMetadata) {
      throw new Error(`Critical error: Sandbox mode not registered in mode registry`);
    }

    const sandboxSettings = modeSettings[sandboxMetadata.settingsKey];
    return sandboxMetadata.gameStateFactory(sandboxSettings);
  }

  // Extract only the settings this mode needs using its settingsKey
  const modeSpecificSettings = modeSettings[modeMetadata.settingsKey];
  return modeMetadata.gameStateFactory(modeSpecificSettings);
}