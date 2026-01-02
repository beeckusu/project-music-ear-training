import type { Note, NoteWithOctave, Octave } from '../types/music';

/**
 * Maps a MIDI note number (0-127) to a Note type (chromatic note name).
 *
 * MIDI note numbering (in our system where lowest playable octave is 1):
 * - C0 = 0
 * - C1 = 12
 * - C2 = 24
 * - C3 = 36
 * - C4 = 48
 * - C5 (Middle C) = 60
 * - C6 = 72
 * - C7 = 84
 * - C8 = 96
 * - B8 (highest playable) = 107
 * - G9 = 127
 */
const CHROMATIC_NOTES: Note[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Converts a MIDI note number (0-127) to a NoteWithOctave object.
 *
 * @param midiNoteNumber - MIDI note number (0-127)
 * @returns NoteWithOctave object with note name and octave
 * @throws Error if MIDI note number is invalid or results in octave outside valid range (1-8)
 *
 * @example
 * midiNoteToNoteWithOctave(60) // Returns { note: 'C', octave: 5 } (Middle C)
 * midiNoteToNoteWithOctave(69) // Returns { note: 'A', octave: 5 } (A440)
 */
export function midiNoteToNoteWithOctave(midiNoteNumber: number): NoteWithOctave {
  // Validate input
  if (!Number.isInteger(midiNoteNumber)) {
    throw new Error('MIDI note number must be an integer');
  }

  if (midiNoteNumber < 0 || midiNoteNumber > 127) {
    throw new Error('MIDI note number must be between 0 and 127');
  }

  // Calculate note and octave
  // Our octave numbering: MIDI 12 = C1, MIDI 24 = C2, etc.
  // octave = floor(midiNote / 12)
  const noteIndex = midiNoteNumber % 12;
  const octave = Math.floor(midiNoteNumber / 12);

  // Validate octave is within our supported range (1-8)
  if (octave < 1 || octave > 8) {
    throw new Error(`MIDI note ${midiNoteNumber} maps to octave ${octave}, which is outside the valid range (1-8)`);
  }

  const note = CHROMATIC_NOTES[noteIndex];

  return {
    note,
    octave: octave as Octave
  };
}

/**
 * Validates a MIDI note number.
 *
 * @param midiNoteNumber - The number to validate
 * @returns true if valid, false otherwise
 */
export function isValidMidiNote(midiNoteNumber: number): boolean {
  return (
    Number.isInteger(midiNoteNumber) &&
    midiNoteNumber >= 0 &&
    midiNoteNumber <= 127
  );
}

/**
 * Validates a MIDI note number and checks if it maps to a playable octave (1-8).
 *
 * @param midiNoteNumber - The MIDI note number to validate
 * @returns true if valid and playable, false otherwise
 */
export function isPlayableMidiNote(midiNoteNumber: number): boolean {
  if (!isValidMidiNote(midiNoteNumber)) {
    return false;
  }

  const octave = Math.floor(midiNoteNumber / 12);
  return octave >= 1 && octave <= 8;
}

/**
 * Converts a NoteWithOctave to a MIDI note number.
 *
 * @param noteWithOctave - The note with octave to convert
 * @returns MIDI note number (0-127)
 *
 * @example
 * noteWithOctaveToMidiNote({ note: 'C', octave: 5 }) // Returns 60 (Middle C)
 * noteWithOctaveToMidiNote({ note: 'A', octave: 5 }) // Returns 69 (A440)
 */
export function noteWithOctaveToMidiNote(noteWithOctave: NoteWithOctave): number {
  const { note, octave } = noteWithOctave;

  const noteIndex = CHROMATIC_NOTES.indexOf(note);
  if (noteIndex === -1) {
    throw new Error(`Invalid note: ${note}`);
  }

  // MIDI formula: midiNote = octave * 12 + noteIndex
  const midiNote = octave * 12 + noteIndex;

  if (midiNote < 0 || midiNote > 127) {
    throw new Error(`Note ${note}${octave} maps to MIDI note ${midiNote}, which is outside valid range (0-127)`);
  }

  return midiNote;
}

/**
 * Type guard for MIDI message data.
 * Web MIDI API message format: [status, data1, data2]
 */
export interface MidiMessage {
  status: number;
  data1: number;
  data2?: number;
}

/**
 * MIDI status byte constants
 */
export const MIDI_STATUS = {
  NOTE_OFF: 0x80,      // 128
  NOTE_ON: 0x90,       // 144
  NOTE_ON_MASK: 0xF0,  // Mask to get message type (ignoring channel)
} as const;

/**
 * Checks if a MIDI message is a note on event.
 *
 * @param message - MIDI message data
 * @returns true if message is note on with non-zero velocity
 */
export function isNoteOnMessage(message: MidiMessage): boolean {
  const statusByte = message.status & MIDI_STATUS.NOTE_ON_MASK;
  return statusByte === MIDI_STATUS.NOTE_ON && (message.data2 ?? 0) > 0;
}

/**
 * Checks if a MIDI message is a note off event.
 * Note: Note on with velocity 0 is also treated as note off.
 *
 * @param message - MIDI message data
 * @returns true if message is note off or note on with zero velocity
 */
export function isNoteOffMessage(message: MidiMessage): boolean {
  const statusByte = message.status & MIDI_STATUS.NOTE_ON_MASK;
  return (
    statusByte === MIDI_STATUS.NOTE_OFF ||
    (statusByte === MIDI_STATUS.NOTE_ON && (message.data2 ?? 0) === 0)
  );
}

/**
 * Extracts the MIDI note number from a MIDI message.
 *
 * @param message - MIDI message data
 * @returns MIDI note number (0-127) or null if invalid
 */
export function getMidiNoteFromMessage(message: MidiMessage): number | null {
  if (!isValidMidiNote(message.data1)) {
    return null;
  }
  return message.data1;
}

/**
 * Extracts the velocity from a MIDI message.
 *
 * @param message - MIDI message data
 * @returns Velocity (0-127) or null if not present
 */
export function getVelocityFromMessage(message: MidiMessage): number | null {
  const velocity = message.data2;
  if (velocity === undefined || velocity < 0 || velocity > 127) {
    return null;
  }
  return velocity;
}
