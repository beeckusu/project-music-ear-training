import type { NoteWithOctave, Chord, NoteHighlight } from './music';

/**
 * Strategy type enum for determining which orchestration strategy to use
 */
export type StrategyType = 'ear-training' | 'chord-training';

/**
 * Generic context object for round state
 *
 * This context provides a mode-agnostic interface for both ear training and chord training modes.
 * Each ModeStrategy implementation should populate the relevant fields based on its mode type.
 *
 * Usage by mode type:
 * - Ear Training: Populate `note` with the challenge note, leave chord fields undefined
 * - Chord Training: Populate `chord` and `displayNotes` with the challenge, leave `note` undefined
 *
 * @example Ear Training Strategy
 * ```typescript
 * const context: RoundContext = {
 *   startTime: new Date(),
 *   elapsedTime: 0,
 *   note: { name: 'C', octave: 4 },
 *   noteHighlights: []
 * };
 * ```
 *
 * @example Chord Training Strategy
 * ```typescript
 * const context: RoundContext = {
 *   startTime: new Date(),
 *   elapsedTime: 0,
 *   chord: { root: 'C', type: 'major' },
 *   displayNotes: [{ name: 'C', octave: 4 }, { name: 'E', octave: 4 }, { name: 'G', octave: 4 }],
 *   selectedNotes: new Set(),
 *   noteHighlights: []
 * };
 * ```
 */
export interface RoundContext {
  /** When the round started - used for calculating elapsed time and performance metrics */
  startTime: Date;

  /** Time elapsed since round start (in milliseconds) - updated throughout the round */
  elapsedTime: number;

  // Ear training fields (optional)
  /**
   * The note to identify (ear training mode only)
   * When populated, this is the challenge note the user must identify by ear
   */
  note?: NoteWithOctave;

  // Chord training fields (optional)
  /**
   * The chord to work with (chord training mode only)
   * Represents the chord the user is learning or identifying
   */
  chord?: Chord;

  /**
   * Notes to display on the piano (chord training mode only)
   * These are the visual representation of the chord being shown to the user
   */
  displayNotes?: NoteWithOctave[];

  /**
   * Notes the user has selected (chord training mode only)
   * Tracks the current state of the user's chord construction or identification attempt
   */
  selectedNotes?: Set<NoteWithOctave>;

  /**
   * Visual highlights to apply to piano keys
   * Used for feedback, indicating correct/incorrect notes, or showing the solution
   * Available in both ear training and chord training modes
   */
  noteHighlights?: NoteHighlight[];
}
