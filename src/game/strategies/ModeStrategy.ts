import type { NoteWithOctave, NoteFilter } from '../../types/music';
import type { RoundContext } from '../../types/orchestrator';
import type { GuessResult } from '../OrchestratorEvents';
import type { IGameMode } from '../IGameMode';

/**
 * Strategy interface for mode-specific orchestration logic
 *
 * This interface encapsulates the varying behavior between different game modes
 * (ear training vs chord training) without requiring if/else logic in the orchestrator.
 *
 * Each mode type (ear-training, chord-training) will have its own strategy implementation
 * that handles:
 * - Round initialization and challenge generation
 * - User interaction handling (piano clicks, submit button)
 * - Validation and advancement logic
 * - State queries (can submit, should auto-advance)
 */
export interface ModeStrategy {
  /**
   * Start a new round by generating a challenge and returning the round context
   *
   * For ear training: Generate a single note, play audio, return context with note
   * For chord training: Generate a chord, play audio, return context with chord
   *
   * @param gameMode - The game mode instance
   * @param noteFilter - Filter configuration for note/chord generation
   * @returns Promise resolving to the round context for this round
   */
  startNewRound(gameMode: IGameMode, noteFilter: NoteFilter): Promise<RoundContext>;

  /**
   * Optional handler for piano key clicks
   *
   * For ear training: Submit the note as a guess
   * For chord training: Toggle the note in the selected notes set
   *
   * @param note - The note that was clicked
   * @param context - Current round context
   */
  handlePianoKeyClick?(note: NoteWithOctave, context: RoundContext): void;

  /**
   * Optional handler for submit button clicks
   *
   * For ear training: Not used (auto-submit on piano click)
   * For chord training: Validate selected notes against the chord
   *
   * @param context - Current round context
   */
  handleSubmitClick?(context: RoundContext): void;

  /**
   * Validate the current answer and determine if should advance to next round
   *
   * For ear training: Check if guessed note matches actual note
   * For chord training: Check if selected notes match the chord
   *
   * @param context - Current round context
   * @returns Result containing validation outcome and advancement decision
   */
  validateAndAdvance(context: RoundContext): GuessResult;

  /**
   * Check if the user can submit their answer
   *
   * For ear training: Always true (submit happens on piano click)
   * For chord training: True only if notes are selected
   *
   * @param context - Current round context
   * @returns True if submit is allowed, false otherwise
   */
  canSubmit(context: RoundContext): boolean;

  /**
   * Determine if the game should auto-advance after a correct answer
   *
   * For ear training: True (auto-advance after correct guess)
   * For chord training: Depends on mode configuration
   *
   * @returns True if should auto-advance, false otherwise
   */
  shouldAutoAdvance(): boolean;
}
