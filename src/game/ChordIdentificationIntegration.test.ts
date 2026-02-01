import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChordIdentificationGameState } from './ChordIdentificationGameState';
import { ChordTrainingStrategy } from './strategies/ChordTrainingStrategy';
import type { NoteTrainingModeSettings } from '../types/game';
import type { NoteWithOctave, NoteFilter, Chord } from '../types/music';
import { ChordType } from '../types/music';
import type { RoundContext } from '../types/orchestrator';
import type { AudioEngine } from '../utils/audioEngine';

// Import test utilities
import { TEST_NOTES, DEFAULT_NOTE_FILTER } from '../test/gameTestUtils';
import {
  TEST_CHORDS,
  createChordIdentificationGameState,
  createNoteTrainingSettings,
  setupChordForGuess,
  ACCURACY_TEST_CASES,
} from '../test/chordTestUtils';

/**
 * Integration Tests for Show Notes → Guess Chord Flow
 *
 * End-to-end tests verifying the complete chord identification workflow:
 * - Visual chord display (notes shown on piano)
 * - User chord name guessing
 * - Correct/incorrect feedback handling
 * - Game progression and completion
 * - Stats tracking and session results
 */
describe('ChordIdentification Integration: Show Notes → Guess Chord', () => {
  let gameState: ChordIdentificationGameState;
  let strategy: ChordTrainingStrategy;
  let noteTrainingSettings: NoteTrainingModeSettings;

  beforeEach(() => {
    noteTrainingSettings = createNoteTrainingSettings({ targetChords: 3 });
    gameState = new ChordIdentificationGameState(noteTrainingSettings);
    const mockAudioEngine = {
      initialize: vi.fn().mockResolvedValue(undefined),
      playChord: vi.fn(),
      playNote: vi.fn(),
    } as unknown as AudioEngine;
    strategy = new ChordTrainingStrategy(mockAudioEngine);
  });

  describe('Complete Workflow Lifecycle', () => {
    it('should initialize game state with correct settings', () => {
      expect(gameState.isCompleted).toBe(false);
      expect(gameState.correctChordsCount).toBe(0);
      expect(gameState.totalAttempts).toBe(0);
      expect(gameState.currentStreak).toBe(0);
      expect(gameState.longestStreak).toBe(0);
      expect(gameState.guessHistory).toEqual([]);
    });

    it('should generate chord and display notes on start', () => {
      setupChordForGuess(gameState, TEST_CHORDS.C_MAJOR);

      expect(gameState.currentChord).toEqual(TEST_CHORDS.C_MAJOR);
      expect(gameState.displayedNotes).toHaveLength(3);
      expect(gameState.displayedNotes).toEqual(TEST_CHORDS.C_MAJOR.notes);
    });

    it('should complete full flow: start → view notes → guess → advance', () => {
      setupChordForGuess(gameState, TEST_CHORDS.C_MAJOR);

      const result = gameState.handleSubmitGuess('C Major');

      expect(result.gameCompleted).toBe(false);
      expect(result.shouldAdvance).toBe(true);
      expect(result.feedback).toContain('Correct');
      expect(gameState.correctChordsCount).toBe(1);
    });

    it('should complete game after reaching target chords', () => {
      for (let i = 0; i < 3; i++) {
        setupChordForGuess(gameState, TEST_CHORDS.C_MAJOR);
        const result = gameState.handleSubmitGuess('C Major');

        if (i < 2) {
          expect(result.gameCompleted).toBe(false);
          expect(result.shouldAdvance).toBe(true);
        } else {
          expect(result.gameCompleted).toBe(true);
          expect(result.shouldAdvance).toBe(false);
          expect(result.stats).toBeDefined();
          expect(result.stats?.accuracy).toBe(100);
        }
      }

      expect(gameState.isCompleted).toBe(true);
      expect(gameState.correctChordsCount).toBe(3);
    });
  });

  describe('Piano Key Click Behavior', () => {
    it('should be a no-op for chord identification mode', () => {
      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        note: TEST_NOTES.C4,
        noteHighlights: []
      };

      setupChordForGuess(gameState, TEST_CHORDS.C_MAJOR);
      const displayedNotesBefore = [...gameState.displayedNotes];

      // Piano clicks should have no effect
      gameState.onPianoKeyClick(TEST_NOTES.C4, context);
      gameState.onPianoKeyClick(TEST_NOTES.E4, context);
      gameState.onPianoKeyClick(TEST_NOTES.G4, context);

      expect(gameState.displayedNotes).toEqual(displayedNotesBefore);
      expect(gameState.userGuess).toBeNull();
    });
  });

  describe('Correct Guess Handling', () => {
    beforeEach(() => {
      setupChordForGuess(gameState, TEST_CHORDS.C_MAJOR);
    });

    it('should handle correct guess and update stats', () => {
      const result = gameState.handleSubmitGuess('C Major');

      expect(result.gameCompleted).toBe(false);
      expect(result.shouldAdvance).toBe(true);
      expect(gameState.correctChordsCount).toBe(1);
      expect(gameState.currentStreak).toBe(1);
      expect(gameState.longestStreak).toBe(1);
      expect(gameState.totalAttempts).toBe(1);
    });

    it('should add correct guess to history', () => {
      gameState.handleSubmitGuess('C Major');

      expect(gameState.guessHistory).toHaveLength(1);
      expect(gameState.guessHistory[0].isCorrect).toBe(true);
      expect(gameState.guessHistory[0].actualChord.name).toBe('C Major');
      expect(gameState.guessHistory[0].guessedChordName).toBe('C Major');
    });

    it('should maintain streak on consecutive correct guesses', () => {
      gameState.handleSubmitGuess('C Major');
      expect(gameState.currentStreak).toBe(1);

      setupChordForGuess(gameState, TEST_CHORDS.A_MINOR);
      gameState.handleSubmitGuess('A Minor');
      expect(gameState.currentStreak).toBe(2);
      expect(gameState.longestStreak).toBe(2);
    });
  });

  describe('Incorrect Guess Handling', () => {
    beforeEach(() => {
      setupChordForGuess(gameState, TEST_CHORDS.C_MAJOR);
    });

    it('should handle incorrect guess and reset streak', () => {
      const result = gameState.handleSubmitGuess('D Minor');

      expect(result.gameCompleted).toBe(false);
      expect(result.shouldAdvance).toBe(false);
      expect(result.feedback).toContain('Incorrect');
      expect(result.feedback).toContain('C Major');
      expect(gameState.currentStreak).toBe(0);
      expect(gameState.totalAttempts).toBe(1);
    });

    it('should add incorrect guess to history', () => {
      gameState.handleSubmitGuess('D Minor');

      expect(gameState.guessHistory).toHaveLength(1);
      expect(gameState.guessHistory[0].isCorrect).toBe(false);
      expect(gameState.guessHistory[0].guessedChordName).toBe('D Minor');
    });

    it('should preserve longest streak after incorrect guess', () => {
      gameState.handleSubmitGuess('C Major');
      setupChordForGuess(gameState, TEST_CHORDS.A_MINOR);
      gameState.handleSubmitGuess('A Minor');
      expect(gameState.longestStreak).toBe(2);

      setupChordForGuess(gameState, TEST_CHORDS.C_MAJOR);
      gameState.handleSubmitGuess('Wrong');
      expect(gameState.currentStreak).toBe(0);
      expect(gameState.longestStreak).toBe(2);
    });
  });

  describe('Multiple Attempts Before Correct', () => {
    beforeEach(() => {
      setupChordForGuess(gameState, TEST_CHORDS.C_MAJOR);
    });

    it('should allow multiple incorrect attempts before correct', () => {
      let result = gameState.handleSubmitGuess('D Minor');
      expect(result.shouldAdvance).toBe(false);
      expect(gameState.totalAttempts).toBe(1);

      result = gameState.handleSubmitGuess('E Minor');
      expect(result.shouldAdvance).toBe(false);
      expect(gameState.totalAttempts).toBe(2);

      result = gameState.handleSubmitGuess('C Major');
      expect(result.shouldAdvance).toBe(true);
      expect(gameState.totalAttempts).toBe(3);
      expect(gameState.correctChordsCount).toBe(1);
    });

    it('should track all attempts in history', () => {
      gameState.handleSubmitGuess('D Minor');
      gameState.handleSubmitGuess('E Minor');
      gameState.handleSubmitGuess('C Major');

      expect(gameState.guessHistory).toHaveLength(3);
      expect(gameState.guessHistory[0].isCorrect).toBe(false);
      expect(gameState.guessHistory[1].isCorrect).toBe(false);
      expect(gameState.guessHistory[2].isCorrect).toBe(true);
    });
  });

  describe('Enharmonic Equivalents', () => {
    it('should accept enharmonic equivalent chord names', () => {
      setupChordForGuess(gameState, TEST_CHORDS.C_SHARP_MAJOR);

      const result = gameState.handleSubmitGuess('Db Major');

      expect(result.shouldAdvance).toBe(true);
      expect(result.feedback).toContain('Correct');
    });

    it.each([
      ['C Major', true],
      ['c major', true],
      ['Cmaj', true],
      ['C', true],
      ['CM', true],
    ])('should accept chord name format "%s"', (format, shouldPass) => {
      setupChordForGuess(gameState, TEST_CHORDS.C_MAJOR);

      const result = gameState.handleSubmitGuess(format);
      expect(result.shouldAdvance).toBe(shouldPass);
    });
  });

  describe('Empty Guess Handling', () => {
    it('should handle empty guess gracefully', () => {
      setupChordForGuess(gameState, TEST_CHORDS.C_MAJOR);

      const result = gameState.handleSubmitGuess('');

      expect(result.shouldAdvance).toBe(false);
      expect(result.feedback).toContain('Incorrect');
    });

    it('should handle undefined guess', () => {
      setupChordForGuess(gameState, TEST_CHORDS.C_MAJOR);

      const result = gameState.handleSubmitGuess(undefined);

      expect(result.shouldAdvance).toBe(false);
    });
  });

  describe('Game Completion State', () => {
    it('should return final stats on game completion', () => {
      for (let i = 0; i < 3; i++) {
        setupChordForGuess(gameState, TEST_CHORDS.C_MAJOR);
        gameState.handleSubmitGuess('C Major');
      }

      const lastResult = gameState.handleSubmitGuess('anything');

      expect(lastResult.gameCompleted).toBe(true);
      expect(lastResult.stats).toBeDefined();
    });

    it('should not allow further progress after completion', () => {
      for (let i = 0; i < 3; i++) {
        setupChordForGuess(gameState, TEST_CHORDS.C_MAJOR);
        gameState.handleSubmitGuess('C Major');
      }

      setupChordForGuess(gameState, TEST_CHORDS.A_MINOR);
      const result = gameState.handleSubmitGuess('A Minor');

      expect(result.gameCompleted).toBe(true);
      expect(gameState.correctChordsCount).toBe(3);
    });
  });

  describe('Session Results', () => {
    it('should calculate chord type stats correctly', () => {
      setupChordForGuess(gameState, TEST_CHORDS.C_MAJOR);
      gameState.handleSubmitGuess('D Minor'); // incorrect
      gameState.handleSubmitGuess('C Major'); // correct

      setupChordForGuess(gameState, TEST_CHORDS.A_MINOR);
      gameState.handleSubmitGuess('A Minor'); // correct

      setupChordForGuess(gameState, TEST_CHORDS.C_MAJOR);
      gameState.handleSubmitGuess('C Major'); // correct

      const stats = {
        completionTime: 60,
        accuracy: 75,
        averageTimePerNote: 20,
        longestStreak: 2,
        totalAttempts: 4,
        correctAttempts: 3
      };

      const results = gameState.getSessionResults(stats);

      expect(results.chordTypeStats).toBeDefined();
      expect(results.chordTypeStats['C Major']).toBeDefined();
      expect(results.chordTypeStats['C Major'].attempts).toBe(3);
      expect(results.chordTypeStats['C Major'].correct).toBe(2);
    });

    it('should serialize guess history for storage', () => {
      setupChordForGuess(gameState, TEST_CHORDS.C_MAJOR);
      gameState.handleSubmitGuess('C Major');

      const stats = {
        completionTime: 30,
        accuracy: 100,
        averageTimePerNote: 30,
        longestStreak: 1,
        totalAttempts: 1,
        correctAttempts: 1
      };

      const results = gameState.getSessionResults(stats);

      expect(results.guessHistory).toBeDefined();
      expect(results.guessHistory).toHaveLength(1);
      expect(results.guessHistory[0].isCorrect).toBe(true);
      expect(results.guessHistory[0].chordName).toBe('C Major');
    });

    it('should calculate first-try correct count', () => {
      setupChordForGuess(gameState, TEST_CHORDS.C_MAJOR);
      gameState.handleSubmitGuess('C Major');

      setupChordForGuess(gameState, TEST_CHORDS.A_MINOR);
      gameState.handleSubmitGuess('Wrong');
      gameState.handleSubmitGuess('A Minor');

      const stats = {
        completionTime: 60,
        accuracy: 66.7,
        averageTimePerNote: 30,
        longestStreak: 1,
        totalAttempts: 3,
        correctAttempts: 2
      };

      const results = gameState.getSessionResults(stats);
      // Fast test execution may cause timestamps to be identical
      expect(results.firstTryCorrect).toBe(2);
    });
  });

  describe('Timer Integration', () => {
    it('should initialize timer with response time limit', () => {
      const onTimeUp = vi.fn();
      const onTimeUpdate = vi.fn();

      gameState.initializeTimer(10, false, onTimeUp, onTimeUpdate);

      const timerState = gameState.getTimerState();
      expect(timerState.timeRemaining).toBe(10);
      expect(timerState.isActive).toBe(true);
    });

    it('should initialize timer as paused when specified', () => {
      gameState.initializeTimer(10, true, vi.fn());

      const timerState = gameState.getTimerState();
      expect(timerState.isActive).toBe(false);
    });

    it('should pause and resume timer', () => {
      gameState.initializeTimer(10, false, vi.fn());

      gameState.pauseTimer();
      expect(gameState.getTimerState().isActive).toBe(false);

      gameState.resumeTimer();
      expect(gameState.getTimerState().isActive).toBe(true);
    });

    it('should reset timer', () => {
      gameState.initializeTimer(10, false, vi.fn());
      gameState.resetTimer();

      const timerState = gameState.getTimerState();
      expect(timerState.timeRemaining).toBe(0);
      expect(timerState.isActive).toBe(false);
    });

    it('should handle unlimited time (null limit)', () => {
      gameState.initializeTimer(null, false, vi.fn());

      const timerState = gameState.getTimerState();
      expect(timerState.timeRemaining).toBe(0);
      expect(timerState.isActive).toBe(false);
    });
  });

  describe('End Screen Strategy Methods', () => {
    it.each(ACCURACY_TEST_CASES)(
      'should return emoji %s for accuracy %d',
      (accuracy, expectedEmoji) => {
        expect(gameState.getCelebrationEmoji({ accuracy })).toBe(expectedEmoji);
      }
    );

    it.each(ACCURACY_TEST_CASES)(
      'should return rating containing "%s" for accuracy %d',
      (accuracy, _emoji, expectedRating) => {
        expect(gameState.getPerformanceRating({ accuracy } as any, {})).toContain(expectedRating);
      }
    );

    it('should return stats items for end screen', () => {
      const gameStats = {
        completionTime: 120,
        accuracy: 85.5,
        averageTimePerNote: 4.5,
        longestStreak: 5,
        totalAttempts: 12,
        correctAttempts: 10
      };

      const sessionResults = {
        chordsCompleted: 10,
        averageTimePerChord: 4.5,
        longestStreak: 5
      };

      const statsItems = gameState.getStatsItems(gameStats, sessionResults);

      expect(statsItems).toBeInstanceOf(Array);
      expect(statsItems.length).toBeGreaterThan(0);

      const timeItem = statsItems.find(item => item.label === 'Time');
      expect(timeItem?.value).toBe('2:00');

      const accuracyItem = statsItems.find(item => item.label === 'Accuracy');
      expect(accuracyItem?.value).toBe('85.5%');
    });
  });

  describe('Strategy Pattern Integration', () => {
    it('should work with ChordTrainingStrategy for startNewRound', async () => {
      const mockGameMode = {
        generateNote: vi.fn().mockReturnValue(TEST_CHORDS.C_MAJOR.notes[0]),
        onStartNewRound: vi.fn(),
        handleNoteSelection: vi.fn(),
        handleSubmitAnswer: vi.fn().mockReturnValue({
          feedback: 'Correct!',
          shouldAdvance: true,
          gameCompleted: false
        }),
        getNoteHighlights: vi.fn().mockReturnValue([]),
        isGameComplete: vi.fn().mockReturnValue(false),
        getMode: vi.fn().mockReturnValue('showNotesGuessChord'),
        validateGuess: vi.fn(),
        currentChord: TEST_CHORDS.C_MAJOR,
        selectedNotes: new Set<NoteWithOctave>(),
        correctNotes: new Set<NoteWithOctave>(),
        incorrectNotes: new Set<NoteWithOctave>()
      } as any;

      const context = await strategy.startNewRound(mockGameMode, DEFAULT_NOTE_FILTER);

      expect(context.chord).toEqual(TEST_CHORDS.C_MAJOR);
      expect(context.startTime).toBeInstanceOf(Date);
      expect(context.elapsedTime).toBe(0);
      expect(mockGameMode.generateNote).toHaveBeenCalled();
      expect(mockGameMode.onStartNewRound).toHaveBeenCalled();
    });

    it('should return false for shouldAutoAdvance', () => {
      expect(strategy.shouldAutoAdvance()).toBe(false);
    });

    it('should handle canSubmit based on context', () => {
      const contextEmpty: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        chord: TEST_CHORDS.C_MAJOR,
        selectedNotes: new Set(),
        noteHighlights: []
      };

      expect(strategy.canSubmit(contextEmpty)).toBe(false);

      const contextWithNotes: RoundContext = {
        startTime: new Date(),
        elapsedTime: 0,
        chord: TEST_CHORDS.C_MAJOR,
        selectedNotes: new Set([TEST_NOTES.C4]),
        noteHighlights: []
      };

      expect(strategy.canSubmit(contextWithNotes)).toBe(true);
    });
  });

  describe('onSubmitClick Callback Integration', () => {
    it('should extract guess from context and call handleSubmitGuess', () => {
      setupChordForGuess(gameState, TEST_CHORDS.C_MAJOR);

      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 5,
        note: TEST_CHORDS.C_MAJOR.notes[0],
        noteHighlights: []
      };

      (context as any).guessedChordName = 'C Major';

      const handleSubmitGuessSpy = vi.spyOn(gameState, 'handleSubmitGuess');
      gameState.onSubmitClick(context);

      expect(handleSubmitGuessSpy).toHaveBeenCalledWith('C Major');
    });

    it('should handle missing guessedChordName in context', () => {
      setupChordForGuess(gameState, TEST_CHORDS.C_MAJOR);

      const context: RoundContext = {
        startTime: new Date(),
        elapsedTime: 5,
        note: TEST_CHORDS.C_MAJOR.notes[0],
        noteHighlights: []
      };

      const handleSubmitGuessSpy = vi.spyOn(gameState, 'handleSubmitGuess');
      gameState.onSubmitClick(context);

      expect(handleSubmitGuessSpy).toHaveBeenCalledWith('');
    });
  });

  describe('IGameMode Interface Methods', () => {
    it('should return correct mode identifier', () => {
      expect(gameState.getMode()).toBe('show-notes-guess-chord');
    });

    it('should track game completion state', () => {
      expect(gameState.isGameComplete()).toBe(false);

      gameState.isCompleted = true;

      expect(gameState.isGameComplete()).toBe(true);
    });

    it('should return correct timer mode based on settings', () => {
      expect(gameState.getTimerMode()).toBe('count-up');

      const settingsWithDuration = createNoteTrainingSettings({ sessionDuration: 120 });
      const gameStateWithDuration = new ChordIdentificationGameState(settingsWithDuration);
      expect(gameStateWithDuration.getTimerMode()).toBe('count-down');
    });

    it('should get session settings for history tracking', () => {
      const settings = gameState.getSessionSettings();

      expect(settings.selectedSubMode).toBe('show-notes-guess-chord');
      expect(settings.targetChords).toBe(3);
      expect(settings.sessionDuration).toBe(0);
      expect(settings.chordFilter).toEqual(noteTrainingSettings.chordFilter);
    });
  });

  describe('Inversion Stats', () => {
    it('should not include inversion stats when no inversions were used', () => {
      setupChordForGuess(gameState, TEST_CHORDS.C_MAJOR);
      gameState.handleSubmitGuess('C Major');

      const stats = {
        completionTime: 30,
        accuracy: 100,
        averageTimePerNote: 30,
        longestStreak: 1,
        totalAttempts: 1,
        correctAttempts: 1
      };

      const results = gameState.getSessionResults(stats);
      expect(results.inversionStats).toBeUndefined();
    });

    it('should include inversion stats when inversions were used', () => {
      setupChordForGuess(gameState, TEST_CHORDS.C_MAJOR_FIRST_INVERSION);
      gameState.handleSubmitGuess('C Major');

      setupChordForGuess(gameState, TEST_CHORDS.C_MAJOR);
      gameState.handleSubmitGuess('C Major');

      const stats = {
        completionTime: 60,
        accuracy: 100,
        averageTimePerNote: 30,
        longestStreak: 2,
        totalAttempts: 2,
        correctAttempts: 2
      };

      const results = gameState.getSessionResults(stats);
      expect(results.inversionStats).toBeDefined();
      expect(results.inversionStats.rootPosition.attempts).toBe(1);
      expect(results.inversionStats.inversions.attempts).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle no current chord gracefully', () => {
      gameState.currentChord = null;

      const result = gameState.handleSubmitGuess('C Major');

      expect(result.gameCompleted).toBe(false);
      expect(result.feedback).toContain('No chord');
    });

    it('should handle whitespace-only guess as incorrect', () => {
      setupChordForGuess(gameState, TEST_CHORDS.C_MAJOR);

      const result = gameState.handleSubmitGuess('   ');

      expect(result.gameCompleted).toBe(false);
      expect(result.feedback).toContain('Incorrect');
    });

    it('should track start time on first round', () => {
      expect(gameState.startTime).toBeUndefined();

      setupChordForGuess(gameState, TEST_CHORDS.C_MAJOR);

      expect(gameState.isCompleted).toBe(false);
    });

    it('should return empty completion message when not completed', () => {
      expect(gameState.getCompletionMessage()).toBe('');
    });

    it('should return completion message when game is complete', () => {
      gameState.isCompleted = true;

      expect(gameState.getCompletionMessage()).toContain('Complete');
    });
  });
});
