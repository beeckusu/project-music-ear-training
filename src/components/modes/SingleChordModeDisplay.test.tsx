import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import SingleChordModeDisplay from './SingleChordModeDisplay';
import { SingleChordGameState } from '../../game/SingleChordGameState';
import type { NoteTrainingModeSettings } from '../../types/game';
import type { NoteWithOctave } from '../../types/music';
import { SettingsProvider } from '../../contexts/SettingsContext';

// Mock audio engine
vi.mock('../../utils/audioEngine', () => ({
  audioEngine: {
    playChord: vi.fn(),
    playNote: vi.fn(),
    releaseAllNotes: vi.fn()
  }
}));

// Helper to render with SettingsProvider
const renderWithSettings = (ui: React.ReactElement) => {
  return render(
    <SettingsProvider>
      {ui}
    </SettingsProvider>
  );
};

describe('SingleChordModeDisplay', () => {
  let gameState: SingleChordGameState;
  let noteTrainingSettings: NoteTrainingModeSettings;
  let mockOnPianoKeyClick: ReturnType<typeof vi.fn>;
  let mockOnSubmitClick: ReturnType<typeof vi.fn>;
  let mockOnClearSelection: ReturnType<typeof vi.fn>;
  let mockOnAdvanceRound: ReturnType<typeof vi.fn>;
  let mockOnPlayAgain: ReturnType<typeof vi.fn>;

  const TEST_NOTE_C4: NoteWithOctave = { note: 'C', octave: 4 };
  const TEST_NOTE_E4: NoteWithOctave = { note: 'E', octave: 4 };
  const TEST_NOTE_G4: NoteWithOctave = { note: 'G', octave: 4 };
  const TEST_NOTE_A4: NoteWithOctave = { note: 'A', octave: 4 };

  beforeEach(() => {
    // Create note training settings
    noteTrainingSettings = {
      selectedSubMode: 'showChordGuessNotes',
      targetChords: 10,
      sessionDuration: 0,
      chordFilter: {
        qualities: ['major', 'minor'],
        rootNotes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
        inversions: [0]
      }
    };

    // Create game state instance
    gameState = new SingleChordGameState(noteTrainingSettings);
    gameState.currentChord = {
      name: 'C major',
      notes: [TEST_NOTE_C4, TEST_NOTE_E4, TEST_NOTE_G4],
      root: 'C',
      inversion: 0,
      type: 'major' as any
    };

    // Setup mocks
    mockOnPianoKeyClick = vi.fn();
    mockOnSubmitClick = vi.fn();
    mockOnClearSelection = vi.fn();
    mockOnAdvanceRound = vi.fn();
    mockOnPlayAgain = vi.fn();

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Note Selection', () => {
    it('should render piano keyboard', () => {
      const { container } = renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const pianoKeys = container.querySelectorAll('.white-key, .black-key');
      expect(pianoKeys.length).toBeGreaterThan(0);
    });

    it('should allow multiple notes to be selected', () => {
      gameState.selectedNotes.add(TEST_NOTE_C4);
      gameState.selectedNotes.add(TEST_NOTE_E4);

      const { container } = renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      // Check that multiple notes are highlighted
      const highlights = gameState.getNoteHighlights();
      expect(highlights.length).toBeGreaterThan(0);
    });

    it('should enable submit when notes are selected', () => {
      gameState.selectedNotes.add(TEST_NOTE_C4);

      renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const submitButton = screen.getByText('Submit Answer');
      expect(submitButton).not.toBeDisabled();
    });

    it('should disable submit when no notes are selected', () => {
      renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const submitButton = screen.getByText('Submit Answer');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Submit Validation', () => {
    it('should call onSubmitAnswer when submit button is clicked', () => {
      gameState.selectedNotes.add(TEST_NOTE_C4);

      renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const submitButton = screen.getByText('Submit Answer');
      fireEvent.click(submitButton);

      expect(mockOnSubmitClick).toHaveBeenCalled();
    });

    it('should display feedback message after submit', () => {
      gameState.selectedNotes.add(TEST_NOTE_C4);
      gameState.selectedNotes.add(TEST_NOTE_E4);
      gameState.selectedNotes.add(TEST_NOTE_G4);

      renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const submitButton = screen.getByText('Submit Answer');
      fireEvent.click(submitButton);

      expect(screen.getByText('Perfect! 100% - 1/10 chords identified')).toBeInTheDocument();
    });

    it('should show error feedback for wrong answer', () => {
      gameState.selectedNotes.add(TEST_NOTE_A4);

      renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const submitButton = screen.getByText('Submit Answer');
      fireEvent.click(submitButton);

      expect(screen.getByText(/Try again!/i)).toBeInTheDocument();
    });

    it('should display selection status', () => {
      gameState.correctNotes.add(TEST_NOTE_C4);
      gameState.correctNotes.add(TEST_NOTE_E4);

      renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      expect(screen.getByText(/Correct: 2\/3/)).toBeInTheDocument();
    });

    it('should display incorrect notes status when present', () => {
      gameState.incorrectNotes.add(TEST_NOTE_A4);

      renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      expect(screen.getByText(/Incorrect: 1/)).toBeInTheDocument();
    });
  });

  describe('Clear Selection', () => {
    it('should call onClearSelection when clear button is clicked', () => {
      gameState.selectedNotes.add(TEST_NOTE_C4);

      renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const clearButton = screen.getByText('Clear Selection');
      fireEvent.click(clearButton);

      expect(mockOnClearSelection).toHaveBeenCalled();
    });

    it('should disable clear button when no selection', () => {
      renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const clearButton = screen.getByText('Clear Selection');
      expect(clearButton).toBeDisabled();
    });

    it('should enable clear button when notes are selected', () => {
      gameState.selectedNotes.add(TEST_NOTE_C4);

      renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const clearButton = screen.getByText('Clear Selection');
      expect(clearButton).not.toBeDisabled();
    });
  });

  describe('Round Buttons', () => {
    it('should show Play Chord Again button when chord is active', () => {
      renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      expect(screen.getByText('Play Chord Again')).toBeInTheDocument();
    });

    it('should show Next Chord button when chord is active', () => {
      renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      expect(screen.getByText('Next Chord')).toBeInTheDocument();
    });

    it('should advance to next chord when Next Chord is clicked', () => {
      renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const nextButton = screen.getByText('Next Chord');
      fireEvent.click(nextButton);

      expect(mockOnAdvanceRound).toHaveBeenCalledWith(0);
    });

    it('should show Play Again button when game is completed', () => {
      gameState.isCompleted = true;

      const completionControls = (
        <button onClick={mockOnPlayAgain}>Play Again</button>
      );

      renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
          completionControls={completionControls}
        />
      );

      expect(screen.getByText('Play Again')).toBeInTheDocument();
    });

    it('should call onPlayAgain when Play Again is clicked', () => {
      gameState.isCompleted = true;

      const completionControls = (
        <button onClick={mockOnPlayAgain}>Play Again</button>
      );

      renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
          completionControls={completionControls}
        />
      );

      const playAgainButton = screen.getByText('Play Again');
      fireEvent.click(playAgainButton);

      expect(mockOnPlayAgain).toHaveBeenCalled();
    });

    it('should show Start Practice button when no chord is active', () => {
      gameState.currentChord = null;

      renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={null}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      expect(screen.getByText('Start Practice')).toBeInTheDocument();
    });
  });

  describe('Timer Integration', () => {
    it('should display digital timer when session time is provided', () => {
      const { container } = renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          sessionTimeRemaining={120}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const timer = container.querySelector('.timer-container');
      expect(timer).toBeInTheDocument();
    });

    it('should display round timer when responseTimeLimit is provided', () => {
      const { container } = renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          responseTimeLimit={30}
          timeRemaining={25}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const roundTimer = container.querySelector('.round-timer-container');
      expect(roundTimer).toBeInTheDocument();
    });

    it('should not show round timer when game is paused', () => {
      const { container } = renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          responseTimeLimit={30}
          timeRemaining={25}
          isPaused={true}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const roundTimer = container.querySelector('.round-timer-container');
      expect(roundTimer).toBeInTheDocument();
    });
  });

  describe('Progress Stats', () => {
    it('should display correct/total count', () => {
      gameState.correctChordsCount = 3;

      renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      expect(screen.getByText(/Progress:/)).toBeInTheDocument();
      expect(screen.getByText(/3\/10/)).toBeInTheDocument();
    });

    it('should display current streak', () => {
      gameState.currentStreak = 5;

      renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      expect(screen.getByText(/Streak:/)).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should calculate and display accuracy percentage', () => {
      gameState.correctChordsCount = 7;
      gameState.totalAttempts = 10;

      renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      expect(screen.getByText(/Accuracy:/)).toBeInTheDocument();
      expect(screen.getByText(/70%/)).toBeInTheDocument();
    });

    it('should display 0% accuracy when no attempts', () => {
      gameState.correctChordsCount = 0;
      gameState.totalAttempts = 0;

      renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      expect(screen.getByText(/0%/)).toBeInTheDocument();
    });

    it('should show completion message when game is completed', () => {
      gameState.isCompleted = true;
      gameState.correctChordsCount = 10;

      renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      expect(screen.getByText(/Training Complete!/)).toBeInTheDocument();
      expect(screen.getByText(/10\/10 chords identified/)).toBeInTheDocument();
    });
  });

  describe('Chord Display', () => {
    it('should display chord name', () => {
      renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      expect(screen.getByText('C major')).toBeInTheDocument();
    });

    it('should display guess history component', () => {
      const { container } = renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      expect(container.querySelector('.chord-guess-history')).toBeInTheDocument();
    });
  });

  describe('Keyboard Interaction', () => {
    it('should disable keyboard when game is completed', () => {
      gameState.isCompleted = true;

      const { container } = renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const pianoKeys = container.querySelectorAll('.white-key, .black-key');
      pianoKeys.forEach(key => {
        expect(key).toBeDisabled();
      });
    });

    it('should disable keyboard when no chord is active', () => {
      gameState.currentChord = null;

      const { container } = renderWithSettings(
        <SingleChordModeDisplay
          gameState={gameState}
          currentNote={null}
          onPianoKeyClick={mockOnPianoKeyClick}
          onSubmitClick={mockOnSubmitClick}
          onClearSelection={mockOnClearSelection}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const pianoKeys = container.querySelectorAll('.white-key, .black-key');
      pianoKeys.forEach(key => {
        expect(key).toBeDisabled();
      });
    });
  });
});
