import type { NoteWithOctave } from '../types/music';

/**
 * Calculates the optimal base octave for a 2-octave keyboard
 * to display a chord at its lowest position.
 *
 * The function finds the minimum octave among all notes in the chord and uses
 * that as the base octave for the keyboard display. This ensures all chord notes
 * are visible on a 2-octave keyboard range.
 *
 * @param displayedNotes - The notes of the chord to display
 * @returns The base octave for the keyboard (the lowest octave in the chord), defaults to 4 if no notes provided
 *
 * @example
 * // Chord spanning octaves 4-5
 * getKeyboardOctaveForChord([
 *   { note: 'C', octave: 4 },
 *   { note: 'E', octave: 4 },
 *   { note: 'G', octave: 5 }
 * ]) // 4 (keyboard will show octaves 4-5)
 *
 * @example
 * // Chord in higher register
 * getKeyboardOctaveForChord([
 *   { note: 'E', octave: 5 },
 *   { note: 'G', octave: 5 },
 *   { note: 'C', octave: 6 }
 * ]) // 5 (keyboard will show octaves 5-6)
 *
 * @example
 * // Empty chord
 * getKeyboardOctaveForChord([]) // 4 (default octave)
 */
export function getKeyboardOctaveForChord(displayedNotes: NoteWithOctave[]): number {
  if (!displayedNotes.length) return 4; // Default octave

  // Find the minimum octave in the chord notes
  const minOctave = Math.min(...displayedNotes.map(n => n.octave));

  // Use the minimum octave as the base, so the chord appears at the lowest position
  // The keyboard shows 2 octaves, so this ensures all notes are visible
  return minOctave;
}
