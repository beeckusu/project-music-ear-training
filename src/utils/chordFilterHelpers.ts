import type { ChordFilter } from '../types/music';
import type { ChordFilterPreset } from '../constants/chordPresets';
import { CHORD_FILTER_PRESETS } from '../constants/chordPresets';

/**
 * Apply a chord filter preset to create a new filter configuration.
 * Optionally merge with current settings to preserve user customizations.
 *
 * @param preset - The preset to apply
 * @param mergeWithCurrent - Optional current filter to merge with preset values
 * @returns A new ChordFilter with preset values applied
 *
 * @example
 * // Apply preset without merging
 * const filter = applyChordFilterPreset(CHORD_FILTER_PRESETS.BASIC_TRIADS);
 *
 * @example
 * // Apply preset and preserve current octave settings
 * const filter = applyChordFilterPreset(
 *   CHORD_FILTER_PRESETS.JAZZ_CHORDS,
 *   currentFilter
 * );
 */
export function applyChordFilterPreset(
  preset: ChordFilterPreset,
  mergeWithCurrent?: ChordFilter
): ChordFilter {
  if (!mergeWithCurrent) {
    // Return a copy of the preset filter
    return { ...preset.filter };
  }

  // Merge preset with current filter
  // Preset values take precedence, but we preserve the structure
  return {
    ...mergeWithCurrent,
    ...preset.filter,
    // Deep copy keyFilter if it exists
    keyFilter: preset.filter.keyFilter
      ? { ...preset.filter.keyFilter }
      : mergeWithCurrent.keyFilter,
  };
}

/**
 * Get a chord filter preset by its key name.
 *
 * @param presetKey - The key of the preset (e.g., 'BASIC_TRIADS')
 * @returns The preset if found, undefined otherwise
 *
 * @example
 * const preset = getChordFilterPreset('BASIC_TRIADS');
 * if (preset) {
 *   const filter = applyChordFilterPreset(preset);
 * }
 */
export function getChordFilterPreset(presetKey: string): ChordFilterPreset | undefined {
  return CHORD_FILTER_PRESETS[presetKey as keyof typeof CHORD_FILTER_PRESETS];
}

/**
 * Get a chord filter preset by its display name.
 *
 * @param name - The display name of the preset (e.g., 'Basic Triads')
 * @returns The preset if found, undefined otherwise
 *
 * @example
 * const preset = getChordFilterPresetByName('Basic Triads');
 */
export function getChordFilterPresetByName(name: string): ChordFilterPreset | undefined {
  return Object.values(CHORD_FILTER_PRESETS).find(preset => preset.name === name);
}

/**
 * Detect which preset (if any) matches the current chord filter configuration.
 * Returns 'CUSTOM' if the filter doesn't match any preset exactly.
 *
 * @param filter - The current chord filter to check
 * @returns The preset key that matches, or 'CUSTOM' if no match
 *
 * @example
 * const currentPreset = detectCurrentPreset(chordFilter);
 * if (currentPreset === 'CUSTOM') {
 *   console.log('User has customized their filter');
 * }
 */
export function detectCurrentPreset(filter: ChordFilter): string {
  // Try to find a matching preset by deep comparison
  for (const [key, preset] of Object.entries(CHORD_FILTER_PRESETS)) {
    if (filtersAreEqual(filter, preset.filter)) {
      return key;
    }
  }
  return 'CUSTOM';
}

/**
 * Deep equality comparison for chord filters.
 * Compares all properties including arrays and nested objects.
 *
 * @param filter1 - First filter to compare
 * @param filter2 - Second filter to compare
 * @returns True if filters are identical, false otherwise
 */
function filtersAreEqual(filter1: ChordFilter, filter2: ChordFilter): boolean {
  // Compare allowedChordTypes arrays
  if (!arraysAreEqual(filter1.allowedChordTypes, filter2.allowedChordTypes)) {
    return false;
  }

  // Compare allowedRootNotes (can be null or array)
  if (filter1.allowedRootNotes === null && filter2.allowedRootNotes === null) {
    // Both null, continue
  } else if (filter1.allowedRootNotes === null || filter2.allowedRootNotes === null) {
    // One is null, other isn't
    return false;
  } else if (!arraysAreEqual(filter1.allowedRootNotes, filter2.allowedRootNotes)) {
    return false;
  }

  // Compare allowedOctaves arrays
  if (!arraysAreEqual(filter1.allowedOctaves, filter2.allowedOctaves)) {
    return false;
  }

  // Compare includeInversions
  if (filter1.includeInversions !== filter2.includeInversions) {
    return false;
  }

  // Compare keyFilter (can be undefined or object)
  if (filter1.keyFilter === undefined && filter2.keyFilter === undefined) {
    // Both undefined, continue
  } else if (filter1.keyFilter === undefined || filter2.keyFilter === undefined) {
    // One is undefined, other isn't
    return false;
  } else {
    // Both defined, compare properties
    if (filter1.keyFilter.key !== filter2.keyFilter.key ||
        filter1.keyFilter.scale !== filter2.keyFilter.scale) {
      return false;
    }
  }

  return true;
}

/**
 * Helper function to compare arrays for equality.
 * Order matters - arrays must have same elements in same order.
 */
function arraysAreEqual<T>(arr1: T[], arr2: T[]): boolean {
  if (arr1.length !== arr2.length) {
    return false;
  }
  return arr1.every((val, index) => val === arr2[index]);
}
