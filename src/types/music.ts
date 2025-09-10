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

export interface AppSettings {
  noteFilter: NoteFilter;
}

export const DEFAULT_NOTE_FILTER: NoteFilter = {
  octaveRange: { min: 4, max: 4 },
  keyType: 'all',
  allowedNotes: undefined
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