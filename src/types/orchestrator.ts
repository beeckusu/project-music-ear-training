import type { NoteWithOctave, Chord, NoteHighlight } from './music';

/**
 * Strategy type enum for determining which orchestration strategy to use
 */
export type StrategyType = 'ear-training' | 'chord-training';

/**
 * Generic context object for round state
 * Supports both ear training (single note) and chord training (multi-note) modes
 */
export interface RoundContext {
  /** When the round started */
  startTime: Date;

  /** Time elapsed since round start (in milliseconds) */
  elapsedTime: number;

  // Ear training fields (optional)
  /** The note to identify (ear training mode) */
  note?: NoteWithOctave;

  // Chord training fields (optional)
  /** The chord to work with (chord training mode) */
  chord?: Chord;

  /** Notes to display on the piano (chord training mode) */
  displayNotes?: NoteWithOctave[];

  /** Notes the user has selected (chord training mode) */
  selectedNotes?: Set<NoteWithOctave>;

  /** Visual highlights to apply to piano keys */
  noteHighlights?: NoteHighlight[];
}
