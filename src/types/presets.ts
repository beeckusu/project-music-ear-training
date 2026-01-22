import type { ChordFilter } from './music';

/**
 * A custom chord filter preset created and saved by the user.
 * Extends the base preset structure with metadata for persistence.
 */
export interface CustomChordFilterPreset {
  /** Unique identifier for the preset */
  id: string;

  /** User-defined name for the preset */
  name: string;

  /** Optional description of the preset */
  description: string;

  /** The chord filter configuration */
  filter: ChordFilter;

  /** Discriminator to identify custom presets */
  isCustom: true;

  /** ISO timestamp when the preset was created */
  createdAt: string;

  /** ISO timestamp when the preset was last updated */
  updatedAt: string;
}

/**
 * Data required to create a new custom preset.
 * The id and timestamps are auto-generated.
 */
export interface CreateCustomPresetData {
  name: string;
  description: string;
  filter: ChordFilter;
}

/**
 * Data for updating an existing custom preset.
 */
export interface UpdateCustomPresetData {
  name?: string;
  description?: string;
  filter?: ChordFilter;
}
