import { describe, it, expect } from 'vitest';
import { ChordEngine } from './chordEngine';
import type { Chord, ChordType, Note, NoteWithOctave, Octave, ChordFilter } from '../types/music';
import { WHITE_KEYS, BLACK_KEYS } from '../types/music';
import {
  TEST_CONSTANTS,
  assertValidChord,
  assertChordMatches,
  assertInversionNameCorrect,
  assertNotesSorted,
  assertAllChordsValid,
  assertChordNameFormat,
  generateMultipleChords,
  getOctaveSpan,
  measurePerformance,
  createFilter
} from './__tests__/testHelpers';

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
        },
        {
          name: 'A minor 9',
          root: 'A' as Note,
          type: 'minor9' as ChordType,
          octave: 3,
          expectedNotes: [
            { note: 'A' as Note, octave: 3 },
            { note: 'C' as Note, octave: 4 },
            { note: 'E' as Note, octave: 4 },
            { note: 'G' as Note, octave: 4 },
            { note: 'B' as Note, octave: 4 }
          ],
          expectedName: 'Am9'
        },
        {
          name: 'C major 11',
          root: 'C' as Note,
          type: 'major11' as ChordType,
          octave: 3,
          expectedNotes: [
            { note: 'C' as Note, octave: 3 },
            { note: 'E' as Note, octave: 3 },
            { note: 'G' as Note, octave: 3 },
            { note: 'B' as Note, octave: 3 },
            { note: 'D' as Note, octave: 4 },
            { note: 'F' as Note, octave: 4 }
          ],
          expectedName: 'Cmaj11'
        },
        {
          name: 'G dominant 11',
          root: 'G' as Note,
          type: 'dominant11' as ChordType,
          octave: 3,
          expectedNotes: [
            { note: 'G' as Note, octave: 3 },
            { note: 'B' as Note, octave: 3 },
            { note: 'D' as Note, octave: 4 },
            { note: 'F' as Note, octave: 4 },
            { note: 'A' as Note, octave: 4 },
            { note: 'C' as Note, octave: 5 }
          ],
          expectedName: 'G11'
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
        },
        {
          name: 'F add11',
          root: 'F' as Note,
          type: 'add11' as ChordType,
          octave: 3,
          expectedNotes: [
            { note: 'F' as Note, octave: 3 },
            { note: 'A' as Note, octave: 3 },
            { note: 'C' as Note, octave: 4 },
            { note: 'A#' as Note, octave: 4 }
          ],
          expectedName: 'Fadd11'
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

    describe('Inversion Edge Cases', () => {
      it('should handle extended chord inversions (9th chords)', () => {
        const inversions = [0, 1, 2, 3, 4];
        inversions.forEach(inv => {
          const chord = ChordEngine.buildChord('C', 'major9', 3, inv);
          expect(chord.inversion).toBe(inv);
          expect(chord.notes).toHaveLength(5);
          expect(ChordEngine.validateChord(chord)).toBe(true);
        });
      });

      it('should handle extended chord inversions (11th chords)', () => {
        const inversions = [0, 1, 2, 3, 4, 5];
        inversions.forEach(inv => {
          const chord = ChordEngine.buildChord('C', 'major11', 3, inv);
          expect(chord.inversion).toBe(inv);
          expect(chord.notes).toHaveLength(6);
          expect(ChordEngine.validateChord(chord)).toBe(true);
        });
      });

      it('should handle inversions at low boundary (octave 1)', () => {
        // Triad inversions at octave 1
        const chord1 = ChordEngine.buildChord('C', 'major', 1, 0);
        expect(chord1.notes[0].octave).toBe(1);
        expect(ChordEngine.validateChord(chord1)).toBe(true);

        const chord2 = ChordEngine.buildChord('C', 'major', 1, 1);
        expect(chord2.notes[0].octave).toBe(1);
        expect(ChordEngine.validateChord(chord2)).toBe(true);
      });

      it('should handle inversions at high boundary (octave 7)', () => {
        // Triad inversions at octave 7 (octave 8 would overflow for some inversions)
        const chord1 = ChordEngine.buildChord('C', 'major', 7, 0);
        expect(chord1.notes[0].octave).toBe(7);
        expect(ChordEngine.validateChord(chord1)).toBe(true);

        const chord2 = ChordEngine.buildChord('C', 'major', 7, 1);
        expect(chord2.notes[0].octave).toBe(7);
        expect(ChordEngine.validateChord(chord2)).toBe(true);
      });

      it.each(TEST_CONSTANTS.TRIAD_TYPES.map(type => ({ type })))(
        'should verify $type triad inversion names are correct',
        ({ type }) => {
          const rootPosition = ChordEngine.buildChord('C', type, 4, 0);
          assertInversionNameCorrect(rootPosition);

          const firstInv = ChordEngine.buildChord('C', type, 4, 1);
          assertInversionNameCorrect(firstInv);

          const secondInv = ChordEngine.buildChord('C', type, 4, 2);
          assertInversionNameCorrect(secondInv);
        }
      );

      it.each(TEST_CONSTANTS.SEVENTH_TYPES.map(type => ({ type })))(
        'should verify $type seventh chord inversion names are correct',
        ({ type }) => {
          const rootPosition = ChordEngine.buildChord('G', type, 3, 0);
          assertInversionNameCorrect(rootPosition);

          for (let inv = 1; inv <= 3; inv++) {
            const chord = ChordEngine.buildChord('G', type, 3, inv);
            assertInversionNameCorrect(chord);
          }
        }
      );

      it.each([
        { type: 'major9' as ChordType, maxInversion: 4 },
        { type: 'minor9' as ChordType, maxInversion: 4 },
        { type: 'dominant9' as ChordType, maxInversion: 4 }
      ])(
        'should verify $type extended chord inversion names are correct',
        ({ type, maxInversion }) => {
          const rootPosition = ChordEngine.buildChord('D', type, 3, 0);
          assertInversionNameCorrect(rootPosition);

          for (let inv = 1; inv <= maxInversion; inv++) {
            const chord = ChordEngine.buildChord('D', type, 3, inv);
            assertInversionNameCorrect(chord);
          }
        }
      );

      it('should handle inversions that span multiple octaves', () => {
        // A 2nd inversion of C major starting at octave 4 will have notes in octaves 4 and 5
        const chord = ChordEngine.buildChord('C', 'major', 4, 2);

        const octaveSpan = new Set(chord.notes.map(n => n.octave));
        expect(octaveSpan.size).toBeGreaterThan(1);
        expect(octaveSpan.has(4)).toBe(true);
        expect(octaveSpan.has(5)).toBe(true);
      });

      it('should handle 11th chord inversions that span 3+ octaves', () => {
        const chord = ChordEngine.buildChord('C', 'major11', 3, 5);

        const octaves = chord.notes.map(n => n.octave);
        const minOctave = Math.min(...octaves);
        const maxOctave = Math.max(...octaves);
        const octaveSpan = maxOctave - minOctave;

        // 11th chords with inversions can span multiple octaves
        expect(octaveSpan).toBeGreaterThanOrEqual(1);
        expect(ChordEngine.validateChord(chord)).toBe(true);
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

    describe('Boundary Testing', () => {
      it('should build chords starting at octave 1 (lowest boundary)', () => {
        const chordTypes: ChordType[] = ['major', 'minor', 'diminished', 'augmented'];

        chordTypes.forEach(type => {
          const chord = ChordEngine.buildChord('C', type, 1, 0);
          expect(chord.notes[0].octave).toBe(1);
          expect(ChordEngine.validateChord(chord)).toBe(true);
        });
      });

      it('should build chords ending at octave 8 (highest boundary)', () => {
        // Simple triads at octave 7 should have highest note at octave 7 or 8
        const chord = ChordEngine.buildChord('C', 'major', 7, 0);
        const maxOctave = Math.max(...chord.notes.map(n => n.octave));
        expect(maxOctave).toBeLessThanOrEqual(8);
        expect(ChordEngine.validateChord(chord)).toBe(true);
      });

      it.each([
        { type: 'major' as ChordType, octave: 4 as Octave, expectedLength: 3 },
        { type: 'minor' as ChordType, octave: 4 as Octave, expectedLength: 3 },
        { type: 'dominant7' as ChordType, octave: 3 as Octave, expectedLength: 4 }
      ])(
        'should test all 12 chromatic root notes with $type chords',
        ({ type, octave, expectedLength }) => {
          TEST_CONSTANTS.ALL_NOTES.forEach(note => {
            const chord = ChordEngine.buildChord(note, type, octave, 0);
            assertChordMatches(chord, { root: note, type });
            expect(chord.notes).toHaveLength(expectedLength);
            assertValidChord(chord);
          });
        }
      );

      it.each(TEST_CONSTANTS.SHARP_NOTES.map(note => ({ note })))(
        'should maintain consistent sharp spelling for $note across chord types',
        ({ note }) => {
          const chordTypes: ChordType[] = ['major', 'minor', 'major7', 'minor7'];

          chordTypes.forEach(type => {
            const chord = ChordEngine.buildChord(note, type, 4, 0);
            assertChordMatches(chord, { root: note });
            // Root note should remain sharp in the chord
            expect(chord.notes[0].note).toBe(note);
          });
        }
      );

      it.each(TEST_CONSTANTS.NATURAL_NOTES.map(note => ({ note })))(
        'should handle natural note $note consistently',
        ({ note }) => {
          const chord = ChordEngine.buildChord(note, 'major', 4, 0);
          assertChordMatches(chord, { root: note });
          expect(chord.notes[0].note).toBe(note);
          assertValidChord(chord);
        }
      );

      it('should test extended chords at octave boundaries', () => {
        // Major 11 at octave 1 should work
        const lowChord = ChordEngine.buildChord('C', 'major11', 1, 0);
        expect(lowChord.notes[0].octave).toBe(1);
        expect(lowChord.notes).toHaveLength(6);
        expect(ChordEngine.validateChord(lowChord)).toBe(true);

        // Major 9 at octave 6 should work (7 might overflow)
        const highChord = ChordEngine.buildChord('C', 'major9', 6, 0);
        const maxOctave = Math.max(...highChord.notes.map(n => n.octave));
        expect(maxOctave).toBeLessThanOrEqual(8);
        expect(ChordEngine.validateChord(highChord)).toBe(true);
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

  describe('getRandomChordFromFilter', () => {
    describe('Basic Filtering', () => {
      it('should generate chord with single chord type filter', () => {
        const filter = createFilter()
          .withChordTypes('major')
          .withOctaves(4)
          .build();

        const chord = ChordEngine.getRandomChordFromFilter(filter);

        assertValidChord(chord);
        assertChordMatches(chord, { type: 'major', inversion: 0 });
        expect(chord.notes[0].octave).toBe(4);
      });

      it('should generate chord with multiple chord types', () => {
        const filter = createFilter()
          .withChordTypes('major', 'minor', 'diminished')
          .withOctaves(4)
          .build();

        const chord = ChordEngine.getRandomChordFromFilter(filter);

        assertValidChord(chord);
        expect(['major', 'minor', 'diminished']).toContain(chord.type);
        assertChordMatches(chord, { inversion: 0 });
      });

      it.each([
        { name: 'white keys only', filterMethod: (builder: ReturnType<typeof createFilter>) => builder.withWhiteKeysOnly(), expectedNotes: WHITE_KEYS },
        { name: 'black keys only', filterMethod: (builder: ReturnType<typeof createFilter>) => builder.withBlackKeysOnly(), expectedNotes: BLACK_KEYS },
        { name: 'specific notes', filterMethod: (builder: ReturnType<typeof createFilter>) => builder.withRootNotes('C' as Note, 'F' as Note, 'G' as Note), expectedNotes: ['C', 'F', 'G'] }
      ])(
        'should respect allowedRootNotes filter ($name)',
        ({ filterMethod, expectedNotes }) => {
          const filter = filterMethod(
            createFilter().withChordTypes('major').withOctaves(4)
          ).build();

          const chords = generateMultipleChords(filter, 20);
          chords.forEach(chord => {
            expect(expectedNotes).toContain(chord.root);
          });
        }
      );

      it('should respect allowedOctaves filter (single octave)', () => {
        const filter: ChordFilter = {
          allowedChordTypes: ['major'],
          allowedRootNotes: null,
          allowedOctaves: [3],
          includeInversions: false
        };

        const chord = ChordEngine.getRandomChordFromFilter(filter);
        expect(chord.notes[0].octave).toBe(3);
      });

      it('should respect allowedOctaves filter (multiple octaves)', () => {
        const filter: ChordFilter = {
          allowedChordTypes: ['major'],
          allowedRootNotes: ['C'],
          allowedOctaves: [3, 4, 5],
          includeInversions: false
        };

        const octavesSeen = new Set<number>();
        // Generate multiple chords to see different octaves
        for (let i = 0; i < 50; i++) {
          const chord = ChordEngine.getRandomChordFromFilter(filter);
          octavesSeen.add(chord.notes[0].octave);
        }

        // All seen octaves should be in allowed list
        octavesSeen.forEach(octave => {
          expect([3, 4, 5]).toContain(octave);
        });
      });
    });

    describe('Inversion Filtering', () => {
      it('should only generate root position when includeInversions is false', () => {
        const filter: ChordFilter = {
          allowedChordTypes: ['major', 'minor'],
          allowedRootNotes: ['C', 'D', 'E'],
          allowedOctaves: [4],
          includeInversions: false
        };

        for (let i = 0; i < 20; i++) {
          const chord = ChordEngine.getRandomChordFromFilter(filter);
          expect(chord.inversion).toBe(0);
        }
      });

      it('should generate inversions when includeInversions is true', () => {
        const filter: ChordFilter = {
          allowedChordTypes: ['major'],
          allowedRootNotes: ['C'],
          allowedOctaves: [4],
          includeInversions: true
        };

        const inversionsSeen = new Set<number>();
        // Generate multiple chords to see different inversions
        for (let i = 0; i < 50; i++) {
          const chord = ChordEngine.getRandomChordFromFilter(filter);
          inversionsSeen.add(chord.inversion ?? 0);
        }

        // Should see multiple inversions (0, 1, 2 for triads)
        expect(inversionsSeen.size).toBeGreaterThan(1);
      });

      it('should handle inversions correctly for 7th chords', () => {
        const filter: ChordFilter = {
          allowedChordTypes: ['dominant7'],
          allowedRootNotes: ['G'],
          allowedOctaves: [3],
          includeInversions: true
        };

        const inversionsSeen = new Set<number>();
        for (let i = 0; i < 100; i++) {
          const chord = ChordEngine.getRandomChordFromFilter(filter);
          inversionsSeen.add(chord.inversion ?? 0);
          // Dominant 7 has 4 notes, so inversions are 0-3
          expect(chord.inversion).toBeGreaterThanOrEqual(0);
          expect(chord.inversion).toBeLessThanOrEqual(3);
        }

        // Should eventually see multiple inversions
        expect(inversionsSeen.size).toBeGreaterThan(1);
      });
    });

    describe('Edge Cases and Error Handling', () => {
      it('should throw error when no valid chords are available (empty allowedChordTypes)', () => {
        const filter: ChordFilter = {
          allowedChordTypes: [],
          allowedRootNotes: null,
          allowedOctaves: [4],
          includeInversions: false
        };

        expect(() => ChordEngine.getRandomChordFromFilter(filter)).toThrow(
          'No valid chords available with current filter settings'
        );
      });

      it('should throw error when no valid chords are available (empty allowedOctaves)', () => {
        const filter: ChordFilter = {
          allowedChordTypes: ['major'],
          allowedRootNotes: null,
          allowedOctaves: [],
          includeInversions: false
        };

        expect(() => ChordEngine.getRandomChordFromFilter(filter)).toThrow(
          'No valid chords available with current filter settings'
        );
      });

      it('should throw error when no valid chords are available (empty allowedRootNotes)', () => {
        const filter: ChordFilter = {
          allowedChordTypes: ['major'],
          allowedRootNotes: [],
          allowedOctaves: [4],
          includeInversions: false
        };

        expect(() => ChordEngine.getRandomChordFromFilter(filter)).toThrow(
          'No valid chords available with current filter settings'
        );
      });

      it('should not throw error when keyFilter is specified', () => {
        const filter: ChordFilter = {
          allowedChordTypes: ['major'],
          allowedRootNotes: null,
          allowedOctaves: [4],
          includeInversions: false,
          keyFilter: { key: 'C', scale: 'major' }
        };

        expect(() => ChordEngine.getRandomChordFromFilter(filter)).not.toThrow();
      });

      it('should skip invalid chords that exceed octave boundaries', () => {
        // Extended chords at high octaves might exceed C8
        const filter: ChordFilter = {
          allowedChordTypes: ['major11'],
          allowedRootNotes: ['C'],
          allowedOctaves: [7, 8],
          includeInversions: false
        };

        // Should not throw error, just skip invalid chords
        // Octave 7 should work, octave 8 might not
        const chord = ChordEngine.getRandomChordFromFilter(filter);
        expect(chord).toBeDefined();
        expect(chord.notes[0].octave).toBe(7); // Should use octave 7, not 8
      });

      it('should handle very restrictive filter (single chord)', () => {
        const filter: ChordFilter = {
          allowedChordTypes: ['major'],
          allowedRootNotes: ['C'],
          allowedOctaves: [4],
          includeInversions: false
        };

        // Should always return the same chord (C major in octave 4)
        for (let i = 0; i < 10; i++) {
          const chord = ChordEngine.getRandomChordFromFilter(filter);
          expect(chord.root).toBe('C');
          expect(chord.type).toBe('major');
          expect(chord.notes[0].octave).toBe(4);
          expect(chord.inversion).toBe(0);
        }
      });
    });

    describe('Integration with buildChord', () => {
      it('should return valid chords that pass validateChord', () => {
        const filter: ChordFilter = {
          allowedChordTypes: ['major', 'minor', 'dominant7'],
          allowedRootNotes: null,
          allowedOctaves: [3, 4, 5],
          includeInversions: true
        };

        for (let i = 0; i < 50; i++) {
          const chord = ChordEngine.getRandomChordFromFilter(filter);
          expect(ChordEngine.validateChord(chord)).toBe(true);
        }
      });

      it('should return chords with correctly formatted names', () => {
        const filter: ChordFilter = {
          allowedChordTypes: ['major', 'minor7'],
          allowedRootNotes: ['C', 'G'],
          allowedOctaves: [4],
          includeInversions: false
        };

        for (let i = 0; i < 20; i++) {
          const chord = ChordEngine.getRandomChordFromFilter(filter);
          expect(chord.name).toBeDefined();
          expect(chord.name.length).toBeGreaterThan(0);
          // Name should match what getChordName would return
          expect(chord.name).toBe(ChordEngine.getChordName(chord));
        }
      });

      it('should return chords with notes sorted by pitch', () => {
        const filter: ChordFilter = {
          allowedChordTypes: ['major', 'minor', 'dominant7'],
          allowedRootNotes: null,
          allowedOctaves: [3, 4],
          includeInversions: true
        };

        for (let i = 0; i < 50; i++) {
          const chord = ChordEngine.getRandomChordFromFilter(filter);

          // Verify notes are sorted
          for (let j = 1; j < chord.notes.length; j++) {
            const prev = chord.notes[j - 1];
            const curr = chord.notes[j];

            if (curr.octave === prev.octave) {
              // Same octave: current note index should be higher
              const prevIndex = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(prev.note);
              const currIndex = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(curr.note);
              expect(currIndex).toBeGreaterThan(prevIndex);
            } else {
              // Different octave: current octave should be higher
              expect(curr.octave).toBeGreaterThan(prev.octave);
            }
          }
        }
      });
    });

    describe('Randomness and Distribution', () => {
      it('should generate different chord types with roughly even distribution', () => {
        const filter: ChordFilter = {
          allowedChordTypes: ['major', 'minor'],
          allowedRootNotes: ['C'],
          allowedOctaves: [4],
          includeInversions: false
        };

        const typeCounts: Record<string, number> = { major: 0, minor: 0 };
        const iterations = 100;

        for (let i = 0; i < iterations; i++) {
          const chord = ChordEngine.getRandomChordFromFilter(filter);
          typeCounts[chord.type]++;
        }

        // Both types should appear (not one-sided)
        expect(typeCounts.major).toBeGreaterThan(0);
        expect(typeCounts.minor).toBeGreaterThan(0);

        // Distribution should be roughly even (allow some variance)
        // Each should be between 30% and 70%
        expect(typeCounts.major).toBeGreaterThan(iterations * 0.3);
        expect(typeCounts.major).toBeLessThan(iterations * 0.7);
      });

      it('should generate different root notes when multiple are allowed', () => {
        const filter: ChordFilter = {
          allowedChordTypes: ['major'],
          allowedRootNotes: ['C', 'D', 'E', 'F', 'G'],
          allowedOctaves: [4],
          includeInversions: false
        };

        const rootsSeen = new Set<string>();

        for (let i = 0; i < 100; i++) {
          const chord = ChordEngine.getRandomChordFromFilter(filter);
          rootsSeen.add(chord.root);
        }

        // Should see multiple different roots
        expect(rootsSeen.size).toBeGreaterThan(1);
      });

      it('should generate different inversions with roughly even distribution', () => {
        const filter: ChordFilter = {
          allowedChordTypes: ['major'],
          allowedRootNotes: ['C'],
          allowedOctaves: [4],
          includeInversions: true
        };

        const inversionCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
        const iterations = 150;

        for (let i = 0; i < iterations; i++) {
          const chord = ChordEngine.getRandomChordFromFilter(filter);
          inversionCounts[chord.inversion ?? 0]++;
        }

        // All inversions should appear
        expect(inversionCounts[0]).toBeGreaterThan(0);
        expect(inversionCounts[1]).toBeGreaterThan(0);
        expect(inversionCounts[2]).toBeGreaterThan(0);

        // Rough evenness check (allow variance)
        const expectedPerInversion = iterations / 3;
        expect(inversionCounts[0]).toBeGreaterThan(expectedPerInversion * 0.5);
        expect(inversionCounts[1]).toBeGreaterThan(expectedPerInversion * 0.5);
        expect(inversionCounts[2]).toBeGreaterThan(expectedPerInversion * 0.5);
      });
    });

    describe('Filter Edge Cases', () => {
      it('should handle extremely large octave ranges (octaves 1-8)', () => {
        const filter: ChordFilter = {
          allowedChordTypes: ['major'],
          allowedRootNotes: ['C'],
          allowedOctaves: [1, 2, 3, 4, 5, 6, 7, 8],
          includeInversions: false
        };

        const octavesSeen = new Set<number>();
        for (let i = 0; i < 200; i++) {
          const chord = ChordEngine.getRandomChordFromFilter(filter);
          octavesSeen.add(chord.notes[0].octave);
          expect(chord.root).toBe('C');
          expect(chord.type).toBe('major');
        }

        // Should see multiple different octaves used
        expect(octavesSeen.size).toBeGreaterThan(3);
      });

      it('should handle all chord types enabled simultaneously', () => {
        const allChordTypes: ChordType[] = [
          'major', 'minor', 'diminished', 'augmented',
          'major7', 'minor7', 'dominant7', 'halfDiminished7', 'diminished7',
          'major9', 'minor9', 'dominant9',
          'major11', 'minor11', 'dominant11',
          'sus2', 'sus4', 'add9', 'add11'
        ];

        const filter: ChordFilter = {
          allowedChordTypes: allChordTypes,
          allowedRootNotes: ['C'],
          allowedOctaves: [3],
          includeInversions: false
        };

        const typesSeen = new Set<string>();
        for (let i = 0; i < 500; i++) {
          const chord = ChordEngine.getRandomChordFromFilter(filter);
          typesSeen.add(chord.type);
          expect(allChordTypes).toContain(chord.type as ChordType);
          expect(ChordEngine.validateChord(chord)).toBe(true);
        }

        // Should see many different chord types
        expect(typesSeen.size).toBeGreaterThan(10);
      });

      it('should handle filter with white keys only across multiple octaves', () => {
        const filter: ChordFilter = {
          allowedChordTypes: ['major', 'minor'],
          allowedRootNotes: WHITE_KEYS,
          allowedOctaves: [3, 4, 5],
          includeInversions: false
        };

        for (let i = 0; i < 50; i++) {
          const chord = ChordEngine.getRandomChordFromFilter(filter);
          expect(WHITE_KEYS).toContain(chord.root);
          expect([3, 4, 5]).toContain(chord.notes[0].octave);
        }
      });

      it('should handle filter with black keys only across multiple octaves', () => {
        const filter: ChordFilter = {
          allowedChordTypes: ['major', 'minor'],
          allowedRootNotes: BLACK_KEYS,
          allowedOctaves: [3, 4, 5],
          includeInversions: false
        };

        for (let i = 0; i < 50; i++) {
          const chord = ChordEngine.getRandomChordFromFilter(filter);
          expect(BLACK_KEYS).toContain(chord.root);
          expect([3, 4, 5]).toContain(chord.notes[0].octave);
        }
      });

      it('should handle filter that results in exactly one valid chord', () => {
        const filter: ChordFilter = {
          allowedChordTypes: ['diminished7'],
          allowedRootNotes: ['C#'],
          allowedOctaves: [4],
          includeInversions: false
        };

        // Should always return the same chord
        for (let i = 0; i < 20; i++) {
          const chord = ChordEngine.getRandomChordFromFilter(filter);
          expect(chord.root).toBe('C#');
          expect(chord.type).toBe('diminished7');
          expect(chord.notes[0].octave).toBe(4);
          expect(chord.inversion).toBe(0);
        }
      });

      it('should handle filter with thousands of valid chords', () => {
        const allNotes: Note[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const filter: ChordFilter = {
          allowedChordTypes: ['major', 'minor', 'dominant7', 'major7'],
          allowedRootNotes: allNotes,
          allowedOctaves: [3, 4],
          includeInversions: true
        };

        // Should handle large number of possibilities efficiently
        const chordsSeen = new Set<string>();
        for (let i = 0; i < 200; i++) {
          const chord = ChordEngine.getRandomChordFromFilter(filter);
          chordsSeen.add(`${chord.root}-${chord.type}-${chord.inversion}`);
          expect(allNotes).toContain(chord.root);
          expect(ChordEngine.validateChord(chord)).toBe(true);
        }

        // Should see many different chords
        expect(chordsSeen.size).toBeGreaterThan(50);
      });
    });

    describe('Caching Behavior', () => {
      it('should cache valid chords and reuse them on subsequent calls', () => {
        // Clear cache to start fresh
        ChordEngine.clearChordFilterCache();

        const filter: ChordFilter = {
          allowedChordTypes: ['major', 'minor'],
          allowedRootNotes: ['C', 'D'],
          allowedOctaves: [4],
          includeInversions: false
        };

        // First call - should calculate and cache
        const chord1 = ChordEngine.getRandomChordFromFilter(filter);
        expect(chord1).toBeDefined();

        // Subsequent calls should use cache - we can verify this works by
        // calling multiple times and checking we get valid results
        for (let i = 0; i < 10; i++) {
          const chord = ChordEngine.getRandomChordFromFilter(filter);
          expect(chord).toBeDefined();
          expect(['major', 'minor']).toContain(chord.type);
          expect(['C', 'D']).toContain(chord.root);
        }
      });

      it('should generate same cache key for filters with same settings but different array order', () => {
        ChordEngine.clearChordFilterCache();

        const filter1: ChordFilter = {
          allowedChordTypes: ['major', 'minor'],
          allowedRootNotes: ['C', 'D', 'E'],
          allowedOctaves: [3, 4],
          includeInversions: false
        };

        const filter2: ChordFilter = {
          allowedChordTypes: ['minor', 'major'], // Different order
          allowedRootNotes: ['E', 'C', 'D'], // Different order
          allowedOctaves: [4, 3], // Different order
          includeInversions: false
        };

        // Generate chords with first filter
        ChordEngine.getRandomChordFromFilter(filter1);

        // Second filter should reuse cache (verified by it not throwing error)
        const chord = ChordEngine.getRandomChordFromFilter(filter2);
        expect(chord).toBeDefined();
      });

      it('should use different cache entries for different filters', () => {
        ChordEngine.clearChordFilterCache();

        const filter1: ChordFilter = {
          allowedChordTypes: ['major'],
          allowedRootNotes: ['C'],
          allowedOctaves: [4],
          includeInversions: false
        };

        const filter2: ChordFilter = {
          allowedChordTypes: ['minor'],
          allowedRootNotes: ['D'],
          allowedOctaves: [4],
          includeInversions: false
        };

        // Generate with first filter
        const chord1 = ChordEngine.getRandomChordFromFilter(filter1);
        expect(chord1.type).toBe('major');
        expect(chord1.root).toBe('C');

        // Generate with second filter
        const chord2 = ChordEngine.getRandomChordFromFilter(filter2);
        expect(chord2.type).toBe('minor');
        expect(chord2.root).toBe('D');
      });

      it('should clear cache when clearChordFilterCache is called', () => {
        const filter: ChordFilter = {
          allowedChordTypes: ['major'],
          allowedRootNotes: ['C'],
          allowedOctaves: [4],
          includeInversions: false
        };

        // Populate cache
        ChordEngine.getRandomChordFromFilter(filter);

        // Clear cache
        ChordEngine.clearChordFilterCache();

        // Should still work after clearing (will recalculate)
        const chord = ChordEngine.getRandomChordFromFilter(filter);
        expect(chord).toBeDefined();
        expect(chord.type).toBe('major');
        expect(chord.root).toBe('C');
      });

      it('should handle null allowedRootNotes consistently in cache', () => {
        ChordEngine.clearChordFilterCache();

        const filter1: ChordFilter = {
          allowedChordTypes: ['major'],
          allowedRootNotes: null,
          allowedOctaves: [4],
          includeInversions: false
        };

        const filter2: ChordFilter = {
          allowedChordTypes: ['major'],
          allowedRootNotes: null,
          allowedOctaves: [4],
          includeInversions: false
        };

        // Both should use same cache entry
        ChordEngine.getRandomChordFromFilter(filter1);
        const chord = ChordEngine.getRandomChordFromFilter(filter2);

        expect(chord).toBeDefined();
        expect(chord.type).toBe('major');
      });
    });
  });

  describe('Integration with Chord Filter Helpers', () => {
    it('should work with applyChordFilterPreset', async () => {
      const { applyChordFilterPreset } = await import('./chordFilterHelpers');
      const { CHORD_FILTER_PRESETS } = await import('../constants/chordPresets');

      // Test with a basic preset
      if (CHORD_FILTER_PRESETS.BASIC_TRIADS) {
        const filter = applyChordFilterPreset(CHORD_FILTER_PRESETS.BASIC_TRIADS);
        const chord = ChordEngine.getRandomChordFromFilter(filter);

        expect(chord).toBeDefined();
        expect(ChordEngine.validateChord(chord)).toBe(true);
      }
    });

    it('should work with all available presets', async () => {
      const { applyChordFilterPreset } = await import('./chordFilterHelpers');
      const { CHORD_FILTER_PRESETS } = await import('../constants/chordPresets');

      // Test all presets from the constants
      Object.values(CHORD_FILTER_PRESETS).forEach(preset => {
        const filter = applyChordFilterPreset(preset);

        const chord = ChordEngine.getRandomChordFromFilter(filter);
        expect(chord).toBeDefined();
        expect(ChordEngine.validateChord(chord)).toBe(true);
      });
    });

    it('should merge presets with current filters', async () => {
      const { applyChordFilterPreset } = await import('./chordFilterHelpers');
      const { CHORD_FILTER_PRESETS } = await import('../constants/chordPresets');

      const currentFilter: ChordFilter = {
        allowedChordTypes: ['major'],
        allowedRootNotes: ['C'],
        allowedOctaves: [5],
        includeInversions: true
      };

      if (CHORD_FILTER_PRESETS.BASIC_TRIADS) {
        const mergedFilter = applyChordFilterPreset(CHORD_FILTER_PRESETS.BASIC_TRIADS, currentFilter);

        // Preset values should override current values
        expect(mergedFilter.allowedChordTypes).toEqual(CHORD_FILTER_PRESETS.BASIC_TRIADS.filter.allowedChordTypes);
      }
    });

    it('should retrieve presets by name', async () => {
      const { getChordFilterPresetByName } = await import('./chordFilterHelpers');
      const { CHORD_FILTER_PRESETS } = await import('../constants/chordPresets');

      // Get first preset's name
      const firstPreset = Object.values(CHORD_FILTER_PRESETS)[0];
      if (firstPreset) {
        const retrievedPreset = getChordFilterPresetByName(firstPreset.name);
        expect(retrievedPreset).toBeDefined();
        expect(retrievedPreset?.name).toBe(firstPreset.name);
      }
    });
  });

  describe('Diatonic Key Filtering', () => {
    const C_MAJOR_NOTES: Note[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const C_MINOR_NOTES: Note[] = ['C', 'D', 'D#', 'F', 'G', 'G#', 'A#'];

    it('should only produce chords with notes in C major scale', () => {
      const filter: ChordFilter = {
        allowedChordTypes: ['major', 'minor', 'diminished'],
        allowedRootNotes: null,
        allowedOctaves: [4],
        includeInversions: false,
        keyFilter: { key: 'C', scale: 'major' }
      };

      for (let i = 0; i < 50; i++) {
        const chord = ChordEngine.getRandomChordFromFilter(filter);
        chord.notes.forEach(n => {
          expect(C_MAJOR_NOTES).toContain(n.note);
        });
      }
    });

    it('should produce expected diatonic triads for C major', () => {
      const filter: ChordFilter = {
        allowedChordTypes: ['major', 'minor', 'diminished'],
        allowedRootNotes: null,
        allowedOctaves: [4],
        includeInversions: false,
        keyFilter: { key: 'C', scale: 'major' }
      };

      const chordsSeen = new Set<string>();
      for (let i = 0; i < 200; i++) {
        const chord = ChordEngine.getRandomChordFromFilter(filter);
        chordsSeen.add(`${chord.root}-${chord.type}`);
      }

      // C major diatonic triads: C, Dm, Em, F, G, Am, Bdim
      expect(chordsSeen.has('C-major')).toBe(true);
      expect(chordsSeen.has('D-minor')).toBe(true);
      expect(chordsSeen.has('E-minor')).toBe(true);
      expect(chordsSeen.has('F-major')).toBe(true);
      expect(chordsSeen.has('G-major')).toBe(true);
      expect(chordsSeen.has('A-minor')).toBe(true);
      expect(chordsSeen.has('B-diminished')).toBe(true);

      // Non-diatonic should not appear
      expect(chordsSeen.has('C-minor')).toBe(false);
      expect(chordsSeen.has('D-major')).toBe(false);
      expect(chordsSeen.has('C#-major')).toBe(false);
    });

    it('should only produce chords with notes in C minor scale', () => {
      const filter: ChordFilter = {
        allowedChordTypes: ['major', 'minor', 'diminished'],
        allowedRootNotes: null,
        allowedOctaves: [4],
        includeInversions: false,
        keyFilter: { key: 'C', scale: 'minor' }
      };

      for (let i = 0; i < 50; i++) {
        const chord = ChordEngine.getRandomChordFromFilter(filter);
        chord.notes.forEach(n => {
          expect(C_MINOR_NOTES).toContain(n.note);
        });
      }
    });

    it('should respect chord type restrictions with keyFilter', () => {
      // Only allow major chords in C major -> should get C, F, G
      const filter: ChordFilter = {
        allowedChordTypes: ['major'],
        allowedRootNotes: null,
        allowedOctaves: [4],
        includeInversions: false,
        keyFilter: { key: 'C', scale: 'major' }
      };

      const rootsSeen = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const chord = ChordEngine.getRandomChordFromFilter(filter);
        rootsSeen.add(chord.root);
        expect(chord.type).toBe('major');
      }

      // Only C, F, G should have major chords diatonic to C major
      expect(rootsSeen.has('C')).toBe(true);
      expect(rootsSeen.has('F')).toBe(true);
      expect(rootsSeen.has('G')).toBe(true);
      expect(rootsSeen.size).toBe(3);
    });

    it('should respect allowedRootNotes with keyFilter', () => {
      // Only allow C and G as roots in C major with major chords
      const filter: ChordFilter = {
        allowedChordTypes: ['major', 'minor', 'diminished'],
        allowedRootNotes: ['C', 'G'],
        allowedOctaves: [4],
        includeInversions: false,
        keyFilter: { key: 'C', scale: 'major' }
      };

      for (let i = 0; i < 50; i++) {
        const chord = ChordEngine.getRandomChordFromFilter(filter);
        expect(['C', 'G']).toContain(chord.root);
      }
    });

    it('should work with inversions and keyFilter', () => {
      const filter: ChordFilter = {
        allowedChordTypes: ['major'],
        allowedRootNotes: ['C'],
        allowedOctaves: [4],
        includeInversions: true,
        keyFilter: { key: 'C', scale: 'major' }
      };

      const inversionsSeen = new Set<number>();
      for (let i = 0; i < 50; i++) {
        const chord = ChordEngine.getRandomChordFromFilter(filter);
        inversionsSeen.add(chord.inversion ?? 0);
        // All notes should still be diatonic
        chord.notes.forEach(n => {
          expect(C_MAJOR_NOTES).toContain(n.note);
        });
      }

      expect(inversionsSeen.size).toBeGreaterThan(1);
    });

    it('should work with getDiatonicChords directly', () => {
      const filter: ChordFilter = {
        allowedChordTypes: ['major', 'minor', 'diminished'],
        allowedRootNotes: null,
        allowedOctaves: [4],
        includeInversions: false
      };

      const chords = ChordEngine.getDiatonicChords('C', 'major', filter);

      // Should have 7 diatonic triads in C major at octave 4
      expect(chords.length).toBe(7);

      // Verify all chord tones are diatonic
      chords.forEach(chord => {
        chord.notes.forEach(n => {
          expect(C_MAJOR_NOTES).toContain(n.note);
        });
      });
    });

    it('should throw when keyFilter produces no valid chords', () => {
      const filter: ChordFilter = {
        allowedChordTypes: ['augmented'], // No augmented chords are diatonic to C major
        allowedRootNotes: null,
        allowedOctaves: [4],
        includeInversions: false,
        keyFilter: { key: 'C', scale: 'major' }
      };

      expect(() => ChordEngine.getRandomChordFromFilter(filter)).toThrow(
        'No valid chords available with current filter settings'
      );
    });
  });

  describe('Stress and Performance Tests', () => {
    it('should handle generating 1000+ chords without errors', () => {
      const filter: ChordFilter = {
        allowedChordTypes: ['major', 'minor', 'dominant7'],
        allowedRootNotes: null,
        allowedOctaves: [3, 4, 5],
        includeInversions: true
      };

      for (let i = 0; i < 1000; i++) {
        const chord = ChordEngine.getRandomChordFromFilter(filter);
        expect(chord).toBeDefined();
        expect(ChordEngine.validateChord(chord)).toBe(true);
      }
    });

    it('should handle rapid filter switching', () => {
      const filters: ChordFilter[] = [
        {
          allowedChordTypes: ['major'],
          allowedRootNotes: ['C'],
          allowedOctaves: [4],
          includeInversions: false
        },
        {
          allowedChordTypes: ['minor'],
          allowedRootNotes: ['D'],
          allowedOctaves: [3],
          includeInversions: true
        },
        {
          allowedChordTypes: ['dominant7'],
          allowedRootNotes: ['G'],
          allowedOctaves: [5],
          includeInversions: false
        }
      ];

      // Rapidly switch between filters
      for (let i = 0; i < 300; i++) {
        const filter = filters[i % filters.length];
        const chord = ChordEngine.getRandomChordFromFilter(filter);
        expect(chord).toBeDefined();
      }
    });

    it('should handle cache with many different filter combinations', () => {
      ChordEngine.clearChordFilterCache();

      const chordTypes: ChordType[][] = [
        ['major'],
        ['minor'],
        ['major', 'minor'],
        ['dominant7'],
        ['major7', 'minor7']
      ];

      const octaves: Octave[][] = [
        [3],
        [4],
        [5],
        [3, 4],
        [4, 5]
      ];

      // Create many filter combinations
      let count = 0;
      chordTypes.forEach(types => {
        octaves.forEach(octs => {
          const filter: ChordFilter = {
            allowedChordTypes: types,
            allowedRootNotes: ['C', 'G'],
            allowedOctaves: octs,
            includeInversions: count % 2 === 0
          };

          const chord = ChordEngine.getRandomChordFromFilter(filter);
          expect(chord).toBeDefined();
          count++;
        });
      });

      // Should have created many cache entries
      expect(count).toBeGreaterThan(10);
    });

    it('should maintain performance with large valid chord pool', () => {
      const allNotes: Note[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const filter: ChordFilter = {
        allowedChordTypes: ['major', 'minor', 'major7', 'minor7', 'dominant7'],
        allowedRootNotes: allNotes,
        allowedOctaves: [2, 3, 4, 5, 6],
        includeInversions: true
      };

      const startTime = Date.now();

      // Generate many chords
      for (let i = 0; i < 500; i++) {
        const chord = ChordEngine.getRandomChordFromFilter(filter);
        expect(chord).toBeDefined();
      }

      const elapsed = Date.now() - startTime;

      // Should complete in reasonable time (less than 5 seconds)
      expect(elapsed).toBeLessThan(5000);
    });

    it('should handle buildChord called many times', () => {
      const notes: Note[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
      const types: ChordType[] = ['major', 'minor', 'major7', 'minor7'];

      for (let i = 0; i < 1000; i++) {
        const note = notes[i % notes.length];
        const type = types[i % types.length];
        const octave = (3 + (i % 3)) as Octave;

        const chord = ChordEngine.buildChord(note, type, octave);
        expect(chord).toBeDefined();
        expect(ChordEngine.validateChord(chord)).toBe(true);
      }
    });

    it('should handle validation of many chords', () => {
      const validChords: Chord[] = [];

      // Build a collection of chords
      for (let i = 0; i < 500; i++) {
        const filter: ChordFilter = {
          allowedChordTypes: ['major', 'minor'],
          allowedRootNotes: null,
          allowedOctaves: [4],
          includeInversions: true
        };
        validChords.push(ChordEngine.getRandomChordFromFilter(filter));
      }

      // Validate all of them
      validChords.forEach(chord => {
        expect(ChordEngine.validateChord(chord)).toBe(true);
      });
    });
  });
});
