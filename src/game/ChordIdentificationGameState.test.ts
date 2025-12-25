import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChordIdentificationGameState } from './ChordIdentificationGameState';
import type { NoteTrainingModeSettings } from '../types/game';
import type { NoteWithOctave } from '../types/music';
import type { RoundContext } from '../types/orchestrator';

/**
 * ChordIdentificationGameState Callback Tests
 *
 * Tests for the onPianoKeyClick and onSubmitClick callbacks
 * that enable strategy pattern integration for chord training.
 */
describe('ChordIdentificationGameState - Callbacks', () => {
  let gameState: ChordIdentificationGameState;
  let noteTrainingSettings: NoteTrainingModeSettings;

  const TEST_NOTE_C4: NoteWithOctave = { note: 'C', octave: 4 };
  const TEST_NOTE_E4: NoteWithOctave = { note: 'E', octave: 4 };
  const TEST_NOTE_G4: NoteWithOctave = { note: 'G', octave: 4 };

  beforeEach(() => {
    // Create note training settings
    noteTrainingSettings = {
      selectedSubMode: 'showNotesGuessChord',
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

    // Generate a chord for testing
    gameState.currentChord = {
      name: 'C Major',
      notes: [TEST_NOTE_C4, TEST_NOTE_E4, TEST_NOTE_G4],
      quality: 'major',
      rootNote: 'C',
      inversion: 0
    };
    gameState.displayedNotes = [TEST_NOTE_C4, TEST_NOTE_E4, TEST_NOTE_G4];
  });

  describe('onPianoKeyClick()', () => {
    it('should be a no-op (not throw errors)', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      // Should not throw
      expect(() => {
        gameState.onPianoKeyClick(TEST_NOTE_C4, context);
      }).not.toThrow();
    });

    it('should not modify game state', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      const displayedNotesBefore = [...gameState.displayedNotes];
      const userGuessBefore = gameState.userGuess;

      gameState.onPianoKeyClick(TEST_NOTE_C4, context);

      expect(gameState.displayedNotes).toEqual(displayedNotesBefore);
      expect(gameState.userGuess).toBe(userGuessBefore);
    });

    it('should not modify context', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      const contextBefore = { ...context };

      gameState.onPianoKeyClick(TEST_NOTE_C4, context);

      expect(context.startTime).toEqual(contextBefore.startTime);
      expect(context.elapsedTime).toBe(contextBefore.elapsedTime);
      expect(context.note).toEqual(contextBefore.note);
      expect(context.noteHighlights).toEqual(contextBefore.noteHighlights);
    });

    it('should handle multiple clicks without side effects', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      // Multiple clicks should all be no-ops
      gameState.onPianoKeyClick(TEST_NOTE_C4, context);
      gameState.onPianoKeyClick(TEST_NOTE_E4, context);
      gameState.onPianoKeyClick(TEST_NOTE_G4, context);

      // Should not affect the displayed notes
      expect(gameState.displayedNotes.length).toBe(3);
    });

    it('should handle different notes consistently', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      const differentNotes: NoteWithOctave[] = [
        { note: 'C', octave: 4 },
        { note: 'D', octave: 4 },
        { note: 'E', octave: 4 },
        { note: 'F', octave: 4 },
        { note: 'G', octave: 4 }
      ];

      differentNotes.forEach(note => {
        expect(() => {
          gameState.onPianoKeyClick(note, context);
        }).not.toThrow();
      });
    });
  });

  describe('onSubmitClick()', () => {
    it('should call handleSubmitGuess', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      // Spy on handleSubmitGuess
      const handleSubmitGuessSpy = vi.spyOn(gameState, 'handleSubmitGuess');

      (context as any).guessedChordName = 'C Major';
      gameState.onSubmitClick(context);

      expect(handleSubmitGuessSpy).toHaveBeenCalled();
      expect(handleSubmitGuessSpy).toHaveBeenCalledTimes(1);
    });

    it('should extract guess from context.guessedChordName', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      const handleSubmitGuessSpy = vi.spyOn(gameState, 'handleSubmitGuess');

      (context as any).guessedChordName = 'C Major';
      gameState.onSubmitClick(context);

      expect(handleSubmitGuessSpy).toHaveBeenCalledWith('C Major');
    });

    it('should handle empty guess gracefully', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      const handleSubmitGuessSpy = vi.spyOn(gameState, 'handleSubmitGuess');

      // No guessedChordName in context
      gameState.onSubmitClick(context);

      expect(handleSubmitGuessSpy).toHaveBeenCalledWith('');
    });

    it('should handle correct guess', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      (context as any).guessedChordName = 'C Major';

      // Mock handleSubmitGuess to return correct result
      const handleSubmitGuessSpy = vi.spyOn(gameState, 'handleSubmitGuess').mockReturnValue({
        gameCompleted: false,
        feedback: 'Correct! 1/10 chords identified',
        shouldAdvance: true
      });

      gameState.onSubmitClick(context);

      expect(handleSubmitGuessSpy).toHaveBeenCalledWith('C Major');
    });

    it('should handle incorrect guess', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      (context as any).guessedChordName = 'D Minor';

      // Mock handleSubmitGuess to return incorrect result
      const handleSubmitGuessSpy = vi.spyOn(gameState, 'handleSubmitGuess').mockReturnValue({
        gameCompleted: false,
        feedback: 'Incorrect. The correct answer is C Major. Try again!',
        shouldAdvance: false
      });

      gameState.onSubmitClick(context);

      expect(handleSubmitGuessSpy).toHaveBeenCalledWith('D Minor');
    });

    it('should handle various chord name formats', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      const handleSubmitGuessSpy = vi.spyOn(gameState, 'handleSubmitGuess');

      const chordNames = [
        'C Major',
        'c major',
        'Cmaj',
        'C',
        'D Minor',
        'F# Major'
      ];

      chordNames.forEach(chordName => {
        (context as any).guessedChordName = chordName;
        gameState.onSubmitClick(context);
      });

      expect(handleSubmitGuessSpy).toHaveBeenCalledTimes(chordNames.length);
    });
  });

  describe('Integration: Complete interaction flow', () => {
    it('should handle full chord identification flow (view notes → guess → submit)', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      // Notes are displayed (already set in beforeEach)
      expect(gameState.displayedNotes.length).toBe(3);

      // Piano key clicks should be no-ops
      gameState.onPianoKeyClick(TEST_NOTE_C4, context);
      gameState.onPianoKeyClick(TEST_NOTE_E4, context);

      // User enters guess and submits
      (context as any).guessedChordName = 'C Major';
      const handleSubmitGuessSpy = vi.spyOn(gameState, 'handleSubmitGuess').mockReturnValue({
        gameCompleted: false,
        feedback: 'Correct! 1/10 chords identified',
        shouldAdvance: true
      });

      gameState.onSubmitClick(context);

      expect(handleSubmitGuessSpy).toHaveBeenCalledWith('C Major');
    });

    it('should not allow piano key interaction to interfere with guess submission', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      // User clicks piano keys (should have no effect)
      gameState.onPianoKeyClick(TEST_NOTE_C4, context);
      gameState.onPianoKeyClick(TEST_NOTE_E4, context);
      gameState.onPianoKeyClick(TEST_NOTE_G4, context);

      // User submits text guess
      (context as any).guessedChordName = 'C Major';
      const handleSubmitGuessSpy = vi.spyOn(gameState, 'handleSubmitGuess').mockReturnValue({
        gameCompleted: false,
        feedback: 'Correct!',
        shouldAdvance: true
      });

      gameState.onSubmitClick(context);

      // Verify the guess was submitted correctly
      expect(handleSubmitGuessSpy).toHaveBeenCalledWith('C Major');
      expect(handleSubmitGuessSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple guess attempts', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      const handleSubmitGuessSpy = vi.spyOn(gameState, 'handleSubmitGuess');

      // First attempt (incorrect)
      (context as any).guessedChordName = 'D Minor';
      handleSubmitGuessSpy.mockReturnValueOnce({
        gameCompleted: false,
        feedback: 'Incorrect. Try again!',
        shouldAdvance: false
      });
      gameState.onSubmitClick(context);

      // Second attempt (incorrect)
      (context as any).guessedChordName = 'E Minor';
      handleSubmitGuessSpy.mockReturnValueOnce({
        gameCompleted: false,
        feedback: 'Incorrect. Try again!',
        shouldAdvance: false
      });
      gameState.onSubmitClick(context);

      // Third attempt (correct)
      (context as any).guessedChordName = 'C Major';
      handleSubmitGuessSpy.mockReturnValueOnce({
        gameCompleted: false,
        feedback: 'Correct!',
        shouldAdvance: true
      });
      gameState.onSubmitClick(context);

      expect(handleSubmitGuessSpy).toHaveBeenCalledTimes(3);
      expect(handleSubmitGuessSpy).toHaveBeenNthCalledWith(1, 'D Minor');
      expect(handleSubmitGuessSpy).toHaveBeenNthCalledWith(2, 'E Minor');
      expect(handleSubmitGuessSpy).toHaveBeenNthCalledWith(3, 'C Major');
    });
  });
});
