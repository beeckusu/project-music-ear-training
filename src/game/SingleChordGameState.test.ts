import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SingleChordGameState } from './SingleChordGameState';
import type { NoteTrainingModeSettings } from '../types/game';
import type { NoteWithOctave } from '../types/music';
import type { RoundContext } from '../types/orchestrator';
import { ChordEngine } from '../utils/chordEngine';

/**
 * SingleChordGameState Callback Tests
 *
 * Tests for the onPianoKeyClick and onSubmitClick callbacks
 * that enable strategy pattern integration for chord training.
 */
describe('SingleChordGameState - Callbacks', () => {
  let gameState: SingleChordGameState;
  let noteTrainingSettings: NoteTrainingModeSettings;

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

    // Generate a chord for testing
    gameState.currentChord = {
      name: 'C Major',
      notes: [TEST_NOTE_C4, TEST_NOTE_E4, TEST_NOTE_G4],
      quality: 'major',
      rootNote: 'C',
      inversion: 0
    };
  });

  describe('onPianoKeyClick()', () => {
    it('should call handleNoteSelection with the clicked note', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      // Spy on handleNoteSelection
      const handleNoteSelectionSpy = vi.spyOn(gameState, 'handleNoteSelection');

      gameState.onPianoKeyClick(TEST_NOTE_C4, context);

      expect(handleNoteSelectionSpy).toHaveBeenCalledWith(TEST_NOTE_C4);
      expect(handleNoteSelectionSpy).toHaveBeenCalledTimes(1);
    });

    it('should update context.selectedNotes with current selection', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      gameState.onPianoKeyClick(TEST_NOTE_C4, context);

      expect((context as any).selectedNotes).toBeInstanceOf(Set);
      expect((context as any).selectedNotes.size).toBe(1);
      expect(Array.from((context as any).selectedNotes)).toContainEqual(TEST_NOTE_C4);
    });

    it('should update context.noteHighlights with current highlights', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      gameState.onPianoKeyClick(TEST_NOTE_C4, context);

      expect(context.noteHighlights).toBeDefined();
      expect(Array.isArray(context.noteHighlights)).toBe(true);
      // Should have at least one highlight for the selected correct note
      expect(context.noteHighlights.length).toBeGreaterThan(0);
    });

    it('should toggle note selection on multiple clicks', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      // First click - select note
      gameState.onPianoKeyClick(TEST_NOTE_C4, context);
      expect((context as any).selectedNotes.size).toBe(1);

      // Second click - deselect note
      gameState.onPianoKeyClick(TEST_NOTE_C4, context);
      expect((context as any).selectedNotes.size).toBe(0);
    });

    it('should handle selecting multiple notes', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      // Select C4
      gameState.onPianoKeyClick(TEST_NOTE_C4, context);
      expect((context as any).selectedNotes.size).toBe(1);

      // Select E4
      gameState.onPianoKeyClick(TEST_NOTE_E4, context);
      expect((context as any).selectedNotes.size).toBe(2);

      // Select G4
      gameState.onPianoKeyClick(TEST_NOTE_G4, context);
      expect((context as any).selectedNotes.size).toBe(3);
    });

    it('should mark correct notes in highlights', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      gameState.onPianoKeyClick(TEST_NOTE_C4, context);

      // Before submit, clicked notes should show as 'selected' (gray)
      const highlights = context.noteHighlights;
      const c4Highlight = highlights.find(h => h.note.note === 'C' && h.note.octave === 4);
      expect(c4Highlight).toBeDefined();
      expect(c4Highlight?.type).toBe('selected');
    });

    it('should mark incorrect notes in highlights', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      // Click a note that's not in the chord
      gameState.onPianoKeyClick(TEST_NOTE_A4, context);

      // Before submit, clicked notes should show as 'selected' (gray)
      const highlights = context.noteHighlights;
      const a4Highlight = highlights.find(h => h.note.note === 'A' && h.note.octave === 4);
      expect(a4Highlight).toBeDefined();
      expect(a4Highlight?.type).toBe('selected');
    });
  });

  describe('onSubmitClick()', () => {
    it('should call handleSubmitAnswer', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      // Spy on handleSubmitAnswer
      const handleSubmitAnswerSpy = vi.spyOn(gameState, 'handleSubmitAnswer');

      gameState.onSubmitClick(context);

      expect(handleSubmitAnswerSpy).toHaveBeenCalled();
      expect(handleSubmitAnswerSpy).toHaveBeenCalledTimes(1);
    });

    it('should update context.noteHighlights after submission', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      // Select all correct notes before submitting
      gameState.selectedNotes.add(TEST_NOTE_C4);
      gameState.selectedNotes.add(TEST_NOTE_E4);
      gameState.selectedNotes.add(TEST_NOTE_G4);
      gameState.correctNotes.add(TEST_NOTE_C4);
      gameState.correctNotes.add(TEST_NOTE_E4);
      gameState.correctNotes.add(TEST_NOTE_G4);

      gameState.onSubmitClick(context);

      expect(context.noteHighlights).toBeDefined();
      expect(Array.isArray(context.noteHighlights)).toBe(true);
    });

    it('should show success highlights for correct submission', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      // Select all correct notes
      gameState.selectedNotes.add(TEST_NOTE_C4);
      gameState.selectedNotes.add(TEST_NOTE_E4);
      gameState.selectedNotes.add(TEST_NOTE_G4);
      gameState.correctNotes.add(TEST_NOTE_C4);
      gameState.correctNotes.add(TEST_NOTE_E4);
      gameState.correctNotes.add(TEST_NOTE_G4);

      gameState.onSubmitClick(context);

      // All notes should be marked as success
      expect(context.noteHighlights.length).toBe(3);
      context.noteHighlights.forEach(highlight => {
        expect(highlight.type).toBe('success');
      });
    });

    it('should show error highlights for incorrect notes', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      // Select incorrect note
      gameState.selectedNotes.add(TEST_NOTE_A4);
      gameState.incorrectNotes.add(TEST_NOTE_A4);

      gameState.onSubmitClick(context);

      const highlights = context.noteHighlights;
      const a4Highlight = highlights.find(h => h.note.note === 'A' && h.note.octave === 4);
      expect(a4Highlight).toBeDefined();
      expect(a4Highlight?.type).toBe('error');
    });

    it('should show dimmed highlights for missing notes after submission', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      // Select only C4, missing E4 and G4
      gameState.selectedNotes.add(TEST_NOTE_C4);
      gameState.correctNotes.add(TEST_NOTE_C4);

      gameState.onSubmitClick(context);

      // After submission, missing notes should be dimmed
      const highlights = context.noteHighlights;
      const dimmednotes = highlights.filter(h => h.type === 'dimmed');
      expect(dimmednotes.length).toBe(2); // E4 and G4 are missing
    });
  });

  describe('Integration: Complete interaction flow', () => {
    it('should handle full chord identification flow (select → submit)', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      // User selects notes one by one
      gameState.onPianoKeyClick(TEST_NOTE_C4, context);
      expect((context as any).selectedNotes.size).toBe(1);

      gameState.onPianoKeyClick(TEST_NOTE_E4, context);
      expect((context as any).selectedNotes.size).toBe(2);

      gameState.onPianoKeyClick(TEST_NOTE_G4, context);
      expect((context as any).selectedNotes.size).toBe(3);

      // User submits answer
      gameState.onSubmitClick(context);

      // Should have success highlights for all correct notes
      expect(context.noteHighlights.length).toBe(3);
      context.noteHighlights.forEach(highlight => {
        expect(highlight.type).toBe('success');
      });
    });

    it('should handle incorrect guess flow with partial correctness', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE_C4,
        noteHighlights: []
      };

      // User selects C4 (correct) and A4 (incorrect)
      gameState.onPianoKeyClick(TEST_NOTE_C4, context);
      gameState.onPianoKeyClick(TEST_NOTE_A4, context);

      // User submits answer
      gameState.onSubmitClick(context);

      // Should have both success and error highlights
      const highlights = context.noteHighlights;
      const successHighlights = highlights.filter(h => h.type === 'success');
      const errorHighlights = highlights.filter(h => h.type === 'error');
      const dimmedHighlights = highlights.filter(h => h.type === 'dimmed');

      expect(successHighlights.length).toBe(1); // C4 is correct
      expect(errorHighlights.length).toBe(1); // A4 is incorrect
      expect(dimmedHighlights.length).toBe(2); // E4 and G4 are missing
    });
  });
});
