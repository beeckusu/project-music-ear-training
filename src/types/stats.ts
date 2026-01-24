/**
 * Chord-specific statistics for long-term tracking across sessions.
 * Aggregates performance data per chord name.
 */
export interface ChordStats {
  /** The full chord name (e.g., "C Major", "Am7") */
  chordName: string;

  /** Total number of attempts across all sessions */
  totalAttempts: number;

  /** Number of correct attempts across all sessions */
  correctAttempts: number;

  /** Timestamp of the last practice session containing this chord */
  lastPracticed: Date;

  /** Calculated accuracy percentage (0-100) */
  averageAccuracy: number;
}

/**
 * Serialized version of ChordStats for localStorage.
 * Dates are stored as ISO strings.
 */
export interface SerializedChordStats {
  chordName: string;
  totalAttempts: number;
  correctAttempts: number;
  lastPracticed: string; // ISO date string
  averageAccuracy: number;
}

/**
 * Root storage structure for chord statistics.
 * Includes version for future schema migrations.
 */
export interface ChordStatsStore {
  /** Schema version for migration support */
  version: number;

  /** Map of chord name to stats */
  stats: Record<string, SerializedChordStats>;

  /** Timestamp of last update */
  lastUpdated: string; // ISO date string
}

/**
 * Current schema version for ChordStatsStore.
 * Increment when making breaking changes to the schema.
 */
export const CHORD_STATS_VERSION = 1;
