import type { ChordFilter, ChordType, Note, Octave } from '../../../types/music';
import { WHITE_KEYS, BLACK_KEYS } from '../../../types/music';

/**
 * Builder pattern for creating ChordFilter objects in tests
 * Makes test setup more readable and maintainable
 */
export class ChordFilterBuilder {
  private filter: Partial<ChordFilter> = {};

  /**
   * Set allowed chord types
   */
  withChordTypes(...types: ChordType[]): this {
    this.filter.allowedChordTypes = types;
    return this;
  }

  /**
   * Set allowed root notes
   */
  withRootNotes(...notes: Note[]): this {
    this.filter.allowedRootNotes = notes.length > 0 ? notes : null;
    return this;
  }

  /**
   * Allow only white keys as root notes
   */
  withWhiteKeysOnly(): this {
    this.filter.allowedRootNotes = WHITE_KEYS as Note[];
    return this;
  }

  /**
   * Allow only black keys as root notes
   */
  withBlackKeysOnly(): this {
    this.filter.allowedRootNotes = BLACK_KEYS as Note[];
    return this;
  }

  /**
   * Allow all notes (no restriction)
   */
  withAllNotes(): this {
    this.filter.allowedRootNotes = null;
    return this;
  }

  /**
   * Set allowed octaves
   */
  withOctaves(...octaves: Octave[]): this {
    this.filter.allowedOctaves = octaves;
    return this;
  }

  /**
   * Enable or disable inversions
   */
  withInversions(include: boolean = true): this {
    this.filter.includeInversions = include;
    return this;
  }

  /**
   * Build the final ChordFilter object
   */
  build(): ChordFilter {
    return {
      allowedChordTypes: this.filter.allowedChordTypes || ['major'],
      allowedRootNotes: this.filter.allowedRootNotes !== undefined
        ? this.filter.allowedRootNotes
        : null,
      allowedOctaves: this.filter.allowedOctaves || [4],
      includeInversions: this.filter.includeInversions || false
    };
  }

  /**
   * Create a new builder instance
   */
  static create(): ChordFilterBuilder {
    return new ChordFilterBuilder();
  }
}

/**
 * Convenience function to create a filter builder
 */
export function createFilter(): ChordFilterBuilder {
  return new ChordFilterBuilder();
}
