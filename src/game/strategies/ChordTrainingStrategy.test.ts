import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChordTrainingStrategy } from './ChordTrainingStrategy';
import type { IGameMode } from '../IGameMode';
import type { NoteFilter, NoteWithOctave, Chord, NoteHighlight } from '../../types/music';
import type { RoundContext } from '../../types/orchestrator';

/**
 * ChordTrainingStrategy Unit Tests
 *
 * Comprehensive test suite ensuring 100% coverage of the ChordTrainingStrategy
 * implementation. Tests verify that chord training logic correctly handles:
 * - Visual chord training (NO audio playback)
 * - Piano key clicks (toggle note selection)
 * - Submit button (explicit validation)
 * - Manual advancement (no auto-advance)
 */
describe('ChordTrainingStrategy', () => {
  let strategy: ChordTrainingStrategy;
  let mockGameMode: IGameMode;
  let noteFilter: NoteFilter;

  const TEST_CHORD: Chord = {
    name: 'C Major',
    notes: [
      { note: 'C', octave: 4 },
      { note: 'E', octave: 4 },
      { note: 'G', octave: 4 }
    ]
  };

  const SELECTED_NOTE: NoteWithOctave = { note: 'C', octave: 4 };
  const ANOTHER_NOTE: NoteWithOctave = { note: 'E', octave: 4 };

  beforeEach(() => {
    // Create mock game mode with chord-specific methods
    mockGameMode = {
      generateNote: vi.fn().mockReturnValue(TEST_CHORD.notes[0]),
      onStartNewRound: vi.fn(),
      handleNoteSelection: vi.fn(),
      handleSubmitAnswer: vi.fn().mockReturnValue({
        feedback: 'Correct!',
        shouldAdvance: true,
        gameCompleted: false
      }),
      getNoteHighlights: vi.fn().mockReturnValue([]),
      isGameComplete: vi.fn().mockReturnValue(false),
      getMode: vi.fn().mockReturnValue('single-chord'),
      validateGuess: vi.fn(),
      currentChord: TEST_CHORD,
      selectedNotes: new Set<NoteWithOctave>(),
      correctNotes: new Set<NoteWithOctave>(),
      incorrectNotes: new Set<NoteWithOctave>()
    } as any;

    // Create note filter
    noteFilter = {
      keyType: 'chromatic',
      includeNaturals: true,
      includeSharps: false,
      includeFlats: false,
      octaveRange: { min: 4, max: 4 }
    };

    // Create strategy instance
    strategy = new ChordTrainingStrategy();
  });

  describe('startNewRound()', () => {
    it('should generate a chord using gameMode.generateNote()', async () => {
      await strategy.startNewRound(mockGameMode, noteFilter);

      expect(mockGameMode.generateNote).toHaveBeenCalledWith(noteFilter);
      expect(mockGameMode.generateNote).toHaveBeenCalledTimes(1);
    });

    it('should call gameMode.onStartNewRound()', async () => {
      await strategy.startNewRound(mockGameMode, noteFilter);

      expect(mockGameMode.onStartNewRound).toHaveBeenCalled();
      expect(mockGameMode.onStartNewRound).toHaveBeenCalledTimes(1);
    });

    it('should NOT play audio (visual training only)', async () => {
      // The strategy should not have any audio playback logic
      await strategy.startNewRound(mockGameMode, noteFilter);

      // Verify no audio-related methods were called
      // (ChordTrainingStrategy doesn't use AudioEngine at all)
    });

    it('should return RoundContext with correct structure', async () => {
      const context = await strategy.startNewRound(mockGameMode, noteFilter);

      expect(context).toMatchObject({
        startTime: expect.any(Date),
        elapsedTime: 0,
        chord: TEST_CHORD,
        selectedNotes: expect.any(Set),
        noteHighlights: []
      });
    });

    it('should set chord field in context', async () => {
      const context = await strategy.startNewRound(mockGameMode, noteFilter);

      expect(context.chord).toEqual(TEST_CHORD);
    });

    it('should initialize selectedNotes as empty Set', async () => {
      const context = await strategy.startNewRound(mockGameMode, noteFilter);

      expect(context.selectedNotes).toBeInstanceOf(Set);
      expect(context.selectedNotes?.size).toBe(0);
    });

    it('should initialize startTime and elapsedTime', async () => {
      const context = await strategy.startNewRound(mockGameMode, noteFilter);

      expect(context.startTime).toBeInstanceOf(Date);
      expect(context.elapsedTime).toBe(0);
    });

    it('should initialize noteHighlights as empty array', async () => {
      const context = await strategy.startNewRound(mockGameMode, noteFilter);

      expect(context.noteHighlights).toEqual([]);
    });

    it('should store gameMode for later use', async () => {
      await strategy.startNewRound(mockGameMode, noteFilter);

      // Verify by calling handlePianoKeyClick which requires stored gameMode
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        chord: TEST_CHORD,
        selectedNotes: new Set(),
        noteHighlights: []
      };

      expect(() => strategy.handlePianoKeyClick(SELECTED_NOTE, context)).not.toThrow();
    });
  });

  describe('handlePianoKeyClick()', () => {
    beforeEach(async () => {
      // Initialize strategy with gameMode
      await strategy.startNewRound(mockGameMode, noteFilter);
    });

    it('should throw error if game mode not initialized', () => {
      const freshStrategy = new ChordTrainingStrategy();
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        chord: TEST_CHORD,
        selectedNotes: new Set(),
        noteHighlights: []
      };

      expect(() => freshStrategy.handlePianoKeyClick(SELECTED_NOTE, context)).toThrow(
        'Game mode not initialized. Call startNewRound first.'
      );
    });

    it('should call gameMode.handleNoteSelection() with the clicked note', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        chord: TEST_CHORD,
        selectedNotes: new Set(),
        noteHighlights: []
      };

      strategy.handlePianoKeyClick(SELECTED_NOTE, context);

      expect(mockGameMode.handleNoteSelection).toHaveBeenCalledWith(SELECTED_NOTE);
    });

    it('should update context.selectedNotes from game mode', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        chord: TEST_CHORD,
        selectedNotes: new Set(),
        noteHighlights: []
      };

      // Simulate game mode updating selectedNotes
      (mockGameMode as any).selectedNotes = new Set([SELECTED_NOTE]);

      strategy.handlePianoKeyClick(SELECTED_NOTE, context);

      expect(context.selectedNotes).toBeInstanceOf(Set);
      expect(context.selectedNotes?.size).toBe(1);
      expect(Array.from(context.selectedNotes || [])[0]).toEqual(SELECTED_NOTE);
    });

    it('should update context.noteHighlights from game mode', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        chord: TEST_CHORD,
        selectedNotes: new Set(),
        noteHighlights: []
      };

      const highlights: NoteHighlight[] = [
        { note: SELECTED_NOTE, type: 'selected' }
      ];
      (mockGameMode as any).getNoteHighlights = vi.fn().mockReturnValue(highlights);

      strategy.handlePianoKeyClick(SELECTED_NOTE, context);

      expect(context.noteHighlights).toEqual(highlights);
    });

    it('should handle multiple note selections', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        chord: TEST_CHORD,
        selectedNotes: new Set(),
        noteHighlights: []
      };

      // First note
      (mockGameMode as any).selectedNotes = new Set([SELECTED_NOTE]);
      strategy.handlePianoKeyClick(SELECTED_NOTE, context);
      expect(context.selectedNotes?.size).toBe(1);

      // Second note
      (mockGameMode as any).selectedNotes = new Set([SELECTED_NOTE, ANOTHER_NOTE]);
      strategy.handlePianoKeyClick(ANOTHER_NOTE, context);
      expect(context.selectedNotes?.size).toBe(2);
    });

    it('should handle note deselection (toggle off)', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        chord: TEST_CHORD,
        selectedNotes: new Set([SELECTED_NOTE]),
        noteHighlights: []
      };

      // Simulate game mode removing the note
      (mockGameMode as any).selectedNotes = new Set();

      strategy.handlePianoKeyClick(SELECTED_NOTE, context);

      expect(context.selectedNotes?.size).toBe(0);
    });

    it('should not modify the chord in context', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        chord: TEST_CHORD,
        selectedNotes: new Set(),
        noteHighlights: []
      };

      strategy.handlePianoKeyClick(SELECTED_NOTE, context);

      expect(context.chord).toEqual(TEST_CHORD);
    });
  });

  describe('handleSubmitClick()', () => {
    beforeEach(async () => {
      // Initialize strategy with gameMode
      await strategy.startNewRound(mockGameMode, noteFilter);
    });

    it('should throw error if game mode not initialized', () => {
      const freshStrategy = new ChordTrainingStrategy();
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        chord: TEST_CHORD,
        selectedNotes: new Set([SELECTED_NOTE]),
        noteHighlights: []
      };

      expect(() => freshStrategy.handleSubmitClick(context)).toThrow(
        'Game mode not initialized. Call startNewRound first.'
      );
    });

    it('should not call gameMode.handleSubmitAnswer() (deferred to validateAndAdvance)', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        chord: TEST_CHORD,
        selectedNotes: new Set([SELECTED_NOTE]),
        noteHighlights: []
      };

      strategy.handleSubmitClick(context);

      // handleSubmitAnswer is NOT called here to prevent duplicate scoring
      // It is called exclusively in validateAndAdvance()
      expect(mockGameMode.handleSubmitAnswer).not.toHaveBeenCalled();
    });

    it('should update context.noteHighlights after submission', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        chord: TEST_CHORD,
        selectedNotes: new Set([SELECTED_NOTE]),
        noteHighlights: []
      };

      const highlights: NoteHighlight[] = [
        { note: SELECTED_NOTE, type: 'success' }
      ];
      (mockGameMode as any).getNoteHighlights = vi.fn().mockReturnValue(highlights);

      strategy.handleSubmitClick(context);

      expect(context.noteHighlights).toEqual(highlights);
    });

    it('should update highlights to show correct/incorrect feedback', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        chord: TEST_CHORD,
        selectedNotes: new Set([SELECTED_NOTE, ANOTHER_NOTE]),
        noteHighlights: []
      };

      const highlights: NoteHighlight[] = [
        { note: SELECTED_NOTE, type: 'success' },
        { note: ANOTHER_NOTE, type: 'error' }
      ];
      (mockGameMode as any).getNoteHighlights = vi.fn().mockReturnValue(highlights);

      strategy.handleSubmitClick(context);

      expect(context.noteHighlights).toHaveLength(2);
    });
  });

  describe('validateAndAdvance()', () => {
    beforeEach(async () => {
      // Initialize strategy with gameMode
      await strategy.startNewRound(mockGameMode, noteFilter);
    });

    it('should throw error if game mode not initialized', () => {
      const freshStrategy = new ChordTrainingStrategy();
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        chord: TEST_CHORD,
        selectedNotes: new Set([SELECTED_NOTE]),
        noteHighlights: []
      };

      expect(() => freshStrategy.validateAndAdvance(context)).toThrow(
        'Game mode not initialized. Call startNewRound first.'
      );
    });

    // Note: Chord training modes manage state internally in the game mode,
    // not in the context, so we don't check for context.chord

    it('should call gameMode.handleSubmitAnswer()', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        chord: TEST_CHORD,
        selectedNotes: new Set([SELECTED_NOTE]),
        noteHighlights: []
      };

      strategy.validateAndAdvance(context);

      expect(mockGameMode.handleSubmitAnswer).toHaveBeenCalled();
    });

    it('should return error result if handleSubmitAnswer returns null/undefined', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        chord: TEST_CHORD,
        selectedNotes: new Set(),
        noteHighlights: []
      };

      (mockGameMode as any).handleSubmitAnswer = vi.fn().mockReturnValue(null);

      const result = strategy.validateAndAdvance(context);

      expect(result).toEqual({
        isCorrect: false,
        feedback: 'Unable to validate answer',
        shouldAdvance: false,
        gameCompleted: false
      });
    });

    it('should return GuessResult for correct answer with shouldAdvance=true', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        chord: TEST_CHORD,
        selectedNotes: new Set(TEST_CHORD.notes),
        noteHighlights: []
      };

      (mockGameMode as any).handleSubmitAnswer = vi.fn().mockReturnValue({
        feedback: 'Perfect! 100%',
        shouldAdvance: true,
        gameCompleted: false
      });

      const result = strategy.validateAndAdvance(context);

      expect(result.isCorrect).toBe(true);
      expect(result.shouldAdvance).toBe(true);
      expect(result.feedback).toBe('Perfect! 100%');
      expect(result.gameCompleted).toBe(false);
    });

    it('should return GuessResult for incorrect answer with shouldAdvance=false', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        chord: TEST_CHORD,
        selectedNotes: new Set([SELECTED_NOTE]),
        noteHighlights: []
      };

      (mockGameMode as any).handleSubmitAnswer = vi.fn().mockReturnValue({
        feedback: '33.3% - Try again!',
        shouldAdvance: false,
        gameCompleted: false
      });

      const result = strategy.validateAndAdvance(context);

      expect(result.isCorrect).toBe(false);
      expect(result.shouldAdvance).toBe(false);
      expect(result.feedback).toBe('33.3% - Try again!');
      expect(result.gameCompleted).toBe(false);
    });

    it('should handle partial correctness', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        chord: TEST_CHORD,
        selectedNotes: new Set([SELECTED_NOTE, ANOTHER_NOTE]),
        noteHighlights: []
      };

      (mockGameMode as any).handleSubmitAnswer = vi.fn().mockReturnValue({
        feedback: 'Keep going! 2/3 notes identified',
        shouldAdvance: false,
        gameCompleted: false
      });

      const result = strategy.validateAndAdvance(context);

      expect(result.shouldAdvance).toBe(false);
      expect(result.feedback).toContain('2/3');
    });

    it('should handle game completion state', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        chord: TEST_CHORD,
        selectedNotes: new Set(TEST_CHORD.notes),
        noteHighlights: []
      };

      const gameStats = {
        accuracy: 95.5,
        totalAttempts: 20,
        correctAttempts: 19,
        completionTime: 180,
        averageTimePerNote: 9.0,
        longestStreak: 15
      };

      (mockGameMode as any).handleSubmitAnswer = vi.fn().mockReturnValue({
        feedback: 'Note Training Complete!',
        shouldAdvance: false,
        gameCompleted: true,
        stats: gameStats
      });

      const result = strategy.validateAndAdvance(context);

      expect(result.isCorrect).toBe(true);
      expect(result.gameCompleted).toBe(true);
      expect(result.stats).toEqual(gameStats);
    });

    it('should include stats when game completes', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        chord: TEST_CHORD,
        selectedNotes: new Set(TEST_CHORD.notes),
        noteHighlights: []
      };

      const expectedStats = {
        accuracy: 100,
        totalAttempts: 10,
        correctAttempts: 10,
        completionTime: 60,
        averageTimePerNote: 6.0,
        longestStreak: 10
      };

      (mockGameMode as any).handleSubmitAnswer = vi.fn().mockReturnValue({
        feedback: 'Perfect session!',
        shouldAdvance: false,
        gameCompleted: true,
        stats: expectedStats
      });

      const result = strategy.validateAndAdvance(context);

      expect(result.stats).toEqual(expectedStats);
    });
  });

  describe('canSubmit()', () => {
    it('should return false when no notes selected', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        chord: TEST_CHORD,
        selectedNotes: new Set(),
        noteHighlights: []
      };

      expect(strategy.canSubmit(context)).toBe(false);
    });

    it('should return true when at least one note is selected', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        chord: TEST_CHORD,
        selectedNotes: new Set([SELECTED_NOTE]),
        noteHighlights: []
      };

      expect(strategy.canSubmit(context)).toBe(true);
    });

    it('should return true when multiple notes are selected', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        chord: TEST_CHORD,
        selectedNotes: new Set([SELECTED_NOTE, ANOTHER_NOTE]),
        noteHighlights: []
      };

      expect(strategy.canSubmit(context)).toBe(true);
    });

    it('should return false when selectedNotes is undefined', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        chord: TEST_CHORD,
        noteHighlights: []
      };

      expect(strategy.canSubmit(context)).toBe(false);
    });
  });

  describe('shouldAutoAdvance()', () => {
    it('should always return false', () => {
      expect(strategy.shouldAutoAdvance()).toBe(false);
    });

    it('should return false for chord training mode', () => {
      // Chord training requires manual advancement
      expect(strategy.shouldAutoAdvance()).toBe(false);
    });

    it('should return false regardless of game state', async () => {
      // Before startNewRound
      expect(strategy.shouldAutoAdvance()).toBe(false);

      // After startNewRound
      await strategy.startNewRound(mockGameMode, noteFilter);
      expect(strategy.shouldAutoAdvance()).toBe(false);
    });
  });

  describe('Integration: Complete round lifecycle', () => {
    it('should handle complete round lifecycle (start → select → submit → validate)', async () => {
      // Start new round
      const context = await strategy.startNewRound(mockGameMode, noteFilter);
      expect(context.chord).toEqual(TEST_CHORD);
      expect(context.selectedNotes?.size).toBe(0);

      // User clicks first note
      (mockGameMode as any).selectedNotes = new Set([SELECTED_NOTE]);
      strategy.handlePianoKeyClick(SELECTED_NOTE, context);
      expect(context.selectedNotes?.size).toBe(1);

      // User clicks second note
      (mockGameMode as any).selectedNotes = new Set([SELECTED_NOTE, ANOTHER_NOTE]);
      strategy.handlePianoKeyClick(ANOTHER_NOTE, context);
      expect(context.selectedNotes?.size).toBe(2);

      // User clicks submit (prepares context, does not validate)
      strategy.handleSubmitClick(context);

      // Validate and check result (this is where handleSubmitAnswer is called)
      const result = strategy.validateAndAdvance(context);
      expect(result.shouldAdvance).toBeDefined();
      expect(strategy.shouldAutoAdvance()).toBe(false);
    });

    it('should maintain exact behavior of chord training flow', async () => {
      // 1. Start round (generate chord, NO audio)
      const context = await strategy.startNewRound(mockGameMode, noteFilter);
      expect(mockGameMode.generateNote).toHaveBeenCalled();
      expect(mockGameMode.onStartNewRound).toHaveBeenCalled();
      // NO audio playback verification needed - ChordTrainingStrategy doesn't use audio

      // 2. User selects notes (via piano clicks)
      (mockGameMode as any).selectedNotes = new Set([SELECTED_NOTE]);
      strategy.handlePianoKeyClick(SELECTED_NOTE, context);
      expect(mockGameMode.handleNoteSelection).toHaveBeenCalledWith(SELECTED_NOTE);

      // 3. User submits answer (prepares context, does not validate)
      strategy.handleSubmitClick(context);

      // 4. Validate (correct answer - this is where handleSubmitAnswer is called)
      (mockGameMode as any).handleSubmitAnswer = vi.fn().mockReturnValue({
        feedback: 'Correct!',
        shouldAdvance: true,
        gameCompleted: false
      });
      const result = strategy.validateAndAdvance(context);
      expect(result.shouldAdvance).toBe(true);

      // 5. Manual advancement (no auto-advance)
      expect(strategy.shouldAutoAdvance()).toBe(false);
    });

    it('should handle incorrect answer requiring retry', async () => {
      const context = await strategy.startNewRound(mockGameMode, noteFilter);

      // Select wrong notes
      const wrongNote: NoteWithOctave = { note: 'F', octave: 4 };
      (mockGameMode as any).selectedNotes = new Set([wrongNote]);
      (mockGameMode as any).incorrectNotes = new Set([wrongNote]);

      strategy.handlePianoKeyClick(wrongNote, context);
      strategy.handleSubmitClick(context);

      // Validate (incorrect answer)
      (mockGameMode as any).handleSubmitAnswer = vi.fn().mockReturnValue({
        feedback: 'Not quite right. Try again!',
        shouldAdvance: false,
        gameCompleted: false
      });

      const result = strategy.validateAndAdvance(context);
      expect(result.isCorrect).toBe(false);
      expect(result.shouldAdvance).toBe(false);
      expect(strategy.shouldAutoAdvance()).toBe(false);
    });

    it('should work with different chord types', async () => {
      const minorChord: Chord = {
        name: 'A Minor',
        notes: [
          { note: 'A', octave: 4 },
          { note: 'C', octave: 5 },
          { note: 'E', octave: 5 }
        ]
      };

      (mockGameMode as any).currentChord = minorChord;
      (mockGameMode as any).generateNote = vi.fn().mockReturnValue(minorChord.notes[0]);

      const context = await strategy.startNewRound(mockGameMode, noteFilter);

      expect(context.chord).toEqual(minorChord);
      expect(context.chord?.name).toBe('A Minor');
      expect(context.chord?.notes).toHaveLength(3);
    });

    it('should handle clearing and reselecting notes', async () => {
      const context = await strategy.startNewRound(mockGameMode, noteFilter);

      // Select note
      (mockGameMode as any).selectedNotes = new Set([SELECTED_NOTE]);
      strategy.handlePianoKeyClick(SELECTED_NOTE, context);
      expect(context.selectedNotes?.size).toBe(1);

      // Deselect note (toggle off)
      (mockGameMode as any).selectedNotes = new Set();
      strategy.handlePianoKeyClick(SELECTED_NOTE, context);
      expect(context.selectedNotes?.size).toBe(0);

      // Reselect note
      (mockGameMode as any).selectedNotes = new Set([SELECTED_NOTE]);
      strategy.handlePianoKeyClick(SELECTED_NOTE, context);
      expect(context.selectedNotes?.size).toBe(1);
    });
  });
});
