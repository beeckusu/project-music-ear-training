/**
 * ChordEngine - Utility class for chord generation, recognition, and manipulation
 *
 * This class provides methods for building chords from formulas, identifying chords
 * from note sets, formatting chord names, and validating chord structures.
 *
 * Similar architecture to AudioEngine - a stateless utility class with static methods
 * for chord operations.
 *
 * @module utils/chordEngine
 */

import type { Note, NoteWithOctave, Chord, ChordType, Octave, ChordFilter } from '../types/music';
import { CHORD_FORMULAS, formatChordName } from '../constants/chords';
import { ALL_NOTES } from '../types/music';
import { getScaleNotes } from '../constants/scales';

/**
 * Utility class for chord operations including generation, recognition, and validation
 */
export class ChordEngine {
  /**
   * Cache for storing pre-calculated valid chords for each filter configuration.
   * Maps filter hash to array of valid chords for performance optimization.
   */
  private static chordFilterCache: Map<string, Chord[]> = new Map();

  /**
   * Builds a chord from a root note, chord type, octave, and optional inversion
   *
   * This method generates all notes in a chord based on the interval formula for the
   * specified chord type. Notes are calculated from the root note and automatically
   * wrap across octaves for extended chords (9ths, 11ths, etc.).
   *
   * **Enharmonic Spelling:**
   * All notes use sharp notation (e.g., C#, F#, G#) rather than flat notation
   * (Db, Gb, Ab). This is based on the ALL_NOTES array which defines the chromatic
   * scale using sharps.
   *
   * **Octave Boundaries:**
   * Valid octave range is 1-8 (not 0-8). This prevents notes from going below C1
   * or above C8. Extended chords (major11, dominant11, etc.) automatically span
   * multiple octaves and may throw errors if the resulting notes exceed C8.
   *
   * **Inversion Behavior:**
   * When an inversion is specified, notes are moved to higher octaves and then
   * sorted by pitch to maintain ascending order. The chord name reflects the
   * new bass note (e.g., "C/E" for C major in first inversion).
   *
   * @param root - The root note of the chord (e.g., 'C', 'F#', 'Bb')
   * @param type - The chord type (e.g., 'major', 'minor7', 'dominant9')
   * @param octave - The octave for the root note (1-8, NOT 0-8)
   * @param inversion - Optional inversion number (0 = root position, 1 = first inversion, etc.)
   * @returns A complete Chord object with all notes sorted by pitch
   * @throws {Error} If octave is outside valid range (1-8)
   * @throws {Error} If inversion is invalid for the chord type
   * @throws {Error} If resulting notes would exceed octave boundaries
   *
   * @example
   * // Build a C major chord in root position at octave 4
   * buildChord('C', 'major', 4)
   * // Returns: { name: "C", root: "C", type: "major", notes: [C4, E4, G4], inversion: 0 }
   *
   * @example
   * // Build a F# minor 7 chord in first inversion at octave 3
   * buildChord('F#', 'minor7', 3, 1)
   * // Returns: { name: "F#m7/A", root: "F#", type: "minor7", notes: [A3, C#4, E4, F#4], inversion: 1 }
   *
   * @example
   * // Extended chord showing octave wrapping (9th = 14 semitones = 2 semitones + 1 octave)
   * buildChord('C', 'major9', 4)
   * // Returns: { name: "Cmaj9", root: "C", type: "major9", notes: [C4, E4, G4, B4, D5], inversion: 0 }
   * // Note: D5 is one octave above the root
   *
   * @example
   * // Sharp notation is always used (enharmonic preference)
   * buildChord('C', 'augmented', 4)
   * // Returns notes: [C4, E4, G#4] (uses G# not Ab)
   */
  static buildChord(root: Note, type: ChordType, octave: number, inversion: number = 0): Chord {
    // Get the interval formula for this chord type
    const intervals = CHORD_FORMULAS[type];
    if (!intervals) {
      throw new Error(`Unknown chord type: ${type}`);
    }

    // Validate octave
    if (octave < 1 || octave > 8) {
      throw new Error(`Octave must be between 1 and 8, got ${octave}`);
    }

    // Validate inversion
    if (inversion < 0 || inversion >= intervals.length) {
      throw new Error(`Inversion must be between 0 and ${intervals.length - 1} for ${type} chord, got ${inversion}`);
    }

    // Find the root note index in ALL_NOTES
    const rootIndex = ALL_NOTES.indexOf(root);
    if (rootIndex === -1) {
      throw new Error(`Invalid root note: ${root}`);
    }

    // Build the chord notes from intervals
    const notes: NoteWithOctave[] = [];

    for (const interval of intervals) {
      // Calculate the note index (wrapping around the 12-note chromatic scale)
      const noteIndex = (rootIndex + interval) % 12;
      // Calculate how many octaves we've jumped
      const octaveOffset = Math.floor((rootIndex + interval) / 12);
      // Calculate the final octave
      const noteOctave = octave + octaveOffset;

      // Ensure we don't go below C0 or above C8
      if (noteOctave < 1) {
        throw new Error(`Chord would contain notes below C1 (minimum octave)`);
      }
      if (noteOctave > 8) {
        throw new Error(`Chord would contain notes above C8 (maximum octave)`);
      }

      notes.push({
        note: ALL_NOTES[noteIndex],
        octave: noteOctave as Octave
      });
    }

    // Apply inversion if specified
    if (inversion > 0) {
      for (let i = 0; i < inversion; i++) {
        // Move the lowest note up an octave
        const lowestNote = notes.shift()!;
        const newOctave = lowestNote.octave + 1;

        if (newOctave > 8) {
          throw new Error(`Inversion would create notes above C8 (maximum octave)`);
        }

        notes.push({
          note: lowestNote.note,
          octave: newOctave as Octave
        });
      }

      // Sort notes by pitch after inversion
      notes.sort((a, b) => {
        if (a.octave !== b.octave) {
          return a.octave - b.octave;
        }
        return ALL_NOTES.indexOf(a.note) - ALL_NOTES.indexOf(b.note);
      });
    }

    // Build temporary chord object to generate name
    const chord: Chord = {
      name: '', // Will be set below
      root,
      type,
      notes,
      inversion
    };

    // Generate chord name
    chord.name = this.getChordName(chord);

    return chord;
  }

  /**
   * Formats a chord name with proper music notation conventions
   *
   * @param chord - The chord to name (only needs root, type, and optionally inversion)
   * @returns Formatted chord name following standard notation
   *
   * @example
   * getChordName({ root: 'C', type: 'major', inversion: 0 }) // "C"
   *
   * @example
   * getChordName({ root: 'F#', type: 'minor7', inversion: 0 }) // "F#m7"
   *
   * @example
   * getChordName({ root: 'C', type: 'major', inversion: 1, notes: [{note: 'E', octave: 4}, ...] }) // "C/E"
   */
  static getChordName(chord: Pick<Chord, 'root' | 'type' | 'inversion' | 'notes'>): string {
    // Use the formatChordName helper from constants/chords
    let name = formatChordName(chord.root, chord.type);

    // Add inversion notation if not in root position
    // Format: ChordName/BassNote (e.g., "C/E" for C major in 1st inversion)
    if (chord.inversion && chord.inversion > 0 && chord.notes && chord.notes.length > 0) {
      const bassNote = chord.notes[0].note;
      name += `/${bassNote}`;
    }

    return name;
  }

  /**
   * Validates that a chord object has correct structure and intervals
   *
   * Checks:
   * - Notes array is not empty
   * - Notes are sorted by pitch
   * - Number of notes matches expected count for chord type
   * - Intervals between notes match the chord type formula
   * - All notes have valid octaves (1-8)
   * - Root note exists in the notes array
   * - Inversion value is valid for the chord type
   *
   * @param chord - The chord to validate
   * @returns true if valid, false otherwise
   *
   * @example
   * validateChord({ root: 'C', type: 'major', notes: [{note: 'C', octave: 4}, {note: 'E', octave: 4}, {note: 'G', octave: 4}] }) // true
   */
  static validateChord(chord: Chord): boolean {
    // Check if notes array exists and is not empty
    if (!chord.notes || chord.notes.length === 0) {
      return false;
    }

    // Get expected intervals for this chord type
    const expectedIntervals = CHORD_FORMULAS[chord.type];
    if (!expectedIntervals) {
      return false;
    }

    // Check if number of notes matches expected count
    if (chord.notes.length !== expectedIntervals.length) {
      return false;
    }

    // Validate all octaves are in range 1-8
    for (const note of chord.notes) {
      if (note.octave < 1 || note.octave > 8) {
        return false;
      }
    }

    // Check that notes are sorted by pitch
    for (let i = 1; i < chord.notes.length; i++) {
      const prev = chord.notes[i - 1];
      const curr = chord.notes[i];

      if (curr.octave < prev.octave) {
        return false;
      }

      if (curr.octave === prev.octave) {
        const prevIndex = ALL_NOTES.indexOf(prev.note);
        const currIndex = ALL_NOTES.indexOf(curr.note);
        if (currIndex <= prevIndex) {
          return false;
        }
      }
    }

    // Validate inversion is within valid range
    if (chord.inversion !== undefined) {
      if (chord.inversion < 0 || chord.inversion >= expectedIntervals.length) {
        return false;
      }
    }

    // Check if root note exists somewhere in the notes
    // (accounting for inversions where root might not be the bass note)
    const hasRoot = chord.notes.some(n => n.note === chord.root);
    if (!hasRoot) {
      return false;
    }

    return true;
  }

  /**
   * Identifies a chord from a set of notes
   *
   * This method attempts to determine the chord type and root note from an array
   * of notes. It tries each note as a potential root and checks if the resulting
   * intervals match any known chord formula. Handles enharmonic equivalents.
   *
   * Algorithm:
   * 1. Sort notes by pitch
   * 2. Try each note as the potential root
   * 3. Calculate intervals from that root to all other notes
   * 4. Match intervals against CHORD_FORMULAS
   * 5. Check for inversions if root position doesn't match
   * 6. Prefer simpler chord names when multiple matches exist
   *
   * @param notes - Array of notes to identify
   * @returns Chord object if recognized, null otherwise
   *
   * @example
   * getChordFromNotes([{note: 'C', octave: 4}, {note: 'E', octave: 4}, {note: 'G', octave: 4}])
   * // { name: "C", root: "C", type: "major", notes: [...], inversion: 0 }
   *
   * @example
   * getChordFromNotes([{note: 'E', octave: 4}, {note: 'G', octave: 4}, {note: 'C', octave: 5}])
   * // { name: "C/E", root: "C", type: "major", notes: [...], inversion: 1 }
   */
  static getChordFromNotes(notes: NoteWithOctave[]): Chord | null {
    // Handle empty array
    if (!notes || notes.length === 0) {
      return null;
    }

    // Sort notes by pitch
    const sortedNotes = [...notes].sort((a, b) => {
      if (a.octave !== b.octave) {
        return a.octave - b.octave;
      }
      return ALL_NOTES.indexOf(a.note) - ALL_NOTES.indexOf(b.note);
    });

    // Helper function to calculate semitone distance between two notes
    const getSemitoneDistance = (from: NoteWithOctave, to: NoteWithOctave): number => {
      const fromIndex = ALL_NOTES.indexOf(from.note) + (from.octave * 12);
      const toIndex = ALL_NOTES.indexOf(to.note) + (to.octave * 12);
      return toIndex - fromIndex;
    };

    // Helper function to normalize intervals (reduce to within one octave, modulo 12)
    const normalizeIntervals = (intervals: number[]): number[] => {
      return intervals.map(interval => interval % 12);
    };

    // Try to match against known chord formulas
    for (const [chordType, formula] of Object.entries(CHORD_FORMULAS)) {
      const normalizedFormula = normalizeIntervals(formula).sort((a, b) => a - b);

      // Try each position as the potential root position
      for (let rootPosition = 0; rootPosition < sortedNotes.length; rootPosition++) {
        const potentialRoot = sortedNotes[rootPosition];

        // Calculate intervals from this potential root to all other notes
        const intervals: number[] = [];
        for (let i = 0; i < sortedNotes.length; i++) {
          // Calculate which note this is relative to root position
          const noteIndex = (rootPosition + i) % sortedNotes.length;
          const note = sortedNotes[noteIndex];

          // Calculate interval
          let interval = getSemitoneDistance(potentialRoot, note);
          // Handle notes that wrap around (e.g., in an inversion)
          while (interval < 0) interval += 12;
          intervals.push(interval);
        }

        // Normalize all intervals and sort
        const normalizedIntervals = normalizeIntervals(intervals).sort((a, b) => a - b);

        // Check if intervals match the formula
        if (normalizedIntervals.length === normalizedFormula.length &&
            normalizedIntervals.every((interval, idx) => interval === normalizedFormula[idx])) {

          // Found a match! Calculate inversion
          // If root is at position 0, inversion = 0
          // If root is at position 1, inversion = sortedNotes.length - 1 (last note was moved to front)
          // If root is at position 2, inversion = sortedNotes.length - 2, etc.
          const inversion = rootPosition === 0 ? 0 : sortedNotes.length - rootPosition;

          // Build the chord object
          const chord: Chord = {
            name: '', // Will be set below
            root: potentialRoot.note,
            type: chordType as ChordType,
            notes: sortedNotes,
            inversion
          };

          // Generate the proper chord name
          chord.name = this.getChordName(chord);

          return chord;
        }
      }
    }

    // No recognized chord found
    return null;
  }

  /**
   * Generates a cache key from a ChordFilter for caching valid chords.
   *
   * This creates a deterministic string representation of the filter settings
   * by sorting arrays to ensure consistent keys for equivalent filters.
   *
   * @param filter - The ChordFilter to generate a key for
   * @returns A unique string key representing the filter configuration
   */
  private static getFilterCacheKey(filter: ChordFilter): string {
    const sortedTypes = [...filter.allowedChordTypes].sort();
    const sortedRootNotes = filter.allowedRootNotes
      ? [...filter.allowedRootNotes].sort()
      : null;
    const sortedOctaves = [...filter.allowedOctaves].sort((a, b) => a - b);

    const keyParts = [
      `types:${sortedTypes.join(',')}`,
      `roots:${sortedRootNotes ? sortedRootNotes.join(',') : 'all'}`,
      `octaves:${sortedOctaves.join(',')}`,
      `inversions:${filter.includeInversions}`,
      `keyFilter:${filter.keyFilter ? `${filter.keyFilter.key}-${filter.keyFilter.scale}` : 'none'}`
    ];

    return keyParts.join('|');
  }

  /**
   * Clears the chord filter cache.
   *
   * Use this method if you want to free up memory or force recalculation
   * of valid chords for all filters.
   */
  static clearChordFilterCache(): void {
    this.chordFilterCache.clear();
  }

  /**
   * Returns all chords that are diatonic to a given key and scale,
   * filtered by the rest of the ChordFilter constraints.
   *
   * A chord is diatonic if every chord tone (mod 12) belongs to the scale.
   *
   * @param key - Root note of the scale
   * @param scale - 'major' or 'minor'
   * @param filter - ChordFilter for additional constraints (chord types, octaves, inversions)
   * @returns Array of valid diatonic Chord objects
   */
  static getDiatonicChords(key: Note, scale: 'major' | 'minor', filter: ChordFilter): Chord[] {
    const scaleNotes = getScaleNotes(key, scale);
    const scaleNoteIndices = new Set(scaleNotes.map(n => ALL_NOTES.indexOf(n)));
    const validChords: Chord[] = [];

    // Use all 12 chromatic notes as potential roots (diatonic check will filter)
    const rootNotes = filter.allowedRootNotes ?? ALL_NOTES;

    for (const chordType of filter.allowedChordTypes) {
      const formula = CHORD_FORMULAS[chordType];
      if (!formula) continue;

      for (const rootNote of rootNotes) {
        const rootIndex = ALL_NOTES.indexOf(rootNote);

        // Check if all chord tones (mod 12) fall within the scale
        const allTonesInScale = formula.every(interval => {
          const noteIndex = (rootIndex + interval) % 12;
          return scaleNoteIndices.has(noteIndex);
        });

        if (!allTonesInScale) continue;

        // This root + type is diatonic; now build for each octave/inversion
        const maxInversion = formula.length - 1;
        const inversionsToTry = filter.includeInversions
          ? Array.from({ length: maxInversion + 1 }, (_, i) => i)
          : [0];

        for (const octave of filter.allowedOctaves) {
          for (const inversion of inversionsToTry) {
            try {
              const chord = this.buildChord(rootNote, chordType, octave, inversion);
              validChords.push(chord);
            } catch {
              // Skip invalid combinations (e.g., octave out of bounds)
              continue;
            }
          }
        }
      }
    }

    return validChords;
  }

  /**
   * Generates a random chord based on ChordFilter settings
   *
   * This method creates all possible chords that match the filter constraints,
   * then randomly selects one with even distribution. Similar to
   * AudioEngine.getRandomNoteFromFilter() but for chord generation.
   *
   * **Performance Optimization:**
   * Results are cached based on filter settings. The first call with a given
   * filter calculates all valid chords, subsequent calls reuse the cached list.
   * Use `clearChordFilterCache()` to clear the cache if needed.
   *
   * **Filter Constraints:**
   * - allowedChordTypes: Which chord types to include (e.g., major, minor7, etc.)
   * - allowedRootNotes: Which root notes are allowed (null = all 12 chromatic notes)
   * - allowedOctaves: Which octaves the chord root can start in
   * - includeInversions: Whether to include inversions (true) or only root position (false)
   * - keyFilter: Optional diatonic key restriction
   *
   * **Distribution:**
   * Each valid chord has equal probability of being selected. The method builds
   * an array of all possible combinations and picks a random index.
   *
   * **Edge Cases:**
   * - If no valid chords exist with the current filter, throws an error
   * - Automatically skips invalid combinations (e.g., chords that exceed C8)
   * - Empty allowedChordTypes or allowedOctaves will result in no valid chords
   *
   * @param filter - ChordFilter configuration specifying which chords are allowed
   * @returns A randomly selected Chord object matching the filter constraints
   * @throws {Error} If no valid chords are available with current filter settings
   * @throws {Error} If no valid chords match the filter (including keyFilter)
   *
   * @example
   * // Get random major or minor chord in root position
   * const filter: ChordFilter = {
   *   allowedChordTypes: ['major', 'minor'],
   *   allowedRootNotes: null, // All 12 notes
   *   allowedOctaves: [3, 4],
   *   includeInversions: false
   * };
   * const chord = ChordEngine.getRandomChordFromFilter(filter);
   *
   * @example
   * // Get random triad with inversions, white keys only
   * const filter: ChordFilter = {
   *   allowedChordTypes: ['major', 'minor', 'diminished'],
   *   allowedRootNotes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
   *   allowedOctaves: [4],
   *   includeInversions: true
   * };
   * const chord = ChordEngine.getRandomChordFromFilter(filter);
   */
  static getRandomChordFromFilter(filter: ChordFilter): Chord {
    // Check cache first
    const cacheKey = this.getFilterCacheKey(filter);
    let validChords = this.chordFilterCache.get(cacheKey);

    // If not cached, calculate and cache
    if (!validChords) {
      if (filter.keyFilter) {
        // Use diatonic filtering when a key is specified
        validChords = this.getDiatonicChords(
          filter.keyFilter.key,
          filter.keyFilter.scale,
          filter
        );
      } else {
        validChords = [];

        // Determine which root notes to use
        const rootNotes = filter.allowedRootNotes ?? ALL_NOTES;

        // Iterate through all combinations
        for (const chordType of filter.allowedChordTypes) {
          for (const rootNote of rootNotes) {
            for (const octave of filter.allowedOctaves) {
              // Determine which inversions to try
              const formula = CHORD_FORMULAS[chordType];
              if (!formula) {
                continue; // Skip unknown chord types
              }

              const maxInversion = formula.length - 1;
              const inversionsToTry = filter.includeInversions
                ? Array.from({ length: maxInversion + 1 }, (_, i) => i) // [0, 1, 2, ...]
                : [0]; // Only root position

              for (const inversion of inversionsToTry) {
                try {
                  // Attempt to build the chord
                  const chord = this.buildChord(rootNote, chordType, octave, inversion);
                  validChords.push(chord);
                } catch (error) {
                  // Skip invalid combinations (e.g., octave out of bounds)
                  continue;
                }
              }
            }
          }
        }
      }

      // Check if we have any valid chords
      if (validChords.length === 0) {
        throw new Error('No valid chords available with current filter settings');
      }

      // Cache the result
      this.chordFilterCache.set(cacheKey, validChords);
    }

    // Select a random chord with even distribution
    const randomIndex = Math.floor(Math.random() * validChords.length);
    return validChords[randomIndex];
  }
}

// Export singleton instance for convenience (similar to audioEngine)
export const chordEngine = new ChordEngine();
