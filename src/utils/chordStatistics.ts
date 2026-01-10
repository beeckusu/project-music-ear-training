import type { ChordGuessAttempt } from '../types/game';
import type { ChordType, Note } from '../types/music';
import { CHORD_TYPE_DISPLAY_NAMES } from '../constants/chordDisplayNames';

/**
 * Statistics aggregated by chord type.
 * Only includes chord types that actually appeared in the session.
 */
export interface ChordTypeStats {
  chordType: ChordType;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  displayName: string;
}

/**
 * Statistics aggregated by root note.
 * Only includes root notes that actually appeared in the session.
 */
export interface RootNoteStats {
  rootNote: Note;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
}

/**
 * Aggregates guess history by chord type.
 * Calculates total attempts, correct attempts, and accuracy for each chord type.
 * Only returns stats for chord types that actually appeared in the guess history.
 *
 * @param guessHistory - Array of chord guess attempts
 * @returns Array of chord type statistics, sorted by chord type name
 */
export function aggregateByChordType(guessHistory: ChordGuessAttempt[]): ChordTypeStats[] {
  // Map to accumulate stats by chord type
  const statsMap = new Map<ChordType, {
    totalAttempts: number;
    totalAccuracy: number;
    correctAttempts: number;
  }>();

  // Aggregate stats from guess history
  for (const attempt of guessHistory) {
    const chordType = attempt.actualChord.type;
    const existing = statsMap.get(chordType) || {
      totalAttempts: 0,
      totalAccuracy: 0,
      correctAttempts: 0
    };

    // For Chord Training mode: use accuracy field (0-100%)
    // For Chord Identification mode: convert isCorrect to 0% or 100%
    const attemptAccuracy = attempt.accuracy !== undefined
      ? attempt.accuracy
      : (attempt.isCorrect ? 100 : 0);

    statsMap.set(chordType, {
      totalAttempts: existing.totalAttempts + 1,
      totalAccuracy: existing.totalAccuracy + attemptAccuracy,
      correctAttempts: existing.correctAttempts + (attempt.isCorrect ? 1 : 0)
    });
  }

  // Convert map to array of ChordTypeStats
  const results: ChordTypeStats[] = [];
  for (const [chordType, stats] of statsMap.entries()) {
    results.push({
      chordType,
      totalAttempts: stats.totalAttempts,
      correctAttempts: stats.correctAttempts,
      accuracy: stats.totalAttempts > 0 ? stats.totalAccuracy / stats.totalAttempts : 0,
      displayName: CHORD_TYPE_DISPLAY_NAMES[chordType] || chordType
    });
  }

  return results;
}

/**
 * Aggregates guess history by root note.
 * Calculates total attempts, correct attempts, and accuracy for each root note.
 * Only returns stats for root notes that actually appeared in the guess history.
 *
 * @param guessHistory - Array of chord guess attempts
 * @returns Array of root note statistics, sorted by note name
 */
export function aggregateByRootNote(guessHistory: ChordGuessAttempt[]): RootNoteStats[] {
  // Map to accumulate stats by root note
  const statsMap = new Map<Note, {
    totalAttempts: number;
    totalAccuracy: number;
    correctAttempts: number;
  }>();

  // Aggregate stats from guess history
  for (const attempt of guessHistory) {
    const rootNote = attempt.actualChord.root;
    const existing = statsMap.get(rootNote) || {
      totalAttempts: 0,
      totalAccuracy: 0,
      correctAttempts: 0
    };

    // For Chord Training mode: use accuracy field (0-100%)
    // For Chord Identification mode: convert isCorrect to 0% or 100%
    const attemptAccuracy = attempt.accuracy !== undefined
      ? attempt.accuracy
      : (attempt.isCorrect ? 100 : 0);

    statsMap.set(rootNote, {
      totalAttempts: existing.totalAttempts + 1,
      totalAccuracy: existing.totalAccuracy + attemptAccuracy,
      correctAttempts: existing.correctAttempts + (attempt.isCorrect ? 1 : 0)
    });
  }

  // Convert map to array of RootNoteStats
  const results: RootNoteStats[] = [];
  for (const [rootNote, stats] of statsMap.entries()) {
    results.push({
      rootNote,
      totalAttempts: stats.totalAttempts,
      correctAttempts: stats.correctAttempts,
      accuracy: stats.totalAttempts > 0 ? stats.totalAccuracy / stats.totalAttempts : 0
    });
  }

  return results;
}

/**
 * Gets the most difficult chord types based on accuracy.
 * Sorts by accuracy ascending (lowest accuracy first).
 *
 * @param stats - Array of chord type statistics
 * @param limit - Maximum number of results to return
 * @returns Array of most difficult chord types, limited to specified count
 */
export function getMostDifficultChords(stats: ChordTypeStats[], limit: number): ChordTypeStats[] {
  return [...stats]
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, limit);
}

/**
 * Gets the most difficult root notes based on accuracy.
 * Sorts by accuracy ascending (lowest accuracy first).
 *
 * @param stats - Array of root note statistics
 * @param limit - Maximum number of results to return
 * @returns Array of most difficult root notes, limited to specified count
 */
export function getMostDifficultRoots(stats: RootNoteStats[], limit: number): RootNoteStats[] {
  return [...stats]
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, limit);
}

/**
 * Gets chord type stats sorted by accuracy (ascending - lowest first).
 *
 * @param stats - Array of chord type or root note statistics
 * @returns Array sorted by accuracy ascending
 */
export function sortByAccuracyAsc<T extends ChordTypeStats | RootNoteStats>(stats: T[]): T[] {
  return [...stats].sort((a, b) => a.accuracy - b.accuracy);
}
