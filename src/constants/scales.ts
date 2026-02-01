import type { Note } from '../types/music';
import { ALL_NOTES } from '../types/music';

/** Semitone intervals for a major scale from the root */
export const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11] as const;

/** Semitone intervals for a natural minor scale from the root */
export const MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10] as const;

/**
 * Returns the set of notes in a given key and scale.
 *
 * @param key - The root note of the scale
 * @param scale - 'major' or 'minor' (natural minor)
 * @returns Array of Note values belonging to the scale
 */
export function getScaleNotes(key: Note, scale: 'major' | 'minor'): Note[] {
  const rootIndex = ALL_NOTES.indexOf(key);
  const intervals = scale === 'major' ? MAJOR_SCALE_INTERVALS : MINOR_SCALE_INTERVALS;

  return intervals.map(interval => ALL_NOTES[(rootIndex + interval) % 12]);
}
