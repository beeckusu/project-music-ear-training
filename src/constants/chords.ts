/**
 * Chord Constants and Definitions
 *
 * This file contains the fundamental building blocks for chord generation and recognition
 * in the Note Training mode. It defines interval formulas for all supported chord types
 * and provides utilities for chord name formatting.
 *
 * Interval Notation:
 * - Intervals are expressed as semitones from the root note
 * - Root note is always 0
 * - Example: [0, 4, 7] = root, major 3rd (4 semitones), perfect 5th (7 semitones)
 * - Extended chords span octaves: 14 = 9th (2 + 12), 17 = 11th (5 + 12)
 *
 * @module constants/chords
 */

import type { ChordType, Note } from '../types/music';

/**
 * Maps each chord type to its interval formula (semitones from root)
 *
 * Interval Reference:
 * - Minor 2nd: 1, Major 2nd: 2
 * - Minor 3rd: 3, Major 3rd: 4
 * - Perfect 4th: 5, Tritone: 6, Perfect 5th: 7
 * - Minor 6th: 8, Major 6th: 9
 * - Minor 7th: 10, Major 7th: 11
 * - Octave: 12
 * - 9th: 14 (2 + 12), 11th: 17 (5 + 12), 13th: 21 (9 + 12)
 *
 * @example
 * // C Major chord: C (0) + E (4 semitones) + G (7 semitones) = C-E-G
 * CHORD_FORMULAS.major // [0, 4, 7]
 *
 * @example
 * // C Dominant 9th: C (0) + E (4) + G (7) + Bb (10) + D (14) = C-E-G-Bb-D
 * CHORD_FORMULAS.dominant9 // [0, 4, 7, 10, 14]
 */
export const CHORD_FORMULAS: Record<ChordType, number[]> = {
  // Triads
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],

  // Seventh chords
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  dominant7: [0, 4, 7, 10],
  diminished7: [0, 3, 6, 9],
  halfDiminished7: [0, 3, 6, 10],

  // Extended chords (9ths)
  major9: [0, 4, 7, 11, 14],
  minor9: [0, 3, 7, 10, 14],
  dominant9: [0, 4, 7, 10, 14],

  // Extended chords (11ths)
  major11: [0, 4, 7, 11, 14, 17],
  minor11: [0, 3, 7, 10, 14, 17],
  dominant11: [0, 4, 7, 10, 14, 17],

  // Suspended chords
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],

  // Added tone chords
  add9: [0, 4, 7, 14],
  add11: [0, 4, 7, 17],
} as const;

/**
 * Standard chord name suffixes for each chord type
 *
 * Used to format chord names consistently throughout the application.
 * Major chords have no suffix (just the root note).
 *
 * @example
 * // C major chord
 * formatChordName('C', 'major') // "C"
 *
 * @example
 * // F# minor 7th chord
 * formatChordName('F#', 'minor7') // "F#m7"
 */
export const CHORD_NAME_FORMATS: Record<ChordType, string> = {
  // Triads
  major: '',           // C Major → "C"
  minor: 'm',          // C Minor → "Cm"
  diminished: 'dim',   // C Diminished → "Cdim"
  augmented: 'aug',    // C Augmented → "Caug"

  // Seventh chords
  major7: 'maj7',         // C Major 7 → "Cmaj7"
  minor7: 'm7',           // C Minor 7 → "Cm7"
  dominant7: '7',         // C Dominant 7 → "C7"
  diminished7: 'dim7',    // C Diminished 7 → "Cdim7"
  halfDiminished7: 'm7♭5', // C Half Diminished → "Cm7♭5" (also written as "Cø7")

  // Extended chords (9ths)
  major9: 'maj9',      // C Major 9 → "Cmaj9"
  minor9: 'm9',        // C Minor 9 → "Cm9"
  dominant9: '9',      // C Dominant 9 → "C9"

  // Extended chords (11ths)
  major11: 'maj11',    // C Major 11 → "Cmaj11"
  minor11: 'm11',      // C Minor 11 → "Cm11"
  dominant11: '11',    // C Dominant 11 → "C11"

  // Suspended chords
  sus2: 'sus2',        // C Suspended 2 → "Csus2"
  sus4: 'sus4',        // C Suspended 4 → "Csus4"

  // Added tone chords
  add9: 'add9',        // C Add 9 → "Cadd9"
  add11: 'add11',      // C Add 11 → "Cadd11"
} as const;

/**
 * Formats a chord name from root note and chord type
 *
 * Combines the root note with the standard chord suffix to create
 * a properly formatted chord name following music notation conventions.
 *
 * @param root - The root note (e.g., 'C', 'F#', 'Bb')
 * @param type - The chord type (e.g., 'major', 'minor7', 'dominant9')
 * @returns Formatted chord name (e.g., "Cmaj7", "F#m", "Bb9")
 *
 * @example
 * formatChordName('C', 'major') // "C"
 *
 * @example
 * formatChordName('F#', 'minor7') // "F#m7"
 *
 * @example
 * formatChordName('Bb', 'dominant9') // "Bb9"
 */
export function formatChordName(root: Note, type: ChordType): string {
  return `${root}${CHORD_NAME_FORMATS[type]}`;
}
