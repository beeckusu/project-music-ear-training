import type { NoteWithOctave } from './music';

/**
 * MIDI connection status states
 */
export type MidiConnectionStatus =
  | 'connected'      // Successfully connected to a MIDI device
  | 'disconnected'   // Not connected to any device
  | 'initializing'   // Currently requesting MIDI access
  | 'error'          // Error occurred during initialization or connection
  | 'unsupported';   // Browser doesn't support Web MIDI API

/**
 * Information about a MIDI device
 */
export interface MidiDeviceInfo {
  /** Unique device identifier */
  id: string;
  /** Device manufacturer name */
  manufacturer: string;
  /** Device model/product name */
  name: string;
  /** Device connection state */
  state: 'connected' | 'disconnected';
  /** Device type (always 'input' for our use case) */
  type: 'input' | 'output';
}

/**
 * Parsed MIDI note event with musical context
 */
export interface MidiNoteEvent {
  /** Musical note with octave */
  note: NoteWithOctave;
  /** MIDI note number (0-127) */
  midiNote: number;
  /** Velocity (0-127) */
  velocity: number;
  /** Timestamp from MIDI event */
  timestamp: number;
}

/**
 * MIDI error types
 */
export type MidiErrorType =
  | 'permission_denied'    // User denied MIDI access
  | 'not_supported'        // Browser doesn't support Web MIDI API
  | 'device_error'         // Error with MIDI device
  | 'initialization_error' // Error during initialization
  | 'unknown';             // Unknown error

/**
 * MIDI error with context
 */
export interface MidiError {
  /** Error type */
  type: MidiErrorType;
  /** Human-readable error message */
  message: string;
  /** Original error object if available */
  originalError?: Error;
}

/**
 * Event map for MidiManager events
 * Used for type-safe event subscription
 */
export interface MidiManagerEvents {
  /** Emitted when a MIDI note on event is received */
  noteOn: MidiNoteEvent;
  /** Emitted when a MIDI note off event is received */
  noteOff: MidiNoteEvent;
  /** Emitted when any MIDI message is received */
  message: { data: Uint8Array; timestamp: number };
  /** Emitted when a MIDI device is connected */
  deviceConnected: MidiDeviceInfo;
  /** Emitted when a MIDI device is disconnected */
  deviceDisconnected: MidiDeviceInfo;
  /** Emitted when connection status changes */
  statusChange: MidiConnectionStatus;
  /** Emitted when an error occurs */
  error: MidiError;
}
