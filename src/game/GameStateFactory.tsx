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
import type { NoteWithOctave } from '../types/music';
import type { RoundContext } from '../types/orchestrator';
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
  // Callback to trigger round advancement (for modes with manual submission)
  onAdvanceRound?: (delayMs?: number) => void;
  // Callback to restart the current session (for Play Again functionality)
  onPlayAgain?: () => void;
  // Callback for submit button click (for chord training modes)
  onSubmitClick?: () => void;
  // Completion controls to render (for chord/note training modes)
  completionControls?: React.ReactNode;
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

  /**
   * Strategy Pattern Interaction Callbacks
   *
   * These optional callbacks enable a clean separation of concerns between UI components
   * and game state implementations. They support two distinct interaction models:
   *
   * **Ear Training Model** (immediate validation):
   * - User clicks a piano key → onPianoKeyClick validates immediately → game state updates
   * - No submit button needed
   * - Existing modes (Rush, Survival, Sandbox) handle this via display components
   *
   * **Chord Training Model** (deferred validation):
   * - User clicks piano keys → onPianoKeyClick toggles selection → visual feedback
   * - User clicks submit → onSubmitClick validates all selected notes → game state updates
   * - Requires both callbacks to enable multi-note selection workflow
   *
   * Both callbacks are optional to maintain backwards compatibility with existing ear training
   * modes that handle interactions directly in their display components.
   */
  /**
   * Optional callback invoked when the user clicks a piano key.
   *
   * This callback enables mode-specific interaction patterns:
   * - **Ear Training Modes**: Implement this to handle guess submission when a key is pressed.
   *   The note represents the user's guess, which is immediately validated against the target.
   * - **Chord Training Modes**: Implement this to toggle note selection. Multiple notes can be
   *   selected/deselected before submission via onSubmitClick.
   *
   * @param note - The note that was clicked (includes pitch and octave information)
   * @param context - Current round context including timing, mode-specific state, and visual feedback
   *
   * @remarks
   * This callback is optional for backwards compatibility with existing ear training game states
   * (Rush, Survival, Sandbox) that handle piano key interactions through their display components
   * rather than through the strategy pattern.
   *
   * @example
   * ```typescript
   * // Ear training mode implementation
   * onPianoKeyClick: (note, context) => {
   *   const isCorrect = note === context.note;
   *   return isCorrect ? handleCorrectGuess() : handleIncorrectGuess();
   * }
   *
   * // Chord training mode implementation
   * onPianoKeyClick: (note, context) => {
   *   toggleNoteSelection(note, context.selectedNotes);
   * }
   * ```
   */
  onPianoKeyClick?(note: NoteWithOctave, context: RoundContext): void;

  /**
   * Optional callback invoked when the user clicks the submit button.
   *
   * This callback is primarily used by chord training modes to validate the user's selected
   * notes against the target chord. It is typically NOT implemented by ear training modes,
   * which validate guesses immediately upon piano key click.
   *
   * @param context - Current round context including the target chord, selected notes, and timing
   *
   * @remarks
   * This callback is optional for backwards compatibility. Ear training modes do not need to
   * implement this callback as they validate guesses immediately upon note selection.
   *
   * Components that render a submit button should check for the existence of this callback
   * before attempting to invoke it: `if (gameState.onSubmitClick) { gameState.onSubmitClick(context) }`
   *
   * @example
   * ```typescript
   * // Chord training mode implementation
   * onSubmitClick: (context) => {
   *   const isCorrect = areNotesEqual(context.selectedNotes, context.chord);
   *   return isCorrect ? handleCorrectGuess() : handleIncorrectGuess();
   * }
   * ```
   */
  onSubmitClick?(context: RoundContext): void;
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