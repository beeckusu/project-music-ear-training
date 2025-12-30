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
import type { CommonDisplayProps, GameActionResult, GameStateWithDisplay } from './GameStateFactory';
import type { Chord, NoteWithOctave, NoteFilter, NoteHighlight } from '../types/music';
import type { RoundContext } from '../types/orchestrator';
import type { IGameMode } from './IGameMode';
import { ChordEngine } from '../utils/chordEngine';
import { NOTE_TRAINING_SUB_MODES } from '../constants';
import SingleChordModeDisplay from '../components/modes/SingleChordModeDisplay';

/**
 * Game state implementation for "Single Chord" mode.
 *
 * In this mode:
 * - A chord is played/displayed to the user
 * - The user must identify all individual notes that make up the chord
 * - Tracks partial correctness (which notes are correct/incorrect)
 * - Supports multiple completion criteria (target chords, accuracy, duration)
 */
export class SingleChordGameState implements IGameMode {
  // BaseGameState properties
  elapsedTime: number = 0;
  isCompleted: boolean = false;
  totalAttempts: number = 0;
  longestStreak: number = 0;
  currentStreak: number = 0;
  startTime?: Date;

  // Mode-specific properties
  currentChord: Chord | null = null;
  selectedNotes: Set<NoteWithOctave> = new Set();
  correctNotes: Set<NoteWithOctave> = new Set();
  incorrectNotes: Set<NoteWithOctave> = new Set();
  correctChordsCount: number = 0;
  totalNotesAttempted: number = 0;      // Sum of all notes across all attempts
  totalNotesCorrect: number = 0;         // Sum of correct notes across all attempts
  noteTrainingSettings: NoteTrainingModeSettings;
  guessHistory: ChordGuessAttempt[] = [];

  /**
   * Creates a new ShowChordGuessNotesGameState instance.
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
    return React.createElement(SingleChordModeDisplay, {
      ...props,
      gameState: this,
      onPianoKeyClick: this.handleNoteSelection,
      onSubmitAnswer: this.handleSubmitAnswer,
      onClearSelection: this.clearSelection
    });
  };

  /**
   * Optional callback invoked when user clicks a piano key.
   * Toggles note selection and updates the round context.
   *
   * @param note - The note that was clicked
   * @param context - Current round context
   */
  onPianoKeyClick = (note: NoteWithOctave, context: RoundContext): void => {
    // Toggle note selection
    this.handleNoteSelection(note);

    // Update context with new selection state
    context.selectedNotes = new Set(this.selectedNotes);

    // Update context with note highlights
    context.noteHighlights = this.getNoteHighlights();
  };

  /**
   * Optional callback invoked when user clicks the submit button.
   * Validates the selected notes against the current chord.
   *
   * @param context - Current round context
   */
  onSubmitClick = (context: RoundContext): void => {
    // Validate the selected notes
    this.handleSubmitAnswer();

    // Update context with latest highlights after submission
    context.noteHighlights = this.getNoteHighlights();
  };

  /**
   * Handles a successful chord identification.
   * Called when the user has correctly identified all notes in the current chord.
   *
   * @returns GameActionResult indicating whether the game is complete and relevant stats
   */
  handleCorrectGuess = (): GameActionResult => {
    const newCorrectCount = this.correctChordsCount + 1;
    const newCurrentStreak = this.currentStreak + 1;
    const newLongestStreak = Math.max(this.longestStreak, newCurrentStreak);
    const newTotalAttempts = this.totalAttempts + 1;

    // Update cumulative accuracy tracking (perfect match = 100%)
    const notesInChord = this.currentChord!.notes.length;
    this.totalNotesAttempted += notesInChord;
    this.totalNotesCorrect += notesInChord;

    // Add to guess history
    const guessAttempt: ChordGuessAttempt = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      actualChord: this.currentChord!,
      isCorrect: true,
      accuracy: 100,
      correctNotes: [...this.currentChord!.notes],
      missedNotes: [],
      incorrectNotes: []
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

      // Calculate note-level accuracy
      const noteAccuracy = this.totalNotesAttempted > 0
        ? (this.totalNotesCorrect / this.totalNotesAttempted) * 100
        : 100;

      const finalStats: GameStats = {
        completionTime: this.elapsedTime,
        accuracy: noteAccuracy,
        averageTimePerNote: this.elapsedTime / newCorrectCount,
        longestStreak: newLongestStreak,
        totalAttempts: newTotalAttempts,
        correctAttempts: newCorrectCount
      };

      return {
        gameCompleted: true,
        feedback: `🎉 Note Training Complete! ${newCorrectCount}/${targetChords} chords identified`,
        shouldAdvance: false,
        stats: finalStats
      };
    }

    return {
      gameCompleted: false,
      feedback: `Perfect! 100% - ${newCorrectCount}/${targetChords || '∞'} chords identified`,
      shouldAdvance: true
    };
  };

  /**
   * Handles an incorrect chord guess attempt.
   * Called when the user submits an incorrect set of notes.
   *
   * @returns GameActionResult indicating to stay on current chord
   */
  handleIncorrectGuess = (): GameActionResult => {
    console.log('[SingleChordGameState] handleIncorrectGuess called', {
      currentChord: this.currentChord,
      guessHistoryLength: this.guessHistory.length
    });

    this.currentStreak = 0;
    this.totalAttempts = this.totalAttempts + 1;

    if (!this.currentChord) {
      console.log('[SingleChordGameState] No current chord - returning early');
      return {
        gameCompleted: false,
        feedback: 'Not quite right. Keep trying!',
        shouldAdvance: false
      };
    }

    const totalNotes = this.currentChord.notes.length;
    const correctCount = this.correctNotes.size;
    const incorrectCount = this.incorrectNotes.size;
    const missingCount = this.getMissingNotes().size;

    // Update cumulative accuracy tracking
    this.totalNotesAttempted += totalNotes;
    this.totalNotesCorrect += correctCount;

    // Calculate accuracy for this attempt
    const attemptAccuracy = totalNotes > 0 ? (correctCount / totalNotes) * 100 : 0;

    // Add to guess history
    const guessAttempt: ChordGuessAttempt = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      actualChord: this.currentChord,
      isCorrect: false,
      accuracy: attemptAccuracy,
      correctNotes: [...this.correctNotes],
      missedNotes: [...this.getMissingNotes()],
      incorrectNotes: [...this.incorrectNotes]
    };
    this.guessHistory = [...this.guessHistory, guessAttempt];
    console.log('[SingleChordGameState] Added to guess history', {
      newLength: this.guessHistory.length,
      accuracy: attemptAccuracy,
      correctCount,
      missingCount,
      incorrectCount
    });

    // Build detailed feedback message
    let feedback = '';
    if (correctCount > 0) {
      feedback = `${attemptAccuracy.toFixed(1)}% - ${correctCount} out of ${totalNotes} notes correct. `;
    } else {
      feedback = '0% - Not quite right. ';
    }

    // Add breakdown
    const parts: string[] = [];
    if (correctCount > 0) parts.push(`✓ ${correctCount} correct`);
    if (incorrectCount > 0) parts.push(`✗ ${incorrectCount} incorrect`);
    if (missingCount > 0) parts.push(`⊝ ${missingCount} missing`);

    if (parts.length > 0) {
      feedback += parts.join(', ') + '. ';
    }

    feedback += 'Try again!';

    return {
      gameCompleted: false,
      feedback,
      shouldAdvance: false
    };
  };

  /**
   * Handles the user submitting their answer.
   * Validates the selected notes against the current chord.
   *
   * @returns GameActionResult indicating success, failure, or partial completion
   */
  handleSubmitAnswer = (): GameActionResult => {
    if (!this.currentChord) {
      return {
        gameCompleted: false,
        feedback: 'No chord to validate',
        shouldAdvance: false
      };
    }

    // Validate selected notes against current chord (octave-agnostic)
    // We only care about note names (G, A#, D), not octaves, since the piano
    // may not show all octaves and users are learning chord composition, not voicing
    this.correctNotes.clear();
    this.incorrectNotes.clear();

    for (const selectedNote of this.selectedNotes) {
      const isInChord = this.currentChord.notes.some(
        chordNote => chordNote.note === selectedNote.note
      );

      if (isInChord) {
        this.correctNotes.add(selectedNote);
      } else {
        this.incorrectNotes.add(selectedNote);
      }
    }

    // Check if user selected any incorrect notes
    if (this.incorrectNotes.size > 0) {
      return this.handleIncorrectGuess();
    }

    // Check if all chord notes are identified
    if (this.isChordComplete()) {
      return this.handleCorrectGuess();
    }

    // Partial answer - not all notes selected yet
    return {
      gameCompleted: false,
      feedback: `Keep going! ${this.correctNotes.size}/${this.currentChord.notes.length} notes identified`,
      shouldAdvance: false
    };
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
   * @param currentNote - Whether there's currently a chord being played
   * @returns Feedback message string
   */
  getFeedbackMessage = (currentNote: boolean): string => {
    if (!currentNote || !this.currentChord) {
      return 'Click "Start Practice" to begin chord training';
    }

    const totalNotes = this.currentChord.notes.length;
    const correctCount = this.correctNotes.size;

    return `Select all notes in the chord (${correctCount}/${totalNotes} identified)`;
  };

  /**
   * Hook called when starting a new round.
   * Generates a new chord and resets selection state.
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
    return '🎉 Note Training Complete! Piano is now in free play mode.';
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
    return {
      chordsCompleted: stats.correctAttempts,
      longestStreak: stats.longestStreak,
      averageTimePerChord: stats.averageTimePerNote,
      accuracy: stats.accuracy
    };
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
    return '🎵';
  };

  /**
   * Gets the header title for the end screen.
   *
   * @param sessionResults - Results from the completed session
   * @returns Header title string
   */
  getHeaderTitle = (sessionResults: Record<string, any>): string => {
    return 'Well Done!';
  };

  /**
   * Gets the mode completion text for the end screen.
   *
   * @param sessionResults - Results from the completed session
   * @returns Mode completion text
   */
  getModeCompletionText = (sessionResults: Record<string, any>): string => {
    return 'Note Training Complete';
  };

  /**
   * Gets the performance rating based on game statistics.
   *
   * @param gameStats - Statistics from the game
   * @param sessionResults - Results from the session
   * @returns Performance rating string
   */
  getPerformanceRating = (gameStats: GameStats, sessionResults: Record<string, any>): string => {
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
  getHeaderThemeClass = (sessionResults: Record<string, any>): string => {
    return 'note-training-complete';
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
  getAdditionalStatsSection = (sessionResults: Record<string, any>): React.ReactNode => {
    return null; // Note training mode doesn't need additional sections
  };

  /**
   * Gets the history section title.
   *
   * @param settings - Session settings
   * @returns History title string
   */
  getHistoryTitle = (settings: Record<string, any>): string => {
    const targetChords = settings.targetChords || 'Practice';
    return `Your Recent Chord Training Sessions (${targetChords} chords)`;
  };

  /**
   * Gets the history items to display.
   *
   * @param sessions - Array of game sessions
   * @returns Array of history items
   */
  getHistoryItems = (sessions: GameSession[]): HistoryItem[] => {
    const formatTime = (seconds: number): string => {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

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

  private timerCallback: (() => void) | null = null;
  private updateCallback: ((timeRemaining: number) => void) | null = null;

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
    this.timerCallback = onTimeUp;
    this.updateCallback = onTimeUpdate || null;

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
  // Mode-Specific Methods
  // ========================================

  /**
   * Handles a note selection/deselection by the user.
   * Updates the selection state and checks correctness.
   *
   * @param note - The note that was selected/deselected
   * @returns True if the note was added, false if it was removed
   */
  handleNoteSelection = (note: NoteWithOctave): boolean => {
    if (!this.currentChord) return false;

    // Check if note is already selected
    const noteKey = this.getNoteKey(note);
    const alreadySelected = Array.from(this.selectedNotes).some(
      n => this.getNoteKey(n) === noteKey
    );

    if (alreadySelected) {
      // Deselect the note - remove from all sets
      this.selectedNotes = new Set(
        Array.from(this.selectedNotes).filter(n => this.getNoteKey(n) !== noteKey)
      );
      this.correctNotes = new Set(
        Array.from(this.correctNotes).filter(n => this.getNoteKey(n) !== noteKey)
      );
      this.incorrectNotes = new Set(
        Array.from(this.incorrectNotes).filter(n => this.getNoteKey(n) !== noteKey)
      );
      return false;
    } else {
      // Select the note - only add to selectedNotes
      // Do NOT validate yet - that happens on submit
      this.selectedNotes.add(note);
      return true;
    }
  };

  /**
   * Checks if all notes in the current chord have been correctly identified.
   * Uses octave-agnostic comparison (only note names, not octaves).
   *
   * @returns True if all chord notes are in correctNotes set
   */
  isChordComplete = (): boolean => {
    if (!this.currentChord) return false;

    // Compare note names only, not octaves
    const chordNoteNames = this.currentChord.notes.map(n => n.note);
    const correctNoteNames = Array.from(this.correctNotes).map(n => n.note);

    return chordNoteNames.every(name => correctNoteNames.includes(name)) &&
           chordNoteNames.length === correctNoteNames.length;
  };

  /**
   * Clears the current note selection.
   * Resets all selected, correct, and incorrect notes.
   */
  clearSelection = (): void => {
    this.selectedNotes = new Set();
    this.correctNotes = new Set();
    this.incorrectNotes = new Set();
  };

  /**
   * Gets the notes that are required but not selected.
   * These are notes in the current chord that the user hasn't selected yet.
   * Uses octave-agnostic comparison (only note names).
   *
   * @returns Set of notes that are missing from the user's selection
   */
  getMissingNotes = (): Set<NoteWithOctave> => {
    if (!this.currentChord) return new Set();

    const missingNotes = new Set<NoteWithOctave>();
    const selectedNoteNames = Array.from(this.selectedNotes).map(n => n.note);

    for (const chordNote of this.currentChord.notes) {
      if (!selectedNoteNames.includes(chordNote.note)) {
        missingNotes.add(chordNote);
      }
    }

    return missingNotes;
  };

  /**
   * Computes the visual highlights for piano keys based on current game state.
   * This encapsulates the game logic for determining which notes should be
   * displayed with which visual feedback.
   *
   * The highlight priority is:
   * 1. Correct notes (success) - highest priority
   * 2. Incorrect notes (error)
   * 3. Missing notes (dimmed) - only shown AFTER submission
   * 4. Selected notes (selected) - lowest priority, only shown if not already marked
   *
   * @returns Array of note highlights to display on the piano
   */
  getNoteHighlights = (): NoteHighlight[] => {
    const highlights: NoteHighlight[] = [];

    // Correct notes - show success feedback
    for (const note of this.correctNotes) {
      highlights.push({ note, type: 'success' });
    }

    // Incorrect notes - show error feedback
    for (const note of this.incorrectNotes) {
      highlights.push({ note, type: 'error' });
    }

    // Missing notes (after submission) - show dimmed
    // Only show missing notes if the user has submitted at least once
    // (i.e., correctNotes or incorrectNotes have values)
    // This prevents pre-highlighting chord notes before the user interacts
    const hasSubmitted = this.correctNotes.size > 0 || this.incorrectNotes.size > 0;
    if (hasSubmitted) {
      const missingNotes = this.getMissingNotes();
      for (const note of missingNotes) {
        highlights.push({ note, type: 'dimmed' });
      }
    }

    // Selected notes (before submission) - show selection
    // Only show if not already marked as correct/incorrect
    for (const note of this.selectedNotes) {
      const noteKey = this.getNoteKey(note);
      const alreadyMarked = Array.from(this.correctNotes).some(n => this.getNoteKey(n) === noteKey) ||
                            Array.from(this.incorrectNotes).some(n => this.getNoteKey(n) === noteKey);

      if (!alreadyMarked) {
        highlights.push({ note, type: 'selected' });
      }
    }

    return highlights;
  };

  /**
   * Gets a unique key for a note (for comparison purposes).
   *
   * @param note - The note to get a key for
   * @returns String key in format "note-octave"
   */
  private getNoteKey = (note: NoteWithOctave): string => {
    return `${note.note}-${note.octave}`;
  };

  // ========================================
  // IGameMode Interface Methods
  // ========================================

  /**
   * Generate a new chord for the round.
   * Note: For chord mode, this generates a chord, not a single note.
   * The return value is the first note of the chord (for compatibility).
   *
   * @param filter - Note filter (not used in chord mode, uses chordFilter instead)
   * @returns The first note of the generated chord
   */
  generateNote = (filter: NoteFilter): NoteWithOctave => {
    // Generate a new chord using the chord filter
    this.currentChord = ChordEngine.getRandomChordFromFilter(
      this.noteTrainingSettings.chordFilter
    );

    // Reset selection state for new chord
    this.selectedNotes = new Set();
    this.correctNotes = new Set();
    this.incorrectNotes = new Set();

    // Return the first note of the chord for orchestrator compatibility
    return this.currentChord.notes[0];
  };

  /**
   * Validate a guess (not used in chord mode).
   * Chord mode uses handleSubmitAnswer instead.
   *
   * @param guess - User's guessed note
   * @param actual - The actual note
   * @returns Always false (validation happens in handleSubmitAnswer)
   */
  validateGuess = (guess: NoteWithOctave, actual: NoteWithOctave): boolean => {
    // Chord mode doesn't use single-note validation
    // Validation happens when user clicks "Submit Answer"
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
    return NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES;
  };
}
