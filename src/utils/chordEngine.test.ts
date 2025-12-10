import { describe, it, expect } from 'vitest';
import { ChordEngine } from './chordEngine';
import type { Chord, ChordType, Note, NoteWithOctave, Octave } from '../types/music';

describe('ChordEngine', () => {
  describe('buildChord', () => {
    describe('Triads', () => {
      it.each([
        {
          name: 'C major triad',
          root: 'C' as Note,
          type: 'major' as ChordType,
          octave: 4,
          expectedNotes: [
            { note: 'C' as Note, octave: 4 },
            { note: 'E' as Note, octave: 4 },
            { note: 'G' as Note, octave: 4 }
          ],
          expectedName: 'C'
        },
        {
          name: 'D minor triad',
          root: 'D' as Note,
          type: 'minor' as ChordType,
          octave: 3,
          expectedNotes: [
            { note: 'D' as Note, octave: 3 },
            { note: 'F' as Note, octave: 3 },
            { note: 'A' as Note, octave: 3 }
          ],
          expectedName: 'Dm'
        },
        {
          name: 'B diminished triad',
          root: 'B' as Note,
          type: 'diminished' as ChordType,
          octave: 4,
          expectedNotes: [
            { note: 'B' as Note, octave: 4 },
            { note: 'D' as Note, octave: 5 },
            { note: 'F' as Note, octave: 5 }
          ],
          expectedName: 'Bdim'
        },
        {
          name: 'C augmented triad',
          root: 'C' as Note,
          type: 'augmented' as ChordType,
          octave: 4,
          expectedNotes: [
            { note: 'C' as Note, octave: 4 },
            { note: 'E' as Note, octave: 4 },
            { note: 'G#' as Note, octave: 4 }
          ],
          expectedName: 'Caug'
        }
      ])('should build $name in root position', ({ root, type, octave, expectedNotes, expectedName }) => {
        const chord = ChordEngine.buildChord(root, type, octave);

        expect(chord.root).toBe(root);
        expect(chord.type).toBe(type);
        expect(chord.inversion).toBe(0);
        expect(chord.notes).toHaveLength(expectedNotes.length);
        expect(chord.notes).toEqual(expectedNotes);
        expect(chord.name).toBe(expectedName);
      });
    });

    describe('Seventh Chords', () => {
      it.each([
        {
          name: 'C major 7',
          root: 'C' as Note,
          type: 'major7' as ChordType,
          octave: 4,
          expectedNotes: [
            { note: 'C' as Note, octave: 4 },
            { note: 'E' as Note, octave: 4 },
            { note: 'G' as Note, octave: 4 },
            { note: 'B' as Note, octave: 4 }
          ],
          expectedName: 'Cmaj7'
        },
        {
          name: 'G dominant 7',
          root: 'G' as Note,
          type: 'dominant7' as ChordType,
          octave: 3,
          expectedNotes: [
            { note: 'G' as Note, octave: 3 },
            { note: 'B' as Note, octave: 3 },
            { note: 'D' as Note, octave: 4 },
            { note: 'F' as Note, octave: 4 }
          ],
          expectedName: 'G7'
        },
        {
          name: 'D minor 7',
          root: 'D' as Note,
          type: 'minor7' as ChordType,
          octave: 4,
          expectedNotes: [
            { note: 'D' as Note, octave: 4 },
            { note: 'F' as Note, octave: 4 },
            { note: 'A' as Note, octave: 4 },
            { note: 'C' as Note, octave: 5 }
          ],
          expectedName: 'Dm7'
        },
        {
          name: 'B half-diminished 7',
          root: 'B' as Note,
          type: 'halfDiminished7' as ChordType,
          octave: 4,
          expectedNotes: [
            { note: 'B' as Note, octave: 4 },
            { note: 'D' as Note, octave: 5 },
            { note: 'F' as Note, octave: 5 },
            { note: 'A' as Note, octave: 5 }
          ],
          expectedName: 'Bm7♭5'
        },
        {
          name: 'C# diminished 7',
          root: 'C#' as Note,
          type: 'diminished7' as ChordType,
          octave: 4,
          expectedNotes: [
            { note: 'C#' as Note, octave: 4 },
            { note: 'E' as Note, octave: 4 },
            { note: 'G' as Note, octave: 4 },
            { note: 'A#' as Note, octave: 4 }
          ],
          expectedName: 'C#dim7'
        }
      ])('should build $name chord', ({ root, type, octave, expectedNotes, expectedName }) => {
        const chord = ChordEngine.buildChord(root, type, octave);

        expect(chord.notes).toHaveLength(expectedNotes.length);
        expect(chord.notes).toEqual(expectedNotes);
        expect(chord.name).toBe(expectedName);
      });
    });

    describe('Extended Chords', () => {
      it.each([
        {
          name: 'C major 9',
          root: 'C' as Note,
          type: 'major9' as ChordType,
          octave: 4,
          expectedNotes: [
            { note: 'C' as Note, octave: 4 },
            { note: 'E' as Note, octave: 4 },
            { note: 'G' as Note, octave: 4 },
            { note: 'B' as Note, octave: 4 },
            { note: 'D' as Note, octave: 5 }
          ],
          expectedName: 'Cmaj9'
        },
        {
          name: 'G dominant 9',
          root: 'G' as Note,
          type: 'dominant9' as ChordType,
          octave: 3,
          expectedNotes: [
            { note: 'G' as Note, octave: 3 },
            { note: 'B' as Note, octave: 3 },
            { note: 'D' as Note, octave: 4 },
            { note: 'F' as Note, octave: 4 },
            { note: 'A' as Note, octave: 4 }
          ],
          expectedName: 'G9'
        },
        {
          name: 'D minor 11',
          root: 'D' as Note,
          type: 'minor11' as ChordType,
          octave: 3,
          expectedNotes: [
            { note: 'D' as Note, octave: 3 },
            { note: 'F' as Note, octave: 3 },
            { note: 'A' as Note, octave: 3 },
            { note: 'C' as Note, octave: 4 },
            { note: 'E' as Note, octave: 4 },
            { note: 'G' as Note, octave: 4 }
          ],
          expectedName: 'Dm11'
        }
      ])('should build $name chord', ({ root, type, octave, expectedNotes, expectedName }) => {
        const chord = ChordEngine.buildChord(root, type, octave);

        expect(chord.notes).toHaveLength(expectedNotes.length);
        expect(chord.notes).toEqual(expectedNotes);
        expect(chord.name).toBe(expectedName);
      });
    });

    describe('Suspended and Added Tone Chords', () => {
      it.each([
        {
          name: 'C sus2',
          root: 'C' as Note,
          type: 'sus2' as ChordType,
          octave: 4,
          expectedNotes: [
            { note: 'C' as Note, octave: 4 },
            { note: 'D' as Note, octave: 4 },
            { note: 'G' as Note, octave: 4 }
          ],
          expectedName: 'Csus2'
        },
        {
          name: 'G sus4',
          root: 'G' as Note,
          type: 'sus4' as ChordType,
          octave: 4,
          expectedNotes: [
            { note: 'G' as Note, octave: 4 },
            { note: 'C' as Note, octave: 5 },
            { note: 'D' as Note, octave: 5 }
          ],
          expectedName: 'Gsus4'
        },
        {
          name: 'C add9',
          root: 'C' as Note,
          type: 'add9' as ChordType,
          octave: 4,
          expectedNotes: [
            { note: 'C' as Note, octave: 4 },
            { note: 'E' as Note, octave: 4 },
            { note: 'G' as Note, octave: 4 },
            { note: 'D' as Note, octave: 5 }
          ],
          expectedName: 'Cadd9'
        }
      ])('should build $name chord', ({ root, type, octave, expectedNotes, expectedName }) => {
        const chord = ChordEngine.buildChord(root, type, octave);

        expect(chord.notes).toHaveLength(expectedNotes.length);
        expect(chord.notes).toEqual(expectedNotes);
        expect(chord.name).toBe(expectedName);
      });
    });

    describe('Inversions', () => {
      it.each([
        {
          name: 'C major chord in 1st inversion',
          root: 'C' as Note,
          type: 'major' as ChordType,
          octave: 4,
          inversion: 1,
          expectedNotes: [
            { note: 'E' as Note, octave: 4 },
            { note: 'G' as Note, octave: 4 },
            { note: 'C' as Note, octave: 5 }
          ],
          expectedName: 'C/E'
        },
        {
          name: 'C major chord in 2nd inversion',
          root: 'C' as Note,
          type: 'major' as ChordType,
          octave: 4,
          inversion: 2,
          expectedNotes: [
            { note: 'G' as Note, octave: 4 },
            { note: 'C' as Note, octave: 5 },
            { note: 'E' as Note, octave: 5 }
          ],
          expectedName: 'C/G'
        },
        {
          name: 'G7 chord in 1st inversion',
          root: 'G' as Note,
          type: 'dominant7' as ChordType,
          octave: 3,
          inversion: 1,
          expectedNotes: [
            { note: 'B' as Note, octave: 3 },
            { note: 'D' as Note, octave: 4 },
            { note: 'F' as Note, octave: 4 },
            { note: 'G' as Note, octave: 4 }
          ],
          expectedName: 'G7/B'
        },
        {
          name: 'G7 chord in 3rd inversion',
          root: 'G' as Note,
          type: 'dominant7' as ChordType,
          octave: 3,
          inversion: 3,
          expectedNotes: [
            { note: 'F' as Note, octave: 4 },
            { note: 'G' as Note, octave: 4 },
            { note: 'B' as Note, octave: 4 },
            { note: 'D' as Note, octave: 5 }
          ],
          expectedName: 'G7/F'
        }
      ])('should build $name', ({ root, type, octave, inversion, expectedNotes, expectedName }) => {
        const chord = ChordEngine.buildChord(root, type, octave, inversion);

        expect(chord.inversion).toBe(inversion);
        expect(chord.notes).toHaveLength(expectedNotes.length);
        expect(chord.notes).toEqual(expectedNotes);
        expect(chord.name).toBe(expectedName);
      });
    });

    describe('Edge Cases and Error Handling', () => {
      it.each([
        {
          name: 'invalid octave (too low)',
          root: 'C' as Note,
          type: 'major' as ChordType,
          octave: 0,
          inversion: 0,
          expectedError: 'Octave must be between 1 and 8'
        },
        {
          name: 'invalid octave (too high)',
          root: 'C' as Note,
          type: 'major' as ChordType,
          octave: 9,
          inversion: 0,
          expectedError: 'Octave must be between 1 and 8'
        },
        {
          name: 'invalid inversion',
          root: 'C' as Note,
          type: 'major' as ChordType,
          octave: 4,
          inversion: 3,
          expectedError: 'Inversion must be between 0 and 2'
        },
        {
          name: 'negative inversion',
          root: 'C' as Note,
          type: 'major' as ChordType,
          octave: 4,
          inversion: -1,
          expectedError: 'Inversion must be between 0 and 2'
        },
        {
          name: 'inversion exceeding octave 8',
          root: 'G' as Note,
          type: 'major' as ChordType,
          octave: 8,
          inversion: 2,
          expectedError: 'notes above C8'
        }
      ])('should throw error for $name', ({ root, type, octave, inversion, expectedError }) => {
        expect(() => ChordEngine.buildChord(root, type, octave, inversion)).toThrow(expectedError);
      });

      it('should handle sharps in root note', () => {
        const chord = ChordEngine.buildChord('F#', 'major', 4);

        expect(chord.root).toBe('F#');
        expect(chord.notes[0]).toEqual({ note: 'F#', octave: 4 });
        expect(chord.notes[1]).toEqual({ note: 'A#', octave: 4 });
        expect(chord.notes[2]).toEqual({ note: 'C#', octave: 5 });
      });
    });
  });

  describe('getChordName', () => {
    it.each([
      { root: 'C' as Note, type: 'major' as ChordType, expectedName: 'C' },
      { root: 'A' as Note, type: 'minor' as ChordType, expectedName: 'Am' },
      { root: 'G' as Note, type: 'dominant7' as ChordType, expectedName: 'G7' },
      { root: 'C' as Note, type: 'major7' as ChordType, expectedName: 'Cmaj7' },
      { root: 'D' as Note, type: 'sus2' as ChordType, expectedName: 'Dsus2' },
      { root: 'G' as Note, type: 'sus4' as ChordType, expectedName: 'Gsus4' }
    ])('should format $type chord as $expectedName', ({ root, type, expectedName }) => {
      const name = ChordEngine.getChordName({ root, type, inversion: 0 } as Chord);
      expect(name).toBe(expectedName);
    });

    it('should include bass note for inversions', () => {
      const chord: Pick<Chord, 'root' | 'type' | 'notes' | 'inversion'> = {
        root: 'C' as Note,
        type: 'major' as ChordType,
        inversion: 1,
        notes: [{ note: 'E' as Note, octave: 4 }, { note: 'G' as Note, octave: 4 }, { note: 'C' as Note, octave: 5 }]
      };
      expect(ChordEngine.getChordName(chord)).toBe('C/E');
    });

    it('should handle sharp notes in inversion notation', () => {
      const chord: Pick<Chord, 'root' | 'type' | 'notes' | 'inversion'> = {
        root: 'F' as Note,
        type: 'major' as ChordType,
        inversion: 2,
        notes: [{ note: 'C' as Note, octave: 5 }, { note: 'F' as Note, octave: 5 }, { note: 'A' as Note, octave: 5 }]
      };
      expect(ChordEngine.getChordName(chord)).toBe('F/C');
    });
  });

  describe('validateChord', () => {
    it('should validate a correct C major chord', () => {
      const chord: Chord = {
        name: 'C',
        root: 'C',
        type: 'major',
        notes: [
          { note: 'C', octave: 4 },
          { note: 'E', octave: 4 },
          { note: 'G', octave: 4 }
        ],
        inversion: 0
      };
      expect(ChordEngine.validateChord(chord)).toBe(true);
    });

    it.each([
      {
        name: 'empty notes array',
        chord: {
          name: 'C',
          root: 'C' as Note,
          type: 'major' as ChordType,
          notes: [],
          inversion: 0
        }
      },
      {
        name: 'wrong number of notes',
        chord: {
          name: 'C',
          root: 'C' as Note,
          type: 'major' as ChordType,
          notes: [
            { note: 'C' as Note, octave: 4 },
            { note: 'E' as Note, octave: 4 }
          ],
          inversion: 0
        }
      },
      {
        name: 'unsorted notes',
        chord: {
          name: 'C',
          root: 'C' as Note,
          type: 'major' as ChordType,
          notes: [
            { note: 'E' as Note, octave: 4 },
            { note: 'C' as Note, octave: 4 },
            { note: 'G' as Note, octave: 4 }
          ],
          inversion: 0
        }
      },
      {
        name: 'octave out of range',
        chord: {
          name: 'C',
          root: 'C' as Note,
          type: 'major' as ChordType,
          notes: [
            { note: 'C' as Note, octave: 0 as any },
            { note: 'E' as Note, octave: 0 as any },
            { note: 'G' as Note, octave: 0 as any }
          ],
          inversion: 0
        }
      },
      {
        name: 'missing root note',
        chord: {
          name: 'C',
          root: 'C' as Note,
          type: 'major' as ChordType,
          notes: [
            { note: 'D' as Note, octave: 4 },
            { note: 'E' as Note, octave: 4 },
            { note: 'G' as Note, octave: 4 }
          ],
          inversion: 0
        }
      },
      {
        name: 'invalid inversion',
        chord: {
          name: 'C',
          root: 'C' as Note,
          type: 'major' as ChordType,
          notes: [
            { note: 'C' as Note, octave: 4 },
            { note: 'E' as Note, octave: 4 },
            { note: 'G' as Note, octave: 4 }
          ],
          inversion: 5
        }
      }
    ])('should invalidate chord with $name', ({ chord }) => {
      expect(ChordEngine.validateChord(chord as Chord)).toBe(false);
    });

    it('should validate an inverted chord', () => {
      const chord: Chord = {
        name: 'C/E',
        root: 'C',
        type: 'major',
        notes: [
          { note: 'E', octave: 4 },
          { note: 'G', octave: 4 },
          { note: 'C', octave: 5 }
        ],
        inversion: 1
      };
      expect(ChordEngine.validateChord(chord)).toBe(true);
    });
  });

  describe('getChordFromNotes', () => {
    it.each([
      {
        name: 'C major chord',
        notes: [
          { note: 'C' as Note, octave: 4 as Octave },
          { note: 'E' as Note, octave: 4 as Octave },
          { note: 'G' as Note, octave: 4 as Octave }
        ],
        expectedRoot: 'C',
        expectedType: 'major',
        expectedInversion: 0,
        expectedName: 'C'
      },
      {
        name: 'D minor chord',
        notes: [
          { note: 'D' as Note, octave: 3 as Octave },
          { note: 'F' as Note, octave: 3 as Octave },
          { note: 'A' as Note, octave: 3 as Octave }
        ],
        expectedRoot: 'D',
        expectedType: 'minor',
        expectedInversion: 0,
        expectedName: 'Dm'
      },
      {
        name: 'G7 chord',
        notes: [
          { note: 'G' as Note, octave: 3 as Octave },
          { note: 'B' as Note, octave: 3 as Octave },
          { note: 'D' as Note, octave: 4 as Octave },
          { note: 'F' as Note, octave: 4 as Octave }
        ],
        expectedRoot: 'G',
        expectedType: 'dominant7',
        expectedInversion: 0,
        expectedName: 'G7'
      },
      {
        name: 'C major chord in 1st inversion',
        notes: [
          { note: 'E' as Note, octave: 4 as Octave },
          { note: 'G' as Note, octave: 4 as Octave },
          { note: 'C' as Note, octave: 5 as Octave }
        ],
        expectedRoot: 'C',
        expectedType: 'major',
        expectedInversion: 1,
        expectedName: 'C/E'
      },
      {
        name: 'C major chord in 2nd inversion',
        notes: [
          { note: 'G' as Note, octave: 4 as Octave },
          { note: 'C' as Note, octave: 5 as Octave },
          { note: 'E' as Note, octave: 5 as Octave }
        ],
        expectedRoot: 'C',
        expectedType: 'major',
        expectedInversion: 2,
        expectedName: 'C/G'
      },
      {
        name: 'Cmaj9 chord',
        notes: [
          { note: 'C' as Note, octave: 4 as Octave },
          { note: 'E' as Note, octave: 4 as Octave },
          { note: 'G' as Note, octave: 4 as Octave },
          { note: 'B' as Note, octave: 4 as Octave },
          { note: 'D' as Note, octave: 5 as Octave }
        ],
        expectedRoot: 'C',
        expectedType: 'major9',
        expectedInversion: 0,
        expectedName: 'Cmaj9'
      }
    ])('should identify $name', ({ notes, expectedRoot, expectedType, expectedInversion, expectedName }) => {
      const chord = ChordEngine.getChordFromNotes(notes);

      expect(chord).not.toBeNull();
      expect(chord?.root).toBe(expectedRoot);
      expect(chord?.type).toBe(expectedType);
      expect(chord?.inversion).toBe(expectedInversion);
      if (expectedName) {
        expect(chord?.name).toBe(expectedName);
      }
    });

    it.each([
      {
        name: 'unrecognized chord',
        notes: [
          { note: 'C' as Note, octave: 4 as Octave },
          { note: 'D' as Note, octave: 4 as Octave }
        ]
      },
      {
        name: 'empty array',
        notes: []
      }
    ])('should return null for $name', ({ notes }) => {
      const chord = ChordEngine.getChordFromNotes(notes);
      expect(chord).toBeNull();
    });

    it('should handle unsorted input notes', () => {
      const notes: NoteWithOctave[] = [
        { note: 'G', octave: 4 },
        { note: 'C', octave: 4 },
        { note: 'E', octave: 4 }
      ];
      const chord = ChordEngine.getChordFromNotes(notes);

      expect(chord).not.toBeNull();
      expect(chord?.root).toBe('C');
      expect(chord?.type).toBe('major');
    });
  });
});
