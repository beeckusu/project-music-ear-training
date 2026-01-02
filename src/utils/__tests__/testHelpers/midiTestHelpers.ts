import type { NoteWithOctave } from '../../../types/music';
import { midiNoteToNoteWithOctave, noteWithOctaveToMidiNote } from '../../midiUtils';
import { MIDI_TEST_CONSTANTS } from './midiTestData';

/**
 * General MIDI test helper functions
 * Similar to chordTestHelpers.ts but for MIDI utilities
 */

/**
 * Test all MIDI notes in a range
 */
export function testMidiNoteRange(
  start: number,
  end: number,
  testFn: (midiNote: number) => void
): void {
  for (let midiNote = start; midiNote <= end; midiNote++) {
    testFn(midiNote);
  }
}

/**
 * Test all playable MIDI notes (12-107)
 */
export function testAllPlayableMidiNotes(
  testFn: (midiNote: number, noteWithOctave: NoteWithOctave) => void
): void {
  testMidiNoteRange(
    MIDI_TEST_CONSTANTS.MIDI_RANGES.PLAYABLE_MIN,
    MIDI_TEST_CONSTANTS.MIDI_RANGES.PLAYABLE_MAX,
    (midiNote) => {
      const noteWithOctave = midiNoteToNoteWithOctave(midiNote);
      testFn(midiNote, noteWithOctave);
    }
  );
}

/**
 * Test all valid MIDI notes (0-127)
 */
export function testAllValidMidiNotes(
  testFn: (midiNote: number) => void
): void {
  testMidiNoteRange(
    MIDI_TEST_CONSTANTS.MIDI_RANGES.VALID_MIN,
    MIDI_TEST_CONSTANTS.MIDI_RANGES.VALID_MAX,
    testFn
  );
}

/**
 * Generate all MIDI channel variations of a test case
 */
export function generateChannelVariations<T>(
  generator: (channel: number) => T
): T[] {
  return MIDI_TEST_CONSTANTS.MIDI_CHANNELS.map(generator);
}

/**
 * Generate all velocity variations with metadata
 */
export function generateVelocityVariations(
  velocities: number[] = MIDI_TEST_CONSTANTS.VELOCITIES.TYPICAL
): Array<{ velocity: number; isNoteOn: boolean; isNoteOff: boolean }> {
  return velocities.map(velocity => ({
    velocity,
    isNoteOn: velocity > 0,
    isNoteOff: velocity === 0
  }));
}

/**
 * Verify conversion consistency across a MIDI range
 * Returns statistics about the conversion test
 */
export function verifyConversionConsistency(
  startMidi: number,
  endMidi: number
): {
  tested: number;
  passed: number;
  failed: number;
  outOfRange: number;
  failedNotes: number[];
} {
  let passed = 0;
  let failed = 0;
  let outOfRange = 0;
  const failedNotes: number[] = [];

  for (let midiNote = startMidi; midiNote <= endMidi; midiNote++) {
    try {
      const noteWithOctave = midiNoteToNoteWithOctave(midiNote);
      const convertedBack = noteWithOctaveToMidiNote(noteWithOctave);

      if (convertedBack === midiNote) {
        passed++;
      } else {
        failed++;
        failedNotes.push(midiNote);
      }
    } catch (error) {
      // Expected for notes outside playable range (octaves 0 and 9+)
      outOfRange++;
    }
  }

  return {
    tested: endMidi - startMidi + 1,
    passed,
    failed,
    outOfRange,
    failedNotes
  };
}

/**
 * Collect statistics about MIDI conversions
 */
export function collectMidiConversionStats(midiNotes: number[]) {
  const noteCounts = new Map<string, number>();
  const octaveCounts = new Map<number, number>();
  const successCount = { success: 0, fail: 0 };

  midiNotes.forEach(midiNote => {
    try {
      const { note, octave } = midiNoteToNoteWithOctave(midiNote);
      noteCounts.set(note, (noteCounts.get(note) || 0) + 1);
      octaveCounts.set(octave, (octaveCounts.get(octave) || 0) + 1);
      successCount.success++;
    } catch {
      successCount.fail++;
    }
  });

  return {
    totalTested: midiNotes.length,
    successCount: successCount.success,
    failCount: successCount.fail,
    uniqueNotes: noteCounts.size,
    uniqueOctaves: octaveCounts.size,
    noteCounts,
    octaveCounts
  };
}

/**
 * Test MIDI note conversion for all notes in an octave
 */
export function testOctave(
  octave: number,
  testFn: (midiNote: number, note: NoteWithOctave) => void
): void {
  const startMidi = octave * 12;
  const endMidi = startMidi + 11;

  for (let midiNote = startMidi; midiNote <= endMidi; midiNote++) {
    if (midiNote >= MIDI_TEST_CONSTANTS.MIDI_RANGES.PLAYABLE_MIN &&
        midiNote <= MIDI_TEST_CONSTANTS.MIDI_RANGES.PLAYABLE_MAX) {
      const noteWithOctave = midiNoteToNoteWithOctave(midiNote);
      testFn(midiNote, noteWithOctave);
    }
  }
}

/**
 * Test a specific note across all octaves
 */
export function testNoteAcrossOctaves(
  noteName: string,
  noteIndex: number,
  testFn: (midiNote: number, octave: number) => void
): void {
  for (let octave = 1; octave <= 8; octave++) {
    const midiNote = octave * 12 + noteIndex;
    if (midiNote >= MIDI_TEST_CONSTANTS.MIDI_RANGES.PLAYABLE_MIN &&
        midiNote <= MIDI_TEST_CONSTANTS.MIDI_RANGES.PLAYABLE_MAX) {
      testFn(midiNote, octave);
    }
  }
}

/**
 * Generate test cases for boundary testing
 */
export function generateBoundaryTestCases() {
  return [
    {
      name: 'First playable note',
      midi: MIDI_TEST_CONSTANTS.MIDI_RANGES.PLAYABLE_MIN,
      shouldPass: true
    },
    {
      name: 'Last playable note',
      midi: MIDI_TEST_CONSTANTS.MIDI_RANGES.PLAYABLE_MAX,
      shouldPass: true
    },
    {
      name: 'One below playable range',
      midi: MIDI_TEST_CONSTANTS.MIDI_RANGES.PLAYABLE_MIN - 1,
      shouldPass: false
    },
    {
      name: 'One above playable range',
      midi: MIDI_TEST_CONSTANTS.MIDI_RANGES.PLAYABLE_MAX + 1,
      shouldPass: false
    },
    {
      name: 'Minimum valid MIDI',
      midi: MIDI_TEST_CONSTANTS.MIDI_RANGES.VALID_MIN,
      shouldPass: false
    },
    {
      name: 'Maximum valid MIDI',
      midi: MIDI_TEST_CONSTANTS.MIDI_RANGES.VALID_MAX,
      shouldPass: false
    }
  ];
}

/**
 * Check if a MIDI note is in the playable range
 */
export function isPlayableMidi(midiNote: number): boolean {
  return midiNote >= MIDI_TEST_CONSTANTS.MIDI_RANGES.PLAYABLE_MIN &&
         midiNote <= MIDI_TEST_CONSTANTS.MIDI_RANGES.PLAYABLE_MAX;
}

/**
 * Check if a MIDI note is in the valid range
 */
export function isValidMidi(midiNote: number): boolean {
  return midiNote >= MIDI_TEST_CONSTANTS.MIDI_RANGES.VALID_MIN &&
         midiNote <= MIDI_TEST_CONSTANTS.MIDI_RANGES.VALID_MAX &&
         Number.isInteger(midiNote);
}

/**
 * Get expected octave for a MIDI note
 */
export function getExpectedOctave(midiNote: number): number {
  return Math.floor(midiNote / 12);
}

/**
 * Get expected note name for a MIDI note
 */
export function getExpectedNote(midiNote: number): string {
  const noteIndex = midiNote % 12;
  return MIDI_TEST_CONSTANTS.CHROMATIC_NOTES[noteIndex];
}
