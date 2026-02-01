import type { NoteWithOctave, NoteFilter } from '../../types/music';
import type { RoundContext } from '../../types/orchestrator';
import type { GuessResult } from '../OrchestratorEvents';
import type { IGameMode } from '../IGameMode';
import type { ModeStrategy } from './ModeStrategy';
import type { AudioEngine } from '../../utils/audioEngine';

/**
 * Strategy implementation for chord training modes
 *
 * Extracts chord training logic from GameOrchestrator to enable
 * mode-agnostic orchestration through the strategy pattern.
 *
 * Chord training flow:
 * 1. Generate a chord challenge and play chord audio
 * 2. User selects notes via piano keys
 * 3. User clicks submit button to validate selection
 * 4. Manual advancement after validation (no auto-advance)
 *
 * Key differences from ear training:
 * - Plays chord audio (not single note) on round start
 * - Piano clicks toggle note selection (not auto-submit)
 * - Requires explicit submit button click
 * - Manual advancement (shouldAutoAdvance = false)
 */
export class ChordTrainingStrategy implements ModeStrategy {
  private gameMode?: IGameMode;

  constructor(
    private audioEngine: AudioEngine
  ) {}

  /**
   * Start a new round by generating a chord challenge
   *
   * For chord training: Generate a chord, play chord audio,
   * return context with chord data and empty selection state.
   *
   * @param gameMode - The game mode instance
   * @param noteFilter - Filter configuration for chord generation
   * @returns Promise resolving to the round context
   */
  async startNewRound(gameMode: IGameMode, noteFilter: NoteFilter): Promise<RoundContext> {
    // Store game mode for use in other methods
    this.gameMode = gameMode;

    // Generate new chord using game mode
    // For chord modes, generateNote actually generates a chord
    const firstNote = gameMode.generateNote(noteFilter);

    // Update game mode state
    gameMode.onStartNewRound();

    // Get the current chord from the game mode
    // We need to cast to access chord-specific properties
    const chord = (gameMode as any).currentChord;

    // Play the chord audio
    if (chord) {
      await this.audioEngine.initialize();
      this.audioEngine.playChord(chord);
    }

    // Create and return round context
    // Include 'note' for orchestrator timeout detection (uses firstNote as representative note)
    const context: RoundContext = {
      startTime: new Date(),
      elapsedTime: 0,
      note: firstNote,
      chord,
      selectedNotes: new Set(),
      noteHighlights: []
    };

    return context;
  }

  /**
   * Handle piano key click by toggling note selection
   *
   * In chord training mode, clicking a piano key toggles the note
   * in the selection set (does NOT auto-submit like ear training).
   *
   * @param note - The note that was clicked
   * @param context - Current round context
   */
  handlePianoKeyClick(note: NoteWithOctave, context: RoundContext): void {
    if (!this.gameMode) {
      throw new Error('Game mode not initialized. Call startNewRound first.');
    }

    // Delegate note selection to game mode
    // The game mode handles the selection logic and tracks correct/incorrect notes
    (this.gameMode as any).handleNoteSelection?.(note);

    // Update context with the new selection state
    context.selectedNotes = new Set((this.gameMode as any).selectedNotes || []);

    // Update note highlights based on game state
    context.noteHighlights = (this.gameMode as any).getNoteHighlights?.() || [];
  }

  /**
   * Handle submit button click by validating the selected notes
   *
   * In chord training mode, the user must explicitly click submit
   * to validate their selected notes against the chord.
   *
   * @param context - Current round context
   */
  handleSubmitClick(context: RoundContext): void {
    if (!this.gameMode) {
      throw new Error('Game mode not initialized. Call startNewRound first.');
    }

    // Note: We intentionally do NOT call handleSubmitAnswer() here.
    // Validation is handled exclusively by validateAndAdvance() to prevent
    // duplicate scoring when the orchestrator calls both methods in sequence.

    // Update context with latest highlights
    context.noteHighlights = (this.gameMode as any).getNoteHighlights?.() || [];
  }

  /**
   * Validate the current answer and determine if should advance to next round
   *
   * For chord training: Check if selected notes match the chord.
   * The validation logic is delegated to the game mode's handleSubmitAnswer.
   *
   * @param context - Current round context
   * @returns Result containing validation outcome and advancement decision
   */
  validateAndAdvance(context: RoundContext): GuessResult {
    if (!this.gameMode) {
      throw new Error('Game mode not initialized. Call startNewRound first.');
    }

    // Note: We don't check context.chord here because chord training modes
    // manage their state internally in the game mode, not in the context.
    // The game mode's handleSubmitAnswer has all the information it needs.

    // Call handleSubmitAnswer to get validation result
    const result = (this.gameMode as any).handleSubmitAnswer?.();

    if (!result) {
      return {
        isCorrect: false,
        feedback: 'Unable to validate answer',
        shouldAdvance: false,
        gameCompleted: false
      };
    }

    return {
      isCorrect: result.gameCompleted ? true : result.shouldAdvance,
      feedback: result.feedback,
      shouldAdvance: result.shouldAdvance,
      gameCompleted: result.gameCompleted,
      stats: result.stats
    };
  }

  /**
   * Check if the user can submit their answer
   *
   * For chord training: True only if at least one note is selected.
   * User must select notes before submitting.
   *
   * @param context - Current round context
   * @returns True if submit is allowed, false otherwise
   */
  canSubmit(context: RoundContext): boolean {
    // Can submit if at least one note is selected
    return (context.selectedNotes?.size || 0) > 0;
  }

  /**
   * Determine if the game should auto-advance after a correct answer
   *
   * For chord training: Always false - user must manually advance
   * or choose to retry the current chord.
   *
   * @returns False (chord training requires manual advancement)
   */
  shouldAutoAdvance(): boolean {
    return false;
  }
}
