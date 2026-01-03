import type { NoteWithOctave, Note } from '../types/music';
import { ALL_NOTES } from '../types/music';

/**
 * Helper function to move a note up by one octave
 *
 * Increases the octave value by 1, capped at octave 8 (the maximum allowed octave).
 * If the note is already at octave 8, it remains unchanged.
 *
 * @param note - The note to move up one octave
 * @returns A new note object with octave increased by 1 (max octave 8)
 *
 * @example
 * moveNoteUpOctave({ note: 'C', octave: 4 }) // { note: 'C', octave: 5 }
 *
 * @example
 * moveNoteUpOctave({ note: 'G', octave: 8 }) // { note: 'G', octave: 8 } (capped at max)
 */
export function moveNoteUpOctave(note: NoteWithOctave): NoteWithOctave {
  const newOctave = Math.min(8, note.octave + 1);
  return {
    note: note.note,
    octave: newOctave as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  };
}

/**
 * Helper function to move a note down by one octave
 *
 * Decreases the octave value by 1, capped at octave 1 (the minimum allowed octave).
 * If the note is already at octave 1, it remains unchanged.
 *
 * @param note - The note to move down one octave
 * @returns A new note object with octave decreased by 1 (min octave 1)
 *
 * @example
 * moveNoteDownOctave({ note: 'C', octave: 4 }) // { note: 'C', octave: 3 }
 *
 * @example
 * moveNoteDownOctave({ note: 'A', octave: 1 }) // { note: 'A', octave: 1 } (capped at min)
 */
export function moveNoteDownOctave(note: NoteWithOctave): NoteWithOctave {
  const newOctave = Math.max(1, note.octave - 1);
  return {
    note: note.note,
    octave: newOctave as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  };
}

/**
 * Get the size of a chord (number of notes)
 *
 * Returns the count of notes in the chord array. This is useful for determining
 * how many inversions are possible (size - 1) and for validation purposes.
 *
 * @param chord - Array of notes representing the chord
 * @returns The number of notes in the chord
 *
 * @example
 * getChordSize([{ note: 'C', octave: 4 }, { note: 'E', octave: 4 }, { note: 'G', octave: 4 }]) // 3 (triad)
 *
 * @example
 * getChordSize([{ note: 'C', octave: 4 }, { note: 'E', octave: 4 }, { note: 'G', octave: 4 }, { note: 'B', octave: 4 }]) // 4 (7th chord)
 */
export function getChordSize(chord: NoteWithOctave[]): number {
  return chord.length;
}

/**
 * Get the maximum number of inversions possible for a chord
 *
 * The maximum number of inversions equals the number of notes minus 1.
 * For example:
 * - A triad (3 notes) has 2 inversions (1st and 2nd)
 * - A 7th chord (4 notes) has 3 inversions (1st, 2nd, and 3rd)
 * - A single note (1 note) has 0 inversions
 *
 * @param chord - Array of notes representing the chord
 * @returns The maximum number of inversions (chord.length - 1, minimum 0)
 *
 * @example
 * getMaxInversions([{ note: 'C', octave: 4 }, { note: 'E', octave: 4 }, { note: 'G', octave: 4 }]) // 2 (triad: 1st and 2nd inversions)
 *
 * @example
 * getMaxInversions([{ note: 'C', octave: 4 }, { note: 'E', octave: 4 }, { note: 'G', octave: 4 }, { note: 'B', octave: 4 }]) // 3 (7th chord: 1st, 2nd, 3rd inversions)
 *
 * @example
 * getMaxInversions([]) // 0 (empty chord has no inversions)
 */
export function getMaxInversions(chord: NoteWithOctave[]): number {
  return Math.max(0, chord.length - 1);
}

/**
 * Compare two notes to determine pitch order
 * Returns negative if note1 is lower, positive if note1 is higher, 0 if equal
 */
function compareNotePitch(note1: NoteWithOctave, note2: NoteWithOctave): number {
  // First compare by octave
  if (note1.octave !== note2.octave) {
    return note1.octave - note2.octave;
  }

  // Same octave, compare by note position in chromatic scale
  const index1 = ALL_NOTES.indexOf(note1.note);
  const index2 = ALL_NOTES.indexOf(note2.note);
  return index1 - index2;
}

/**
 * Sort notes by pitch (lowest to highest)
 */
function sortNotesByPitch(notes: NoteWithOctave[]): NoteWithOctave[] {
  return [...notes].sort(compareNotePitch);
}

/**
 * Check if two note arrays are equal
 */
function notesEqual(notes1: NoteWithOctave[], notes2: NoteWithOctave[]): boolean {
  if (notes1.length !== notes2.length) return false;
  
  const sorted1 = sortNotesByPitch(notes1);
  const sorted2 = sortNotesByPitch(notes2);
  
  for (let i = 0; i < sorted1.length; i++) {
    if (sorted1[i].note !== sorted2[i].note || sorted1[i].octave !== sorted2[i].octave) {
      return false;
    }
  }
  
  return true;
}

/**
 * Generate all inversions of a chord from its root position
 *
 * This function creates an array containing the root position chord followed by
 * each inversion up to the specified number. Each inversion is created by moving
 * the lowest note up one octave and re-sorting the chord.
 *
 * The number of inversions is automatically capped at the maximum possible for
 * the chord (chord size - 1). For example, a triad can have at most 2 inversions.
 *
 * Algorithm:
 * 1. Start with root position (all notes sorted by pitch)
 * 2. For each inversion: take the lowest note, raise it by one octave, re-sort
 * 3. Continue until the requested number of inversions is generated
 *
 * @param rootChord - The root position chord (notes should be in ascending order)
 * @param inversions - The number of inversions to generate (0 = root only, automatically capped at max possible)
 * @returns Array of chord inversions, starting with root position at index 0
 *
 * @example
 * // C major triad: C4, E4, G4
 * const cMajor = [
 *   { note: 'C', octave: 4 },
 *   { note: 'E', octave: 4 },
 *   { note: 'G', octave: 4 }
 * ];
 * generateInversions(cMajor, 2);
 * // Returns:
 * // [
 * //   [C4, E4, G4],  // Root position
 * //   [E4, G4, C5],  // 1st inversion
 * //   [G4, C5, E5]   // 2nd inversion
 * // ]
 *
 * @example
 * // Requesting more inversions than possible (automatically capped)
 * generateInversions(cMajor, 10); // Only generates 2 inversions (max for triad)
 *
 * @example
 * // Requesting only root position
 * generateInversions(cMajor, 0); // Returns [[C4, E4, G4]]
 */
export function generateInversions(
  rootChord: NoteWithOctave[],
  inversions: number
): NoteWithOctave[][] {
  if (rootChord.length === 0) {
    return [];
  }

  // Validate inversions count
  const maxInversions = getMaxInversions(rootChord);
  const actualInversions = Math.min(inversions, maxInversions);

  // Start with root position
  const result: NoteWithOctave[][] = [sortNotesByPitch(rootChord)];

  // Generate each inversion
  let currentChord = sortNotesByPitch([...rootChord]);
  for (let i = 0; i < actualInversions; i++) {
    // Take the lowest note and move it up an octave
    const lowestNote = currentChord[0];
    const raisedNote = moveNoteUpOctave(lowestNote);

    // Create new chord: remove first note, append raised version at end
    currentChord = [...currentChord.slice(1), raisedNote];

    // Sort to maintain ascending order
    currentChord = sortNotesByPitch(currentChord);
    result.push([...currentChord]);
  }

  return result;
}

// NOTE: Chord inversion identification is complex because any set of notes
// can have multiple valid interpretations depending on musical context.
// For now, we only implement generation which is unambiguous and sufficient
// for creating practice exercises.
