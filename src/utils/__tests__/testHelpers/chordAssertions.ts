import { expect } from 'vitest';
import type { Chord, Note, ChordType, NoteWithOctave } from '../../../types/music';
import { ChordEngine } from '../../chordEngine';
import { NOTE_ORDER } from './chordTestData';

/**
 * Assert that a chord is valid
 */
export function assertValidChord(chord: Chord) {
  expect(chord).toBeDefined();
  expect(ChordEngine.validateChord(chord)).toBe(true);
  expect(chord.notes).toBeDefined();
  expect(chord.notes.length).toBeGreaterThan(0);
}

/**
 * Assert that a chord matches expected properties
 */
export function assertChordMatches(
  chord: Chord,
  expected: { root?: Note; type?: ChordType; inversion?: number }
) {
  if (expected.root) {
    expect(chord.root).toBe(expected.root);
  }
  if (expected.type) {
    expect(chord.type).toBe(expected.type);
  }
  if (expected.inversion !== undefined) {
    expect(chord.inversion).toBe(expected.inversion);
  }
}

/**
 * Assert that inversion name formatting is correct
 */
export function assertInversionNameCorrect(chord: Chord) {
  if (chord.inversion === 0) {
    expect(chord.name).not.toContain('/');
  } else {
    expect(chord.name).toContain('/');
    expect(chord.name).toContain(chord.notes[0].note);
  }
}

/**
 * Assert that notes are sorted by pitch (ascending)
 */
export function assertNotesSorted(notes: NoteWithOctave[]) {
  for (let i = 1; i < notes.length; i++) {
    const prev = notes[i - 1];
    const curr = notes[i];

    if (curr.octave === prev.octave) {
      // Same octave: current note index should be higher
      const prevIndex = NOTE_ORDER.indexOf(prev.note);
      const currIndex = NOTE_ORDER.indexOf(curr.note);
      expect(currIndex).toBeGreaterThan(prevIndex);
    } else {
      // Different octave: current octave should be higher
      expect(curr.octave).toBeGreaterThan(prev.octave);
    }
  }
}

/**
 * Assert that all chords in an array are valid
 */
export function assertAllChordsValid(chords: Chord[]) {
  chords.forEach(chord => assertValidChord(chord));
}

/**
 * Assert that a set of items has sufficient variety/distribution
 */
export function assertDistribution<T>(
  items: T[],
  extractor: (item: T) => string,
  minUniqueCount: number,
  name: string = 'items'
) {
  const seen = new Set(items.map(extractor));
  expect(seen.size).toBeGreaterThan(
    minUniqueCount,
    `Expected to see more than ${minUniqueCount} different ${name}, but saw ${seen.size}`
  );
}

/**
 * Assert that chord names match the expected format for their type
 */
export function assertChordNameFormat(chord: Chord) {
  expect(chord.name).toBeDefined();
  expect(chord.name.length).toBeGreaterThan(0);
  expect(chord.name).toBe(ChordEngine.getChordName(chord));
}
