import type { NoteWithOctave, NoteFilter } from '../types/music';
import type { GameStateWithDisplay } from './GameStateFactory';

/**
 * IGameMode Interface
 *
 * Defines the contract for all game modes to enable the orchestrator
 * to coordinate game logic in a mode-agnostic way.
 *
 * This interface extends GameStateWithDisplay to maintain compatibility
 * with existing game state classes while adding orchestrator-specific methods.
 *
 * Future game modes (e.g., chord identification, intervals) should implement
 * this interface to work with the orchestrator without code changes.
 */
export interface IGameMode extends GameStateWithDisplay {
  /**
   * Generate a new note/challenge based on the provided filter
   * @param filter - Note filter configuration
   * @returns The note to be played for this round
   */
  generateNote(filter: NoteFilter): NoteWithOctave;

  /**
   * Validate a user's guess against the actual answer
   * @param guess - User's guessed note
   * @param actual - The actual note that was played
   * @returns True if guess is correct, false otherwise
   */
  validateGuess(guess: NoteWithOctave, actual: NoteWithOctave): boolean;

  /**
   * Check if the game session has completed
   * @returns True if game is complete, false otherwise
   */
  isGameComplete(): boolean;

  /**
   * Get the game mode identifier
   * @returns Mode identifier string (e.g., 'rush', 'survival', 'sandbox')
   */
  getMode(): string;

  /**
   * Optional: Set a completion callback for modes that need external completion triggers
   * (e.g., Sandbox mode completing via timer expiration)
   * @param callback - Function to call when game completes
   */
  setCompletionCallback?(callback: () => void): void;
}

/**
 * Type guard to check if a game state implements IGameMode
 */
export function isIGameMode(obj: any): obj is IGameMode {
  return (
    obj &&
    typeof obj.generateNote === 'function' &&
    typeof obj.validateGuess === 'function' &&
    typeof obj.isGameComplete === 'function' &&
    typeof obj.getMode === 'function'
  );
}
