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
