import type { MidiMessage } from '../../midiUtils';
import { MIDI_TEST_CONSTANTS } from './midiTestData';

/**
 * Builder pattern for creating MIDI messages in tests
 * Similar to ChordFilterBuilder but for MIDI messages
 * Makes test code more readable and maintainable
 */
export class MidiMessageBuilder {
  private status: number = MIDI_TEST_CONSTANTS.STATUS_BYTES.NOTE_ON; // Default: note on, channel 0
  private data1: number = 60; // Default: middle C
  private data2?: number = 64; // Default: medium velocity

  /**
   * Set message as note on for a specific channel
   */
  noteOn(channel: number = 0): this {
    this.status = MIDI_TEST_CONSTANTS.STATUS_BYTES.NOTE_ON + channel;
    return this;
  }

  /**
   * Set message as note off for a specific channel
   */
  noteOff(channel: number = 0): this {
    this.status = MIDI_TEST_CONSTANTS.STATUS_BYTES.NOTE_OFF + channel;
    return this;
  }

  /**
   * Set MIDI channel (0-15)
   */
  channel(ch: number): this {
    const messageType = this.status & 0xF0;
    this.status = messageType + ch;
    return this;
  }

  /**
   * Set note number (data1)
   */
  note(noteNumber: number): this {
    this.data1 = noteNumber;
    return this;
  }

  /**
   * Set velocity (data2)
   */
  velocity(vel: number): this {
    this.data2 = vel;
    return this;
  }

  /**
   * Set as note on with velocity 0 (alternative way to send note off)
   */
  noteOnVelocityZero(channel: number = 0): this {
    this.status = MIDI_TEST_CONSTANTS.STATUS_BYTES.NOTE_ON + channel;
    this.data2 = 0;
    return this;
  }

  /**
   * Set custom status byte
   */
  customStatus(statusByte: number): this {
    this.status = statusByte;
    return this;
  }

  /**
   * Set data1 byte directly
   */
  setData1(value: number): this {
    this.data1 = value;
    return this;
  }

  /**
   * Set data2 byte directly
   */
  setData2(value: number | undefined): this {
    this.data2 = value;
    return this;
  }

  /**
   * Set as polyphonic key pressure
   */
  polyPressure(channel: number = 0): this {
    this.status = MIDI_TEST_CONSTANTS.STATUS_BYTES.POLY_PRESSURE + channel;
    return this;
  }

  /**
   * Set as control change
   */
  controlChange(channel: number = 0): this {
    this.status = MIDI_TEST_CONSTANTS.STATUS_BYTES.CONTROL_CHANGE + channel;
    return this;
  }

  /**
   * Set as program change
   */
  programChange(channel: number = 0): this {
    this.status = MIDI_TEST_CONSTANTS.STATUS_BYTES.PROGRAM_CHANGE + channel;
    return this;
  }

  /**
   * Build the final MIDI message
   */
  build(): MidiMessage {
    return {
      status: this.status,
      data1: this.data1,
      data2: this.data2
    };
  }

  /**
   * Static factory method
   */
  static create(): MidiMessageBuilder {
    return new MidiMessageBuilder();
  }
}

/**
 * Convenience function to create a MIDI message builder
 */
export function createMidiMessage(): MidiMessageBuilder {
  return new MidiMessageBuilder();
}

/**
 * Preset message creators for common MIDI messages
 * Provides a quick way to create common message types
 */
export const MidiMessages = {
  /**
   * Create a note on message
   */
  noteOn: (note: number = 60, velocity: number = 64, channel: number = 0): MidiMessage =>
    createMidiMessage().noteOn(channel).note(note).velocity(velocity).build(),

  /**
   * Create a note off message
   */
  noteOff: (note: number = 60, velocity: number = 64, channel: number = 0): MidiMessage =>
    createMidiMessage().noteOff(channel).note(note).velocity(velocity).build(),

  /**
   * Create a note on message with velocity 0 (alternative note off)
   */
  noteOnVelocityZero: (note: number = 60, channel: number = 0): MidiMessage =>
    createMidiMessage().noteOnVelocityZero(channel).note(note).build(),

  /**
   * Create a control change message
   */
  controlChange: (controller: number, value: number, channel: number = 0): MidiMessage =>
    createMidiMessage().controlChange(channel).setData1(controller).setData2(value).build(),

  /**
   * Create a program change message
   */
  programChange: (program: number, channel: number = 0): MidiMessage =>
    createMidiMessage().programChange(channel).setData1(program).setData2(undefined).build(),

  /**
   * Create middle C note on
   */
  middleC: (velocity: number = 64): MidiMessage =>
    MidiMessages.noteOn(MIDI_TEST_CONSTANTS.REFERENCE_NOTES.MIDDLE_C.midi, velocity),

  /**
   * Create A440 note on
   */
  a440: (velocity: number = 64): MidiMessage =>
    MidiMessages.noteOn(MIDI_TEST_CONSTANTS.REFERENCE_NOTES.A440.midi, velocity)
};

/**
 * Create multiple note on messages for different channels
 */
export function createNoteOnAllChannels(
  note: number = 60,
  velocity: number = 64
): MidiMessage[] {
  return MIDI_TEST_CONSTANTS.MIDI_CHANNELS.map(channel =>
    MidiMessages.noteOn(note, velocity, channel)
  );
}

/**
 * Create multiple note off messages for different channels
 */
export function createNoteOffAllChannels(
  note: number = 60,
  velocity: number = 64
): MidiMessage[] {
  return MIDI_TEST_CONSTANTS.MIDI_CHANNELS.map(channel =>
    MidiMessages.noteOff(note, velocity, channel)
  );
}

/**
 * Create note on messages with different velocities
 */
export function createNoteOnVelocityVariations(
  note: number = 60,
  channel: number = 0
): MidiMessage[] {
  return MIDI_TEST_CONSTANTS.VELOCITIES.TYPICAL.map(velocity =>
    MidiMessages.noteOn(note, velocity, channel)
  );
}
