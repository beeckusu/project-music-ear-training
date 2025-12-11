import type { ChordFilter } from '../types/music';
import { ChordType, WHITE_KEYS, CHORD_TYPES, ALL_CHORD_TYPES } from '../types/music';

/**
 * Preset configuration for chord filters.
 * Provides quick shortcuts for common chord training scenarios.
 */
export interface ChordFilterPreset {
  name: string;
  description: string;
  filter: ChordFilter;
}

/**
 * Predefined chord filter presets for common training scenarios.
 * Users can select these presets and further customize them as needed.
 */
export const CHORD_FILTER_PRESETS: Record<string, ChordFilterPreset> = {
  ALL_MAJOR_MINOR_TRIADS: {
    name: 'All Major & Minor Triads',
    description: 'Practice all major and minor triads across all notes',
    filter: {
      allowedChordTypes: [ChordType.MAJOR, ChordType.MINOR],
      allowedRootNotes: null, // All chromatic notes
      allowedOctaves: [3, 4],
      includeInversions: false,
    },
  },

  ALL_7TH_CHORDS: {
    name: 'All 7th Chords',
    description: 'Practice all seventh chord types (major7, dominant7, minor7, etc.)',
    filter: {
      allowedChordTypes: [...CHORD_TYPES.SEVENTH_CHORDS],
      allowedRootNotes: null, // All chromatic notes
      allowedOctaves: [3, 4],
      includeInversions: false,
    },
  },

  ALL_CHORDS_C_MAJOR: {
    name: 'All Chords in C Major',
    description: 'Practice diatonic chords in the key of C major',
    filter: {
      allowedChordTypes: ALL_CHORD_TYPES,
      allowedRootNotes: null, // Filter handled by keyFilter
      allowedOctaves: [3, 4],
      includeInversions: false,
      keyFilter: {
        key: 'C',
        scale: 'major',
      },
    },
  },

  JAZZ_CHORDS: {
    name: 'Jazz Chords',
    description: 'Practice jazz chords: 7ths, 9ths, 11ths, and 13ths with inversions',
    filter: {
      allowedChordTypes: [
        ...CHORD_TYPES.SEVENTH_CHORDS,
        ...CHORD_TYPES.EXTENDED_CHORDS,
      ],
      allowedRootNotes: null, // All chromatic notes
      allowedOctaves: [3, 4],
      includeInversions: true,
    },
  },

  BASIC_TRIADS: {
    name: 'Basic Triads',
    description: 'Beginner-friendly: major and minor triads on white keys only',
    filter: {
      allowedChordTypes: [ChordType.MAJOR, ChordType.MINOR],
      allowedRootNotes: WHITE_KEYS,
      allowedOctaves: [4],
      includeInversions: false,
    },
  },
} as const;

/**
 * Get all preset names as an array for UI selection.
 */
export const CHORD_FILTER_PRESET_NAMES = Object.keys(CHORD_FILTER_PRESETS);

/**
 * Get all presets as an array for iteration.
 */
export const CHORD_FILTER_PRESET_LIST = Object.values(CHORD_FILTER_PRESETS);
