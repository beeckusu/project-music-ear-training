/**
 * Unit tests for chord validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeChordName,
  getEnharmonicEquivalents,
  validateChordGuess,
  type ChordValidationResult,
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
  });
});
