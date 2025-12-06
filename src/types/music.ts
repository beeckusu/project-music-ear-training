export type Note = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

export type Octave = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface NoteWithOctave {
  note: Note;
  octave: Octave;
}

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type PracticeMode = 'note-identification' | 'note-repetition' | 'chord-recognition';

// Chord type definitions
export const ChordType = {
  // Triads
  MAJOR: 'major',
  MINOR: 'minor',
  DIMINISHED: 'diminished',
  AUGMENTED: 'augmented',

  // 7th Chords
  MAJOR_7: 'major7',
  DOMINANT_7: 'dominant7',
  MINOR_7: 'minor7',
  HALF_DIMINISHED_7: 'halfDiminished7',
  DIMINISHED_7: 'diminished7',

  // Extended Chords - 9ths
  MAJOR_9: 'major9',
  DOMINANT_9: 'dominant9',
  MINOR_9: 'minor9',

  // Extended Chords - 11ths
  MAJOR_11: 'major11',
  DOMINANT_11: 'dominant11',
  MINOR_11: 'minor11',

  // Extended Chords - 13ths
  MAJOR_13: 'major13',
  DOMINANT_13: 'dominant13',
  MINOR_13: 'minor13',

  // Suspended Chords
  SUS2: 'sus2',
  SUS4: 'sus4',

  // Added Tone Chords
  ADD9: 'add9',
  MAJOR_ADD9: 'majorAdd9',
  MINOR_ADD9: 'minorAdd9',
} as const;

export type ChordType = typeof ChordType[keyof typeof ChordType];

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

// Chord type categories for UI grouping and filtering
export const CHORD_TYPES = {
  TRIADS: [
    ChordType.MAJOR,
    ChordType.MINOR,
    ChordType.DIMINISHED,
    ChordType.AUGMENTED,
  ],
  SEVENTH_CHORDS: [
    ChordType.MAJOR_7,
    ChordType.DOMINANT_7,
    ChordType.MINOR_7,
    ChordType.HALF_DIMINISHED_7,
    ChordType.DIMINISHED_7,
  ],
  EXTENDED_CHORDS: [
    ChordType.MAJOR_9,
    ChordType.DOMINANT_9,
    ChordType.MINOR_9,
    ChordType.MAJOR_11,
    ChordType.DOMINANT_11,
    ChordType.MINOR_11,
    ChordType.MAJOR_13,
    ChordType.DOMINANT_13,
    ChordType.MINOR_13,
  ],
  SUSPENDED: [
    ChordType.SUS2,
    ChordType.SUS4,
  ],
  ADDED_TONES: [
    ChordType.ADD9,
    ChordType.MAJOR_ADD9,
    ChordType.MINOR_ADD9,
  ],
} as const;

// Helper to get all chord types as a flat array
export const ALL_CHORD_TYPES = Object.values(CHORD_TYPES).flat();

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