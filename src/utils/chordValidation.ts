/**
 * Chord Validation Utility
 *
 * This module provides utilities for validating chord name guesses against actual chords.
 * It handles various naming conventions, enharmonic equivalents, and provides detailed
 * feedback for incorrect guesses.
 *
 * @module utils/chordValidation
 */

import type { Note, Chord } from '../types/music';
import { CHORD_NAME_FORMATS } from '../constants/chords';

/**
 * Result of a chord validation operation
 */
export interface ChordValidationResult {
  /** Whether the guess is correct */
  isCorrect: boolean;

  /** The normalized form of the user's guess */
  normalizedGuess: string;

  /** The normalized form of the correct answer */
  normalizedAnswer: string;

  /** Optional feedback message about what was wrong */
  feedback?: string;

  /** Whether the correct answer used an enharmonic equivalent (e.g., user entered Db for C#) */
  isEnharmonic?: boolean;

  /** The original guess before normalization */
  originalGuess?: string;
}

/**
 * Mapping of alternative chord suffix names to their standard forms
 * This allows users to input chord names in various formats
 *
 * Note: Includes both the normalized forms (mapping to themselves) and
 * alternative spellings (mapping to normalized forms)
 */
const CHORD_SUFFIX_ALIASES: Record<string, string> = {
  // Empty suffix for major (already normalized)
  '': '',

  // Major variations
  'major': '',
  'maj': '',
  'M': '',

  // Minor variations (already normalized form)
  'm': 'm',
  'minor': 'm',
  'min': 'm',
  '-': 'm',

  // Diminished variations (already normalized form)
  'dim': 'dim',
  'diminished': 'dim',
  'dimin': 'dim',
  'o': 'dim',
  '°': 'dim',

  // Augmented variations (already normalized form)
  'aug': 'aug',
  'augmented': 'aug',
  '+': 'aug',

  // Seventh chord variations (already normalized forms)
  'maj7': 'maj7',
  'major7': 'maj7',
  'major 7': 'maj7',
  'M7': 'maj7',

  'm7': 'm7',
  'min7': 'm7',
  'minor7': 'm7',
  'minor 7': 'm7',
  '-7': 'm7',

  '7': '7',
  'dom7': '7',
  'dominant7': '7',
  'dominant 7': '7',

  'dim7': 'dim7',
  'diminished7': 'dim7',
  'diminished 7': 'dim7',
  'o7': 'dim7',
  '°7': 'dim7',

  'm7b5': 'm7♭5',
  'm7♭5': 'm7♭5',
  'halfdiminished7': 'm7♭5',
  'half diminished 7': 'm7♭5',
  'ø7': 'm7♭5',
  'ø': 'm7♭5',

  // Extended chord variations (already normalized forms)
  'maj9': 'maj9',
  'major9': 'maj9',
  'major 9': 'maj9',
  'M9': 'maj9',

  'm9': 'm9',
  'min9': 'm9',
  'minor9': 'm9',
  'minor 9': 'm9',
  '-9': 'm9',

  '9': '9',
  'dom9': '9',
  'dominant9': '9',
  'dominant 9': '9',

  'maj11': 'maj11',
  'major11': 'maj11',
  'major 11': 'maj11',
  'M11': 'maj11',

  'm11': 'm11',
  'min11': 'm11',
  'minor11': 'm11',
  'minor 11': 'm11',
  '-11': 'm11',

  '11': '11',
  'dom11': '11',
  'dominant11': '11',
  'dominant 11': '11',

  'maj13': 'maj13',
  'major13': 'maj13',
  'major 13': 'maj13',
  'M13': 'maj13',

  'm13': 'm13',
  'min13': 'm13',
  'minor13': 'm13',
  'minor 13': 'm13',
  '-13': 'm13',

  '13': '13',
  'dom13': '13',
  'dominant13': '13',
  'dominant 13': '13',

  // Suspended chords (already normalized forms)
  'sus2': 'sus2',
  'suspended2': 'sus2',
  'suspended 2': 'sus2',

  'sus4': 'sus4',
  'suspended4': 'sus4',
  'suspended 4': 'sus4',
  'sus': 'sus4', // sus without number defaults to sus4

  // Added tone chords (already normalized forms)
  'add9': 'add9',
  'add 9': 'add9',

  'add11': 'add11',
  'add 11': 'add11',

  'madd9': 'madd9',
  'minoradd9': 'madd9',
  'minor add9': 'madd9',
  'minor add 9': 'madd9',
};

/**
 * Map of sharp notes to their flat equivalents (as strings, not Note types)
 *
 * We use this for checking enharmonic equivalents during validation.
 * Enharmonic equivalents are notes that sound the same but are written differently.
 *
 * Standard enharmonic pairs:
 * - C# / Db
 * - D# / Eb
 * - F# / Gb
 * - G# / Ab
 * - A# / Bb
 *
 * Note: Theoretical enharmonics (B#/C, Cb/B, E#/F, Fb/E) are handled
 * separately in the NOTE_ALIASES map for normalization purposes.
 */
const SHARP_TO_FLAT_MAP: Record<string, string> = {
  'C#': 'Db',
  'D#': 'Eb',
  'F#': 'Gb',
  'G#': 'Ab',
  'A#': 'Bb',
};

/**
 * Alternative note spellings (flats and sharps)
 *
 * Maps flat notation to sharp notation (our canonical form). This enables
 * the validation system to accept both sharp and flat spellings of the same note.
 *
 * Canonical Form: All notes are normalized to sharp notation internally.
 * For example:
 * - User enters "Db" → normalized to "C#"
 * - User enters "D♭" (unicode) → normalized to "C#"
 * - User enters "C#" → remains "C#"
 *
 * Supported formats:
 * - ASCII flat: "b" (e.g., "Db", "Eb")
 * - Unicode flat: "♭" (e.g., "D♭", "E♭")
 * - ASCII sharp: "#" (e.g., "C#", "F#")
 *
 * Theoretical enharmonics: This map now includes theoretical enharmonics
 * (B#/C, Cb/B, E#/F, Fb/E) for comprehensive support, though they are rare
 * in practical music contexts.
 */
const NOTE_ALIASES: Record<string, Note> = {
  // Standard enharmonic pairs (sharps and flats)
  'Db': 'C#',
  'D♭': 'C#',
  'Eb': 'D#',
  'E♭': 'D#',
  'Gb': 'F#',
  'G♭': 'F#',
  'Ab': 'G#',
  'A♭': 'G#',
  'Bb': 'A#',
  'B♭': 'A#',

  // Theoretical enharmonics (natural notes with accidentals)
  // B# = C
  'B#': 'C',
  'B♯': 'C',
  // Cb = B
  'Cb': 'B',
  'C♭': 'B',
  // E# = F
  'E#': 'F',
  'E♯': 'F',
  // Fb = E
  'Fb': 'E',
  'F♭': 'E',

  // Map natural notes and sharps to themselves for consistency
  'C': 'C',
  'C#': 'C#',
  'C♯': 'C#',
  'D': 'D',
  'D#': 'D#',
  'D♯': 'D#',
  'E': 'E',
  'F': 'F',
  'F#': 'F#',
  'F♯': 'F#',
  'G': 'G',
  'G#': 'G#',
  'G♯': 'G#',
  'A': 'A',
  'A#': 'A#',
  'A♯': 'A#',
  'B': 'B',
};

/**
 * Returns all enharmonic equivalents of a note, including the note itself
 *
 * Enharmonic equivalents are notes that sound the same but are written differently
 * in music notation. For example, C# and Db are enharmonic equivalents.
 *
 * This function returns the standard 5 enharmonic pairs:
 * - C# / Db
 * - D# / Eb
 * - F# / Gb
 * - G# / Ab
 * - A# / Bb
 *
 * Note: Theoretical enharmonics (B#/C, Cb/B, E#/F, Fb/E) are supported through
 * the NOTE_ALIASES normalization map, so they work in validation even though
 * this function doesn't explicitly list them as equivalents.
 *
 * @param note - The note to find equivalents for (in sharp notation)
 * @returns Array of enharmonic equivalent note names (as strings)
 *
 * @example
 * getEnharmonicEquivalents('C#') // ['C#', 'Db']
 * getEnharmonicEquivalents('C') // ['C'] (B# is handled via normalization)
 * getEnharmonicEquivalents('F#') // ['F#', 'Gb']
 */
export function getEnharmonicEquivalents(note: Note): string[] {
  // Return the sharp form and the flat equivalent if it exists
  const flatEquivalent = SHARP_TO_FLAT_MAP[note];
  return flatEquivalent ? [note, flatEquivalent] : [note];
}

/**
 * Normalizes a note name to its canonical sharp form
 *
 * @param noteName - The note name to normalize (e.g., "Db", "C#", "c", "DB")
 * @returns The canonical note name
 *
 * @example
 * normalizeNote('Db') // 'C#'
 * normalizeNote('c') // 'C'
 * normalizeNote('F#') // 'F#'
 * normalizeNote('DB') // 'C#'
 */
function normalizeNote(noteName: string): Note | null {
  // Normalize case: first char uppercase, rest lowercase
  const normalized = noteName.charAt(0).toUpperCase() + noteName.slice(1).toLowerCase();

  // Look up in aliases map
  if (normalized in NOTE_ALIASES) {
    return NOTE_ALIASES[normalized as keyof typeof NOTE_ALIASES];
  }

  return null;
}

/**
 * Parses a chord name string into its components (root note and suffix)
 *
 * @param chordName - The chord name to parse (e.g., "C#m7", "Dbmaj7")
 * @returns Object with root note and suffix, or null if parsing fails
 *
 * @example
 * parseChordName('C#m7') // { root: 'C#', suffix: 'm7' }
 * parseChordName('Dbmaj7') // { root: 'C#', suffix: 'maj7' }
 */
function parseChordName(chordName: string): { root: Note; suffix: string } | null {
  // Trim and handle empty input
  const trimmed = chordName.trim();
  if (!trimmed) return null;

  // Try to extract root note (1 or 2 characters at the start)
  // Handle cases like "C", "C#", "Db", "D♭"
  let root: Note | null = null;
  let suffix = '';

  // Try 2-character root first (e.g., "C#", "Db", "D♭")
  if (trimmed.length >= 2) {
    const twoCharRoot = normalizeNote(trimmed.substring(0, 2));
    if (twoCharRoot) {
      root = twoCharRoot;
      suffix = trimmed.substring(2);
    }
  }

  // If that didn't work, try 1-character root (e.g., "C", "D")
  if (!root && trimmed.length >= 1) {
    const oneCharRoot = normalizeNote(trimmed.substring(0, 1));
    if (oneCharRoot) {
      root = oneCharRoot;
      suffix = trimmed.substring(1);
    }
  }

  if (!root) return null;

  return { root, suffix: suffix.trim() };
}

/**
 * Normalizes a chord name to a standard format
 *
 * This function:
 * - Converts to lowercase for suffix matching
 * - Removes extra whitespace
 * - Converts flat notation to sharp notation (Db → C#)
 * - Converts alternative chord suffixes to standard forms
 * - Handles slash notation for inversions
 *
 * @param chordName - The chord name to normalize
 * @returns Normalized chord name, or empty string if invalid
 *
 * @example
 * normalizeChordName('C Major') // 'C'
 * normalizeChordName('f# minor') // 'F#m'
 * normalizeChordName('Db maj7') // 'C#maj7'
 * normalizeChordName('C/E') // 'C/E'
 */
export function normalizeChordName(chordName: string): string {
  // Handle empty input
  if (!chordName || typeof chordName !== 'string') {
    return '';
  }

  // Check for slash notation (inversions)
  const slashIndex = chordName.indexOf('/');
  if (slashIndex !== -1) {
    // Split into chord and bass note
    const chordPart = chordName.substring(0, slashIndex).trim();
    const bassPart = chordName.substring(slashIndex + 1).trim();

    // Normalize both parts
    const normalizedChord = normalizeChordName(chordPart);
    const normalizedBass = normalizeNote(bassPart);

    if (normalizedChord && normalizedBass) {
      return `${normalizedChord}/${normalizedBass}`;
    }

    // If slash notation parsing failed, fall through to normal parsing
  }

  // Parse the chord name
  const parsed = parseChordName(chordName);
  if (!parsed) return '';

  const { root, suffix } = parsed;

  // Normalize the suffix by looking up aliases
  // First try exact match (case-sensitive for single chars like 'm' vs 'M')
  let normalizedSuffix = CHORD_SUFFIX_ALIASES[suffix];

  // If not found, try case-insensitive match
  if (normalizedSuffix === undefined) {
    const lowercaseSuffix = suffix.toLowerCase();
    for (const [alias, standard] of Object.entries(CHORD_SUFFIX_ALIASES)) {
      if (lowercaseSuffix === alias.toLowerCase() && alias !== 'M') {
        // Skip 'M' when doing case-insensitive match to avoid 'm'/'M' conflict
        normalizedSuffix = standard;
        break;
      }
    }
  }

  // If still not found, use the original suffix
  if (normalizedSuffix === undefined) {
    normalizedSuffix = suffix;
  }

  // Build the normalized chord name
  return `${root}${normalizedSuffix}`;
}

/**
 * Checks if a chord name contains flat notation (either 'b' or '♭')
 * Used to detect when users enter enharmonic equivalents
 */
function containsFlatNotation(chordName: string): boolean {
  return /[b♭]/.test(chordName) && /[A-G][b♭]/.test(chordName);
}

/**
 * Validates a user's chord name guess against the actual chord
 *
 * This function handles:
 * - Case-insensitive matching
 * - Alternative chord naming conventions (e.g., "C Major" vs "C" vs "Cmaj")
 * - Enharmonic equivalents (e.g., "C#" vs "Db")
 * - Slash chord notation for inversions (e.g., "C/E")
 *
 * @param guess - The user's chord name guess
 * @param actualChord - The actual chord to validate against
 * @returns ChordValidationResult with detailed feedback
 *
 * @example
 * validateChordGuess('C Major', chordC) // { isCorrect: true, ... }
 * validateChordGuess('Dbm7', chordCSharpMinor7) // { isCorrect: true, isEnharmonic: true, ... }
 * validateChordGuess('C/E', chordCFirstInversion) // { isCorrect: true, ... }
 */
export function validateChordGuess(guess: string, actualChord: Chord): ChordValidationResult {
  // Store original guess for enharmonic detection
  const originalGuess = guess.trim();

  // Generate the canonical name for the actual chord
  const canonicalName = `${actualChord.root}${CHORD_NAME_FORMATS[actualChord.type]}`;

  // Add inversion notation if applicable
  let actualChordName = canonicalName;
  if (actualChord.inversion && actualChord.inversion > 0 && actualChord.notes.length > 0) {
    const bassNote = actualChord.notes[0].note;
    actualChordName = `${canonicalName}/${bassNote}`;
  }

  // Normalize both the guess and the actual chord name
  const normalizedGuess = normalizeChordName(guess);
  const normalizedAnswer = normalizeChordName(actualChordName);

  // Detect if user entered an enharmonic equivalent
  // Check if the original guess contained flat notation and the answer uses sharps
  const usedFlatNotation = containsFlatNotation(originalGuess);
  const answerUsesSharp = actualChordName.includes('#');
  const isEnharmonic = usedFlatNotation && answerUsesSharp && normalizedGuess === normalizedAnswer;

  // Check for exact match after normalization
  if (normalizedGuess === normalizedAnswer) {
    return {
      isCorrect: true,
      normalizedGuess,
      normalizedAnswer,
      isEnharmonic,
      originalGuess,
    };
  }

  // Check for enharmonic equivalents
  // Parse both the guess and the answer to get root notes
  const guessComponents = parseChordName(normalizedGuess);
  const answerComponents = parseChordName(normalizedAnswer);

  if (guessComponents && answerComponents) {
    // Get enharmonic equivalents for both root notes
    const guessEnharmonics = getEnharmonicEquivalents(guessComponents.root);
    const answerEnharmonics = getEnharmonicEquivalents(answerComponents.root);

    // Check if the root notes are enharmonic equivalents
    const areEnharmonicRoots = guessEnharmonics.some(note =>
      answerEnharmonics.includes(note)
    );

    // Check if the suffixes match
    const suffixesMatch = guessComponents.suffix === answerComponents.suffix;

    if (areEnharmonicRoots && suffixesMatch) {
      return {
        isCorrect: true,
        normalizedGuess,
        normalizedAnswer,
        isEnharmonic: true,
        originalGuess,
      };
    }
  }

  // Not a match
  return {
    isCorrect: false,
    normalizedGuess,
    normalizedAnswer,
    feedback: `Incorrect. The correct answer is ${actualChordName}.`,
    originalGuess,
  };
}
