/**
 * Test utilities for chord-related tests
 *
 * Provides reusable fixtures, factories, and helpers for testing
 * chord identification, validation, and training features.
 */

import { ChordIdentificationGameState } from '../game/ChordIdentificationGameState';
import type { Chord, ChordFilter, Note } from '../types/music';
import { ChordType } from '../types/music';
import type { NoteTrainingModeSettings } from '../types/game';

// ============================================================================
// CHORD FIXTURES
// ============================================================================

/**
 * Common test chord constants with proper typing
 */
export const TEST_CHORDS = {
  C_MAJOR: {
    name: 'C Major',
    notes: [
      { note: 'C' as Note, octave: 4 as const },
      { note: 'E' as Note, octave: 4 as const },
      { note: 'G' as Note, octave: 4 as const }
    ],
    root: 'C' as Note,
    type: ChordType.MAJOR,
    inversion: 0
  } as Chord,

  A_MINOR: {
    name: 'A Minor',
    notes: [
      { note: 'A' as Note, octave: 4 as const },
      { note: 'C' as Note, octave: 5 as const },
      { note: 'E' as Note, octave: 5 as const }
    ],
    root: 'A' as Note,
    type: ChordType.MINOR,
    inversion: 0
  } as Chord,

  C_SHARP_MAJOR: {
    name: 'C# Major',
    notes: [
      { note: 'C#' as Note, octave: 4 as const },
      { note: 'F' as Note, octave: 4 as const },
      { note: 'G#' as Note, octave: 4 as const }
    ],
    root: 'C#' as Note,
    type: ChordType.MAJOR,
    inversion: 0
  } as Chord,

  C_MAJOR_FIRST_INVERSION: {
    name: 'C Major',
    notes: [
      { note: 'E' as Note, octave: 4 as const },
      { note: 'G' as Note, octave: 4 as const },
      { note: 'C' as Note, octave: 5 as const }
    ],
    root: 'C' as Note,
    type: ChordType.MAJOR,
    inversion: 1
  } as Chord,

  G_DOMINANT_7: {
    name: 'G7',
    notes: [
      { note: 'G' as Note, octave: 4 as const },
      { note: 'B' as Note, octave: 4 as const },
      { note: 'D' as Note, octave: 5 as const },
      { note: 'F' as Note, octave: 5 as const }
    ],
    root: 'G' as Note,
    type: ChordType.DOMINANT_7,
    inversion: 0
  } as Chord,
} as const;

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Default chord filter for tests
 */
export const DEFAULT_TEST_CHORD_FILTER: ChordFilter = {
  allowedChordTypes: [ChordType.MAJOR, ChordType.MINOR],
  allowedRootNotes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  allowedOctaves: [3, 4],
  includeInversions: false
};

/**
 * Creates a NoteTrainingModeSettings object with sensible defaults
 */
export function createNoteTrainingSettings(
  overrides: Partial<NoteTrainingModeSettings> = {}
): NoteTrainingModeSettings {
  return {
    selectedSubMode: 'show-notes-guess-chord',
    targetChords: 3,
    sessionDuration: 0,
    chordFilter: DEFAULT_TEST_CHORD_FILTER,
    ...overrides
  };
}

/**
 * Creates a ChordIdentificationGameState with sensible defaults
 */
export function createChordIdentificationGameState(
  settingsOverrides: Partial<NoteTrainingModeSettings> = {}
): ChordIdentificationGameState {
  const settings = createNoteTrainingSettings(settingsOverrides);
  return new ChordIdentificationGameState(settings);
}

/**
 * Creates a Chord object for testing
 * Similar to the pattern in chordValidation.test.ts
 */
export function createChord(
  root: Note,
  type: typeof ChordType[keyof typeof ChordType],
  name: string,
  inversion: number = 0
): Chord {
  return {
    root,
    type,
    name,
    notes: [
      { note: root, octave: 4 },
      { note: 'E' as Note, octave: 4 },
      { note: 'G' as Note, octave: 4 },
    ],
    inversion,
  };
}

// ============================================================================
// TEST HELPER FUNCTIONS
// ============================================================================

/**
 * Sets up a chord for guessing on the game state
 * Commonly used pattern: set currentChord and displayedNotes together
 */
export function setupChordForGuess(
  gameState: ChordIdentificationGameState,
  chord: Chord
): void {
  gameState.currentChord = chord;
  gameState.displayedNotes = [...chord.notes];
}

/**
 * Submits a guess and returns the result
 * Convenience wrapper for testing guess flow
 */
export function submitGuess(
  gameState: ChordIdentificationGameState,
  guess: string
) {
  return gameState.handleSubmitGuess(guess);
}

/**
 * Completes N correct guesses for a chord
 * Useful for testing game completion
 */
export function completeCorrectGuesses(
  gameState: ChordIdentificationGameState,
  chord: Chord,
  count: number
): void {
  for (let i = 0; i < count; i++) {
    setupChordForGuess(gameState, chord);
    gameState.handleSubmitGuess(chord.name.split(' ')[0] + ' ' + (chord.name.includes('Minor') ? 'Minor' : 'Major'));
  }
}

// ============================================================================
// PARAMETERIZED TEST DATA
// ============================================================================

/**
 * Accuracy levels for testing celebration emoji and performance rating
 * Format: [accuracy, expectedEmoji, expectedRatingContains]
 */
export const ACCURACY_TEST_CASES: Array<[number, string, string]> = [
  [100, '🌟', 'Perfect'],
  [95, '🌟', 'Perfect'],
  [90, '🎯', 'Excellent'],
  [80, '🎵', 'Great'],
  [70, '📚', 'Keep'],
  [50, '💪', 'Good'],
];

/**
 * Chord name format variations for testing normalization
 * Format: [input, shouldBeCorrect]
 */
export const CHORD_NAME_FORMATS: Array<[string, boolean]> = [
  ['C Major', true],
  ['c major', true],
  ['Cmaj', true],
  ['C', true],
  ['CM', true],
  ['D Minor', false], // Wrong chord
];

/**
 * Stats items expected labels for end screen
 */
export const EXPECTED_STATS_LABELS = [
  'Time',
  'Accuracy',
  'Chords Completed',
  'Average per Chord',
  'Longest Streak',
  'Total Attempts',
];
