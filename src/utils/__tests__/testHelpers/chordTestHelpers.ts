import type { Chord, ChordFilter } from '../../../types/music';
import { ChordEngine } from '../../chordEngine';
import { expect } from 'vitest';

/**
 * Generate multiple chords from a filter
 */
export function generateMultipleChords(filter: ChordFilter, count: number): Chord[] {
  const chords: Chord[] = [];
  for (let i = 0; i < count; i++) {
    chords.push(ChordEngine.getRandomChordFromFilter(filter));
  }
  return chords;
}

/**
 * Get octave span information from a chord
 */
export function getOctaveSpan(chord: Chord): { min: number; max: number; span: number } {
  const octaves = chord.notes.map(n => n.octave);
  const min = Math.min(...octaves);
  const max = Math.max(...octaves);
  return { min, max, span: max - min };
}

/**
 * Measure performance of a function
 */
export function measurePerformance(fn: () => void, maxMs: number, label?: string): number {
  const start = Date.now();
  fn();
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(
    maxMs,
    `${label || 'Operation'} took ${elapsed}ms, expected < ${maxMs}ms`
  );
  return elapsed;
}

/**
 * Generate chords and collect statistics about them
 */
export function collectChordStats(filter: ChordFilter, count: number) {
  const chords = generateMultipleChords(filter, count);

  const rootCounts = new Map<string, number>();
  const typeCounts = new Map<string, number>();
  const inversionCounts = new Map<number, number>();
  const octaveCounts = new Map<number, number>();

  chords.forEach(chord => {
    rootCounts.set(chord.root, (rootCounts.get(chord.root) || 0) + 1);
    typeCounts.set(chord.type, (typeCounts.get(chord.type) || 0) + 1);
    inversionCounts.set(chord.inversion, (inversionCounts.get(chord.inversion) || 0) + 1);
    octaveCounts.set(chord.notes[0].octave, (octaveCounts.get(chord.notes[0].octave) || 0) + 1);
  });

  return {
    chords,
    stats: {
      totalChords: chords.length,
      uniqueRoots: rootCounts.size,
      uniqueTypes: typeCounts.size,
      uniqueInversions: inversionCounts.size,
      uniqueOctaves: octaveCounts.size,
      rootCounts,
      typeCounts,
      inversionCounts,
      octaveCounts
    }
  };
}

/**
 * Check if a value is within a reasonable percentage of an expected value
 * Useful for distribution testing
 */
export function isWithinRange(value: number, expected: number, tolerancePercent: number): boolean {
  const min = expected * (1 - tolerancePercent / 100);
  const max = expected * (1 + tolerancePercent / 100);
  return value >= min && value <= max;
}
