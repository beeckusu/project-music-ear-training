export type Note = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

export type Octave = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface NoteWithOctave {
  note: Note;
  octave: Octave;
}

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

export interface GuessAttempt {
  id: string;
  timestamp: Date;
  actualNote: NoteWithOctave;
  guessedNote: NoteWithOctave | null;
  isCorrect: boolean;
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

export type ModeType = 'rush' | 'survival' | 'sandbox';

export interface RushModeSettings {
  targetNotes: number; // Number of correct notes to hit
}

export interface SurvivalModeSettings {
  sessionDuration: number; // Minutes to survive
  healthDrainRate: number; // Health lost per second
  healthRecovery: number; // Health gained per correct note
  healthDamage: number; // Health lost per wrong note
}

export interface SandboxModeSettings {
  sessionDuration: number; // Minutes to practice
  targetAccuracy?: number; // Optional accuracy target
  targetStreak?: number; // Optional streak target
}

export interface ModeSettings {
  selectedMode: ModeType;
  rush: RushModeSettings;
  survival: SurvivalModeSettings;
  sandbox: SandboxModeSettings;
}

export interface AppSettings {
  noteFilter: NoteFilter;
  timing: TimingSettings;
  audio: AudioSettings;
  modes: ModeSettings;
}

export const DEFAULT_NOTE_FILTER: NoteFilter = {
  octaveRange: { min: 4, max: 4 },
  keyType: 'all',
  allowedNotes: undefined
};

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  volume: 75,
  instrument: InstrumentType.SYNTH
};

export const DEFAULT_TIMING_SETTINGS: TimingSettings = {
  responseTimeLimit: 10, // 10 seconds default
  autoAdvanceSpeed: 1.5, // 1.5 seconds auto-advance
  noteDuration: '2n' // half note default
};

export const DEFAULT_MODE_SETTINGS: ModeSettings = {
  selectedMode: 'sandbox',
  rush: {
    targetNotes: 25
  },
  survival: {
    sessionDuration: 1, // 1 minute
    healthDrainRate: 2, // 2 health per second
    healthRecovery: 15, // 15 health per correct note
    healthDamage: 25 // 25 health per wrong note
  },
  sandbox: {
    sessionDuration: 1, // 1 minute
    targetAccuracy: 80,
    targetStreak: 10
  }
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