import { expect } from 'vitest';
import type { NoteWithOctave } from '../../../types/music';
import {
  midiNoteToNoteWithOctave,
  noteWithOctaveToMidiNote,
  isValidMidiNote,
  isPlayableMidiNote
} from '../../midiUtils';
import { MIDI_TEST_CONSTANTS } from './midiTestData';

/**
 * MIDI-specific assertion helpers
 * Similar to chordAssertions.ts but for MIDI utilities
 */

/**
 * Assert that a MIDI note converts correctly to NoteWithOctave
 */
export function assertMidiNoteConvertsTo(
  midiNote: number,
  expected: NoteWithOctave,
  message?: string
) {
  const result = midiNoteToNoteWithOctave(midiNote);
  expect(result).toEqual(expected, message);
}

/**
 * Assert that a NoteWithOctave converts correctly to MIDI note
 */
export function assertNoteWithOctaveConvertsTo(
  noteWithOctave: NoteWithOctave,
  expectedMidi: number,
  message?: string
) {
  const result = noteWithOctaveToMidiNote(noteWithOctave);
  expect(result).toBe(expectedMidi, message);
}

/**
 * Assert round-trip conversion works correctly
 * MIDI -> NoteWithOctave -> MIDI should yield the same MIDI note
 */
export function assertRoundTripConversion(midiNote: number) {
  const noteWithOctave = midiNoteToNoteWithOctave(midiNote);
  const convertedBack = noteWithOctaveToMidiNote(noteWithOctave);
  expect(convertedBack).toBe(
    midiNote,
    `Round-trip conversion failed for MIDI note ${midiNote}`
  );
}

/**
 * Assert that a MIDI note throws an error with specific message
 */
export function assertMidiNoteThrows(
  midiNote: number,
  expectedError: string | RegExp,
  message?: string
) {
  expect(() => midiNoteToNoteWithOctave(midiNote)).toThrow(expectedError);
}

/**
 * Assert that a NoteWithOctave throws an error when converting to MIDI
 */
export function assertNoteWithOctaveThrows(
  noteWithOctave: NoteWithOctave,
  expectedError: string | RegExp,
  message?: string
) {
  expect(() => noteWithOctaveToMidiNote(noteWithOctave)).toThrow(expectedError);
}

/**
 * Assert MIDI note is within valid range (0-127)
 */
export function assertValidMidiRange(midiNote: number) {
  expect(midiNote).toBeGreaterThanOrEqual(MIDI_TEST_CONSTANTS.MIDI_RANGES.VALID_MIN);
  expect(midiNote).toBeLessThanOrEqual(MIDI_TEST_CONSTANTS.MIDI_RANGES.VALID_MAX);
  expect(isValidMidiNote(midiNote)).toBe(true);
}

/**
 * Assert MIDI note is within playable range (12-107, octaves 1-8)
 */
export function assertPlayableMidiRange(midiNote: number) {
  expect(midiNote).toBeGreaterThanOrEqual(MIDI_TEST_CONSTANTS.MIDI_RANGES.PLAYABLE_MIN);
  expect(midiNote).toBeLessThanOrEqual(MIDI_TEST_CONSTANTS.MIDI_RANGES.PLAYABLE_MAX);
  expect(isPlayableMidiNote(midiNote)).toBe(true);
}

/**
 * Assert octave is within valid range (1-8)
 */
export function assertValidOctave(octave: number) {
  expect(octave).toBeGreaterThanOrEqual(1);
  expect(octave).toBeLessThanOrEqual(8);
}

/**
 * Assert that a MIDI note is NOT valid
 */
export function assertInvalidMidiNote(midiNote: number) {
  expect(isValidMidiNote(midiNote)).toBe(false);
}

/**
 * Assert that a MIDI note is valid but NOT playable
 */
export function assertNotPlayable(midiNote: number) {
  expect(isValidMidiNote(midiNote)).toBe(true);
  expect(isPlayableMidiNote(midiNote)).toBe(false);
}

/**
 * Assert that two NoteWithOctave objects are equal
 */
export function assertNoteWithOctaveEqual(
  actual: NoteWithOctave,
  expected: NoteWithOctave,
  message?: string
) {
  expect(actual.note).toBe(expected.note, message);
  expect(actual.octave).toBe(expected.octave, message);
}

/**
 * Assert that a NoteWithOctave is valid
 */
export function assertValidNoteWithOctave(noteWithOctave: NoteWithOctave) {
  expect(noteWithOctave).toBeDefined();
  expect(noteWithOctave.note).toBeDefined();
  expect(noteWithOctave.octave).toBeDefined();
  assertValidOctave(noteWithOctave.octave);
  expect(MIDI_TEST_CONSTANTS.CHROMATIC_NOTES).toContain(noteWithOctave.note);
}

/**
 * Assert that conversion preserves the note name
 */
export function assertNotePreserved(midiNote: number, expectedNote: string) {
  const result = midiNoteToNoteWithOctave(midiNote);
  expect(result.note).toBe(expectedNote);
}

/**
 * Assert that conversion preserves the octave
 */
export function assertOctavePreserved(midiNote: number, expectedOctave: number) {
  const result = midiNoteToNoteWithOctave(midiNote);
  expect(result.octave).toBe(expectedOctave);
}

/**
 * Assert consistency across all notes in an octave
 */
export function assertOctaveConsistency(octave: number) {
  const startMidi = octave * 12;
  const endMidi = startMidi + 11;

  for (let midi = startMidi; midi <= endMidi; midi++) {
    if (midi >= 12 && midi <= 107) {
      const result = midiNoteToNoteWithOctave(midi);
      expect(result.octave).toBe(octave, `MIDI ${midi} should be in octave ${octave}`);
    }
  }
}

/**
 * Assert consistency across all octaves for a specific note
 */
export function assertNoteConsistency(noteName: string, noteIndex: number) {
  for (let octave = 1; octave <= 8; octave++) {
    const midi = octave * 12 + noteIndex;
    if (midi >= 12 && midi <= 107) {
      const result = midiNoteToNoteWithOctave(midi);
      expect(result.note).toBe(noteName, `MIDI ${midi} should be note ${noteName}`);
    }
  }
}
