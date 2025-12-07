export type Note = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

export type Octave = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface NoteWithOctave {
  note: Note;
  octave: Octave;
}

/**
 * Chord type representing different chord qualities
 * Includes triads, seventh chords, extended chords, suspended, and added tone chords
 */
export type ChordType =
  // Triads
  | 'major'
  | 'minor'
  | 'diminished'
  | 'augmented'
  // Seventh chords
  | 'major7'
  | 'minor7'
  | 'dominant7'
  | 'diminished7'
  | 'halfDiminished7'
  // Extended chords
  | 'major9'
  | 'minor9'
  | 'dominant9'
  | 'major11'
  | 'minor11'
  | 'dominant11'
  // Suspended chords
  | 'sus2'
  | 'sus4'
  // Added tone chords
  | 'add9'
  | 'add11';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type PracticeMode = 'note-identification' | 'note-repetition' | 'chord-recognition';

export interface PracticeSettings {
  mode: PracticeMode;
  difficulty: Difficulty;
  instrument: string;
  octaveRange: {
    min: Octave;
    max: Octave;
  };
}

export interface PracticeSession {
  correct: number;
  total: number;
  startTime: Date;
  endTime?: Date;
}

export type KeyType = 'white' | 'black' | 'all';

export interface NoteFilter {
  octaveRange: {
    min: Octave;
    max: Octave;
  };
  keyType: KeyType;
  allowedNotes?: Note[];
}

/**
 * Represents a musical chord with all its component notes
 */
export interface Chord {
  /** The full name of the chord (e.g., "C Major", "Am7", "Fdim") */
  name: string;

  /** The root note of the chord */
  root: Note;

  /** The type of chord (major, minor, diminished, etc.) */
  type: ChordType;

  /** The actual notes in the chord, sorted by pitch from low to high */
  notes: NoteWithOctave[];

  /** Optional inversion number (0 = root position, 1 = first inversion, etc.) */
  inversion?: number;
}


export type NoteDuration = '8n' | '4n' | '2n' | '1n';

export const InstrumentType = {
  SYNTH: 'synth',
  PIANO: 'piano',
  FM: 'fm',
  MONO: 'mono'
} as const;

export type InstrumentType = typeof InstrumentType[keyof typeof InstrumentType];

export interface AudioSettings {
  volume: number; // 0-100
  instrument: InstrumentType;
}

export interface TimingSettings {
  responseTimeLimit: number | null; // seconds, null = unlimited
  autoAdvanceSpeed: number; // seconds
  noteDuration: NoteDuration;
}


export const DEFAULT_NOTE_FILTER: NoteFilter = {
  octaveRange: { min: 4, max: 4 },
  keyType: 'white',
  allowedNotes: ['C'] // Only C for easier debugging
};

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  volume: 0,
  instrument: InstrumentType.SYNTH
};

export const DEFAULT_TIMING_SETTINGS: TimingSettings = {
  responseTimeLimit: 3, // 3 seconds default
  autoAdvanceSpeed: 1.5, // 1.5 seconds auto-advance
  noteDuration: '2n' // half note default
};


export const WHITE_KEYS: Note[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
export const BLACK_KEYS: Note[] = ['C#', 'D#', 'F#', 'G#', 'A#'];
export const ALL_NOTES: Note[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function isNotePlayable(noteWithOctave: NoteWithOctave, filter: NoteFilter): boolean {
  const { note, octave } = noteWithOctave;
  const { octaveRange, keyType, allowedNotes } = filter;

  // Check octave range
  if (octave < octaveRange.min || octave > octaveRange.max) {
    return false;
  }

  // Check key type filter
  if (keyType === 'white' && BLACK_KEYS.includes(note)) {
    return false;
  }
  if (keyType === 'black' && WHITE_KEYS.includes(note)) {
    return false;
  }

  // Check specific allowed notes
  if (allowedNotes && !allowedNotes.includes(note)) {
    return false;
  }

  return true;
}

/**
 * Type guard to check if a value is a valid NoteWithOctave
 */
export function isNoteWithOctave(value: unknown): value is NoteWithOctave {
  if (!value || typeof value !== 'object') return false;

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.note === 'string' &&
    typeof obj.octave === 'number' &&
    obj.octave >= 1 &&
    obj.octave <= 8
  );
}

/**
 * Type guard to check if a value is a valid Chord
 */
export function isChord(value: unknown): value is Chord {
  if (!value || typeof value !== 'object') return false;

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.name === 'string' &&
    typeof obj.root === 'string' &&
    typeof obj.type === 'string' &&
    Array.isArray(obj.notes) &&
    obj.notes.every(isNoteWithOctave) &&
    (obj.inversion === undefined || typeof obj.inversion === 'number')
  );
}