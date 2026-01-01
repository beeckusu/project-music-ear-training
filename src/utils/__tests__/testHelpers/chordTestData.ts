import type { Note, ChordType, Octave } from '../../../types/music';

/**
 * Shared test constants and data for chord engine tests
 */
export const TEST_CONSTANTS = {
  // Note collections
  ALL_NOTES: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as Note[],
  NATURAL_NOTES: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as Note[],
  SHARP_NOTES: ['C#', 'D#', 'F#', 'G#', 'A#'] as Note[],

  // Chord type collections
  TRIAD_TYPES: ['major', 'minor', 'diminished', 'augmented', 'sus2', 'sus4'] as ChordType[],
  SEVENTH_TYPES: ['major7', 'minor7', 'dominant7', 'halfDiminished7', 'diminished7'] as ChordType[],
  EXTENDED_TYPES: ['major9', 'minor9', 'dominant9', 'major11', 'minor11', 'dominant11'] as ChordType[],
  ADDED_TONE_TYPES: ['add9', 'add11'] as ChordType[],

  ALL_CHORD_TYPES: [
    'major', 'minor', 'diminished', 'augmented',
    'major7', 'minor7', 'dominant7', 'halfDiminished7', 'diminished7',
    'major9', 'minor9', 'dominant9',
    'major11', 'minor11', 'dominant11',
    'sus2', 'sus4', 'add9', 'add11'
  ] as ChordType[],

  // Octave ranges
  OCTAVE_RANGES: {
    LOW: [1, 2] as Octave[],
    MID: [3, 4, 5] as Octave[],
    HIGH: [6, 7] as Octave[],
    FULL: [1, 2, 3, 4, 5, 6, 7, 8] as Octave[]
  }
} as const;

/**
 * Note order for sorting validation
 */
export const NOTE_ORDER = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Expected inversion counts for different chord types
 */
export const INVERSION_COUNTS = {
  triads: 3,      // 0, 1, 2
  sevenths: 4,    // 0, 1, 2, 3
  ninths: 5,      // 0, 1, 2, 3, 4
  elevenths: 6    // 0, 1, 2, 3, 4, 5
} as const;
