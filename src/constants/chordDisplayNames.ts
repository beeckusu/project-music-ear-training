import { ChordType } from '../types/music';

/**
 * User-friendly display names for chord types.
 * Maps technical chord type identifiers to readable names.
 */
export const CHORD_TYPE_DISPLAY_NAMES: Record<string, string> = {
  // Triads
  [ChordType.MAJOR]: 'Major',
  [ChordType.MINOR]: 'Minor',
  [ChordType.DIMINISHED]: 'Diminished',
  [ChordType.AUGMENTED]: 'Augmented',

  // 7th Chords
  [ChordType.MAJOR_7]: 'Major 7th',
  [ChordType.DOMINANT_7]: 'Dominant 7th',
  [ChordType.MINOR_7]: 'Minor 7th',
  [ChordType.HALF_DIMINISHED_7]: 'Half Diminished 7th',
  [ChordType.DIMINISHED_7]: 'Diminished 7th',

  // Extended Chords - 9ths
  [ChordType.MAJOR_9]: 'Major 9th',
  [ChordType.DOMINANT_9]: 'Dominant 9th',
  [ChordType.MINOR_9]: 'Minor 9th',

  // Extended Chords - 11ths
  [ChordType.MAJOR_11]: 'Major 11th',
  [ChordType.DOMINANT_11]: 'Dominant 11th',
  [ChordType.MINOR_11]: 'Minor 11th',

  // Extended Chords - 13ths
  [ChordType.MAJOR_13]: 'Major 13th',
  [ChordType.DOMINANT_13]: 'Dominant 13th',
  [ChordType.MINOR_13]: 'Minor 13th',

  // Suspended Chords
  [ChordType.SUS2]: 'Sus2',
  [ChordType.SUS4]: 'Sus4',

  // Added Tone Chords
  [ChordType.ADD9]: 'Add9',
  [ChordType.MAJOR_ADD9]: 'Major Add9',
  [ChordType.MINOR_ADD9]: 'Minor Add9',
};

/**
 * Category display names for chord type groups.
 */
export const CHORD_CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  TRIADS: 'Triads',
  SEVENTH_CHORDS: '7th Chords',
  EXTENDED_CHORDS: 'Extended Chords (9ths, 11ths, 13ths)',
  SUSPENDED: 'Suspended Chords',
  ADDED_TONES: 'Added Tone Chords',
};
