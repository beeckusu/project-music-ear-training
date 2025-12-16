import type { ModeType } from '../types/game';
import type { TrainingType } from '../constants';
import type { ModeRegistry, ModeMetadata } from '../types/modeRegistry';

/**
 * Singleton registry for game modes
 */
class ModeRegistryImpl implements ModeRegistry {
  private modes: Map<ModeType, ModeMetadata> = new Map();

  /**
   * Register a new mode
   * @throws Error if mode ID is already registered or metadata is invalid
   */
  register(metadata: ModeMetadata): void {
    // Validate metadata
    if (!metadata.id) {
      throw new Error('Mode metadata must have an id');
    }
    if (!metadata.type) {
      throw new Error(`Mode ${metadata.id} must have a type`);
    }
    if (!metadata.title) {
      throw new Error(`Mode ${metadata.id} must have a title`);
    }
    if (!metadata.description) {
      throw new Error(`Mode ${metadata.id} must have a description`);
    }
    if (!metadata.settingsComponent) {
      throw new Error(`Mode ${metadata.id} must have a settingsComponent`);
    }
    if (!metadata.settingsKey) {
      throw new Error(`Mode ${metadata.id} must have a settingsKey`);
    }
    if (!metadata.gameStateFactory || typeof metadata.gameStateFactory !== 'function') {
      throw new Error(`Mode ${metadata.id} must have a valid gameStateFactory function`);
    }

    // Check for duplicates
    if (this.modes.has(metadata.id)) {
      throw new Error(`Mode ${metadata.id} is already registered`);
    }

    this.modes.set(metadata.id, metadata);
  }

  /**
   * Get metadata for a specific mode
   * @returns Mode metadata or undefined if not registered
   */
  get(modeId: ModeType): ModeMetadata | undefined {
    return this.modes.get(modeId);
  }

  /**
   * Get all registered modes
   */
  getAll(): ModeMetadata[] {
    return Array.from(this.modes.values());
  }

  /**
   * Get all modes of a specific type
   */
  getAllByType(type: TrainingType): ModeMetadata[] {
    return this.getAll().filter(mode => mode.type === type);
  }

  /**
   * Check if a mode is registered
   */
  isRegistered(modeId: ModeType): boolean {
    return this.modes.has(modeId);
  }
}

// Export singleton instance
export const modeRegistry = new ModeRegistryImpl();
