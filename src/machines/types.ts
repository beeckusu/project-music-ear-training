import type { Note } from '../types/music';
import type { GuessAttempt } from '../types/game';

/**
 * Session States (Top-level)
 *
 * These represent the overall game session lifecycle.
 * The PLAYING state contains round states as substates.
 */
export const SessionState = {
  IDLE: 'idle',              // Not started
  PLAYING: 'playing',        // Active gameplay (contains round states)
  PAUSED: 'paused',          // Paused by user or settings
  COMPLETED: 'completed'     // Game over
} as const;

export type SessionState = typeof SessionState[keyof typeof SessionState];

/**
 * Round States (Substates of PLAYING)
 *
 * These represent the individual note cycle within active gameplay.
 * Only active when session is in PLAYING state.
 */
export const RoundState = {
  PLAYING_NOTE: 'playing_note',
  WAITING_INPUT: 'waiting_input',
  PROCESSING_GUESS: 'processing_guess',
  TIMEOUT_INTERMISSION: 'timeout_intermission'
} as const;

export type RoundState = typeof RoundState[keyof typeof RoundState];

/**
 * Game Actions (Events)
 *
 * All possible events that can be sent to the state machine.
 */
export const GameAction = {
  // Session lifecycle
  START_GAME: 'start_game',
  PAUSE: 'pause',
  RESUME: 'resume',
  COMPLETE: 'complete',
  RESET: 'reset',
  PLAY_AGAIN: 'play_again',

  // Round lifecycle
  NOTE_PLAYED: 'note_played',
  REPLAY_NOTE: 'replay_note',
  ADVANCE_ROUND: 'advance_round',

  // User input
  MAKE_GUESS: 'make_guess',

  // Guess results
  CORRECT_GUESS: 'correct_guess',
  INCORRECT_GUESS: 'incorrect_guess',

  // Timing
  TIMEOUT: 'timeout',

  // Mode-specific (Survival)
  HEALTH_DRAIN: 'health_drain',
  APPLY_HEALTH_DAMAGE: 'apply_health_damage',
  APPLY_HEALTH_RECOVERY: 'apply_health_recovery',

  // Settings
  OPEN_SETTINGS: 'open_settings',
  CLOSE_SETTINGS: 'close_settings',
  CHANGE_MODE: 'change_mode',

  // Sandbox-specific
  CHECK_TARGETS: 'check_targets'
} as const;

export type GameAction = typeof GameAction[keyof typeof GameAction];

/**
 * Game Machine Context
 *
 * The data stored in the state machine.
 *
 * NOTE: Timer data (responseTimeRemaining) and health mechanics
 * live OUTSIDE the machine context as invoked services.
 * Settings also live external to the machine.
 */
export interface GameMachineContext {
  // Round state (what note are we on?)
  currentNote: Note | null;
  userGuess: Note | null;

  // Session statistics
  correctCount: number;
  totalAttempts: number;
  currentStreak: number;
  longestStreak: number;

  // Timing (elapsed time only, timers live outside as services)
  elapsedTime: number;
  sessionDuration: number;

  // Guess history
  attemptHistory: GuessAttempt[];

  // Feedback state
  feedbackMessage: string;
  showCorrectAnswer: boolean;
}

/**
 * Game Event Types
 *
 * Type-safe event definitions for XState.
 */
export type GameEvent =
  | { type: typeof GameAction.START_GAME }
  | { type: typeof GameAction.PAUSE }
  | { type: typeof GameAction.RESUME }
  | { type: typeof GameAction.COMPLETE }
  | { type: typeof GameAction.RESET }
  | { type: typeof GameAction.PLAY_AGAIN }
  | { type: typeof GameAction.NOTE_PLAYED }
  | { type: typeof GameAction.REPLAY_NOTE }
  | { type: typeof GameAction.ADVANCE_ROUND }
  | { type: typeof GameAction.MAKE_GUESS; guessedNote: Note }
  | { type: typeof GameAction.CORRECT_GUESS }
  | { type: typeof GameAction.INCORRECT_GUESS }
  | { type: typeof GameAction.TIMEOUT }
  | { type: typeof GameAction.HEALTH_DRAIN; amount: number }
  | { type: typeof GameAction.APPLY_HEALTH_DAMAGE; amount: number }
  | { type: typeof GameAction.APPLY_HEALTH_RECOVERY; amount: number }
  | { type: typeof GameAction.OPEN_SETTINGS }
  | { type: typeof GameAction.CLOSE_SETTINGS }
  | { type: typeof GameAction.CHANGE_MODE; mode: string }
  | { type: typeof GameAction.CHECK_TARGETS };
