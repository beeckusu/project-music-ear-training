import { describe, it, expect } from 'vitest';
import {
  aggregateByChordType,
  aggregateByRootNote,
  getMostDifficultChords,
  getMostDifficultRoots,
  sortByAccuracyAsc
} from './chordStatistics';
import type { ChordGuessAttempt } from '../types/game';
import type { Chord } from '../types/music';
import { ChordType } from '../types/music';

// Helper to create mock chord
function createMockChord(root: 'C' | 'D' | 'E' | 'F' | 'G', type: typeof ChordType[keyof typeof ChordType]): Chord {
  return {
    name: `${root} ${type}`,
    root,
    type,
    notes: [{ note: root, octave: 4 }]
  };
}

// Helper to create mock guess attempt (Chord Training mode)
function createTrainingAttempt(
  root: 'C' | 'D' | 'E' | 'F' | 'G',
  type: typeof ChordType[keyof typeof ChordType],
  accuracy: number,
  isCorrect: boolean
): ChordGuessAttempt {
  return {
    id: Math.random().toString(),
    timestamp: new Date(),
    actualChord: createMockChord(root, type),
    isCorrect,
    accuracy,
    correctNotes: [],
    missedNotes: [],
    incorrectNotes: []
  };
}

// Helper to create mock guess attempt (Chord Identification mode)
function createIdentificationAttempt(
  root: 'C' | 'D' | 'E' | 'F' | 'G',
  type: typeof ChordType[keyof typeof ChordType],
  isCorrect: boolean
): ChordGuessAttempt {
  return {
    id: Math.random().toString(),
    timestamp: new Date(),
    actualChord: createMockChord(root, type),
    isCorrect,
    guessedChordName: `${root} ${type}`
  };
}

describe('chordStatistics', () => {
  describe('aggregateByChordType', () => {
    it('should return empty array for empty guess history', () => {
      const result = aggregateByChordType([]);
      expect(result).toEqual([]);
    });

    it('should aggregate stats for Chord Training mode (using accuracy field)', () => {
      const guessHistory: ChordGuessAttempt[] = [
        createTrainingAttempt('C', ChordType.MAJOR, 100, true),
        createTrainingAttempt('D', ChordType.MAJOR, 80, false),
        createTrainingAttempt('E', ChordType.MINOR, 60, false),
        createTrainingAttempt('F', ChordType.MINOR, 100, true)
      ];

      const result = aggregateByChordType(guessHistory);

      expect(result).toHaveLength(2);

      const majorStats = result.find(s => s.chordType === ChordType.MAJOR);
      expect(majorStats).toBeDefined();
      expect(majorStats!.totalAttempts).toBe(2);
      expect(majorStats!.correctAttempts).toBe(1);
      expect(majorStats!.accuracy).toBe(90); // (100 + 80) / 2
      expect(majorStats!.displayName).toBe('Major');

      const minorStats = result.find(s => s.chordType === ChordType.MINOR);
      expect(minorStats).toBeDefined();
      expect(minorStats!.totalAttempts).toBe(2);
      expect(minorStats!.correctAttempts).toBe(1);
      expect(minorStats!.accuracy).toBe(80); // (60 + 100) / 2
      expect(minorStats!.displayName).toBe('Minor');
    });

    it('should aggregate stats for Chord Identification mode (using isCorrect boolean)', () => {
      const guessHistory: ChordGuessAttempt[] = [
        createIdentificationAttempt('C', ChordType.MAJOR, true),
        createIdentificationAttempt('D', ChordType.MAJOR, false),
        createIdentificationAttempt('E', ChordType.MINOR, true),
        createIdentificationAttempt('F', ChordType.MINOR, true)
      ];

      const result = aggregateByChordType(guessHistory);

      expect(result).toHaveLength(2);

      const majorStats = result.find(s => s.chordType === ChordType.MAJOR);
      expect(majorStats).toBeDefined();
      expect(majorStats!.totalAttempts).toBe(2);
      expect(majorStats!.correctAttempts).toBe(1);
      expect(majorStats!.accuracy).toBe(50); // (100 + 0) / 2

      const minorStats = result.find(s => s.chordType === ChordType.MINOR);
      expect(minorStats).toBeDefined();
      expect(minorStats!.totalAttempts).toBe(2);
      expect(minorStats!.correctAttempts).toBe(2);
      expect(minorStats!.accuracy).toBe(100); // (100 + 100) / 2
    });

    it('should only include chord types that actually appeared', () => {
      const guessHistory: ChordGuessAttempt[] = [
        createTrainingAttempt('C', ChordType.MAJOR, 100, true),
        createTrainingAttempt('D', ChordType.MAJOR, 80, false)
      ];

      const result = aggregateByChordType(guessHistory);

      expect(result).toHaveLength(1);
      expect(result[0].chordType).toBe(ChordType.MAJOR);
    });

    it('should handle single attempt correctly', () => {
      const guessHistory: ChordGuessAttempt[] = [
        createTrainingAttempt('C', ChordType.MAJOR, 75, false)
      ];

      const result = aggregateByChordType(guessHistory);

      expect(result).toHaveLength(1);
      expect(result[0].totalAttempts).toBe(1);
      expect(result[0].correctAttempts).toBe(0);
      expect(result[0].accuracy).toBe(75);
    });
  });

  describe('aggregateByRootNote', () => {
    it('should return empty array for empty guess history', () => {
      const result = aggregateByRootNote([]);
      expect(result).toEqual([]);
    });

    it('should aggregate stats for Chord Training mode', () => {
      const guessHistory: ChordGuessAttempt[] = [
        createTrainingAttempt('C', ChordType.MAJOR, 100, true),
        createTrainingAttempt('C', ChordType.MINOR, 80, false),
        createTrainingAttempt('D', ChordType.MAJOR, 60, false),
        createTrainingAttempt('D', ChordType.MINOR, 100, true)
      ];

      const result = aggregateByRootNote(guessHistory);

      expect(result).toHaveLength(2);

      const cStats = result.find(s => s.rootNote === 'C');
      expect(cStats).toBeDefined();
      expect(cStats!.totalAttempts).toBe(2);
      expect(cStats!.correctAttempts).toBe(1);
      expect(cStats!.accuracy).toBe(90); // (100 + 80) / 2

      const dStats = result.find(s => s.rootNote === 'D');
      expect(dStats).toBeDefined();
      expect(dStats!.totalAttempts).toBe(2);
      expect(dStats!.correctAttempts).toBe(1);
      expect(dStats!.accuracy).toBe(80); // (60 + 100) / 2
    });

    it('should aggregate stats for Chord Identification mode', () => {
      const guessHistory: ChordGuessAttempt[] = [
        createIdentificationAttempt('C', ChordType.MAJOR, true),
        createIdentificationAttempt('C', ChordType.MINOR, false),
        createIdentificationAttempt('D', ChordType.MAJOR, true)
      ];

      const result = aggregateByRootNote(guessHistory);

      expect(result).toHaveLength(2);

      const cStats = result.find(s => s.rootNote === 'C');
      expect(cStats).toBeDefined();
      expect(cStats!.totalAttempts).toBe(2);
      expect(cStats!.correctAttempts).toBe(1);
      expect(cStats!.accuracy).toBe(50); // (100 + 0) / 2

      const dStats = result.find(s => s.rootNote === 'D');
      expect(dStats).toBeDefined();
      expect(dStats!.totalAttempts).toBe(1);
      expect(dStats!.correctAttempts).toBe(1);
      expect(dStats!.accuracy).toBe(100);
    });

    it('should only include root notes that actually appeared', () => {
      const guessHistory: ChordGuessAttempt[] = [
        createTrainingAttempt('C', ChordType.MAJOR, 100, true),
        createTrainingAttempt('C', ChordType.MINOR, 80, false)
      ];

      const result = aggregateByRootNote(guessHistory);

      expect(result).toHaveLength(1);
      expect(result[0].rootNote).toBe('C');
    });
  });

  describe('getMostDifficultChords', () => {
    it('should return empty array for empty stats', () => {
      const result = getMostDifficultChords([], 5);
      expect(result).toEqual([]);
    });

    it('should sort by accuracy ascending (lowest first)', () => {
      const guessHistory: ChordGuessAttempt[] = [
        createTrainingAttempt('C', ChordType.MAJOR, 90, true),
        createTrainingAttempt('D', ChordType.MINOR, 50, false),
        createTrainingAttempt('E', ChordType.DIMINISHED, 70, false)
      ];

      const stats = aggregateByChordType(guessHistory);
      const result = getMostDifficultChords(stats, 5);

      expect(result).toHaveLength(3);
      expect(result[0].chordType).toBe(ChordType.MINOR); // 50%
      expect(result[1].chordType).toBe(ChordType.DIMINISHED); // 70%
      expect(result[2].chordType).toBe(ChordType.MAJOR); // 90%
    });

    it('should respect limit parameter', () => {
      const guessHistory: ChordGuessAttempt[] = [
        createTrainingAttempt('C', ChordType.MAJOR, 90, true),
        createTrainingAttempt('D', ChordType.MINOR, 50, false),
        createTrainingAttempt('E', ChordType.DIMINISHED, 70, false)
      ];

      const stats = aggregateByChordType(guessHistory);
      const result = getMostDifficultChords(stats, 2);

      expect(result).toHaveLength(2);
      expect(result[0].chordType).toBe(ChordType.MINOR); // 50%
      expect(result[1].chordType).toBe(ChordType.DIMINISHED); // 70%
    });

    it('should not mutate original stats array', () => {
      const guessHistory: ChordGuessAttempt[] = [
        createTrainingAttempt('C', ChordType.MAJOR, 90, true),
        createTrainingAttempt('D', ChordType.MINOR, 50, false)
      ];

      const stats = aggregateByChordType(guessHistory);
      const originalOrder = [...stats];

      getMostDifficultChords(stats, 2);

      expect(stats).toEqual(originalOrder);
    });
  });

  describe('getMostDifficultRoots', () => {
    it('should return empty array for empty stats', () => {
      const result = getMostDifficultRoots([], 5);
      expect(result).toEqual([]);
    });

    it('should sort by accuracy ascending (lowest first)', () => {
      const guessHistory: ChordGuessAttempt[] = [
        createTrainingAttempt('C', ChordType.MAJOR, 90, true),
        createTrainingAttempt('D', ChordType.MAJOR, 50, false),
        createTrainingAttempt('E', ChordType.MAJOR, 70, false)
      ];

      const stats = aggregateByRootNote(guessHistory);
      const result = getMostDifficultRoots(stats, 5);

      expect(result).toHaveLength(3);
      expect(result[0].rootNote).toBe('D'); // 50%
      expect(result[1].rootNote).toBe('E'); // 70%
      expect(result[2].rootNote).toBe('C'); // 90%
    });

    it('should respect limit parameter', () => {
      const guessHistory: ChordGuessAttempt[] = [
        createTrainingAttempt('C', ChordType.MAJOR, 90, true),
        createTrainingAttempt('D', ChordType.MAJOR, 50, false),
        createTrainingAttempt('E', ChordType.MAJOR, 70, false)
      ];

      const stats = aggregateByRootNote(guessHistory);
      const result = getMostDifficultRoots(stats, 1);

      expect(result).toHaveLength(1);
      expect(result[0].rootNote).toBe('D'); // 50%
    });
  });

  describe('sortByAccuracyAsc', () => {
    it('should sort chord type stats by accuracy ascending', () => {
      const guessHistory: ChordGuessAttempt[] = [
        createTrainingAttempt('C', ChordType.MAJOR, 90, true),
        createTrainingAttempt('D', ChordType.MINOR, 50, false),
        createTrainingAttempt('E', ChordType.DIMINISHED, 70, false)
      ];

      const stats = aggregateByChordType(guessHistory);
      const result = sortByAccuracyAsc(stats);

      expect(result[0].accuracy).toBe(50);
      expect(result[1].accuracy).toBe(70);
      expect(result[2].accuracy).toBe(90);
    });

    it('should sort root note stats by accuracy ascending', () => {
      const guessHistory: ChordGuessAttempt[] = [
        createTrainingAttempt('C', ChordType.MAJOR, 90, true),
        createTrainingAttempt('D', ChordType.MAJOR, 50, false),
        createTrainingAttempt('E', ChordType.MAJOR, 70, false)
      ];

      const stats = aggregateByRootNote(guessHistory);
      const result = sortByAccuracyAsc(stats);

      expect(result[0].accuracy).toBe(50);
      expect(result[1].accuracy).toBe(70);
      expect(result[2].accuracy).toBe(90);
    });

    it('should not mutate original array', () => {
      const guessHistory: ChordGuessAttempt[] = [
        createTrainingAttempt('C', ChordType.MAJOR, 90, true),
        createTrainingAttempt('D', ChordType.MAJOR, 50, false)
      ];

      const stats = aggregateByRootNote(guessHistory);
      const originalOrder = [...stats];

      sortByAccuracyAsc(stats);

      expect(stats).toEqual(originalOrder);
    });
  });

  describe('Edge cases', () => {
    it('should handle all correct attempts', () => {
      const guessHistory: ChordGuessAttempt[] = [
        createTrainingAttempt('C', ChordType.MAJOR, 100, true),
        createTrainingAttempt('D', ChordType.MAJOR, 100, true),
        createTrainingAttempt('E', ChordType.MAJOR, 100, true)
      ];

      const stats = aggregateByChordType(guessHistory);
      const result = getMostDifficultChords(stats, 1);

      expect(result).toHaveLength(1);
      expect(result[0].accuracy).toBe(100);
    });

    it('should handle all incorrect attempts', () => {
      const guessHistory: ChordGuessAttempt[] = [
        createIdentificationAttempt('C', ChordType.MAJOR, false),
        createIdentificationAttempt('D', ChordType.MAJOR, false),
        createIdentificationAttempt('E', ChordType.MAJOR, false)
      ];

      const stats = aggregateByChordType(guessHistory);

      expect(stats[0].correctAttempts).toBe(0);
      expect(stats[0].accuracy).toBe(0);
    });

    it('should handle mixed training and identification mode data gracefully', () => {
      // This tests that the function handles attempts that have both accuracy and isCorrect
      // (though this shouldn't happen in practice, the accuracy field takes precedence)
      const guessHistory: ChordGuessAttempt[] = [
        { ...createTrainingAttempt('C', ChordType.MAJOR, 75, false), accuracy: 75 },
        createIdentificationAttempt('D', ChordType.MAJOR, true)
      ];

      const stats = aggregateByChordType(guessHistory);

      expect(stats).toHaveLength(1);
      expect(stats[0].accuracy).toBe(87.5); // (75 + 100) / 2
    });
  });
});
