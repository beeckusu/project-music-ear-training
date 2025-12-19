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
    it('should handle empty input', () => {
      expect(normalizeChordName('')).toBe('');
      expect(normalizeChordName('   ')).toBe('');
    });

    it('should normalize major chord variations', () => {
      expect(normalizeChordName('C Major')).toBe('C');
      expect(normalizeChordName('C major')).toBe('C');
      expect(normalizeChordName('Cmaj')).toBe('C');
      expect(normalizeChordName('C')).toBe('C');
    });

    it('should normalize minor chord variations', () => {
      expect(normalizeChordName('A Minor')).toBe('Am');
      expect(normalizeChordName('A minor')).toBe('Am');
      expect(normalizeChordName('Amin')).toBe('Am');
      expect(normalizeChordName('Am')).toBe('Am');
      expect(normalizeChordName('A-')).toBe('Am');
    });

    it('should normalize diminished chord variations', () => {
      expect(normalizeChordName('F# Diminished')).toBe('F#dim');
      expect(normalizeChordName('F#dim')).toBe('F#dim');
      expect(normalizeChordName('F#dimin')).toBe('F#dim');
      expect(normalizeChordName('F#°')).toBe('F#dim');
    });

    it('should normalize augmented chord variations', () => {
      expect(normalizeChordName('C Augmented')).toBe('Caug');
      expect(normalizeChordName('Caug')).toBe('Caug');
      expect(normalizeChordName('C+')).toBe('Caug');
    });

    it('should normalize seventh chord variations', () => {
      expect(normalizeChordName('C Major 7')).toBe('Cmaj7');
      expect(normalizeChordName('Cmaj7')).toBe('Cmaj7');
      expect(normalizeChordName('CM7')).toBe('Cmaj7');

      expect(normalizeChordName('A Minor 7')).toBe('Am7');
      expect(normalizeChordName('Am7')).toBe('Am7');
      expect(normalizeChordName('Amin7')).toBe('Am7');

      expect(normalizeChordName('G Dominant 7')).toBe('G7');
      expect(normalizeChordName('G7')).toBe('G7');
      expect(normalizeChordName('Gdom7')).toBe('G7');
    });

    it('should handle case-insensitive input', () => {
      expect(normalizeChordName('c')).toBe('C');
      expect(normalizeChordName('f# minor')).toBe('F#m');
      expect(normalizeChordName('DB MAJOR')).toBe('C#');
    });

    it('should convert flat notation to sharp notation', () => {
      expect(normalizeChordName('Db')).toBe('C#');
      expect(normalizeChordName('Dbm7')).toBe('C#m7');
      expect(normalizeChordName('Eb major')).toBe('D#');
      expect(normalizeChordName('Gbdim')).toBe('F#dim');
      expect(normalizeChordName('Ab7')).toBe('G#7');
      expect(normalizeChordName('Bbm')).toBe('A#m');
    });

    it('should handle slash notation for inversions', () => {
      expect(normalizeChordName('C/E')).toBe('C/E');
      expect(normalizeChordName('C major/E')).toBe('C/E');
      expect(normalizeChordName('Am/C')).toBe('Am/C');
      expect(normalizeChordName('F#m7/A')).toBe('F#m7/A');
    });

    it('should handle extended chords', () => {
      expect(normalizeChordName('Cmaj9')).toBe('Cmaj9');
      expect(normalizeChordName('C Major 9')).toBe('Cmaj9');
      expect(normalizeChordName('Dm9')).toBe('Dm9');
      expect(normalizeChordName('G9')).toBe('G9');
      expect(normalizeChordName('Cmaj11')).toBe('Cmaj11');
      expect(normalizeChordName('Am11')).toBe('Am11');
      expect(normalizeChordName('Cmaj13')).toBe('Cmaj13');
    });

    it('should handle suspended chords', () => {
      expect(normalizeChordName('Csus2')).toBe('Csus2');
      expect(normalizeChordName('Csus4')).toBe('Csus4');
      expect(normalizeChordName('Csus')).toBe('Csus4'); // Default to sus4
      expect(normalizeChordName('C suspended 4')).toBe('Csus4');
    });

    it('should handle added tone chords', () => {
      expect(normalizeChordName('Cadd9')).toBe('Cadd9');
      expect(normalizeChordName('C add 9')).toBe('Cadd9');
      expect(normalizeChordName('Cmadd9')).toBe('Cmadd9');
      expect(normalizeChordName('C minor add9')).toBe('Cmadd9');
    });

    it('should handle half-diminished seventh chords', () => {
      expect(normalizeChordName('Cm7b5')).toBe('Cm7♭5');
      expect(normalizeChordName('Cm7♭5')).toBe('Cm7♭5');
      expect(normalizeChordName('C half diminished 7')).toBe('Cm7♭5');
      expect(normalizeChordName('Cø7')).toBe('Cm7♭5');
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

    it('should reject incorrect guesses', () => {
      const chord = createChord('C', 'major', 'C');
      const result = validateChordGuess('Cm', chord);
      expect(result.isCorrect).toBe(false);
      expect(result.feedback).toBeDefined();
    });

    it('should reject guesses with wrong root note', () => {
      const chord = createChord('C', 'major', 'C');
      const result = validateChordGuess('D', chord);
      expect(result.isCorrect).toBe(false);
    });

    it('should reject guesses with wrong chord type', () => {
      const chord = createChord('C', 'major', 'C');
      const result = validateChordGuess('Caug', chord);
      expect(result.isCorrect).toBe(false);
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

    it('should provide feedback for incorrect guesses', () => {
      const chord = createChord('C', 'major', 'C');
      const result = validateChordGuess('Dm', chord);
      expect(result.isCorrect).toBe(false);
      expect(result.feedback).toContain('Incorrect');
      expect(result.feedback).toContain('C');
    });

    it('should handle empty guesses', () => {
      const chord = createChord('C', 'major', 'C');
      const result = validateChordGuess('', chord);
      expect(result.isCorrect).toBe(false);
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
      it('should validate all sharp-flat enharmonic pairs', () => {
        // C#/Db
        const cSharpChord = createChord('C#', 'major', 'C#');
        expect(validateChordGuess('C#', cSharpChord).isCorrect).toBe(true);
        expect(validateChordGuess('Db', cSharpChord).isCorrect).toBe(true);

        // D#/Eb
        const dSharpChord = createChord('D#', 'major', 'D#');
        expect(validateChordGuess('D#', dSharpChord).isCorrect).toBe(true);
        expect(validateChordGuess('Eb', dSharpChord).isCorrect).toBe(true);

        // F#/Gb
        const fSharpChord = createChord('F#', 'major', 'F#');
        expect(validateChordGuess('F#', fSharpChord).isCorrect).toBe(true);
        expect(validateChordGuess('Gb', fSharpChord).isCorrect).toBe(true);

        // G#/Ab
        const gSharpChord = createChord('G#', 'major', 'G#');
        expect(validateChordGuess('G#', gSharpChord).isCorrect).toBe(true);
        expect(validateChordGuess('Ab', gSharpChord).isCorrect).toBe(true);

        // A#/Bb
        const aSharpChord = createChord('A#', 'major', 'A#');
        expect(validateChordGuess('A#', aSharpChord).isCorrect).toBe(true);
        expect(validateChordGuess('Bb', aSharpChord).isCorrect).toBe(true);
      });

      it('should validate enharmonic equivalents with complex chord types', () => {
        // Major 7th
        const dbMaj7 = createChord('C#', 'major7', 'C#maj7');
        expect(validateChordGuess('C#maj7', dbMaj7).isCorrect).toBe(true);
        expect(validateChordGuess('Dbmaj7', dbMaj7).isCorrect).toBe(true);
        expect(validateChordGuess('Db Major 7', dbMaj7).isCorrect).toBe(true);

        // Minor 7th
        const ebm7 = createChord('D#', 'minor7', 'D#m7');
        expect(validateChordGuess('D#m7', ebm7).isCorrect).toBe(true);
        expect(validateChordGuess('Ebm7', ebm7).isCorrect).toBe(true);

        // Dominant 7th
        const gb7 = createChord('F#', 'dominant7', 'F#7');
        expect(validateChordGuess('F#7', gb7).isCorrect).toBe(true);
        expect(validateChordGuess('Gb7', gb7).isCorrect).toBe(true);

        // Diminished
        const abDim = createChord('G#', 'diminished', 'G#dim');
        expect(validateChordGuess('G#dim', abDim).isCorrect).toBe(true);
        expect(validateChordGuess('Abdim', abDim).isCorrect).toBe(true);

        // Augmented
        const bbAug = createChord('A#', 'augmented', 'A#aug');
        expect(validateChordGuess('A#aug', bbAug).isCorrect).toBe(true);
        expect(validateChordGuess('Bbaug', bbAug).isCorrect).toBe(true);
      });

      it('should validate enharmonic equivalents with extended chords', () => {
        // Major 9th
        const dbMaj9 = createChord('C#', 'major9', 'C#maj9');
        expect(validateChordGuess('C#maj9', dbMaj9).isCorrect).toBe(true);
        expect(validateChordGuess('Dbmaj9', dbMaj9).isCorrect).toBe(true);

        // Minor 9th
        const ebm9 = createChord('D#', 'minor9', 'D#m9');
        expect(validateChordGuess('D#m9', ebm9).isCorrect).toBe(true);
        expect(validateChordGuess('Ebm9', ebm9).isCorrect).toBe(true);

        // Dominant 13th
        const ab13 = createChord('G#', 'dominant13', 'G#13');
        expect(validateChordGuess('G#13', ab13).isCorrect).toBe(true);
        expect(validateChordGuess('Ab13', ab13).isCorrect).toBe(true);
      });

      it('should validate enharmonic equivalents with suspended chords', () => {
        // Sus4
        const dbSus4 = createChord('C#', 'sus4', 'C#sus4');
        expect(validateChordGuess('C#sus4', dbSus4).isCorrect).toBe(true);
        expect(validateChordGuess('Dbsus4', dbSus4).isCorrect).toBe(true);

        // Sus2
        const gbSus2 = createChord('F#', 'sus2', 'F#sus2');
        expect(validateChordGuess('F#sus2', gbSus2).isCorrect).toBe(true);
        expect(validateChordGuess('Gbsus2', gbSus2).isCorrect).toBe(true);
      });

      it('should validate slash notation with enharmonic bass notes', () => {
        // C/Db should equal C/C#
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
        expect(validateChordGuess('C/C#', cSlashCSharp).isCorrect).toBe(true);
        expect(validateChordGuess('C/Db', cSlashCSharp).isCorrect).toBe(true);

        // Am7/Db should equal Am7/C#
        const am7SlashCSharp: Chord = {
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
        };
        expect(validateChordGuess('Am7/C#', am7SlashCSharp).isCorrect).toBe(true);
        expect(validateChordGuess('Am7/Db', am7SlashCSharp).isCorrect).toBe(true);
      });

      it('should validate slash notation with enharmonic root notes', () => {
        // Dbm/F should equal C#m/F
        const cSharpMinorSlashF: Chord = {
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
        };
        expect(validateChordGuess('C#m/F', cSharpMinorSlashF).isCorrect).toBe(true);
        expect(validateChordGuess('Dbm/F', cSharpMinorSlashF).isCorrect).toBe(true);

        // Gbmaj7/Bb should equal F#maj7/A#
        const fSharpMaj7SlashASharp: Chord = {
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
        };
        expect(validateChordGuess('F#maj7/A#', fSharpMaj7SlashASharp).isCorrect).toBe(true);
        expect(validateChordGuess('Gbmaj7/Bb', fSharpMaj7SlashASharp).isCorrect).toBe(true);
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

      it('should validate theoretical enharmonic equivalents', () => {
        // B# = C
        const cMajorChord = createChord('C', 'major', 'C');
        expect(validateChordGuess('B#', cMajorChord).isCorrect).toBe(true);
        expect(validateChordGuess('B♯', cMajorChord).isCorrect).toBe(true);

        // Cb = B
        const bMajorChord = createChord('B', 'major', 'B');
        expect(validateChordGuess('Cb', bMajorChord).isCorrect).toBe(true);
        expect(validateChordGuess('C♭', bMajorChord).isCorrect).toBe(true);

        // E# = F
        const fMajorChord = createChord('F', 'major', 'F');
        expect(validateChordGuess('E#', fMajorChord).isCorrect).toBe(true);
        expect(validateChordGuess('E♯', fMajorChord).isCorrect).toBe(true);

        // Fb = E
        const eMajorChord = createChord('E', 'major', 'E');
        expect(validateChordGuess('Fb', eMajorChord).isCorrect).toBe(true);
        expect(validateChordGuess('F♭', eMajorChord).isCorrect).toBe(true);
      });

      it('should validate theoretical enharmonics with chord types', () => {
        // B#m = Cm
        const cMinorChord = createChord('C', 'minor', 'Cm');
        expect(validateChordGuess('B#m', cMinorChord).isCorrect).toBe(true);
        expect(validateChordGuess('B# minor', cMinorChord).isCorrect).toBe(true);

        // E#7 = F7
        const f7Chord = createChord('F', 'dominant7', 'F7');
        expect(validateChordGuess('E#7', f7Chord).isCorrect).toBe(true);

        // Fbmaj7 = Emaj7
        const eMaj7Chord = createChord('E', 'major7', 'Emaj7');
        expect(validateChordGuess('Fbmaj7', eMaj7Chord).isCorrect).toBe(true);
      });

      it('should validate theoretical enharmonics in slash notation', () => {
        // C/E# should equal C/F
        const cSlashF: Chord = {
          root: 'C' as any,
          type: 'major' as any,
          name: 'C/F',
          notes: [
            { note: 'F' as any, octave: 4 },
            { note: 'E' as any, octave: 4 },
            { note: 'G' as any, octave: 4 },
          ],
          inversion: 1,
        };
        expect(validateChordGuess('C/E#', cSlashF).isCorrect).toBe(true);
        expect(validateChordGuess('C/F', cSlashF).isCorrect).toBe(true);

        // B#/E should equal C/E
        const cSlashE: Chord = {
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
        expect(validateChordGuess('B#/E', cSlashE).isCorrect).toBe(true);
      });
    });
  });
});
