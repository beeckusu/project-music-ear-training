import React from 'react';
import type {
  BaseGameState,
  NoteTrainingModeSettings,
  GameStats,
  StatItem,
  HistoryItem,
  GameSession,
  ChordGuessAttempt
} from '../types/game';
import type { CommonDisplayProps, GameActionResult } from './GameStateFactory';
import type { Chord, NoteWithOctave, NoteFilter } from '../types/music';
import type { RoundContext } from '../types/orchestrator';
import type { IGameMode } from './IGameMode';
import { ChordEngine } from '../utils/chordEngine';
import { validateChordGuess } from '../utils/chordValidation';
import { NOTE_TRAINING_SUB_MODES } from '../constants';
import ChordIdentificationModeDisplay from '../components/modes/ChordIdentificationModeDisplay';

/**
 * Game state implementation for "Chord Identification" mode (Show Notes, Guess Chord).
 *
 * In this mode:
 * - Notes are displayed/highlighted on the keyboard (visual feedback)
 * - The user must identify the chord name based on the displayed notes
 * - User enters their guess as a chord name (e.g., "C Major", "A Minor")
 * - Similar to ear training but with visual instead of audio feedback
 */
export class ChordIdentificationGameState implements IGameMode {
  // BaseGameState properties
  elapsedTime: number = 0;
  isCompleted: boolean = false;
  totalAttempts: number = 0;
  longestStreak: number = 0;
  currentStreak: number = 0;
  startTime?: Date;

  // Mode-specific properties
  currentChord: Chord | null = null;
  displayedNotes: NoteWithOctave[] = [];
  userGuess: string | null = null;
  correctChordsCount: number = 0;
  noteTrainingSettings: NoteTrainingModeSettings;
  guessHistory: ChordGuessAttempt[] = [];

  /**
   * Creates a new ChordIdentificationGameState instance.
   *
   * @param noteTrainingSettings - Configuration for note training mode including
   *                               chord filters, session duration, and target goals
   */
  constructor(noteTrainingSettings: NoteTrainingModeSettings) {
    this.noteTrainingSettings = noteTrainingSettings;
  }

  /**
   * Renders the mode-specific display component.
   *
   * @param props - Common display props passed from the game container
   * @returns React element for the mode display
   */
  modeDisplay = (props: CommonDisplayProps) => {
    return React.createElement(ChordIdentificationModeDisplay, {
      ...props,
      gameState: this
    });
  };

  /**
   * Optional callback invoked when user clicks a piano key.
   * No-op for chord identification mode - piano key clicks are disabled
   * since notes are displayed and user guesses the chord name.
   *
   * @param note - The note that was clicked (unused)
   * @param context - Current round context (unused)
   */
  onPianoKeyClick = (note: NoteWithOctave, context: RoundContext): void => {
    // No-op: Piano key clicks are disabled in chord identification mode
  };

  /**
   * Optional callback invoked when user clicks the submit button.
   * Validates the chord name guess from the context.
   *
   * @param context - Current round context (should contain guessedChordName)
   */
  onSubmitClick = (context: RoundContext): void => {
    // Extract the chord guess from the context
    const guess = (context as any).guessedChordName || '';

    // Validate the chord name guess
    this.handleSubmitGuess(guess);
  };

  /**
   * Handles a correct chord identification.
   * Called when the user has correctly identified the chord name.
   *
   * @returns GameActionResult indicating whether the game is complete and relevant stats
   */
  handleCorrectGuess = (): GameActionResult => {
    const newCorrectCount = this.correctChordsCount + 1;
    const newCurrentStreak = this.currentStreak + 1;
    const newLongestStreak = Math.max(this.longestStreak, newCurrentStreak);
    const newTotalAttempts = this.totalAttempts + 1;

    // Add to guess history
    const guessAttempt: ChordGuessAttempt = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      actualChord: this.currentChord!,
      isCorrect: true,
      guessedChordName: this.userGuess || ''
    };
    this.guessHistory = [...this.guessHistory, guessAttempt];

    // Update state
    this.correctChordsCount = newCorrectCount;
    this.currentStreak = newCurrentStreak;
    this.longestStreak = newLongestStreak;
    this.totalAttempts = newTotalAttempts;

    // Check completion conditions
    const targetChords = this.noteTrainingSettings.targetChords;
    const hasReachedTarget = targetChords && newCorrectCount >= targetChords;

    if (hasReachedTarget) {
      this.isCompleted = true;

      // Calculate accuracy
      const accuracy = newTotalAttempts > 0
        ? (newCorrectCount / newTotalAttempts) * 100
        : 100;

      const finalStats: GameStats = {
        completionTime: this.elapsedTime,
        accuracy: accuracy,
        averageTimePerNote: this.elapsedTime / newCorrectCount,
        longestStreak: newLongestStreak,
        totalAttempts: newTotalAttempts,
        correctAttempts: newCorrectCount
      };

      return {
        gameCompleted: true,
        feedback: `🎉 Chord Training Complete! ${newCorrectCount}/${targetChords} chords identified`,
        shouldAdvance: false,
        stats: finalStats
      };
    }

    return {
      gameCompleted: false,
      feedback: `Correct! ${newCorrectCount}/${targetChords || '∞'} chords identified`,
      shouldAdvance: true
    };
  };

  /**
   * Handles an incorrect chord guess attempt.
   * Called when the user submits an incorrect chord name.
   *
   * @returns GameActionResult indicating to stay on current chord
   */
  handleIncorrectGuess = (): GameActionResult => {
    console.log('[ChordIdentificationGameState] handleIncorrectGuess called', {
      currentChord: this.currentChord,
      guessHistoryLength: this.guessHistory.length,
      userGuess: this.userGuess
    });

    this.currentStreak = 0;
    this.totalAttempts = this.totalAttempts + 1;

    if (!this.currentChord) {
      console.log('[ChordIdentificationGameState] No current chord - returning early');
      return {
        gameCompleted: false,
        feedback: 'Not quite right. Try again!',
        shouldAdvance: false
      };
    }

    // Add to guess history
    const guessAttempt: ChordGuessAttempt = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      actualChord: this.currentChord,
      isCorrect: false,
      guessedChordName: this.userGuess || ''
    };
    this.guessHistory = [...this.guessHistory, guessAttempt];
    console.log('[ChordIdentificationGameState] Added to guess history', {
      newLength: this.guessHistory.length,
      guessedName: this.userGuess || '(timeout - no guess)'
    });

    const correctAnswer = this.currentChord.name;
    return {
      gameCompleted: false,
      feedback: `Incorrect. The correct answer is ${correctAnswer}. Try again!`,
      shouldAdvance: false
    };
  };

  /**
   * Handles the user submitting their chord name guess.
   * Validates the guess against the current chord.
   *
   * @param guess - The chord name guessed by the user
   * @returns GameActionResult indicating success or failure
   */
  handleSubmitGuess = (guess?: string): GameActionResult => {
    // Guard against being called multiple times after completion
    if (this.isCompleted) {
      const targetChords = this.noteTrainingSettings.targetChords;
      const accuracy = this.totalAttempts > 0
        ? (this.correctChordsCount / this.totalAttempts) * 100
        : 100;

      const finalStats: GameStats = {
        completionTime: this.elapsedTime,
        accuracy: accuracy,
        averageTimePerNote: this.elapsedTime / this.correctChordsCount,
        longestStreak: this.longestStreak,
        totalAttempts: this.totalAttempts,
        correctAttempts: this.correctChordsCount
      };

      return {
        gameCompleted: true,
        feedback: `🎉 Chord Training Complete! ${this.correctChordsCount}/${targetChords} chords identified`,
        shouldAdvance: false,
        stats: finalStats
      };
    }

    if (!this.currentChord) {
      return {
        gameCompleted: false,
        feedback: 'No chord to validate',
        shouldAdvance: false
      };
    }

    // Use provided guess or fall back to stored guessedChordName
    this.userGuess = guess || this.guessedChordName || '';

    // Validate the guess using the chord validation utility
    const validationResult = validateChordGuess(this.userGuess, this.currentChord);

    if (validationResult.isCorrect) {
      const result = this.handleCorrectGuess();

      // Add enharmonic feedback if the user entered an enharmonic equivalent
      if (validationResult.isEnharmonic && result.feedback) {
        const enharmonicNote = `You entered ${validationResult.originalGuess}, which is enharmonically equivalent to ${this.currentChord.name}`;
        result.feedback = `${result.feedback} (${enharmonicNote})`;
      }

      return result;
    } else {
      return this.handleIncorrectGuess();
    }
  };

  /**
   * Updates the game state with partial updates.
   *
   * @param updates - Partial state updates to apply
   */
  updateState = (updates: Partial<BaseGameState>) => {
    Object.assign(this, updates);
  };

  /**
   * Gets the current feedback message to display to the user.
   *
   * @param currentNote - Whether there's currently a chord being displayed
   * @returns Feedback message string
   */
  getFeedbackMessage = (currentNote: boolean): string => {
    if (!currentNote || !this.currentChord) {
      return 'Click "Start Practice" to begin chord identification training';
    }

    return 'Identify the chord name based on the displayed notes';
  };

  /**
   * Hook called when starting a new round.
   * Generates a new chord and displays its notes.
   */
  onStartNewRound = (): void => {
    // Track start time on first round
    if (!this.startTime && !this.isCompleted) {
      this.startTime = new Date();
    }

    // Generate new chord using the generateNote method
    // (Note filter is not used in chord mode, pass null)
    this.generateNote(null as any);
  };

  /**
   * Gets the timer mode for this game state.
   *
   * @returns Timer mode based on session settings
   */
  getTimerMode = (): 'count-up' | 'count-down' | 'none' => {
    return this.noteTrainingSettings.sessionDuration > 0 ? 'count-down' : 'count-up';
  };

  /**
   * Gets the completion message to display when the game ends.
   *
   * @returns Completion message string
   */
  getCompletionMessage = (): string => {
    if (!this.isCompleted) return '';
    return '🎉 Chord Identification Training Complete! Piano is now in free play mode.';
  };

  /**
   * Gets the session settings for history tracking.
   *
   * @returns Session settings object
   */
  getSessionSettings = (): Record<string, any> => {
    return {
      selectedSubMode: this.noteTrainingSettings.selectedSubMode,
      targetChords: this.noteTrainingSettings.targetChords,
      sessionDuration: this.noteTrainingSettings.sessionDuration,
      chordFilter: this.noteTrainingSettings.chordFilter
    };
  };

  /**
   * Gets the session results for history tracking.
   *
   * @param stats - Game statistics
   * @returns Session results object
   */
  getSessionResults = (stats: GameStats): Record<string, any> => {
    // Calculate chord type statistics
    const chordTypeStats = this.calculateChordTypeStats();

    // Calculate first-try accuracy (chords correct on first attempt)
    const firstTryCorrect = this.guessHistory.filter((attempt, index, arr) => {
      // Count only correct attempts where there's no previous attempt for the same chord
      if (!attempt.isCorrect) return false;

      // Check if this is the first attempt for this chord
      const previousAttempts = arr.slice(0, index);
      const hasPreviousAttempt = previousAttempts.some(
        prev => prev.actualChord.name === attempt.actualChord.name &&
                prev.timestamp.getTime() < attempt.timestamp.getTime()
      );

      return !hasPreviousAttempt;
    }).length;

    return {
      chordsCompleted: stats.correctAttempts,
      longestStreak: stats.longestStreak,
      averageTimePerChord: stats.averageTimePerNote,
      accuracy: stats.accuracy,
      // Chord-specific data for historical tracking
      chordTypeStats,
      guessHistory: this.serializeGuessHistory(),
      firstTryCorrect,
      totalChordsAttempted: this.guessHistory.length,
      subMode: this.noteTrainingSettings.selectedSubMode
    };
  };

  /**
   * Calculates statistics grouped by chord type.
   * Tracks attempts, correct count, and accuracy for each chord type encountered.
   *
   * @returns Object mapping chord names to their statistics
   */
  private calculateChordTypeStats = (): Record<string, {
    attempts: number;
    correct: number;
    accuracy: number;
  }> => {
    const stats: Record<string, { attempts: number; correct: number; accuracy: number }> = {};

    for (const attempt of this.guessHistory) {
      const chordName = attempt.actualChord.name;

      if (!stats[chordName]) {
        stats[chordName] = { attempts: 0, correct: 0, accuracy: 0 };
      }

      stats[chordName].attempts++;
      if (attempt.isCorrect) {
        stats[chordName].correct++;
      }
    }

    // Calculate accuracy percentages
    for (const chordName in stats) {
      const { attempts, correct } = stats[chordName];
      stats[chordName].accuracy = attempts > 0 ? (correct / attempts) * 100 : 0;
    }

    return stats;
  };

  /**
   * Serializes the guess history into a format suitable for localStorage.
   * Converts Date objects to ISO strings and simplifies chord data.
   *
   * @returns Serializable array of guess attempts
   */
  private serializeGuessHistory = (): any[] => {
    return this.guessHistory.map(attempt => ({
      id: attempt.id,
      timestamp: attempt.timestamp.toISOString(),
      chordName: attempt.actualChord.name,
      isCorrect: attempt.isCorrect,
      guessedChordName: attempt.guessedChordName || ''
    }));
  };

  // ========================================
  // End Screen Strategy Methods
  // ========================================

  /**
   * Gets the celebration emoji for the end screen.
   *
   * @param sessionResults - Results from the completed session
   * @returns Emoji string
   */
  getCelebrationEmoji = (sessionResults: Record<string, any>): string => {
    const accuracy = sessionResults.accuracy || 0;

    if (accuracy >= 95) return '🌟';
    if (accuracy >= 85) return '🎯';
    if (accuracy >= 75) return '🎵';
    if (accuracy >= 65) return '📚';
    return '💪';
  };

  /**
   * Gets the header title for the end screen.
   *
   * @param sessionResults - Results from the completed session
   * @returns Header title string
   */
  getHeaderTitle = (_sessionResults: Record<string, any>): string => {
    return 'Well Done!';
  };

  /**
   * Gets the mode completion text for the end screen.
   *
   * @param sessionResults - Results from the completed session
   * @returns Mode completion text
   */
  getModeCompletionText = (_sessionResults: Record<string, any>): string => {
    return 'Chord Identification Complete';
  };

  /**
   * Gets the performance rating based on game statistics.
   *
   * @param gameStats - Statistics from the game
   * @param sessionResults - Results from the session
   * @returns Performance rating string
   */
  getPerformanceRating = (gameStats: GameStats, _sessionResults: Record<string, any>): string => {
    const accuracy = gameStats.accuracy;

    if (accuracy >= 95) return 'Perfect Pitch! 🌟';
    if (accuracy >= 85) return 'Excellent Ear! 🎯';
    if (accuracy >= 75) return 'Great Progress! 🎵';
    if (accuracy >= 65) return 'Keep Practicing! 📚';
    return 'Good Effort! 💪';
  };

  /**
   * Gets the header theme CSS class for the end screen.
   *
   * @param sessionResults - Results from the completed session
   * @returns CSS class name
   */
  getHeaderThemeClass = (_sessionResults: Record<string, any>): string => {
    return 'chord-identification-complete';
  };

  /**
   * Gets the stats items to display on the end screen.
   *
   * @param gameStats - Statistics from the game
   * @param sessionResults - Results from the session
   * @returns Array of stat items
   */
  getStatsItems = (gameStats: GameStats, sessionResults: Record<string, any>): StatItem[] => {
    const formatTime = (seconds: number): string => {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    return [
      {
        label: 'Time',
        value: formatTime(gameStats.completionTime),
        className: 'stat-neutral'
      },
      {
        label: 'Accuracy',
        value: `${gameStats.accuracy.toFixed(1)}%`,
        className: gameStats.accuracy >= 85 ? 'stat-success' : gameStats.accuracy >= 65 ? 'stat-neutral' : 'stat-warning'
      },
      {
        label: 'Chords Completed',
        value: `${sessionResults.chordsCompleted}`,
        className: 'stat-neutral'
      },
      {
        label: 'Average per Chord',
        value: `${sessionResults.averageTimePerChord.toFixed(1)}s`,
        className: sessionResults.averageTimePerChord <= 5.0 ? 'stat-success' : 'stat-neutral'
      },
      {
        label: 'Longest Streak',
        value: sessionResults.longestStreak.toString(),
        className: 'stat-neutral'
      },
      {
        label: 'Total Attempts',
        value: `${gameStats.correctAttempts}/${gameStats.totalAttempts}`,
        className: 'stat-neutral'
      }
    ];
  };

  /**
   * Gets additional stats section for the end screen.
   *
   * @param sessionResults - Results from the completed session
   * @returns React node or null
   */
  getAdditionalStatsSection = (_sessionResults: Record<string, any>): React.ReactNode => {
    return null; // Chord identification mode doesn't need additional sections
  };

  /**
   * Gets the history section title.
   *
   * @param settings - Session settings
   * @returns History title string
   */
  getHistoryTitle = (settings: Record<string, any>): string => {
    const targetChords = settings.targetChords || 'Practice';
    return `Your Recent Chord Identification Sessions (${targetChords} chords)`;
  };

  /**
   * Gets the history items to display.
   *
   * @param sessions - Array of game sessions
   * @returns Array of history items
   */
  getHistoryItems = (sessions: GameSession[]): HistoryItem[] => {
    const formatRelativeTime = (timestamp: Date): string => {
      const now = new Date();
      const diffMs = now.getTime() - timestamp.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMinutes < 1) return 'just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return timestamp.toLocaleDateString();
    };

    return sessions.map(session => ({
      primaryStat: `${session.results?.chordsCompleted || 0} chords`,
      secondaryStat: `${session.accuracy.toFixed(1)}%`,
      metadata: formatRelativeTime(session.timestamp),
      className: 'history-neutral'
    }));
  };

  /**
   * Determines whether to show the history section.
   *
   * @param sessions - Array of game sessions
   * @returns True if history should be shown
   */
  shouldShowHistory = (sessions: GameSession[]): boolean => {
    return sessions.length > 0;
  };

  // ========================================
  // Timer Management Methods
  // ========================================

  private timerState = {
    timeRemaining: 0,
    isActive: false
  };

  private _timerCallback: (() => void) | null = null;
  private _updateCallback: ((timeRemaining: number) => void) | null = null;

  /**
   * Initializes the timer for response time limits.
   *
   * @param responseTimeLimit - Time limit in seconds (null for unlimited)
   * @param isPaused - Whether the timer should start paused
   * @param onTimeUp - Callback when time runs out
   * @param onTimeUpdate - Optional callback for timer updates
   */
  initializeTimer = (
    responseTimeLimit: number | null,
    isPaused: boolean,
    onTimeUp: () => void,
    onTimeUpdate?: (timeRemaining: number) => void
  ): void => {
    this._timerCallback = onTimeUp;
    this._updateCallback = onTimeUpdate || null;

    if (responseTimeLimit !== null) {
      this.timerState = {
        timeRemaining: responseTimeLimit,
        isActive: !isPaused
      };
    } else {
      this.timerState = {
        timeRemaining: 0,
        isActive: false
      };
    }
  };

  /**
   * Gets the current timer state.
   *
   * @returns Current timer state with remaining time and active status
   */
  getTimerState = (): { timeRemaining: number; isActive: boolean } => {
    return { ...this.timerState };
  };

  /**
   * Pauses the timer.
   */
  pauseTimer = (): void => {
    this.timerState.isActive = false;
  };

  /**
   * Resumes the timer.
   */
  resumeTimer = (): void => {
    this.timerState.isActive = true;
  };

  /**
   * Resets the timer to initial state.
   */
  resetTimer = (): void => {
    this.timerState = {
      timeRemaining: 0,
      isActive: false
    };
  };

  // ========================================
  // IGameMode Interface Methods
  // ========================================

  /**
   * Generate a new chord for the round.
   * Sets the current chord and displays its notes on the keyboard.
   *
   * @param filter - Note filter (not used in chord mode, uses chordFilter instead)
   * @returns The first note of the generated chord
   */
  generateNote = (_filter: NoteFilter): NoteWithOctave => {
    // Generate a new chord using the chord filter
    this.currentChord = ChordEngine.getRandomChordFromFilter(
      this.noteTrainingSettings.chordFilter
    );

    // Set displayed notes to all notes in the chord
    this.displayedNotes = [...this.currentChord.notes];

    // Reset user guess for new chord
    this.userGuess = null;

    // Return the first note of the chord for orchestrator compatibility
    return this.currentChord.notes[0];
  };

  /**
   * Validate a guess (not used in chord identification mode).
   * Chord identification uses handleSubmitGuess instead.
   *
   * @param guess - User's guessed note
   * @param actual - The actual note
   * @returns Always false (validation happens in handleSubmitGuess)
   */
  validateGuess = (_guess: NoteWithOctave, _actual: NoteWithOctave): boolean => {
    // Chord identification mode doesn't use single-note validation
    // Validation happens when user submits chord name
    return false;
  };

  /**
   * Check if the game is complete.
   *
   * @returns True if game is complete, false otherwise
   */
  isGameComplete = (): boolean => {
    return this.isCompleted;
  };

  /**
   * Get the game mode identifier.
   *
   * @returns Mode identifier string
   */
  getMode = (): string => {
    return NOTE_TRAINING_SUB_MODES.SHOW_NOTES_GUESS_CHORD;
  };
}
