import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import ChordIdentificationModeDisplay from './ChordIdentificationModeDisplay';
import { ChordIdentificationGameState } from '../../game/ChordIdentificationGameState';
import type { NoteTrainingModeSettings } from '../../types/game';
import type { NoteWithOctave, Note, ChordType } from '../../types/music';
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

describe('ChordIdentificationModeDisplay', () => {
  let gameState: ChordIdentificationGameState;
  let noteTrainingSettings: NoteTrainingModeSettings;
  let mockOnSubmitClick: ReturnType<typeof vi.fn>;
  let mockOnAdvanceRound: ReturnType<typeof vi.fn>;
  let mockOnPlayAgain: ReturnType<typeof vi.fn>;

  const TEST_NOTE_C4: NoteWithOctave = { note: 'C', octave: 4 };
  const TEST_NOTE_E4: NoteWithOctave = { note: 'E', octave: 4 };
  const TEST_NOTE_G4: NoteWithOctave = { note: 'G', octave: 4 };

  beforeEach(() => {
    // Create note training settings
    noteTrainingSettings = {
      selectedSubMode: 'hearChordGuessName',
      targetChords: 10,
      sessionDuration: 0,
      chordFilter: {
        qualities: ['major', 'minor'],
        rootNotes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
        inversions: [0]
      }
    };

    // Create game state instance
    gameState = new ChordIdentificationGameState(noteTrainingSettings);
    gameState.currentChord = {
      name: 'C major',
      notes: [TEST_NOTE_C4, TEST_NOTE_E4, TEST_NOTE_G4],
      root: 'C',
      inversion: 0,
      type: 'major' as any
    };
    gameState.displayedNotes = [TEST_NOTE_C4, TEST_NOTE_E4, TEST_NOTE_G4];

    // Setup mocks
    mockOnSubmitClick = vi.fn();
    mockOnAdvanceRound = vi.fn();
    mockOnPlayAgain = vi.fn();

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Read-only Keyboard', () => {
    it('should display piano keyboard with chord notes highlighted', () => {
      const { container } = renderWithSettings(
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const pianoKeys = container.querySelectorAll('.white-key, .black-key');
      expect(pianoKeys.length).toBeGreaterThan(0);
    });

    it('should disable all piano keys in identification mode', () => {
      const { container } = renderWithSettings(
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const pianoKeys = container.querySelectorAll('.white-key, .black-key');
      pianoKeys.forEach(key => {
        expect(key).toBeDisabled();
      });
    });

    it('should render read-only keyboard when chord is active', () => {
      const { container } = renderWithSettings(
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const keyboard = container.querySelector('.piano-container');
      expect(keyboard).toBeInTheDocument();
    });
  });

  describe('Chord Selection UI', () => {
    it('should display chord selection component', () => {
      const { container } = renderWithSettings(
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const chordSelection = container.querySelector('.chord-selection');
      expect(chordSelection).toBeInTheDocument();
    });

    it('should display base note buttons', () => {
      const { container } = renderWithSettings(
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const baseNoteButtons = container.querySelectorAll('.base-note-button');
      expect(baseNoteButtons.length).toBe(12); // 12 chromatic notes
    });

    it('should display chord type buttons', () => {
      const { container } = renderWithSettings(
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const chordTypeButtons = container.querySelectorAll('.chord-type-button');
      expect(chordTypeButtons.length).toBe(24); // 24 chord types
    });

    it('should not show selected chord name when nothing is selected', () => {
      const { container } = renderWithSettings(
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const chordDisplay = container.querySelector('.selected-chord-display');
      expect(chordDisplay).not.toBeInTheDocument();
    });
  });

  describe('Manual Input', () => {
    it('should display manual chord input field', () => {
      const { container } = renderWithSettings(
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const input = container.querySelector('.chord-input-field');
      expect(input).toBeInTheDocument();
    });

    it('should accept manual chord name input', () => {
      const { container } = renderWithSettings(
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const input = container.querySelector('.chord-input-field') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Cm' } });

      expect(input.value).toBe('Cm');
    });

    it('should display placeholder text', () => {
      const { container } = renderWithSettings(
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const input = container.querySelector('.chord-input-field') as HTMLInputElement;
      expect(input.placeholder).toContain('e.g.');
    });
  });

  describe('Submit Button', () => {
    it('should disable submit with no input', () => {
      renderWithSettings(
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const submitButton = screen.getByText('Submit Guess');
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit with manual input', () => {
      const { container } = renderWithSettings(
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const input = container.querySelector('.chord-input-field') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'C' } });

      const submitButton = screen.getByText('Submit Guess');
      expect(submitButton).not.toBeDisabled();
    });

    it('should call onSubmitGuess when submit is clicked', () => {
      const { container } = renderWithSettings(
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const input = container.querySelector('.chord-input-field') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'C' } });

      const submitButton = screen.getByText('Submit Guess');
      fireEvent.click(submitButton);

      expect(mockOnSubmitClick).toHaveBeenCalled();
    });

    it('should display feedback after submit', () => {
      const { container } = renderWithSettings(
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const input = container.querySelector('.chord-input-field') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'C' } });

      const submitButton = screen.getByText('Submit Guess');
      fireEvent.click(submitButton);

      expect(screen.getByText('Correct! 1/10 chords identified')).toBeInTheDocument();
    });

    it('should show error feedback for wrong answer', () => {
      const { container } = renderWithSettings(
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const input = container.querySelector('.chord-input-field') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Cm' } });

      const submitButton = screen.getByText('Submit Guess');
      fireEvent.click(submitButton);

      expect(screen.getByText('Incorrect. The correct answer is C major. Try again!')).toBeInTheDocument();
    });
  });

  describe('Round Buttons', () => {
    it('should show Play Chord Again button when chord is active', () => {
      renderWithSettings(
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      expect(screen.getByText('Play Chord Again')).toBeInTheDocument();
    });

    it('should show Next Chord button when chord is active', () => {
      renderWithSettings(
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      expect(screen.getByText('Next Chord')).toBeInTheDocument();
    });

    it('should advance to next chord when Next Chord is clicked', () => {
      renderWithSettings(
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
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
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
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
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
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
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={null}
          onSubmitClick={mockOnSubmitClick}
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
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          sessionTimeRemaining={120}
          onSubmitClick={mockOnSubmitClick}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const timer = container.querySelector('.timer-container');
      expect(timer).toBeInTheDocument();
    });

    it('should display round timer when responseTimeLimit is provided', () => {
      const { container } = renderWithSettings(
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          responseTimeLimit={30}
          timeRemaining={25}
          onSubmitClick={mockOnSubmitClick}
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
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
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
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
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
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
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
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
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
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      expect(screen.getByText(/Training Complete!/)).toBeInTheDocument();
      expect(screen.getByText(/10\/10 chords identified/)).toBeInTheDocument();
    });
  });

  describe('Guess History', () => {
    it('should display guess history component', () => {
      const { container } = renderWithSettings(
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      expect(container.querySelector('.chord-guess-history')).toBeInTheDocument();
    });
  });

  describe('Input Clearing', () => {
    it('should clear input after correct guess', async () => {
      const { container } = renderWithSettings(
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const input = container.querySelector('.chord-input-field') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'C' } });

      const submitButton = screen.getByText('Submit Guess');
      fireEvent.click(submitButton);

      // Input should be cleared after submission (when shouldAdvance is true)
      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('should clear input when Next Chord is clicked', () => {
      const { container } = renderWithSettings(
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const input = container.querySelector('.chord-input-field') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'C' } });

      const nextButton = screen.getByText('Next Chord');
      fireEvent.click(nextButton);

      expect(input.value).toBe('');
    });
  });

  describe('Game Completion', () => {
    it('should hide chord input when game is completed', () => {
      gameState.isCompleted = true;

      const { container } = renderWithSettings(
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const inputSection = container.querySelector('.chord-input-section');
      expect(inputSection).not.toBeInTheDocument();
    });

    it('should show chord answer when game is completed', () => {
      gameState.isCompleted = true;

      renderWithSettings(
        <ChordIdentificationModeDisplay
          gameState={gameState}
          currentNote={TEST_NOTE_C4}
          onSubmitClick={mockOnSubmitClick}
          onAdvanceRound={mockOnAdvanceRound}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      expect(screen.getByText('C major')).toBeInTheDocument();
    });
  });
});
