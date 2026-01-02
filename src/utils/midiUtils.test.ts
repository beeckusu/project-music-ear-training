import { describe, it, expect } from 'vitest';
import {
  midiNoteToNoteWithOctave,
  isValidMidiNote,
  isPlayableMidiNote,
  noteWithOctaveToMidiNote,
  isNoteOnMessage,
  isNoteOffMessage,
  getMidiNoteFromMessage,
  getVelocityFromMessage,
  MIDI_STATUS
} from './midiUtils';
import type { Note, Octave } from '../types/music';

// Import test helpers
import {
  // MIDI test data
  MIDI_TEST_CONSTANTS,
  generateAllPlayableMidiNotes,
  generateAllChromaticNotesInOctave,
  generateAllOctavesForNote,
  generateOctaveBoundaries,
  generateChannelTestData,
  generateVelocityTestData,
  generateInvalidMidiNoteTestCases,
  generateOutOfRangeOctaveTestCases,
  // MIDI assertions
  assertRoundTripConversion,
  assertMidiNoteThrows,
  assertValidNoteWithOctave,
  // MIDI message builder
  MidiMessages,
  createMidiMessage,
  createNoteOnAllChannels,
  createNoteOffAllChannels,
  createNoteOnVelocityVariations,
  // MIDI test helpers
  testAllPlayableMidiNotes,
  verifyConversionConsistency,
  // Common utilities
  generateRange
} from './__tests__/testHelpers';

describe('midiUtils', () => {
  describe('midiNoteToNoteWithOctave', () => {
    describe('Reference Notes', () => {
      it.each(Object.values(MIDI_TEST_CONSTANTS.REFERENCE_NOTES))(
        'should correctly convert $description',
        ({ midi, note, octave }) => {
          const result = midiNoteToNoteWithOctave(midi);
          expect(result).toEqual({ note, octave });
        }
      );
    });

    describe('All Chromatic Notes Across All Octaves', () => {
      it.each(
        MIDI_TEST_CONSTANTS.ALL_OCTAVES.flatMap(octave =>
          generateAllChromaticNotesInOctave(octave)
        )
      )('should convert MIDI $expectedMidi to $note$octave', ({ note, octave, expectedMidi }) => {
        const result = midiNoteToNoteWithOctave(expectedMidi);
        expect(result).toEqual({ note, octave });
      });
    });

    describe('Octave Boundaries', () => {
      it.each(generateOctaveBoundaries())(
        'octave $octave should start at $firstNote (MIDI $firstMidi) and end at $lastNote (MIDI $lastMidi)',
        ({ octave, firstMidi, firstNote, lastMidi, lastNote }) => {
          expect(midiNoteToNoteWithOctave(firstMidi)).toEqual({ note: firstNote, octave });
          expect(midiNoteToNoteWithOctave(lastMidi)).toEqual({ note: lastNote, octave });
        }
      );
    });

    describe('Specific Notes Across Octaves', () => {
      it.each(
        MIDI_TEST_CONSTANTS.CHROMATIC_NOTES.flatMap((note, noteIndex) =>
          MIDI_TEST_CONSTANTS.ALL_OCTAVES
            .map(octave => ({ note, octave, expectedMidi: octave * 12 + noteIndex }))
            .filter(({ expectedMidi }) => expectedMidi >= 12 && expectedMidi <= 107)
        )
      )('should map $note across octave $octave (MIDI $expectedMidi)', ({ note, octave, expectedMidi }) => {
        const result = midiNoteToNoteWithOctave(expectedMidi);
        expect(result).toEqual({ note, octave });
      });
    });

    describe('Invalid Input Handling', () => {
      it.each(generateInvalidMidiNoteTestCases())(
        'should throw "$expectedError" for $description',
        ({ input, expectedError }) => {
          assertMidiNoteThrows(input, expectedError);
        }
      );

      it.each(generateOutOfRangeOctaveTestCases())(
        'should throw for MIDI $midi mapping to $description',
        ({ midi }) => {
          assertMidiNoteThrows(midi, /outside the valid range/);
        }
      );
    });
  });

  describe('isValidMidiNote', () => {
    it.each(
      generateRange(0, 127).map(midi => ({ midi, expected: true }))
    )('should return true for valid MIDI note $midi', ({ midi, expected }) => {
      expect(isValidMidiNote(midi)).toBe(expected);
    });

    it.each([
      ...MIDI_TEST_CONSTANTS.INVALID_INPUTS.NEGATIVE.map(midi => ({ midi, expected: false })),
      ...MIDI_TEST_CONSTANTS.INVALID_INPUTS.ABOVE_MAX.map(midi => ({ midi, expected: false })),
      ...MIDI_TEST_CONSTANTS.INVALID_INPUTS.DECIMALS.map(midi => ({ midi, expected: false })),
      ...MIDI_TEST_CONSTANTS.INVALID_INPUTS.SPECIAL.map(midi => ({ midi, expected: false }))
    ])('should return false for invalid input $midi', ({ midi, expected }) => {
      expect(isValidMidiNote(midi)).toBe(expected);
    });
  });

  describe('isPlayableMidiNote', () => {
    it.each(
      generateRange(12, 107).map(midi => ({ midi, expected: true }))
    )('should return true for playable MIDI note $midi', ({ midi, expected }) => {
      expect(isPlayableMidiNote(midi)).toBe(expected);
    });

    it.each([
      ...generateRange(0, 11).map(midi => ({ midi, expected: false, reason: 'octave too low' })),
      ...generateRange(108, 127).map(midi => ({ midi, expected: false, reason: 'octave too high' })),
      ...MIDI_TEST_CONSTANTS.INVALID_INPUTS.NEGATIVE.map(midi => ({ midi, expected: false, reason: 'negative' })),
      ...MIDI_TEST_CONSTANTS.INVALID_INPUTS.ABOVE_MAX.map(midi => ({ midi, expected: false, reason: 'above 127' }))
    ])('should return false for $reason (MIDI $midi)', ({ midi, expected }) => {
      expect(isPlayableMidiNote(midi)).toBe(expected);
    });
  });

  describe('noteWithOctaveToMidiNote', () => {
    describe('Round-trip Conversion', () => {
      it('should correctly convert all playable MIDI notes to NoteWithOctave and back', () => {
        testAllPlayableMidiNotes((midiNote) => {
          assertRoundTripConversion(midiNote);
        });
      });
    });

    describe('All Chromatic Notes', () => {
      it.each(generateAllChromaticNotesInOctave(5 as Octave))(
        'should convert $note$octave to MIDI $expectedMidi',
        ({ note, octave, expectedMidi }) => {
          const result = noteWithOctaveToMidiNote({ note, octave });
          expect(result).toBe(expectedMidi);
        }
      );
    });

    describe('Multiple Octaves', () => {
      it.each(
        MIDI_TEST_CONSTANTS.ALL_OCTAVES.map(octave => ({
          note: 'C' as Note,
          octave,
          expectedMidi: octave * 12
        }))
      )('should convert C in octave $octave to MIDI $expectedMidi', ({ note, octave, expectedMidi }) => {
        const result = noteWithOctaveToMidiNote({ note, octave });
        expect(result).toBe(expectedMidi);
      });
    });
  });

  describe('MIDI Message Handling', () => {
    describe('isNoteOnMessage', () => {
      it.each(
        createNoteOnAllChannels().map((message, channel) => ({
          message,
          channel,
          expected: true
        }))
      )('should recognize note on message on channel $channel', ({ message, expected }) => {
        expect(isNoteOnMessage(message)).toBe(expected);
      });

      it.each(generateVelocityTestData())(
        'should handle $description correctly',
        ({ velocity, isNoteOn }) => {
          const message = MidiMessages.noteOn(60, velocity);
          expect(isNoteOnMessage(message)).toBe(isNoteOn);
        }
      );

      it.each([
        { message: MidiMessages.noteOff(), expected: false, description: 'note off message' },
        { message: createMidiMessage().controlChange().build(), expected: false, description: 'control change' },
        { message: createMidiMessage().programChange().build(), expected: false, description: 'program change' }
      ])('should return false for $description', ({ message, expected }) => {
        expect(isNoteOnMessage(message)).toBe(expected);
      });
    });

    describe('isNoteOffMessage', () => {
      it.each(
        createNoteOffAllChannels().map((message, channel) => ({
          message,
          channel,
          expected: true
        }))
      )('should recognize note off message on channel $channel', ({ message, expected }) => {
        expect(isNoteOffMessage(message)).toBe(expected);
      });

      it.each([
        { message: MidiMessages.noteOnVelocityZero(), expected: true, description: 'note on with velocity 0' },
        { message: MidiMessages.noteOff(), expected: true, description: 'explicit note off' },
        { message: MidiMessages.noteOn(), expected: false, description: 'note on with non-zero velocity' }
      ])('should return $expected for $description', ({ message, expected }) => {
        expect(isNoteOffMessage(message)).toBe(expected);
      });
    });

    describe('getMidiNoteFromMessage', () => {
      it.each(
        Object.values(MIDI_TEST_CONSTANTS.REFERENCE_NOTES).map(({ midi, description }) => ({
          midi,
          description
        }))
      )('should extract $description from message', ({ midi }) => {
        const message = MidiMessages.noteOn(midi);
        expect(getMidiNoteFromMessage(message)).toBe(midi);
      });

      it.each([
        { data1: -1, description: 'negative note number' },
        { data1: 128, description: 'note number above 127' }
      ])('should return null for $description', ({ data1 }) => {
        const message = createMidiMessage().setData1(data1).build();
        expect(getMidiNoteFromMessage(message)).toBeNull();
      });
    });

    describe('getVelocityFromMessage', () => {
      it.each(MIDI_TEST_CONSTANTS.VELOCITIES.TYPICAL.map(velocity => ({ velocity })))(
        'should extract velocity $velocity from message',
        ({ velocity }) => {
          const message = MidiMessages.noteOn(60, velocity);
          expect(getVelocityFromMessage(message)).toBe(velocity);
        }
      );

      it.each([
        { data2: undefined, description: 'missing velocity' },
        { data2: -1, description: 'negative velocity' },
        { data2: 128, description: 'velocity above 127' }
      ])('should return null for $description', ({ data2 }) => {
        const message = createMidiMessage().setData2(data2).build();
        expect(getVelocityFromMessage(message)).toBeNull();
      });
    });
  });

  describe('MIDI Constants', () => {
    it('should have correct MIDI status constants', () => {
      expect(MIDI_STATUS.NOTE_OFF).toBe(0x80);
      expect(MIDI_STATUS.NOTE_ON).toBe(0x90);
      expect(MIDI_STATUS.NOTE_ON_MASK).toBe(0xF0);
    });
  });

  describe('Comprehensive Integration Tests', () => {
    describe('All Valid MIDI Channels', () => {
      it.each(generateChannelTestData())(
        'should handle note on/off on channel $channel',
        ({ channel, noteOnStatus, noteOffStatus }) => {
          const noteOn = createMidiMessage().customStatus(noteOnStatus).note(60).velocity(64).build();
          const noteOff = createMidiMessage().customStatus(noteOffStatus).note(60).velocity(0).build();

          expect(isNoteOnMessage(noteOn)).toBe(true);
          expect(isNoteOffMessage(noteOff)).toBe(true);
        }
      );
    });

    describe('Velocity Edge Cases', () => {
      it.each(generateVelocityTestData())(
        'should correctly identify $description as on=$isNoteOn off=$isNoteOff',
        ({ velocity, isNoteOn, isNoteOff }) => {
          const message = MidiMessages.noteOn(60, velocity);
          expect(isNoteOnMessage(message)).toBe(isNoteOn);
          expect(isNoteOffMessage(message)).toBe(isNoteOff);
        }
      );
    });

    describe('Conversion Consistency', () => {
      it('should maintain consistency across all playable notes', () => {
        const stats = verifyConversionConsistency(12, 107);

        expect(stats.passed).toBe(96); // All 96 playable notes (12-107)
        expect(stats.failed).toBe(0);
        expect(stats.failedNotes).toHaveLength(0);
      });

      it('should correctly handle out-of-range notes', () => {
        const stats = verifyConversionConsistency(0, 127);

        // Should have 96 passed (12-107) and 32 out of range (0-11, 108-127)
        expect(stats.passed).toBe(96);
        expect(stats.outOfRange).toBe(32);
      });
    });

    describe('Note Validation', () => {
      it('all converted notes should be valid NoteWithOctave objects', () => {
        testAllPlayableMidiNotes((_, noteWithOctave) => {
          assertValidNoteWithOctave(noteWithOctave);
        });
      });
    });
  });
});
