import type { NoteWithOctave } from '../types/music';
import type { GuessAttempt, GameStats, GameSession } from '../types/game';
import type { SessionState, RoundState } from '../machines/types';

/**
 * Result of a guess attempt
 */
export interface GuessResult {
  isCorrect: boolean;
  feedback: string;
  shouldAdvance: boolean;
  gameCompleted: boolean;
  stats?: GameStats;
}

/**
 * Result of a completed round
 */
export interface RoundResult {
  wasCorrect: boolean;
  wasTimeout: boolean;
  actualNote: NoteWithOctave;
  guessedNote: NoteWithOctave | null;
  pointsAwarded?: number;
  healthChange?: number;
  timeElapsed: number;
}

/**
 * Events emitted by GameOrchestrator
 * Components subscribe to these events to react to game state changes
 */
export interface OrchestratorEvents {
  /**
   * Fired when a new round starts
   * @param note - The note to be played
   * @param feedback - Initial feedback message for the round
   */
  roundStart: { note: NoteWithOctave; feedback: string };

  /**
   * Fired when a round ends
   * @param result - Result details of the completed round
   */
  roundEnd: RoundResult;

  /**
   * Fired when a guess attempt is made
   * @param attempt - The guess attempt record
   */
  guessAttempt: GuessAttempt;

  /**
   * Fired when a guess is validated
   * @param result - Result of the guess validation
   */
  guessResult: GuessResult;

  /**
   * Fired when a game session starts
   */
  sessionStart: void;

  /**
   * Fired when a game session completes
   * @param session - The completed game session
   * @param stats - Final game statistics
   */
  sessionComplete: { session: GameSession; stats: GameStats };

  /**
   * Fired when feedback message updates
   * @param message - The new feedback message
   */
  feedbackUpdate: string;

  /**
   * Fired when state machine state changes
   * @param sessionState - Current session state
   * @param roundState - Current round state (if in PLAYING session)
   */
  stateChange: { sessionState: SessionState; roundState?: RoundState };

  /**
   * Fired when the orchestrator needs the component to start a new round
   * Used for auto-advance after correct guesses or timeouts
   */
  advanceToNextRound: void;

  /**
   * Fired when the game is reset
   * Component should clear UI state
   */
  gameReset: void;

  /**
   * Fired when the game is paused
   */
  gamePaused: void;

  /**
   * Fired when the game is resumed
   */
  gameResumed: void;

  /**
   * Fired when user needs to complete first-time setup
   */
  requestFirstTimeSetup: void;
}
