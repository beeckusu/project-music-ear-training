import type { NoteWithOctave } from '../types/music';

/**
 * Calculates the optimal base octave for a 2-octave keyboard
 * to display a chord at its lowest position.
 *
 * @param displayedNotes - The notes of the chord to display
 * @returns The base octave for the keyboard (the lowest octave in the chord)
 */
export function getKeyboardOctaveForChord(displayedNotes: NoteWithOctave[]): number {
  if (!displayedNotes.length) return 4; // Default octave

  // Find the minimum octave in the chord notes
  const minOctave = Math.min(...displayedNotes.map(n => n.octave));

  // Use the minimum octave as the base, so the chord appears at the lowest position
  // The keyboard shows 2 octaves, so this ensures all notes are visible
  return minOctave;
}
