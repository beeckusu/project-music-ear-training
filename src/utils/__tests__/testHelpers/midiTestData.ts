import type { Note, Octave } from '../../../types/music';

/**
 * Test constants and data generators for MIDI utility tests
 * Centralizes test data similar to chordTestData.ts
 */

export const MIDI_TEST_CONSTANTS = {
  // MIDI note ranges
  MIDI_RANGES: {
    VALID_MIN: 0,
    VALID_MAX: 127,
    PLAYABLE_MIN: 12,
    PLAYABLE_MAX: 107,
    OUT_OF_RANGE_LOW: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    OUT_OF_RANGE_HIGH: [108, 109, 110, 115, 120, 127]
  },

  // Chromatic notes in order
  CHROMATIC_NOTES: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as Note[],

  // Natural notes (white keys)
  NATURAL_NOTES: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as Note[],

  // Sharp notes (black keys)
  SHARP_NOTES: ['C#', 'D#', 'F#', 'G#', 'A#'] as Note[],

  // Reference MIDI notes with descriptions
  REFERENCE_NOTES: {
    MIDDLE_C: { midi: 60, note: 'C' as Note, octave: 5 as Octave, description: 'Middle C (C5)' },
    A440: { midi: 69, note: 'A' as Note, octave: 5 as Octave, description: 'A440 (concert pitch)' },
    C1: { midi: 12, note: 'C' as Note, octave: 1 as Octave, description: 'C1 (lowest playable C)' },
    C8: { midi: 96, note: 'C' as Note, octave: 8 as Octave, description: 'C8 (highest playable C)' },
    B8: { midi: 107, note: 'B' as Note, octave: 8 as Octave, description: 'B8 (highest playable note)' }
  },

  // Octave to MIDI C note mapping
  OCTAVE_TO_MIDI_C: {
    1: 12, 2: 24, 3: 36, 4: 48,
    5: 60, 6: 72, 7: 84, 8: 96
  } as Record<Octave, number>,

  // All valid octaves
  ALL_OCTAVES: [1, 2, 3, 4, 5, 6, 7, 8] as Octave[],

  // MIDI channels (0-15)
  MIDI_CHANNELS: Array.from({ length: 16 }, (_, i) => i),

  // Velocity values
  VELOCITIES: {
    MIN: 0,
    MAX: 127,
    TYPICAL: [0, 1, 32, 64, 96, 127],
    EDGE_CASES: [0, 1, 127],
    NOTE_OFF: 0,
    QUIET: 32,
    MEDIUM: 64,
    LOUD: 96,
    MAXIMUM: 127
  },

  // MIDI status bytes
  STATUS_BYTES: {
    NOTE_OFF: 0x80,
    NOTE_ON: 0x90,
    POLY_PRESSURE: 0xA0,
    CONTROL_CHANGE: 0xB0,
    PROGRAM_CHANGE: 0xC0,
    CHANNEL_PRESSURE: 0xD0,
    PITCH_BEND: 0xE0,
    SYSTEM: 0xF0
  },

  // Invalid inputs for error testing
  INVALID_INPUTS: {
    NEGATIVE: [-1, -10, -100],
    ABOVE_MAX: [128, 200, 1000],
    DECIMALS: [1.5, 60.7, 127.3],
    SPECIAL: [NaN, Infinity, -Infinity]
  }
} as const;

/**
 * Generate a range of MIDI notes
 */
export function generateMidiNoteRange(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Generate all playable MIDI notes (12-107)
 */
export function generateAllPlayableMidiNotes(): number[] {
  return generateMidiNoteRange(
    MIDI_TEST_CONSTANTS.MIDI_RANGES.PLAYABLE_MIN,
    MIDI_TEST_CONSTANTS.MIDI_RANGES.PLAYABLE_MAX
  );
}

/**
 * Generate all valid MIDI notes (0-127)
 */
export function generateAllValidMidiNotes(): number[] {
  return generateMidiNoteRange(
    MIDI_TEST_CONSTANTS.MIDI_RANGES.VALID_MIN,
    MIDI_TEST_CONSTANTS.MIDI_RANGES.VALID_MAX
  );
}

/**
 * Generate test data for all chromatic notes in a specific octave
 */
export function generateAllChromaticNotesInOctave(octave: Octave) {
  return MIDI_TEST_CONSTANTS.CHROMATIC_NOTES.map((note, index) => ({
    note,
    octave,
    expectedMidi: octave * 12 + index
  }));
}

/**
 * Generate test data for a specific note across all octaves
 */
export function generateAllOctavesForNote(note: Note) {
  const noteIndex = MIDI_TEST_CONSTANTS.CHROMATIC_NOTES.indexOf(note);
  if (noteIndex === -1) {
    throw new Error(`Invalid note: ${note}`);
  }

  return MIDI_TEST_CONSTANTS.ALL_OCTAVES.map(octave => ({
    note,
    octave,
    expectedMidi: octave * 12 + noteIndex
  }));
}

/**
 * Generate all note/octave combinations for playable range
 */
export function generateAllPlayableNoteOctaveCombinations() {
  const combinations: Array<{ note: Note; octave: Octave; expectedMidi: number }> = [];

  for (const octave of MIDI_TEST_CONSTANTS.ALL_OCTAVES) {
    for (let noteIndex = 0; noteIndex < 12; noteIndex++) {
      const midi = octave * 12 + noteIndex;
      if (midi >= 12 && midi <= 107) {
        combinations.push({
          note: MIDI_TEST_CONSTANTS.CHROMATIC_NOTES[noteIndex],
          octave,
          expectedMidi: midi
        });
      }
    }
  }

  return combinations;
}

/**
 * Generate octave boundary test data
 */
export function generateOctaveBoundaries() {
  return MIDI_TEST_CONSTANTS.ALL_OCTAVES.map(octave => ({
    octave,
    firstMidi: octave * 12,
    firstNote: 'C' as Note,
    lastMidi: octave * 12 + 11,
    lastNote: 'B' as Note
  }));
}

/**
 * Generate test data for MIDI channels with note on/off
 */
export function generateChannelTestData() {
  return MIDI_TEST_CONSTANTS.MIDI_CHANNELS.map(channel => ({
    channel,
    noteOnStatus: 0x90 + channel,
    noteOffStatus: 0x80 + channel
  }));
}

/**
 * Generate velocity test data with expected behavior
 */
export function generateVelocityTestData() {
  return MIDI_TEST_CONSTANTS.VELOCITIES.TYPICAL.map(velocity => ({
    velocity,
    isNoteOn: velocity > 0,
    isNoteOff: velocity === 0,
    description: velocity === 0 ? 'note off' : velocity === 127 ? 'maximum' : `velocity ${velocity}`
  }));
}

/**
 * Generate error test cases for invalid MIDI notes
 */
export function generateInvalidMidiNoteTestCases() {
  return [
    ...MIDI_TEST_CONSTANTS.INVALID_INPUTS.NEGATIVE.map(input => ({
      input,
      description: `negative number (${input})`,
      expectedError: 'MIDI note number must be between 0 and 127'
    })),
    ...MIDI_TEST_CONSTANTS.INVALID_INPUTS.ABOVE_MAX.map(input => ({
      input,
      description: `above 127 (${input})`,
      expectedError: 'MIDI note number must be between 0 and 127'
    })),
    ...MIDI_TEST_CONSTANTS.INVALID_INPUTS.DECIMALS.map(input => ({
      input,
      description: `decimal (${input})`,
      expectedError: 'MIDI note number must be an integer'
    })),
    ...MIDI_TEST_CONSTANTS.INVALID_INPUTS.SPECIAL.map(input => ({
      input,
      description: `${input}`,
      expectedError: 'MIDI note number must be an integer'
    }))
  ];
}

/**
 * Generate out-of-range octave test cases
 */
export function generateOutOfRangeOctaveTestCases() {
  return [
    ...MIDI_TEST_CONSTANTS.MIDI_RANGES.OUT_OF_RANGE_LOW.map(midi => ({
      midi,
      octave: Math.floor(midi / 12),
      description: `octave ${Math.floor(midi / 12)} (too low)`
    })),
    ...MIDI_TEST_CONSTANTS.MIDI_RANGES.OUT_OF_RANGE_HIGH.map(midi => ({
      midi,
      octave: Math.floor(midi / 12),
      description: `octave ${Math.floor(midi / 12)} (too high)`
    }))
  ];
}
