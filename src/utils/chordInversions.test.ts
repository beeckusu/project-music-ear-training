import { describe, it, expect } from 'vitest';
import {
  moveNoteUpOctave,
  moveNoteDownOctave,
  getChordSize,
  getMaxInversions,
  generateInversions
} from './chordInversions';
import type { NoteWithOctave } from '../types/music';

describe('chordInversions', () => {
  describe('Helper Functions', () => {
    describe('moveNoteUpOctave', () => {
      it('should move a note up by one octave', () => {
        const note: NoteWithOctave = { note: 'C', octave: 4 };
        const result = moveNoteUpOctave(note);
        expect(result).toEqual({ note: 'C', octave: 5 });
      });

      it('should not exceed octave 8', () => {
        const note: NoteWithOctave = { note: 'C', octave: 8 };
        const result = moveNoteUpOctave(note);
        expect(result).toEqual({ note: 'C', octave: 8 });
      });

      it('should preserve the note name', () => {
        const note: NoteWithOctave = { note: 'G#', octave: 3 };
        const result = moveNoteUpOctave(note);
        expect(result.note).toBe('G#');
      });
    });

    describe('moveNoteDownOctave', () => {
      it('should move a note down by one octave', () => {
        const note: NoteWithOctave = { note: 'C', octave: 4 };
        const result = moveNoteDownOctave(note);
        expect(result).toEqual({ note: 'C', octave: 3 });
      });

      it('should not go below octave 1', () => {
        const note: NoteWithOctave = { note: 'C', octave: 1 };
        const result = moveNoteDownOctave(note);
        expect(result).toEqual({ note: 'C', octave: 1 });
      });

      it('should preserve the note name', () => {
        const note: NoteWithOctave = { note: 'Bb', octave: 5 };
        const result = moveNoteDownOctave(note);
        expect(result.note).toBe('Bb');
      });
    });

    describe('getChordSize', () => {
      it('should return 0 for empty chord', () => {
        expect(getChordSize([])).toBe(0);
      });

      it('should return 3 for a triad', () => {
        const chord: NoteWithOctave[] = [
          { note: 'C', octave: 4 },
          { note: 'E', octave: 4 },
          { note: 'G', octave: 4 }
        ];
        expect(getChordSize(chord)).toBe(3);
      });

      it('should return 4 for a 7th chord', () => {
        const chord: NoteWithOctave[] = [
          { note: 'C', octave: 4 },
          { note: 'E', octave: 4 },
          { note: 'G', octave: 4 },
          { note: 'B', octave: 4 }
        ];
        expect(getChordSize(chord)).toBe(4);
      });
    });

    describe('getMaxInversions', () => {
      it('should return 0 for empty chord', () => {
        expect(getMaxInversions([])).toBe(0);
      });

      it('should return 2 for a triad (3 notes)', () => {
        const triad: NoteWithOctave[] = [
          { note: 'C', octave: 4 },
          { note: 'E', octave: 4 },
          { note: 'G', octave: 4 }
        ];
        expect(getMaxInversions(triad)).toBe(2);
      });

      it('should return 3 for a 7th chord (4 notes)', () => {
        const seventh: NoteWithOctave[] = [
          { note: 'C', octave: 4 },
          { note: 'E', octave: 4 },
          { note: 'G', octave: 4 },
          { note: 'B', octave: 4 }
        ];
        expect(getMaxInversions(seventh)).toBe(3);
      });

      it('should return 1 for a dyad (2 notes)', () => {
        const dyad: NoteWithOctave[] = [
          { note: 'C', octave: 4 },
          { note: 'G', octave: 4 }
        ];
        expect(getMaxInversions(dyad)).toBe(1);
      });
    });
  });

  describe('generateInversions', () => {
    describe('C Major Triad', () => {
      const cMajorRoot: NoteWithOctave[] = [
        { note: 'C', octave: 4 },
        { note: 'E', octave: 4 },
        { note: 'G', octave: 4 }
      ];

      it('should generate root position only when inversions = 0', () => {
        const result = generateInversions(cMajorRoot, 0);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(cMajorRoot);
      });

      it('should generate root and 1st inversion when inversions = 1', () => {
        const result = generateInversions(cMajorRoot, 1);
        expect(result).toHaveLength(2);

        // Root position: C4, E4, G4
        expect(result[0]).toEqual([
          { note: 'C', octave: 4 },
          { note: 'E', octave: 4 },
          { note: 'G', octave: 4 }
        ]);

        // 1st inversion: E4, G4, C5
        expect(result[1]).toEqual([
          { note: 'E', octave: 4 },
          { note: 'G', octave: 4 },
          { note: 'C', octave: 5 }
        ]);
      });

      it('should generate all inversions (root, 1st, 2nd) when inversions = 2', () => {
        const result = generateInversions(cMajorRoot, 2);
        expect(result).toHaveLength(3);

        // Root position: C4, E4, G4
        expect(result[0]).toEqual([
          { note: 'C', octave: 4 },
          { note: 'E', octave: 4 },
          { note: 'G', octave: 4 }
        ]);

        // 1st inversion: E4, G4, C5
        expect(result[1]).toEqual([
          { note: 'E', octave: 4 },
          { note: 'G', octave: 4 },
          { note: 'C', octave: 5 }
        ]);

        // 2nd inversion: G4, C5, E5
        expect(result[2]).toEqual([
          { note: 'G', octave: 4 },
          { note: 'C', octave: 5 },
          { note: 'E', octave: 5 }
        ]);
      });

      it('should cap inversions at maximum possible', () => {
        // Requesting more inversions than possible should only generate max
        const result = generateInversions(cMajorRoot, 10);
        expect(result).toHaveLength(3); // root + 2 inversions
      });
    });

    describe('C Dominant 7th Chord', () => {
      const cDom7Root: NoteWithOctave[] = [
        { note: 'C', octave: 4 },
        { note: 'E', octave: 4 },
        { note: 'G', octave: 4 },
        { note: 'A#', octave: 4 }
      ];

      it('should generate all 4 positions (root + 3 inversions)', () => {
        const result = generateInversions(cDom7Root, 3);
        expect(result).toHaveLength(4);

        // Root: C4, E4, G4, A#4
        expect(result[0]).toEqual(cDom7Root);

        // 1st inversion: E4, G4, A#4, C5
        expect(result[1]).toEqual([
          { note: 'E', octave: 4 },
          { note: 'G', octave: 4 },
          { note: 'A#', octave: 4 },
          { note: 'C', octave: 5 }
        ]);

        // 2nd inversion: G4, A#4, C5, E5
        expect(result[2]).toEqual([
          { note: 'G', octave: 4 },
          { note: 'A#', octave: 4 },
          { note: 'C', octave: 5 },
          { note: 'E', octave: 5 }
        ]);

        // 3rd inversion: A#4, C5, E5, G5
        expect(result[3]).toEqual([
          { note: 'A#', octave: 4 },
          { note: 'C', octave: 5 },
          { note: 'E', octave: 5 },
          { note: 'G', octave: 5 }
        ]);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty chord', () => {
        const result = generateInversions([], 0);
        expect(result).toEqual([]);
      });

      it('should handle single note', () => {
        const singleNote: NoteWithOctave[] = [{ note: 'C', octave: 4 }];
        const result = generateInversions(singleNote, 0);
        expect(result).toEqual([singleNote]);
      });

      it('should handle unsorted input', () => {
        const unsorted: NoteWithOctave[] = [
          { note: 'G', octave: 4 },
          { note: 'C', octave: 4 },
          { note: 'E', octave: 4 }
        ];
        const result = generateInversions(unsorted, 1);

        // Should still generate correct inversions
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual([
          { note: 'C', octave: 4 },
          { note: 'E', octave: 4 },
          { note: 'G', octave: 4 }
        ]);
      });
    });
  });
});
