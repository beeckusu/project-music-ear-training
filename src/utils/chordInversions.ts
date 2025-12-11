import type { NoteWithOctave, Note } from '../types/music';
import { ALL_NOTES } from '../types/music';

/**
 * Helper function to move a note up by one octave
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
 */
export function getChordSize(chord: NoteWithOctave[]): number {
  return chord.length;
}

/**
 * Get the maximum number of inversions possible for a chord
 * A triad (3 notes) has 2 inversions (1st and 2nd)
 * A 7th chord (4 notes) has 3 inversions (1st, 2nd, and 3rd)
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
 * @param rootChord - The root position chord (notes should be in ascending order)
 * @param inversions - The number of inversions to generate (0 = root only)
 * @returns Array of chord inversions, starting with root position
 *
 * @example
 * // C major triad: C4, E4, G4
 * // Root position: [C4, E4, G4]
 * // 1st inversion: [E4, G4, C5]
 * // 2nd inversion: [G4, C5, E5]
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
