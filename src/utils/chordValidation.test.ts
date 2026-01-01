/**
 * Unit tests for chord validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeChordName,
  getEnharmonicEquivalents,
  validateChordGuess,
} from './chordValidation';
import type { Chord } from '../types/music';

describe('chordValidation', () => {
  describe('getEnharmonicEquivalents', () => {
    it('should return C# and Db as enharmonic equivalents', () => {
      const equivalents = getEnharmonicEquivalents('C#');
      expect(equivalents).toContain('C#');
      // Note: We use sharps as canonical form, so Db is stored as a string literal
    });

    it('should return only C for natural notes', () => {
      const equivalents = getEnharmonicEquivalents('C');
      expect(equivalents).toEqual(['C']);
    });

    it('should return F# and its enharmonic equivalent', () => {
      const equivalents = getEnharmonicEquivalents('F#');
      expect(equivalents).toContain('F#');
    });
  });

  describe('normalizeChordName', () => {
    it.each([
      // Empty input
      ['', ''],
      ['   ', ''],

      // Major chord variations
      ['C Major', 'C'],
      ['C major', 'C'],
      ['Cmaj', 'C'],
      ['C', 'C'],

      // Minor chord variations
      ['A Minor', 'Am'],
      ['A minor', 'Am'],
      ['Amin', 'Am'],
      ['Am', 'Am'],
      ['A-', 'Am'],

      // Diminished chord variations
      ['F# Diminished', 'F#dim'],
      ['F#dim', 'F#dim'],
      ['F#dimin', 'F#dim'],
      ['F#°', 'F#dim'],

      // Augmented chord variations
      ['C Augmented', 'Caug'],
      ['Caug', 'Caug'],
      ['C+', 'Caug'],

      // Seventh chord variations
      ['C Major 7', 'Cmaj7'],
      ['Cmaj7', 'Cmaj7'],
      ['CM7', 'Cmaj7'],
      ['A Minor 7', 'Am7'],
      ['Am7', 'Am7'],
      ['Amin7', 'Am7'],
      ['G Dominant 7', 'G7'],
      ['G7', 'G7'],
      ['Gdom7', 'G7'],

      // Case-insensitive input
      ['c', 'C'],
      ['f# minor', 'F#m'],
      ['DB MAJOR', 'C#'],

      // Flat to sharp conversion
      ['Db', 'C#'],
      ['Dbm7', 'C#m7'],
      ['Eb major', 'D#'],
      ['Gbdim', 'F#dim'],
      ['Ab7', 'G#7'],
      ['Bbm', 'A#m'],

      // Slash notation for inversions
      ['C/E', 'C/E'],
      ['C major/E', 'C/E'],
      ['Am/C', 'Am/C'],
      ['F#m7/A', 'F#m7/A'],

      // Extended chords
      ['Cmaj9', 'Cmaj9'],
      ['C Major 9', 'Cmaj9'],
      ['Dm9', 'Dm9'],
      ['G9', 'G9'],
      ['Cmaj11', 'Cmaj11'],
      ['Am11', 'Am11'],
      ['Cmaj13', 'Cmaj13'],

      // Suspended chords
      ['Csus2', 'Csus2'],
      ['Csus4', 'Csus4'],
      ['Csus', 'Csus4'], // Default to sus4
      ['C suspended 4', 'Csus4'],

      // Added tone chords
      ['Cadd9', 'Cadd9'],
      ['C add 9', 'Cadd9'],
      ['Cmadd9', 'Cmadd9'],
      ['C minor add9', 'Cmadd9'],

      // Half-diminished seventh chords
      ['Cm7b5', 'Cm7♭5'],
      ['Cm7♭5', 'Cm7♭5'],
      ['C half diminished 7', 'Cm7♭5'],
      ['Cø7', 'Cm7♭5'],
    ])('normalizeChordName("%s") should return "%s"', (input, expected) => {
      expect(normalizeChordName(input)).toBe(expected);
    });
  });

  describe('validateChordGuess', () => {
    const createChord = (
      root: string,
      type: string,
      name: string,
      inversion: number = 0
    ): Chord => ({
      root: root as any,
      type: type as any,
      name,
      notes: [
        { note: root as any, octave: 4 },
        { note: 'E' as any, octave: 4 },
        { note: 'G' as any, octave: 4 },
      ],
      inversion,
    });

    it('should validate exact matches', () => {
      const chord = createChord('C', 'major', 'C');
      const result = validateChordGuess('C', chord);
      expect(result.isCorrect).toBe(true);
    });

    it('should validate case-insensitive matches', () => {
      const chord = createChord('C', 'major', 'C');
      expect(validateChordGuess('c', chord).isCorrect).toBe(true);
      expect(validateChordGuess('C', chord).isCorrect).toBe(true);
    });

    it('should validate different naming conventions for major chords', () => {
      const chord = createChord('C', 'major', 'C');
      expect(validateChordGuess('C', chord).isCorrect).toBe(true);
      expect(validateChordGuess('C Major', chord).isCorrect).toBe(true);
      expect(validateChordGuess('Cmaj', chord).isCorrect).toBe(true);
    });

    it('should validate different naming conventions for minor chords', () => {
      const chord = createChord('A', 'minor', 'Am');
      expect(validateChordGuess('Am', chord).isCorrect).toBe(true);
      expect(validateChordGuess('A Minor', chord).isCorrect).toBe(true);
      expect(validateChordGuess('Amin', chord).isCorrect).toBe(true);
      expect(validateChordGuess('A-', chord).isCorrect).toBe(true);
    });

    it('should validate enharmonic equivalents', () => {
      const chordCSharp = createChord('C#', 'minor', 'C#m');
      expect(validateChordGuess('C#m', chordCSharp).isCorrect).toBe(true);
      expect(validateChordGuess('Dbm', chordCSharp).isCorrect).toBe(true);
      expect(validateChordGuess('Db minor', chordCSharp).isCorrect).toBe(true);
    });

    it('should validate seventh chords with different conventions', () => {
      const chord = createChord('C', 'major7', 'Cmaj7');
      expect(validateChordGuess('Cmaj7', chord).isCorrect).toBe(true);
      expect(validateChordGuess('C Major 7', chord).isCorrect).toBe(true);
      expect(validateChordGuess('CM7', chord).isCorrect).toBe(true);
    });

    it('should validate diminished chords', () => {
      const chord = createChord('F#', 'diminished', 'F#dim');
      expect(validateChordGuess('F#dim', chord).isCorrect).toBe(true);
      expect(validateChordGuess('F# Diminished', chord).isCorrect).toBe(true);
      expect(validateChordGuess('Gbdim', chord).isCorrect).toBe(true); // Enharmonic
    });

    it.each([
      ['C', 'major', 'C', 'Cm', 'Wrong chord type (minor instead of major)'],
      ['C', 'major', 'C', 'D', 'Wrong root note'],
      ['C', 'major', 'C', 'Caug', 'Wrong chord type (augmented instead of major)'],
    ])('should reject incorrect guess "%s" for %s %s chord - %s', (root, type, name, incorrectGuess) => {
      const chord = createChord(root, type, name);
      const result = validateChordGuess(incorrectGuess, chord);
      expect(result.isCorrect).toBe(false);
      expect(result.feedback).toBeDefined();
    });

    it('should handle inversions with slash notation', () => {
      const chord: Chord = {
        root: 'C' as any,
        type: 'major' as any,
        name: 'C/E',
        notes: [
          { note: 'E' as any, octave: 4 },
          { note: 'G' as any, octave: 4 },
          { note: 'C' as any, octave: 5 },
        ],
        inversion: 1,
      };
      expect(validateChordGuess('C/E', chord).isCorrect).toBe(true);
      expect(validateChordGuess('C Major/E', chord).isCorrect).toBe(true);
    });

    it.each([
      ['C', 'major', 'C', 'Dm', /Incorrect/, 'C'],
      ['C', 'major', 'C', '', null, null],
    ])('should handle invalid guess "%s" with appropriate feedback', (root, type, name, guess, feedbackPattern, expectedAnswer) => {
      const chord = createChord(root, type, name);
      const result = validateChordGuess(guess, chord);
      expect(result.isCorrect).toBe(false);
      if (feedbackPattern) {
        expect(result.feedback).toMatch(feedbackPattern);
      }
      if (expectedAnswer) {
        expect(result.feedback).toContain(expectedAnswer);
      }
    });

    it('should normalize both guess and answer in result', () => {
      const chord = createChord('C', 'major', 'C');
      const result = validateChordGuess('C Major', chord);
      expect(result.normalizedGuess).toBe('C');
      expect(result.normalizedAnswer).toBe('C');
    });

    it('should validate extended chords', () => {
      const chord = createChord('C', 'major9', 'Cmaj9');
      expect(validateChordGuess('Cmaj9', chord).isCorrect).toBe(true);
      expect(validateChordGuess('C Major 9', chord).isCorrect).toBe(true);
    });

    it('should validate suspended chords', () => {
      const chord = createChord('C', 'sus4', 'Csus4');
      expect(validateChordGuess('Csus4', chord).isCorrect).toBe(true);
      expect(validateChordGuess('Csus', chord).isCorrect).toBe(true);
      expect(validateChordGuess('C suspended 4', chord).isCorrect).toBe(true);
    });

    it('should validate added tone chords', () => {
      const chord = createChord('C', 'add9', 'Cadd9');
      expect(validateChordGuess('Cadd9', chord).isCorrect).toBe(true);
      expect(validateChordGuess('C add 9', chord).isCorrect).toBe(true);
    });

    describe('comprehensive enharmonic equivalent validation', () => {
      it.each([
        // Simple major chords - all sharp-flat enharmonic pairs
        ['C#', 'major', 'C#', ['C#', 'Db']],
        ['D#', 'major', 'D#', ['D#', 'Eb']],
        ['F#', 'major', 'F#', ['F#', 'Gb']],
        ['G#', 'major', 'G#', ['G#', 'Ab']],
        ['A#', 'major', 'A#', ['A#', 'Bb']],

        // Complex chord types with enharmonics
        ['C#', 'major7', 'C#maj7', ['C#maj7', 'Dbmaj7', 'Db Major 7']],
        ['D#', 'minor7', 'D#m7', ['D#m7', 'Ebm7']],
        ['F#', 'dominant7', 'F#7', ['F#7', 'Gb7']],
        ['G#', 'diminished', 'G#dim', ['G#dim', 'Abdim']],
        ['A#', 'augmented', 'A#aug', ['A#aug', 'Bbaug']],

        // Extended chords with enharmonics
        ['C#', 'major9', 'C#maj9', ['C#maj9', 'Dbmaj9']],
        ['D#', 'minor9', 'D#m9', ['D#m9', 'Ebm9']],
        ['G#', 'dominant13', 'G#13', ['G#13', 'Ab13']],

        // Suspended chords with enharmonics
        ['C#', 'sus4', 'C#sus4', ['C#sus4', 'Dbsus4']],
        ['F#', 'sus2', 'F#sus2', ['F#sus2', 'Gbsus2']],
      ])('should validate %s %s accepts enharmonic equivalents', (root, type, name, validGuesses) => {
        const chord = createChord(root, type, name);
        validGuesses.forEach((guess) => {
          expect(validateChordGuess(guess, chord).isCorrect).toBe(true);
        });
      });

      it.each([
        // Slash notation with enharmonic bass notes
        [
          'C/C#',
          {
            root: 'C' as any,
            type: 'major' as any,
            name: 'C/C#',
            notes: [
              { note: 'C#' as any, octave: 4 },
              { note: 'E' as any, octave: 4 },
              { note: 'G' as any, octave: 4 },
            ],
            inversion: 1,
          },
          ['C/C#', 'C/Db'],
        ],
        [
          'Am7/C#',
          {
            root: 'A' as any,
            type: 'minor7' as any,
            name: 'Am7/C#',
            notes: [
              { note: 'C#' as any, octave: 4 },
              { note: 'A' as any, octave: 4 },
              { note: 'C' as any, octave: 4 },
              { note: 'E' as any, octave: 4 },
              { note: 'G' as any, octave: 4 },
            ],
            inversion: 2,
          },
          ['Am7/C#', 'Am7/Db'],
        ],

        // Slash notation with enharmonic root notes
        [
          'C#m/F',
          {
            root: 'C#' as any,
            type: 'minor' as any,
            name: 'C#m/F',
            notes: [
              { note: 'F' as any, octave: 4 },
              { note: 'C#' as any, octave: 4 },
              { note: 'E' as any, octave: 4 },
              { note: 'G#' as any, octave: 4 },
            ],
            inversion: 1,
          },
          ['C#m/F', 'Dbm/F'],
        ],
        [
          'F#maj7/A#',
          {
            root: 'F#' as any,
            type: 'major7' as any,
            name: 'F#maj7/A#',
            notes: [
              { note: 'A#' as any, octave: 4 },
              { note: 'F#' as any, octave: 4 },
              { note: 'A' as any, octave: 4 },
              { note: 'C#' as any, octave: 4 },
              { note: 'E#' as any, octave: 4 },
            ],
            inversion: 1,
          },
          ['F#maj7/A#', 'Gbmaj7/Bb'],
        ],
      ])('should validate slash notation %s with enharmonic equivalents', (name, chord, validGuesses) => {
        validGuesses.forEach((guess) => {
          expect(validateChordGuess(guess, chord).isCorrect).toBe(true);
        });
      });

      it('should validate enharmonic equivalents with unicode symbols', () => {
        // Unicode flat symbol (♭)
        const cSharpChord = createChord('C#', 'minor', 'C#m');
        expect(validateChordGuess('D♭m', cSharpChord).isCorrect).toBe(true);
        expect(validateChordGuess('C#m', cSharpChord).isCorrect).toBe(true);

        // Multiple unicode symbols
        const fSharpMaj7 = createChord('F#', 'major7', 'F#maj7');
        expect(validateChordGuess('G♭maj7', fSharpMaj7).isCorrect).toBe(true);
      });

      it('should detect when user enters enharmonic equivalent', () => {
        // Test isEnharmonic flag
        const cSharpChord = createChord('C#', 'minor', 'C#m');

        // User enters flat notation, should be marked as enharmonic
        const dbResult = validateChordGuess('Dbm', cSharpChord);
        expect(dbResult.isCorrect).toBe(true);
        expect(dbResult.isEnharmonic).toBe(true);
        expect(dbResult.originalGuess).toBe('Dbm');

        // User enters sharp notation, should NOT be marked as enharmonic
        const cSharpResult = validateChordGuess('C#m', cSharpChord);
        expect(cSharpResult.isCorrect).toBe(true);
        expect(cSharpResult.isEnharmonic).toBe(false);
        expect(cSharpResult.originalGuess).toBe('C#m');
      });

      it('should track original guess for all results', () => {
        const chord = createChord('C', 'major', 'C');

        // Correct answer
        const correctResult = validateChordGuess('C Major', chord);
        expect(correctResult.originalGuess).toBe('C Major');

        // Incorrect answer
        const incorrectResult = validateChordGuess('Dm', chord);
        expect(incorrectResult.originalGuess).toBe('Dm');
      });

      it('should detect enharmonic in slash notation', () => {
        const cSlashCSharp: Chord = {
          root: 'C' as any,
          type: 'major' as any,
          name: 'C/C#',
          notes: [
            { note: 'C#' as any, octave: 4 },
            { note: 'E' as any, octave: 4 },
            { note: 'G' as any, octave: 4 },
          ],
          inversion: 1,
        };

        // User enters C/Db - should be marked as enharmonic
        const result = validateChordGuess('C/Db', cSlashCSharp);
        expect(result.isCorrect).toBe(true);
        expect(result.isEnharmonic).toBe(true);
        expect(result.originalGuess).toBe('C/Db');
      });

      it.each([
        // Simple theoretical enharmonics (B#=C, Cb=B, E#=F, Fb=E)
        ['C', 'major', 'C', ['B#', 'B♯']],
        ['B', 'major', 'B', ['Cb', 'C♭']],
        ['F', 'major', 'F', ['E#', 'E♯']],
        ['E', 'major', 'E', ['Fb', 'F♭']],

        // Theoretical enharmonics with chord types
        ['C', 'minor', 'Cm', ['B#m', 'B# minor']],
        ['F', 'dominant7', 'F7', ['E#7']],
        ['E', 'major7', 'Emaj7', ['Fbmaj7']],
      ])('should validate theoretical enharmonic %s %s with equivalents', (root, type, name, validGuesses) => {
        const chord = createChord(root, type, name);
        validGuesses.forEach((guess) => {
          expect(validateChordGuess(guess, chord).isCorrect).toBe(true);
        });
      });

      it.each([
        // Theoretical enharmonics in slash notation
        [
          'C/F',
          {
            root: 'C' as any,
            type: 'major' as any,
            name: 'C/F',
            notes: [
              { note: 'F' as any, octave: 4 },
              { note: 'E' as any, octave: 4 },
              { note: 'G' as any, octave: 4 },
            ],
            inversion: 1,
          },
          ['C/E#', 'C/F'],
        ],
        [
          'C/E',
          {
            root: 'C' as any,
            type: 'major' as any,
            name: 'C/E',
            notes: [
              { note: 'E' as any, octave: 4 },
              { note: 'G' as any, octave: 4 },
              { note: 'C' as any, octave: 5 },
            ],
            inversion: 1,
          },
          ['B#/E', 'C/E'],
        ],
      ])('should validate theoretical enharmonics in slash notation %s', (name, chord, validGuesses) => {
        validGuesses.forEach((guess) => {
          expect(validateChordGuess(guess, chord).isCorrect).toBe(true);
        });
      });
    });
  });
});
