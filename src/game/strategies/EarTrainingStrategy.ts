import type { NoteWithOctave, NoteFilter, NoteDuration } from '../../types/music';
import type { RoundContext } from '../../types/orchestrator';
import type { GuessResult } from '../OrchestratorEvents';
import type { IGameMode } from '../IGameMode';
import type { ModeStrategy } from './ModeStrategy';
import type { AudioEngine } from '../../utils/audioEngine';

/**
 * Extended context type for ear training
 * Adds guessedNote field to track user's guess
 */
interface EarTrainingContext extends RoundContext {
  guessedNote?: NoteWithOctave;
}

/**
 * Strategy implementation for ear training modes
 *
 * Extracts ear training logic from GameOrchestrator to enable
 * mode-agnostic orchestration through the strategy pattern.
 *
 * Ear training flow:
 * 1. Generate a single note challenge
 * 2. User clicks piano key to submit guess (auto-submit)
 * 3. Validate and auto-advance after correct guess
 */
export class EarTrainingStrategy implements ModeStrategy {
  private gameMode?: IGameMode;

  constructor(
    private audioEngine: AudioEngine,
    private noteDuration: NoteDuration
  ) {}

  /**
   * Start a new round by generating a note and playing audio
   *
   * @param gameMode - The game mode instance
   * @param noteFilter - Filter configuration for note generation
   * @returns Promise resolving to the round context
   */
  async startNewRound(gameMode: IGameMode, noteFilter: NoteFilter): Promise<RoundContext> {
    // Store game mode for use in validateAndAdvance
    this.gameMode = gameMode;

    // Generate new note using game mode
    const note = gameMode.generateNote(noteFilter);

    // Update game mode state
    gameMode.onStartNewRound();

    // Initialize audio engine if needed
    await this.audioEngine.initialize();

    // Play the note
    await this.audioEngine.playNote(note, this.noteDuration);

    // Create and return round context
    const context: EarTrainingContext = {
      startTime: new Date(),
      elapsedTime: 0,
      note,
      noteHighlights: [],
      guessedNote: undefined
    };

    return context;
  }

  /**
   * Handle piano key click by storing the note as the user's guess
   *
   * In ear training mode, clicking a piano key auto-submits the guess
   *
   * @param note - The note that was clicked
   * @param context - Current round context
   */
  handlePianoKeyClick(note: NoteWithOctave, context: RoundContext): void {
    // Store the clicked note as the guessed note
    // The orchestrator will call validateAndAdvance next
    (context as EarTrainingContext).guessedNote = note;
  }

  /**
   * Validate the current answer and determine if should advance to next round
   *
   * @param context - Current round context
   * @returns Result containing validation outcome and advancement decision
   */
  validateAndAdvance(context: RoundContext): GuessResult {
    if (!this.gameMode) {
      throw new Error('Game mode not initialized. Call startNewRound first.');
    }

    const earContext = context as EarTrainingContext;
    const actualNote = context.note;
    const guessedNote = earContext.guessedNote;

    if (!actualNote) {
      throw new Error('No actual note in context. Call startNewRound first.');
    }

    if (!guessedNote) {
      return {
        isCorrect: false,
        feedback: 'No guess provided',
        shouldAdvance: false,
        gameCompleted: false
      };
    }

    // Validate the guess
    const isCorrect = this.gameMode.validateGuess(guessedNote, actualNote);

    // Handle the guess result through game mode
    const result = isCorrect
      ? this.gameMode.handleCorrectGuess()
      : this.gameMode.handleIncorrectGuess();

    return {
      isCorrect,
      feedback: result.feedback,
      shouldAdvance: result.shouldAdvance,
      gameCompleted: result.gameCompleted,
      stats: result.stats
    };
  }

  /**
   * Check if the user can submit their answer
   *
   * For ear training: Always true (submit happens on piano click)
   *
   * @param context - Current round context
   * @returns True if submit is allowed
   */
  canSubmit(context: RoundContext): boolean {
    // Ear training auto-submits on piano click
    return true;
  }

  /**
   * Determine if the game should auto-advance after a correct answer
   *
   * For ear training: Always true (auto-advance after correct guess)
   *
   * @returns True (ear training always auto-advances)
   */
  shouldAutoAdvance(): boolean {
    return true;
  }
}
