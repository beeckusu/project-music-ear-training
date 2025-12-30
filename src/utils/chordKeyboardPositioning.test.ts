import { describe, it, expect } from 'vitest';
import { getKeyboardOctaveForChord } from './chordKeyboardPositioning';
import type { NoteWithOctave } from '../types/music';

describe('getKeyboardOctaveForChord', () => {
  describe('Default behavior', () => {
    it('should return default octave 4 when no notes are provided', () => {
      const result = getKeyboardOctaveForChord([]);
      expect(result).toBe(4);
    });
  });

  describe('Single octave chords', () => {
    it('should return octave 3 for a chord in octave 3', () => {
      const notes: NoteWithOctave[] = [
        { note: 'C', octave: 3 },
        { note: 'E', octave: 3 },
        { note: 'G', octave: 3 }
      ];
      const result = getKeyboardOctaveForChord(notes);
      expect(result).toBe(3);
    });

    it('should return octave 4 for a chord in octave 4', () => {
      const notes: NoteWithOctave[] = [
        { note: 'D', octave: 4 },
        { note: 'F', octave: 4 },
        { note: 'A', octave: 4 }
      ];
      const result = getKeyboardOctaveForChord(notes);
      expect(result).toBe(4);
    });

    it('should return octave 5 for a chord in octave 5', () => {
      const notes: NoteWithOctave[] = [
        { note: 'F#', octave: 5 },
        { note: 'A#', octave: 5 },
        { note: 'C#', octave: 5 }
      ];
      const result = getKeyboardOctaveForChord(notes);
      expect(result).toBe(5);
    });
  });

  describe('Multi-octave chords', () => {
    it('should return the lowest octave for a chord spanning 2 octaves', () => {
      const notes: NoteWithOctave[] = [
        { note: 'C', octave: 3 },
        { note: 'E', octave: 3 },
        { note: 'G', octave: 4 } // Spans into next octave
      ];
      const result = getKeyboardOctaveForChord(notes);
      expect(result).toBe(3); // Should use the lowest octave
    });

    it('should return the lowest octave when notes are in reverse order', () => {
      const notes: NoteWithOctave[] = [
        { note: 'G', octave: 5 },
        { note: 'E', octave: 4 },
        { note: 'C', octave: 3 } // Lowest note
      ];
      const result = getKeyboardOctaveForChord(notes);
      expect(result).toBe(3); // Should find the minimum
    });

    it('should handle wide voicings spanning multiple octaves', () => {
      const notes: NoteWithOctave[] = [
        { note: 'C', octave: 2 }, // Very low
        { note: 'G', octave: 4 },
        { note: 'E', octave: 6 }  // Very high
      ];
      const result = getKeyboardOctaveForChord(notes);
      expect(result).toBe(2); // Should position at the lowest
    });
  });

  describe('Edge cases', () => {
    it('should handle single note', () => {
      const notes: NoteWithOctave[] = [
        { note: 'A', octave: 4 }
      ];
      const result = getKeyboardOctaveForChord(notes);
      expect(result).toBe(4);
    });

    it('should handle very low octaves', () => {
      const notes: NoteWithOctave[] = [
        { note: 'C', octave: 1 },
        { note: 'E', octave: 1 },
        { note: 'G', octave: 1 }
      ];
      const result = getKeyboardOctaveForChord(notes);
      expect(result).toBe(1);
    });

    it('should handle very high octaves', () => {
      const notes: NoteWithOctave[] = [
        { note: 'C', octave: 7 },
        { note: 'E', octave: 7 },
        { note: 'G', octave: 7 }
      ];
      const result = getKeyboardOctaveForChord(notes);
      expect(result).toBe(7);
    });

    it('should handle mixed octaves with duplicates', () => {
      const notes: NoteWithOctave[] = [
        { note: 'C', octave: 4 },
        { note: 'C', octave: 3 }, // Duplicate note name, different octave
        { note: 'E', octave: 4 },
        { note: 'G', octave: 4 }
      ];
      const result = getKeyboardOctaveForChord(notes);
      expect(result).toBe(3); // Should still find the minimum
    });
  });

  describe('Chord inversions', () => {
    it('should position root position chord at lowest octave', () => {
      // C Major root position: C-E-G
      const notes: NoteWithOctave[] = [
        { note: 'C', octave: 4 },
        { note: 'E', octave: 4 },
        { note: 'G', octave: 4 }
      ];
      const result = getKeyboardOctaveForChord(notes);
      expect(result).toBe(4);
    });

    it('should position first inversion chord at lowest octave', () => {
      // C Major first inversion: E-G-C (next octave)
      const notes: NoteWithOctave[] = [
        { note: 'E', octave: 4 },
        { note: 'G', octave: 4 },
        { note: 'C', octave: 5 }
      ];
      const result = getKeyboardOctaveForChord(notes);
      expect(result).toBe(4); // Should start at octave 4
    });

    it('should position second inversion chord at lowest octave', () => {
      // C Major second inversion: G-C-E (next octave)
      const notes: NoteWithOctave[] = [
        { note: 'G', octave: 4 },
        { note: 'C', octave: 5 },
        { note: 'E', octave: 5 }
      ];
      const result = getKeyboardOctaveForChord(notes);
      expect(result).toBe(4); // Should start at octave 4
    });
  });

  describe('Display guarantee', () => {
    it('should ensure all notes in a 2-octave chord are displayable on 2-octave keyboard', () => {
      // A 2-octave keyboard starting at octave 3 shows:
      // - Octave 3: C3-B3 (7 white keys)
      // - Octave 4: C4-B4 (7 white keys)
      // - Octave 5: C5 (1 white key - the final C)
      // Total: 15 white keys spanning from C3 to C5
      const notes: NoteWithOctave[] = [
        { note: 'C', octave: 3 },  // Start of octave 3
        { note: 'E', octave: 4 },  // Middle note in octave 4
        { note: 'B', octave: 4 }   // Last note before C5
      ];
      const baseOctave = getKeyboardOctaveForChord(notes);

      // Verify base octave is the minimum
      expect(baseOctave).toBe(3);

      // Verify all notes are within displayable range
      // Range is [baseOctave, baseOctave + 2) for most notes
      // But C at baseOctave + 2 is also displayable (the 15th key)
      const allNotesWithinRange = notes.every(note => {
        if (note.octave < baseOctave) return false;
        if (note.octave > baseOctave + 2) return false;
        if (note.octave === baseOctave + 2 && note.note !== 'C') return false;
        return true;
      });
      expect(allNotesWithinRange).toBe(true);
    });

    it('should handle chord ending exactly at C in third octave', () => {
      // Edge case: chord that ends at the final displayable note (C5)
      const notes: NoteWithOctave[] = [
        { note: 'C', octave: 3 },
        { note: 'G', octave: 4 },
        { note: 'C', octave: 5 }  // Final displayable note
      ];
      const baseOctave = getKeyboardOctaveForChord(notes);
      expect(baseOctave).toBe(3);
    });
  });
});
