import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EarTrainingStrategy } from './EarTrainingStrategy';
import type { IGameMode } from '../IGameMode';
import type { AudioEngine } from '../../utils/audioEngine';
import type { NoteFilter, NoteWithOctave, NoteDuration } from '../../types/music';
import type { RoundContext } from '../../types/orchestrator';

/**
 * EarTrainingStrategy Unit Tests
 *
 * Comprehensive test suite ensuring 100% coverage of the EarTrainingStrategy
 * implementation. Tests verify that ear training logic is correctly extracted
 * from GameOrchestrator and maintains exact behavior.
 */
describe('EarTrainingStrategy', () => {
  let strategy: EarTrainingStrategy;
  let mockGameMode: IGameMode;
  let mockAudioEngine: AudioEngine;
  let noteFilter: NoteFilter;

  const TEST_NOTE: NoteWithOctave = { note: 'C', octave: 4 };
  const GUESSED_NOTE: NoteWithOctave = { note: 'D', octave: 4 };
  const NOTE_DURATION: NoteDuration = '4n';

  beforeEach(() => {
    // Create mock game mode
    mockGameMode = {
      generateNote: vi.fn().mockReturnValue(TEST_NOTE),
      validateGuess: vi.fn().mockReturnValue(true),
      onStartNewRound: vi.fn(),
      handleCorrectGuess: vi.fn().mockReturnValue({
        feedback: 'Correct!',
        shouldAdvance: true,
        gameCompleted: false
      }),
      handleIncorrectGuess: vi.fn().mockReturnValue({
        feedback: 'Incorrect',
        shouldAdvance: false,
        gameCompleted: false
      }),
      isGameComplete: vi.fn().mockReturnValue(false),
      getMode: vi.fn().mockReturnValue('sandbox')
    } as any;

    // Create mock audio engine
    mockAudioEngine = {
      playNote: vi.fn().mockResolvedValue(undefined)
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
    strategy = new EarTrainingStrategy(mockAudioEngine, NOTE_DURATION);
  });

  describe('startNewRound()', () => {
    it('should generate a note using gameMode.generateNote()', async () => {
      await strategy.startNewRound(mockGameMode, noteFilter);

      expect(mockGameMode.generateNote).toHaveBeenCalledWith(noteFilter);
      expect(mockGameMode.generateNote).toHaveBeenCalledTimes(1);
    });

    it('should call gameMode.onStartNewRound()', async () => {
      await strategy.startNewRound(mockGameMode, noteFilter);

      expect(mockGameMode.onStartNewRound).toHaveBeenCalled();
      expect(mockGameMode.onStartNewRound).toHaveBeenCalledTimes(1);
    });

    it('should play the note using audioEngine', async () => {
      await strategy.startNewRound(mockGameMode, noteFilter);

      expect(mockAudioEngine.playNote).toHaveBeenCalledWith(TEST_NOTE, NOTE_DURATION);
      expect(mockAudioEngine.playNote).toHaveBeenCalledTimes(1);
    });

    it('should return RoundContext with correct structure', async () => {
      const context = await strategy.startNewRound(mockGameMode, noteFilter);

      expect(context).toMatchObject({
        startTime: expect.any(Date),
        elapsedTime: 0,
        note: TEST_NOTE,
        noteHighlights: []
      });
    });

    it('should set note field in context', async () => {
      const context = await strategy.startNewRound(mockGameMode, noteFilter);

      expect(context.note).toEqual(TEST_NOTE);
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

      // Verify by calling validateAndAdvance which requires stored gameMode
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE,
        noteHighlights: []
      };
      (context as any).guessedNote = GUESSED_NOTE;

      expect(() => strategy.validateAndAdvance(context)).not.toThrow();
    });
  });

  describe('handlePianoKeyClick()', () => {
    it('should store clicked note in context', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE,
        noteHighlights: []
      };

      strategy.handlePianoKeyClick(GUESSED_NOTE, context);

      expect((context as any).guessedNote).toEqual(GUESSED_NOTE);
    });

    it('should handle different notes', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE,
        noteHighlights: []
      };

      const differentNote: NoteWithOctave = { note: 'G', octave: 5 };
      strategy.handlePianoKeyClick(differentNote, context);

      expect((context as any).guessedNote).toEqual(differentNote);
    });

    it('should not modify the actual note in context', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE,
        noteHighlights: []
      };

      strategy.handlePianoKeyClick(GUESSED_NOTE, context);

      expect(context.note).toEqual(TEST_NOTE);
    });
  });

  describe('validateAndAdvance()', () => {
    beforeEach(async () => {
      // Initialize strategy with gameMode
      await strategy.startNewRound(mockGameMode, noteFilter);
    });

    it('should throw error if game mode not initialized', () => {
      const freshStrategy = new EarTrainingStrategy(mockAudioEngine, NOTE_DURATION);
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE,
        noteHighlights: []
      };

      expect(() => freshStrategy.validateAndAdvance(context)).toThrow(
        'Game mode not initialized. Call startNewRound first.'
      );
    });

    it('should throw error if no actual note in context', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        noteHighlights: []
      };
      (context as any).guessedNote = GUESSED_NOTE;

      expect(() => strategy.validateAndAdvance(context)).toThrow(
        'No actual note in context. Call startNewRound first.'
      );
    });

    it('should return error result if no guess provided', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE,
        noteHighlights: []
      };

      const result = strategy.validateAndAdvance(context);

      expect(result).toEqual({
        isCorrect: false,
        feedback: 'No guess provided',
        shouldAdvance: false,
        gameCompleted: false
      });
    });

    it('should validate correct guess', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE,
        noteHighlights: []
      };
      (context as any).guessedNote = GUESSED_NOTE;

      mockGameMode.validateGuess = vi.fn().mockReturnValue(true);

      strategy.validateAndAdvance(context);

      expect(mockGameMode.validateGuess).toHaveBeenCalledWith(GUESSED_NOTE, TEST_NOTE);
    });

    it('should validate incorrect guess', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE,
        noteHighlights: []
      };
      (context as any).guessedNote = GUESSED_NOTE;

      mockGameMode.validateGuess = vi.fn().mockReturnValue(false);

      strategy.validateAndAdvance(context);

      expect(mockGameMode.validateGuess).toHaveBeenCalledWith(GUESSED_NOTE, TEST_NOTE);
    });

    it('should call gameMode.handleCorrectGuess() for correct answers', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE,
        noteHighlights: []
      };
      (context as any).guessedNote = GUESSED_NOTE;

      mockGameMode.validateGuess = vi.fn().mockReturnValue(true);

      strategy.validateAndAdvance(context);

      expect(mockGameMode.handleCorrectGuess).toHaveBeenCalled();
      expect(mockGameMode.handleIncorrectGuess).not.toHaveBeenCalled();
    });

    it('should call gameMode.handleIncorrectGuess() for wrong answers', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE,
        noteHighlights: []
      };
      (context as any).guessedNote = GUESSED_NOTE;

      mockGameMode.validateGuess = vi.fn().mockReturnValue(false);

      strategy.validateAndAdvance(context);

      expect(mockGameMode.handleIncorrectGuess).toHaveBeenCalled();
      expect(mockGameMode.handleCorrectGuess).not.toHaveBeenCalled();
    });

    it('should return GuessResult with all required fields for correct guess', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE,
        noteHighlights: []
      };
      (context as any).guessedNote = GUESSED_NOTE;

      mockGameMode.validateGuess = vi.fn().mockReturnValue(true);
      mockGameMode.handleCorrectGuess = vi.fn().mockReturnValue({
        feedback: 'Correct!',
        shouldAdvance: true,
        gameCompleted: false
      });

      const result = strategy.validateAndAdvance(context);

      expect(result).toEqual({
        isCorrect: true,
        feedback: 'Correct!',
        shouldAdvance: true,
        gameCompleted: false,
        stats: undefined
      });
    });

    it('should return GuessResult with all required fields for incorrect guess', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE,
        noteHighlights: []
      };
      (context as any).guessedNote = GUESSED_NOTE;

      mockGameMode.validateGuess = vi.fn().mockReturnValue(false);
      mockGameMode.handleIncorrectGuess = vi.fn().mockReturnValue({
        feedback: 'Try again',
        shouldAdvance: false,
        gameCompleted: false
      });

      const result = strategy.validateAndAdvance(context);

      expect(result).toEqual({
        isCorrect: false,
        feedback: 'Try again',
        shouldAdvance: false,
        gameCompleted: false,
        stats: undefined
      });
    });

    it('should handle game completion state', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE,
        noteHighlights: []
      };
      (context as any).guessedNote = GUESSED_NOTE;

      mockGameMode.validateGuess = vi.fn().mockReturnValue(true);
      mockGameMode.handleCorrectGuess = vi.fn().mockReturnValue({
        feedback: 'Game Complete!',
        shouldAdvance: false,
        gameCompleted: true,
        stats: {
          accuracy: 100,
          totalAttempts: 10,
          correctAttempts: 10
        }
      });

      const result = strategy.validateAndAdvance(context);

      expect(result.gameCompleted).toBe(true);
      expect(result.stats).toBeDefined();
    });

    it('should handle stats when game completes', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE,
        noteHighlights: []
      };
      (context as any).guessedNote = GUESSED_NOTE;

      const expectedStats = {
        accuracy: 85.5,
        totalAttempts: 20,
        correctAttempts: 17,
        completionTime: 120
      };

      mockGameMode.validateGuess = vi.fn().mockReturnValue(true);
      mockGameMode.handleCorrectGuess = vi.fn().mockReturnValue({
        feedback: 'Complete',
        shouldAdvance: false,
        gameCompleted: true,
        stats: expectedStats
      });

      const result = strategy.validateAndAdvance(context);

      expect(result.stats).toEqual(expectedStats);
    });
  });

  describe('canSubmit()', () => {
    it('should always return true', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE,
        noteHighlights: []
      };

      expect(strategy.canSubmit(context)).toBe(true);
    });

    it('should return true even with no guess', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE,
        noteHighlights: []
      };

      expect(strategy.canSubmit(context)).toBe(true);
    });

    it('should return true with guessed note', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTE,
        noteHighlights: []
      };
      (context as any).guessedNote = GUESSED_NOTE;

      expect(strategy.canSubmit(context)).toBe(true);
    });
  });

  describe('shouldAutoAdvance()', () => {
    it('should always return true', () => {
      expect(strategy.shouldAutoAdvance()).toBe(true);
    });

    it('should return true for ear training mode', () => {
      // Ear training always auto-advances after correct guess
      expect(strategy.shouldAutoAdvance()).toBe(true);
    });
  });

  describe('Integration: Complete round lifecycle', () => {
    it('should handle complete round lifecycle (start → guess → validate → advance)', async () => {
      // Start new round
      const context = await strategy.startNewRound(mockGameMode, noteFilter);
      expect(context.note).toEqual(TEST_NOTE);

      // User clicks piano key
      strategy.handlePianoKeyClick(GUESSED_NOTE, context);
      expect((context as any).guessedNote).toEqual(GUESSED_NOTE);

      // Validate and advance
      mockGameMode.validateGuess = vi.fn().mockReturnValue(true);
      const result = strategy.validateAndAdvance(context);

      expect(result.isCorrect).toBe(true);
      expect(result.shouldAdvance).toBe(true);
      expect(strategy.shouldAutoAdvance()).toBe(true);
    });

    it('should maintain exact behavior of current ear training flow', async () => {
      // This test verifies the strategy maintains the same behavior as GameOrchestrator

      // 1. Start round (generate note, play audio)
      const context = await strategy.startNewRound(mockGameMode, noteFilter);
      expect(mockGameMode.generateNote).toHaveBeenCalled();
      expect(mockGameMode.onStartNewRound).toHaveBeenCalled();
      expect(mockAudioEngine.playNote).toHaveBeenCalledWith(TEST_NOTE, NOTE_DURATION);

      // 2. User clicks note (auto-submit)
      strategy.handlePianoKeyClick(TEST_NOTE, context);
      expect((context as any).guessedNote).toEqual(TEST_NOTE);

      // 3. Validate (correct guess)
      mockGameMode.validateGuess = vi.fn().mockReturnValue(true);
      const result = strategy.validateAndAdvance(context);

      expect(mockGameMode.validateGuess).toHaveBeenCalledWith(TEST_NOTE, TEST_NOTE);
      expect(mockGameMode.handleCorrectGuess).toHaveBeenCalled();
      expect(result.shouldAdvance).toBe(true);

      // 4. Should auto-advance
      expect(strategy.shouldAutoAdvance()).toBe(true);
    });

    it('should work with mock IGameMode instance', async () => {
      const customGameMode = {
        generateNote: vi.fn().mockReturnValue({ note: 'E', octave: 5 }),
        onStartNewRound: vi.fn(),
        validateGuess: vi.fn().mockReturnValue(false),
        handleCorrectGuess: vi.fn(),
        handleIncorrectGuess: vi.fn().mockReturnValue({
          feedback: 'Wrong note!',
          shouldAdvance: false,
          gameCompleted: false
        })
      } as any;

      const context = await strategy.startNewRound(customGameMode, noteFilter);

      expect(context.note).toEqual({ note: 'E', octave: 5 });
      expect(customGameMode.generateNote).toHaveBeenCalled();
      expect(customGameMode.onStartNewRound).toHaveBeenCalled();
    });
  });
});
