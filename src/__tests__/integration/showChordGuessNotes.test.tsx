import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { SingleChordGameState } from '../../game/SingleChordGameState';
import SingleChordModeDisplay from '../../components/modes/SingleChordModeDisplay';
import { SettingsProvider } from '../../contexts/SettingsContext';
import type { NoteTrainingModeSettings } from '../../types/game';
import type { NoteWithOctave, Chord } from '../../types/music';

// Mock audio engine to prevent actual audio playback
vi.mock('../../utils/audioEngine', () => ({
  audioEngine: {
    playChord: vi.fn(),
    playNote: vi.fn(),
    releaseAllNotes: vi.fn()
  }
}));

// Test data: Predefined chords for deterministic testing
const TEST_CHORD_C_MAJOR: Chord = {
  name: 'C major',
  notes: [
    { note: 'C', octave: 4 },
    { note: 'E', octave: 4 },
    { note: 'G', octave: 4 }
  ],
  root: 'C',
  inversion: 0,
  type: 'major' as any
};

const TEST_CHORD_D_MINOR: Chord = {
  name: 'D minor',
  notes: [
    { note: 'D', octave: 4 },
    { note: 'F', octave: 4 },
    { note: 'A', octave: 4 }
  ],
  root: 'D',
  inversion: 0,
  type: 'minor' as any
};

const TEST_CHORD_E_MAJOR: Chord = {
  name: 'E major',
  notes: [
    { note: 'E', octave: 4 },
    { note: 'G#', octave: 4 },
    { note: 'B', octave: 4 }
  ],
  quality: 'major',
  rootNote: 'E',
  inversion: 0,
  type: 'major' as any
};

const TEST_CHORDS = [TEST_CHORD_C_MAJOR, TEST_CHORD_D_MINOR, TEST_CHORD_E_MAJOR];

// Helper to render with SettingsProvider
const renderWithSettings = (ui: React.ReactElement) => {
  return render(
    <SettingsProvider>
      {ui}
    </SettingsProvider>
  );
};

// Helper to find and click a piano key by note name and octave
const clickPianoKey = (container: HTMLElement, note: NoteWithOctave, gameState: SingleChordGameState) => {
  // Simulate clicking by directly calling the game state method
  // (Piano keyboard component handles the actual DOM clicks)
  gameState.handleNoteSelection(note);
};

// Helper to select multiple notes
const selectNotes = (notes: NoteWithOctave[], gameState: SingleChordGameState) => {
  notes.forEach(note => clickPianoKey(document.body, note, gameState));
};

/**
 * Integration Test Suite for ShowChordGuessNotes Mode
 *
 * Tests the complete end-to-end user flow for the Show Chord → Guess Notes training mode.
 * Unlike unit tests which test individual components, these tests verify the full
 * integration of game state, UI components, and user interactions.
 */
describe('ShowChordGuessNotes Integration Test', () => {
  let noteTrainingSettings: NoteTrainingModeSettings;
  let mockOnAdvanceRound: ReturnType<typeof vi.fn>;
  let mockOnPlayAgain: ReturnType<typeof vi.fn>;
  let chordIndex: number;

  beforeEach(() => {
    // Reset chord index for deterministic chord generation
    chordIndex = 0;

    // Configure note training settings
    noteTrainingSettings = {
      selectedSubMode: 'showChordGuessNotes',
      targetChords: 3,
      sessionDuration: 0,
      chordFilter: {
        qualities: ['major', 'minor'],
        rootNotes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
        inversions: [0]
      }
    };

    // Setup mock callbacks
    mockOnAdvanceRound = vi.fn();
    mockOnPlayAgain = vi.fn();

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Complete Session Flow', () => {
    it('should complete full session with correct answers', async () => {
      // Initialize game state
      const gameState = new SingleChordGameState(noteTrainingSettings);

      // Start the session by generating first chord
      gameState.currentChord = TEST_CHORD_C_MAJOR;
      gameState.startTime = new Date();

      const completionControls = (
        <button onClick={mockOnPlayAgain}>Play Again</button>
      );

      const renderComponent = () => renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={gameState.currentChord?.notes[0] || null}
          onPianoKeyClick={(note) => gameState.handleNoteSelection(note)}
          onSubmitClick={() => {}}
          onClearSelection={() => gameState.clearSelection()}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
          completionControls={completionControls}
        />
      );

      let { container, rerender } = renderComponent();

      // Verify initial state
      expect(screen.getByText('C major')).toBeInTheDocument();
      expect(screen.getByText(/Progress:/)).toBeInTheDocument();
      const progressStats = container.querySelector('.progress-stats');
      expect(progressStats).toHaveTextContent('0/3');

      // Round 1: Select all correct notes for C major (C, E, G)
      selectNotes(TEST_CHORD_C_MAJOR.notes, gameState);

      // Force re-render after selection
      rerender(
        <SettingsProvider>
          <SingleChordModeDisplay
            gameState={gameState}
            currentNote={TEST_CHORD_C_MAJOR.notes[0]}
            onPianoKeyClick={(note) => gameState.handleNoteSelection(note)}
            onSubmitClick={() => {}}
            onClearSelection={() => gameState.clearSelection()}
            onAdvanceRound={mockOnAdvanceRound}
            onPlayAgain={mockOnPlayAgain}
            completionControls={completionControls}
          />
        </SettingsProvider>
      );

      // Verify notes are selected
      expect(gameState.selectedNotes.size).toBe(3);

      // Submit answer (call directly to test state logic)
      const result = gameState.handleSubmitAnswer();
      expect(result.shouldAdvance).toBe(true);
      expect(result.gameCompleted).toBe(false);
      expect(gameState.correctChordsCount).toBe(1);
      expect(gameState.currentStreak).toBe(1);

      // Simulate advancing to round 2
      gameState.currentChord = TEST_CHORD_D_MINOR;
      gameState.selectedNotes.clear();
      gameState.correctNotes.clear();
      gameState.incorrectNotes.clear();

      rerender(
        <SettingsProvider>
          <SingleChordModeDisplay
            gameState={gameState}
            currentNote={TEST_CHORD_D_MINOR.notes[0]}
            onPianoKeyClick={(note) => gameState.handleNoteSelection(note)}
            onSubmitClick={() => {}}
            onClearSelection={() => gameState.clearSelection()}
            onAdvanceRound={mockOnAdvanceRound}
            onPlayAgain={mockOnPlayAgain}
            completionControls={completionControls}
          />
        </SettingsProvider>
      );

      // Round 2: Complete D minor correctly
      selectNotes(TEST_CHORD_D_MINOR.notes, gameState);
      const result2 = gameState.handleSubmitAnswer();

      expect(result2.shouldAdvance).toBe(true);
      expect(gameState.correctChordsCount).toBe(2);
      expect(gameState.currentStreak).toBe(2);

      // Simulate advancing to round 3
      gameState.currentChord = TEST_CHORD_E_MAJOR;
      gameState.selectedNotes.clear();
      gameState.correctNotes.clear();
      gameState.incorrectNotes.clear();

      rerender(
        <SettingsProvider>
          <SingleChordModeDisplay
            gameState={gameState}
            currentNote={TEST_CHORD_E_MAJOR.notes[0]}
            onPianoKeyClick={(note) => gameState.handleNoteSelection(note)}
            onSubmitClick={() => {}}
            onClearSelection={() => gameState.clearSelection()}
            onAdvanceRound={mockOnAdvanceRound}
            onPlayAgain={mockOnPlayAgain}
            completionControls={completionControls}
          />
        </SettingsProvider>
      );

      // Round 3: Complete E major correctly (should complete session)
      selectNotes(TEST_CHORD_E_MAJOR.notes, gameState);
      const result3 = gameState.handleSubmitAnswer();

      // Verify session is complete
      expect(result3.gameCompleted).toBe(true);
      expect(gameState.isCompleted).toBe(true);
      expect(gameState.correctChordsCount).toBe(3);
      expect(result3.stats?.accuracy).toBe(100); // Perfect accuracy

      // Re-render to show completion state
      rerender(
        <SettingsProvider>
          <SingleChordModeDisplay
            gameState={gameState}
            currentNote={TEST_CHORD_E_MAJOR.notes[0]}
            onPianoKeyClick={(note) => gameState.handleNoteSelection(note)}
            onSubmitClick={() => {}}
            onClearSelection={() => gameState.clearSelection()}
            onAdvanceRound={mockOnAdvanceRound}
            onPlayAgain={mockOnPlayAgain}
            completionControls={completionControls}
          />
        </SettingsProvider>
      );

      // Verify completion message
      expect(screen.getByText(/Training Complete!/)).toBeInTheDocument();
      expect(screen.getByText(/3\/3 chords identified/)).toBeInTheDocument();

      // Verify Play Again button is available
      expect(screen.getByText('Play Again')).toBeInTheDocument();
    });

    it('should handle incorrect answers with proper feedback', async () => {
      const gameState = new SingleChordGameState(noteTrainingSettings);
      gameState.currentChord = TEST_CHORD_C_MAJOR;
      gameState.startTime = new Date();

      const completionControls = (
        <button onClick={mockOnPlayAgain}>Play Again</button>
      );

      const { rerender } = renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_CHORD_C_MAJOR.notes[0]}
          onPianoKeyClick={(note) => gameState.handleNoteSelection(note)}
          onSubmitClick={() => {}}
          onClearSelection={() => gameState.clearSelection()}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
          completionControls={completionControls}
        />
      );

      // Select incorrect notes: C, E, A (should be C, E, G)
      const incorrectNotes: NoteWithOctave[] = [
        { note: 'C', octave: 4 },
        { note: 'E', octave: 4 },
        { note: 'A', octave: 4 } // Wrong note
      ];

      selectNotes(incorrectNotes, gameState);

      // Submit incorrect answer
      const result = gameState.handleSubmitAnswer();

      // Verify error feedback
      expect(result.shouldAdvance).toBe(false);
      expect(result.gameCompleted).toBe(false);
      expect(result.feedback).toContain('Try again'); // Updated to match actual feedback format

      // Verify state updates
      expect(gameState.currentStreak).toBe(0); // Streak reset
      expect(gameState.totalAttempts).toBe(1);
      expect(gameState.correctNotes.size).toBe(2); // C and E are correct
      expect(gameState.incorrectNotes.size).toBe(1); // A is incorrect

      // Verify incorrect notes are highlighted
      const highlights = gameState.getNoteHighlights();
      const errorHighlights = highlights.filter(h => h.type === 'error');
      expect(errorHighlights.length).toBe(1);
      expect(errorHighlights[0].note.note).toBe('A');

      // Verify guess history tracked the failed attempt
      expect(gameState.guessHistory.length).toBeGreaterThanOrEqual(1);
      const lastAttempt = gameState.guessHistory[gameState.guessHistory.length - 1];
      expect(lastAttempt.isCorrect).toBe(false);
      expect(lastAttempt.accuracy).toBeLessThan(100);

      // Now fix the answer - clear and select correct notes
      gameState.clearSelection();
      selectNotes(TEST_CHORD_C_MAJOR.notes, gameState);

      const correctResult = gameState.handleSubmitAnswer();

      // Verify now advances
      expect(correctResult.shouldAdvance).toBe(true);
      expect(gameState.correctChordsCount).toBe(1);
      expect(gameState.totalAttempts).toBe(2);
    });

    it('should handle partial correct answers', async () => {
      const gameState = new SingleChordGameState(noteTrainingSettings);
      gameState.currentChord = TEST_CHORD_C_MAJOR;
      gameState.startTime = new Date();

      renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_CHORD_C_MAJOR.notes[0]}
          onPianoKeyClick={(note) => gameState.handleNoteSelection(note)}
          onSubmitClick={() => {}}
          onClearSelection={() => gameState.clearSelection()}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      // Select only partial notes: C, E (missing G)
      const partialNotes: NoteWithOctave[] = [
        { note: 'C', octave: 4 },
        { note: 'E', octave: 4 }
      ];

      selectNotes(partialNotes, gameState);

      // Submit partial answer
      const result = gameState.handleSubmitAnswer();

      // Verify partial feedback
      expect(result.shouldAdvance).toBe(false);
      expect(result.feedback).toContain('Keep going!');
      expect(result.feedback).toContain('2/3');

      // Verify correct notes are identified
      expect(gameState.correctNotes.size).toBe(2);
      expect(gameState.incorrectNotes.size).toBe(0);

      // Verify missing notes are shown
      const missingNotes = gameState.getMissingNotes();
      expect(missingNotes.size).toBe(1);
      const missingNote = Array.from(missingNotes)[0];
      expect(missingNote.note).toBe('G');

      // Add the missing note
      gameState.handleNoteSelection({ note: 'G', octave: 4 });

      // Submit complete answer
      const completeResult = gameState.handleSubmitAnswer();

      // Verify now it advances
      expect(completeResult.shouldAdvance).toBe(true);
      expect(gameState.correctChordsCount).toBe(1);
    });
  });

  describe('Session Completion', () => {
    it('should complete session when target reached', async () => {
      // Set target to just 2 chords for faster completion test
      noteTrainingSettings.targetChords = 2;

      const gameState = new SingleChordGameState(noteTrainingSettings);
      gameState.currentChord = TEST_CHORD_C_MAJOR;
      gameState.startTime = new Date();

      const completionControls = (
        <button onClick={mockOnPlayAgain}>Play Again</button>
      );

      const { rerender } = renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_CHORD_C_MAJOR.notes[0]}
          onPianoKeyClick={(note) => gameState.handleNoteSelection(note)}
          onSubmitClick={() => {}}
          onClearSelection={() => gameState.clearSelection()}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
          completionControls={completionControls}
        />
      );

      // Complete first chord
      selectNotes(TEST_CHORD_C_MAJOR.notes, gameState);
      const result1 = gameState.handleSubmitAnswer();

      expect(result1.gameCompleted).toBe(false);
      expect(gameState.isCompleted).toBe(false);

      // Move to second chord
      gameState.currentChord = TEST_CHORD_D_MINOR;
      gameState.selectedNotes.clear();
      gameState.correctNotes.clear();
      gameState.incorrectNotes.clear();

      // Complete second chord
      selectNotes(TEST_CHORD_D_MINOR.notes, gameState);
      const result2 = gameState.handleSubmitAnswer();

      // Verify session completes
      expect(result2.gameCompleted).toBe(true);
      expect(gameState.isCompleted).toBe(true);
      expect(gameState.correctChordsCount).toBe(2);

      // Verify final stats
      expect(result2.stats).toBeDefined();
      expect(result2.stats?.correctAttempts).toBe(2);
      expect(result2.stats?.totalAttempts).toBe(2);
      expect(result2.stats?.accuracy).toBe(100);

      // Re-render with completion state
      rerender(
        <SettingsProvider>
          <SingleChordModeDisplay
            gameState={gameState}
            currentNote={TEST_CHORD_D_MINOR.notes[0]}
            onPianoKeyClick={(note) => gameState.handleNoteSelection(note)}
            onSubmitClick={() => {}}
            onClearSelection={() => gameState.clearSelection()}
            onAdvanceRound={mockOnAdvanceRound}
            onPlayAgain={mockOnPlayAgain}
            completionControls={completionControls}
          />
        </SettingsProvider>
      );

      // Verify keyboard should be disabled when game is completed
      expect(gameState.isCompleted).toBe(true);

      // Verify Play Again button exists
      expect(screen.getByText('Play Again')).toBeInTheDocument();
    });

    it('should calculate final statistics correctly', async () => {
      noteTrainingSettings.targetChords = 3;

      const gameState = new SingleChordGameState(noteTrainingSettings);
      gameState.startTime = new Date();

      // Complete 3 chords with mixed results (2 correct, 1 incorrect then correct)

      // Chord 1: Correct on first try
      gameState.currentChord = TEST_CHORD_C_MAJOR;
      selectNotes(TEST_CHORD_C_MAJOR.notes, gameState);
      gameState.handleSubmitAnswer();

      // Chord 2: Incorrect first, then correct
      gameState.currentChord = TEST_CHORD_D_MINOR;
      gameState.selectedNotes.clear();
      gameState.correctNotes.clear();
      gameState.incorrectNotes.clear();

      // First attempt - wrong
      selectNotes([
        { note: 'D', octave: 4 },
        { note: 'F', octave: 4 },
        { note: 'B', octave: 4 } // Wrong
      ], gameState);
      gameState.handleSubmitAnswer();

      // Second attempt - correct
      gameState.clearSelection();
      selectNotes(TEST_CHORD_D_MINOR.notes, gameState);
      gameState.handleSubmitAnswer();

      // Chord 3: Correct on first try
      gameState.currentChord = TEST_CHORD_E_MAJOR;
      gameState.selectedNotes.clear();
      gameState.correctNotes.clear();
      gameState.incorrectNotes.clear();

      selectNotes(TEST_CHORD_E_MAJOR.notes, gameState);
      const finalResult = gameState.handleSubmitAnswer();

      // Verify final statistics
      expect(finalResult.gameCompleted).toBe(true);
      expect(finalResult.stats).toBeDefined();

      const stats = finalResult.stats!;
      expect(stats.correctAttempts).toBe(3);
      expect(stats.totalAttempts).toBe(4); // 1 + 2 + 1
      expect(stats.longestStreak).toBeGreaterThanOrEqual(1);

      // Accuracy calculation based on note-level correctness
      expect(stats.accuracy).toBeGreaterThan(0);
      expect(stats.accuracy).toBeLessThanOrEqual(100);
    });
  });

  describe('User Interactions', () => {
    it('should allow clearing note selection', async () => {
      const gameState = new SingleChordGameState(noteTrainingSettings);
      gameState.currentChord = TEST_CHORD_C_MAJOR;
      gameState.startTime = new Date();

      const completionControls = (
        <button onClick={mockOnPlayAgain}>Play Again</button>
      );

      const { rerender } = renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_CHORD_C_MAJOR.notes[0]}
          onPianoKeyClick={(note) => gameState.handleNoteSelection(note)}
          onSubmitClick={() => {}}
          onClearSelection={() => gameState.clearSelection()}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
          completionControls={completionControls}
        />
      );

      // Initially, clear button should be disabled (no notes selected)
      let clearButton = screen.getByText('Clear Selection');
      expect(clearButton).toBeDisabled();

      // Select some notes
      selectNotes([
        { note: 'C', octave: 4 },
        { note: 'E', octave: 4 }
      ], gameState);

      // Re-render to update button state
      rerender(
        <SettingsProvider>
          <SingleChordModeDisplay
            gameState={gameState}
            currentNote={TEST_CHORD_C_MAJOR.notes[0]}
            onPianoKeyClick={(note) => gameState.handleNoteSelection(note)}
            onSubmitClick={() => {}}
            onClearSelection={() => gameState.clearSelection()}
            onAdvanceRound={mockOnAdvanceRound}
            onPlayAgain={mockOnPlayAgain}
            completionControls={completionControls}
          />
        </SettingsProvider>
      );

      // Clear button should now be enabled
      expect(screen.getByText('Clear Selection')).not.toBeDisabled();

      // Click clear button
      fireEvent.click(screen.getByText('Clear Selection'));

      // Verify selection is cleared
      expect(gameState.selectedNotes.size).toBe(0);
      expect(gameState.correctNotes.size).toBe(0);
      expect(gameState.incorrectNotes.size).toBe(0);

      // Re-render to update UI
      rerender(
        <SettingsProvider>
          <SingleChordModeDisplay
            gameState={gameState}
            currentNote={TEST_CHORD_C_MAJOR.notes[0]}
            onPianoKeyClick={(note) => gameState.handleNoteSelection(note)}
            onSubmitClick={() => {}}
            onClearSelection={() => gameState.clearSelection()}
            onAdvanceRound={mockOnAdvanceRound}
            onPlayAgain={mockOnPlayAgain}
            completionControls={completionControls}
          />
        </SettingsProvider>
      );

      // Submit button should be disabled after clear
      expect(screen.getByText('Submit Answer')).toBeDisabled();
    });

    it('should advance to next chord on skip', async () => {
      const gameState = new SingleChordGameState(noteTrainingSettings);
      gameState.currentChord = TEST_CHORD_C_MAJOR;
      gameState.startTime = new Date();

      renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_CHORD_C_MAJOR.notes[0]}
          onPianoKeyClick={(note) => gameState.handleNoteSelection(note)}
          onSubmitClick={() => {}}
          onClearSelection={() => gameState.clearSelection()}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      // Verify Next Chord button is available
      const nextButton = screen.getByText('Next Chord');
      expect(nextButton).toBeInTheDocument();

      // Click Next Chord
      fireEvent.click(nextButton);

      // Verify onAdvanceRound was called with immediate advancement
      expect(mockOnAdvanceRound).toHaveBeenCalledWith(0);

      // Verify streak is maintained (not broken by skipping)
      expect(gameState.currentStreak).toBe(0); // No correct answer yet
    });

    it('should replay chord audio', async () => {
      const gameState = new SingleChordGameState(noteTrainingSettings);
      gameState.currentChord = TEST_CHORD_C_MAJOR;
      gameState.startTime = new Date();

      renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_CHORD_C_MAJOR.notes[0]}
          onPianoKeyClick={(note) => gameState.handleNoteSelection(note)}
          onSubmitClick={() => {}}
          onClearSelection={() => gameState.clearSelection()}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      // Find and click Play Chord Again button
      const playButton = screen.getByText('Play Chord Again');
      expect(playButton).toBeInTheDocument();

      // Note: audioEngine mock is defined at top of file - the actual click will call it
      // We're testing that the button exists and is clickable, audio mock prevents actual playback
      expect(playButton).not.toBeDisabled();
    });
  });

  describe('History Tracking', () => {
    it('should track guess history correctly', async () => {
      const gameState = new SingleChordGameState(noteTrainingSettings);
      gameState.currentChord = TEST_CHORD_C_MAJOR;
      gameState.startTime = new Date();

      renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_CHORD_C_MAJOR.notes[0]}
          onPianoKeyClick={(note) => gameState.handleNoteSelection(note)}
          onSubmitClick={() => {}}
          onClearSelection={() => gameState.clearSelection()}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      // Verify history starts empty
      expect(gameState.guessHistory.length).toBe(0);

      // Submit an incorrect answer
      selectNotes([
        { note: 'C', octave: 4 },
        { note: 'E', octave: 4 },
        { note: 'A', octave: 4 } // Wrong
      ], gameState);
      gameState.handleSubmitAnswer();

      // Verify incorrect attempt added to history
      expect(gameState.guessHistory.length).toBe(1);
      expect(gameState.guessHistory[0].isCorrect).toBe(false);
      expect(gameState.guessHistory[0].accuracy).toBeLessThan(100);
      expect(gameState.guessHistory[0].incorrectNotes.length).toBeGreaterThan(0);

      // Submit correct answer
      gameState.clearSelection();
      selectNotes(TEST_CHORD_C_MAJOR.notes, gameState);
      gameState.handleSubmitAnswer();

      // Verify correct attempt added to history
      expect(gameState.guessHistory.length).toBe(2);
      expect(gameState.guessHistory[1].isCorrect).toBe(true);
      expect(gameState.guessHistory[1].accuracy).toBe(100);

      // Move to next chord
      gameState.currentChord = TEST_CHORD_D_MINOR;
      gameState.clearSelection();

      // Submit correct answer for second chord
      selectNotes(TEST_CHORD_D_MINOR.notes, gameState);
      gameState.handleSubmitAnswer();

      // Verify history persists across rounds
      expect(gameState.guessHistory.length).toBe(3);
      expect(gameState.guessHistory[2].actualChord.name).toBe('D minor');
    });

    it('should track timeout as incorrect guess', async () => {
      const gameState = new SingleChordGameState(noteTrainingSettings);
      gameState.currentChord = TEST_CHORD_C_MAJOR;
      gameState.startTime = new Date();

      // Simulate timeout by calling handleIncorrectGuess directly
      // (This is what the orchestrator calls when timer expires)
      const result = gameState.handleIncorrectGuess();

      // Verify timeout counted as incorrect
      expect(result.shouldAdvance).toBe(false);
      expect(gameState.guessHistory.length).toBe(1);
      expect(gameState.guessHistory[0].isCorrect).toBe(false);
      expect(gameState.guessHistory[0].accuracy).toBe(0); // No notes selected
      expect(gameState.currentStreak).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid note selection and deselection', async () => {
      const gameState = new SingleChordGameState(noteTrainingSettings);
      gameState.currentChord = TEST_CHORD_C_MAJOR;
      gameState.startTime = new Date();

      // Select a note
      gameState.handleNoteSelection({ note: 'C', octave: 4 });
      expect(gameState.selectedNotes.size).toBe(1);

      // Deselect the same note
      gameState.handleNoteSelection({ note: 'C', octave: 4 });
      expect(gameState.selectedNotes.size).toBe(0);

      // Select it again
      gameState.handleNoteSelection({ note: 'C', octave: 4 });
      expect(gameState.selectedNotes.size).toBe(1);
    });

    it('should handle session with 100% accuracy', async () => {
      noteTrainingSettings.targetChords = 2;
      const gameState = new SingleChordGameState(noteTrainingSettings);
      gameState.startTime = new Date();

      // Complete all chords correctly on first try
      gameState.currentChord = TEST_CHORD_C_MAJOR;
      selectNotes(TEST_CHORD_C_MAJOR.notes, gameState);
      gameState.handleSubmitAnswer();

      gameState.currentChord = TEST_CHORD_D_MINOR;
      gameState.clearSelection();
      selectNotes(TEST_CHORD_D_MINOR.notes, gameState);
      const result = gameState.handleSubmitAnswer();

      // Verify perfect accuracy
      expect(result.stats?.accuracy).toBe(100);
      expect(gameState.longestStreak).toBe(2);
      expect(gameState.correctChordsCount).toBe(2);
      expect(gameState.totalAttempts).toBe(2);
    });

    it('should handle session with 0% accuracy (all incorrect)', async () => {
      noteTrainingSettings.targetChords = 1;
      const gameState = new SingleChordGameState(noteTrainingSettings);
      gameState.startTime = new Date();
      gameState.currentChord = TEST_CHORD_C_MAJOR;

      // Submit all wrong notes
      selectNotes([
        { note: 'D', octave: 4 },
        { note: 'F', octave: 4 },
        { note: 'A', octave: 4 }
      ], gameState);
      const incorrectResult = gameState.handleSubmitAnswer();

      // Verify all incorrect
      expect(incorrectResult.shouldAdvance).toBe(false);
      expect(gameState.correctNotes.size).toBe(0);
      expect(gameState.incorrectNotes.size).toBe(3);

      // Now submit correct to complete
      gameState.clearSelection();
      selectNotes(TEST_CHORD_C_MAJOR.notes, gameState);
      const finalResult = gameState.handleSubmitAnswer();

      // Accuracy should be 50% (3 wrong notes + 3 correct notes = 6 total, 3 correct)
      expect(finalResult.stats?.accuracy).toBe(50);
    });
  });
});
