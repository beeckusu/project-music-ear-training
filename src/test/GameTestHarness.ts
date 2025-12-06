import { GameOrchestrator } from '../game/GameOrchestrator';
import { GameAction } from '../machines/types';
import type { NoteWithOctave } from '../types/music';
import type { EarTrainingSubMode, ModeSettings } from '../types/game';
import type { Settings } from '../types/settings';
import { createGameState } from '../game/GameStateFactory';
import { EAR_TRAINING_SUB_MODES } from '../constants';

/**
 * Test harness for fluent BDD-style integration testing of game interactions.
 *
 * Example usage:
 * ```typescript
 * const test = new GameTestHarness()
 *   .withMode(EAR_TRAINING_SUB_MODES.SANDBOX)
 *   .withSettings({ timing: { responseTimeLimit: 5000 } })
 *   .startGame()
 *   .waitForState('playing.waiting_input')
 *   .playerGuessesCorrectly()
 *   .expectStats({ correctCount: 1, currentStreak: 1 })
 *   .expectState('playing.timeout_intermission');
 * ```
 */
export class GameTestHarness {
  private orchestrator: GameOrchestrator;
  private currentNote: NoteWithOctave | null = null;
  private mode: EarTrainingSubMode = EAR_TRAINING_SUB_MODES.SANDBOX;
  private settings: Partial<Settings> = {};
  private timeElapsed: number = 0;

  constructor() {
    this.orchestrator = new GameOrchestrator();
    this.orchestrator.start();

    // Track note changes
    this.orchestrator.on('roundStart', ({ note }) => {
      this.currentNote = note;
    });
  }

  // ============================================================================
  // SETUP / CONFIGURATION METHODS
  // ============================================================================

  /**
   * Configure the game mode (Sandbox, Rush, Survival)
   */
  withMode(mode: EarTrainingSubMode): this {
    this.mode = mode;
    return this;
  }

  /**
   * Configure game settings (timing, note filters, etc.)
   */
  withSettings(settings: Partial<Settings>): this {
    this.settings = { ...this.settings, ...settings };
    return this;
  }

  /**
   * Configure default sandbox settings if not provided
   */
  private getDefaultSandboxSettings() {
    return {
      sessionDuration: 5,
      targetAccuracy: 80,
      targetNotes: 10,
      targetStreak: undefined
    };
  }

  /**
   * Configure default rush settings if not provided
   */
  private getDefaultRushSettings() {
    return {
      targetScore: 10,
      timeLimit: 60
    };
  }

  /**
   * Configure default survival settings if not provided
   */
  private getDefaultSurvivalSettings() {
    return {
      maxLives: 3
    };
  }

  /**
   * Set a specific note to be played (useful for deterministic testing)
   */
  withNote(note: NoteWithOctave): this {
    this.currentNote = note;
    return this;
  }

  // ============================================================================
  // GAME FLOW ACTIONS
  // ============================================================================

  /**
   * Start the game with configured mode and settings
   */
  startGame(): this {
    // Ensure mode settings have defaults
    const modeSettings = this.settings.modes || {};

    // Apply defaults based on mode if not provided
    if (!modeSettings.sandbox) {
      modeSettings.sandbox = this.getDefaultSandboxSettings();
    } else {
      modeSettings.sandbox = { ...this.getDefaultSandboxSettings(), ...modeSettings.sandbox };
    }

    if (!modeSettings.rush) {
      modeSettings.rush = this.getDefaultRushSettings();
    } else {
      modeSettings.rush = { ...this.getDefaultRushSettings(), ...modeSettings.rush };
    }

    if (!modeSettings.survival) {
      modeSettings.survival = this.getDefaultSurvivalSettings();
    } else {
      modeSettings.survival = { ...this.getDefaultSurvivalSettings(), ...modeSettings.survival };
    }

    // Configure game mode
    const gameState = createGameState(this.mode, modeSettings as ModeSettings);
    this.orchestrator.setGameMode(gameState);

    // Configure note duration and filters
    if (this.settings.timing?.noteDuration) {
      this.orchestrator.setNoteDuration(this.settings.timing.noteDuration);
    }
    if (this.settings.noteFilter) {
      this.orchestrator.setNoteFilter(this.settings.noteFilter);
    }

    // Start the game
    this.orchestrator.startGame();
    return this;
  }

  /**
   * Pause the game
   */
  pauseGame(): this {
    this.orchestrator.pause();
    return this;
  }

  /**
   * Resume the game
   */
  resumeGame(): this {
    this.orchestrator.resume();
    return this;
  }

  /**
   * Complete the game
   */
  completeGame(): this {
    this.orchestrator.complete();
    return this;
  }

  /**
   * Reset to idle state
   */
  resetGame(): this {
    this.orchestrator.reset();
    return this;
  }

  /**
   * Play again (from completed state)
   */
  playAgain(): this {
    this.orchestrator.playAgain();
    return this;
  }

  // ============================================================================
  // ROUND ACTIONS
  // ============================================================================

  /**
   * Simulate note being played
   */
  notePlayed(): this {
    this.orchestrator.send({ type: GameAction.NOTE_PLAYED });
    return this;
  }

  /**
   * Simulate player making a guess with a specific note
   */
  playerGuesses(note: NoteWithOctave): this {
    this.orchestrator.send({
      type: GameAction.MAKE_GUESS,
      guessedNote: `${note.note}${note.octave}`
    });
    return this;
  }

  /**
   * Simulate player making a correct guess (uses current note)
   */
  playerGuessesCorrectly(): this {
    if (!this.currentNote) {
      throw new Error('Cannot guess correctly: no current note set');
    }
    this.orchestrator.send({
      type: GameAction.MAKE_GUESS,
      guessedNote: `${this.currentNote.note}${this.currentNote.octave}`
    });
    this.orchestrator.send({ type: GameAction.CORRECT_GUESS });
    return this;
  }

  /**
   * Simulate player making an incorrect guess
   */
  playerGuessesIncorrectly(note?: NoteWithOctave): this {
    const guessNote = note || { note: 'C', octave: 4 } as NoteWithOctave;
    this.orchestrator.send({
      type: GameAction.MAKE_GUESS,
      guessedNote: `${guessNote.note}${guessNote.octave}`
    });
    this.orchestrator.send({ type: GameAction.INCORRECT_GUESS });
    return this;
  }

  /**
   * Simulate timeout occurring
   */
  playerTimesOut(): this {
    this.orchestrator.send({ type: GameAction.TIMEOUT });
    return this;
  }

  /**
   * Simulate advancing to next round
   */
  advanceRound(): this {
    this.orchestrator.send({ type: GameAction.ADVANCE_ROUND });
    return this;
  }

  /**
   * Simulate replaying the current note
   */
  replayNote(): this {
    this.orchestrator.send({ type: GameAction.REPLAY_NOTE });
    return this;
  }

  // ============================================================================
  // TIME SIMULATION
  // ============================================================================

  /**
   * Simulate time passing (in milliseconds)
   */
  waitMs(ms: number): this {
    this.timeElapsed += ms;
    return this;
  }

  /**
   * Wait until a specific state is reached (with timeout)
   */
  waitForState(state: string, timeoutMs: number = 5000): this {
    const startTime = Date.now();
    while (!this.orchestrator.getSnapshot().matches(state)) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Timeout waiting for state: ${state}`);
      }
    }
    return this;
  }

  // ============================================================================
  // EXPECTATIONS / ASSERTIONS
  // ============================================================================

  /**
   * Assert the current state matches expected state
   */
  expectState(state: string): this {
    const snapshot = this.orchestrator.getSnapshot();
    const currentState = snapshot.value;

    if (!snapshot.matches(state)) {
      throw new Error(
        `Expected state "${state}" but got "${JSON.stringify(currentState)}"`
      );
    }
    return this;
  }

  /**
   * Assert game stats match expected values
   */
  expectStats(expected: Partial<{
    correctCount: number;
    totalAttempts: number;
    currentStreak: number;
    longestStreak: number;
  }>): this {
    const stats = this.orchestrator.getStats();

    Object.entries(expected).forEach(([key, value]) => {
      if (stats[key as keyof typeof stats] !== value) {
        throw new Error(
          `Expected ${key} to be ${value} but got ${stats[key as keyof typeof stats]}`
        );
      }
    });
    return this;
  }

  /**
   * Assert feedback message matches expected value
   */
  expectFeedback(expected: string): this {
    const feedback = this.orchestrator.getFeedbackMessage();
    if (feedback !== expected) {
      throw new Error(`Expected feedback "${expected}" but got "${feedback}"`);
    }
    return this;
  }

  /**
   * Assert current note matches expected value
   */
  expectCurrentNote(expected: NoteWithOctave | null): this {
    const current = this.orchestrator.getCurrentNote();
    if (JSON.stringify(current) !== JSON.stringify(expected)) {
      throw new Error(
        `Expected current note ${JSON.stringify(expected)} but got ${JSON.stringify(current)}`
      );
    }
    return this;
  }

  /**
   * Assert user guess matches expected value
   */
  expectUserGuess(expected: string | null): this {
    const guess = this.orchestrator.getUserGuess();
    if (guess !== expected) {
      throw new Error(`Expected user guess "${expected}" but got "${guess}"`);
    }
    return this;
  }

  /**
   * Custom assertion with access to orchestrator
   */
  expect(assertion: (orchestrator: GameOrchestrator) => void): this {
    assertion(this.orchestrator);
    return this;
  }

  // ============================================================================
  // QUERY METHODS (for conditional logic in tests)
  // ============================================================================

  /**
   * Get the current orchestrator (for advanced queries)
   */
  getOrchestrator(): GameOrchestrator {
    return this.orchestrator;
  }

  /**
   * Get current stats
   */
  getStats() {
    return this.orchestrator.getStats();
  }

  /**
   * Get current state snapshot
   */
  getSnapshot() {
    return this.orchestrator.getSnapshot();
  }

  /**
   * Check if in specific state
   */
  isInState(state: string): boolean {
    return this.orchestrator.getSnapshot().matches(state);
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  /**
   * Stop and cleanup orchestrator
   */
  cleanup(): void {
    this.orchestrator.stop();
  }
}
