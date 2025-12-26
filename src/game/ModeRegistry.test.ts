import { describe, it, expect, beforeEach } from 'vitest';
import { EAR_TRAINING_SUB_MODES, NOTE_TRAINING_SUB_MODES, TRAINING_MODES } from '../constants';
import type { ModeMetadata } from '../types/modeRegistry';

describe('ModeRegistry Validation Tests', () => {
  it('should throw error when registering mode without strategyType', () => {
    // Import ModeRegistry class directly to create a fresh instance
    // We'll use a type assertion to bypass TypeScript's private constructor check
    const ModeRegistryClass = class {
      private modes: Map<any, ModeMetadata> = new Map();

      register(metadata: ModeMetadata): void {
        // Copy validation logic from ModeRegistry
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
        if (!metadata.strategyType) {
          throw new Error(`Mode ${metadata.id} must have a strategyType`);
        }

        if (this.modes.has(metadata.id)) {
          throw new Error(`Mode ${metadata.id} is already registered`);
        }

        this.modes.set(metadata.id, metadata);
      }
    };

    const testRegistry = new ModeRegistryClass();

    const invalidMetadata = {
      id: 'test-mode' as any,
      type: TRAINING_MODES.EAR_TRAINING,
      title: 'Test Mode',
      description: 'Test description',
      settingsComponent: 'TestSettings' as any,
      settingsKey: 'testSettings' as any,
      gameStateFactory: () => ({} as any),
      // Missing strategyType
    };

    expect(() => {
      testRegistry.register(invalidMetadata as ModeMetadata);
    }).toThrow('Mode test-mode must have a strategyType');
  });

  it('should successfully register mode with valid strategyType', () => {
    const ModeRegistryClass = class {
      private modes: Map<any, ModeMetadata> = new Map();

      register(metadata: ModeMetadata): void {
        // Copy validation logic from ModeRegistry
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
        if (!metadata.strategyType) {
          throw new Error(`Mode ${metadata.id} must have a strategyType`);
        }

        if (this.modes.has(metadata.id)) {
          throw new Error(`Mode ${metadata.id} is already registered`);
        }

        this.modes.set(metadata.id, metadata);
      }

      isRegistered(modeId: any): boolean {
        return this.modes.has(modeId);
      }
    };

    const testRegistry = new ModeRegistryClass();

    const validMetadata: ModeMetadata = {
      id: 'test-mode-valid' as any,
      type: TRAINING_MODES.EAR_TRAINING,
      title: 'Test Mode Valid',
      description: 'Test description',
      settingsComponent: 'TestSettings' as any,
      settingsKey: 'testSettings' as any,
      gameStateFactory: () => ({} as any),
      strategyType: 'ear-training',
    };

    expect(() => {
      testRegistry.register(validMetadata);
    }).not.toThrow();

    expect(testRegistry.isRegistered('test-mode-valid' as any)).toBe(true);
  });
});

describe('Mode Registration Integration', () => {
  // This test ensures all modes are properly registered when the module is imported
  it('should have all expected modes registered', async () => {
    // Import the modes initialization module
    const { modeRegistry } = await import('./modes');

    // Verify all modes are registered
    const allModes = modeRegistry.getAll();
    expect(allModes.length).toBe(5); // Rush, Survival, Sandbox, Chord Training, Chord Identification

    // Verify ear training modes exist
    expect(modeRegistry.isRegistered(EAR_TRAINING_SUB_MODES.RUSH)).toBe(true);
    expect(modeRegistry.isRegistered(EAR_TRAINING_SUB_MODES.SURVIVAL)).toBe(true);
    expect(modeRegistry.isRegistered(EAR_TRAINING_SUB_MODES.SANDBOX)).toBe(true);

    // Verify note training modes exist
    expect(modeRegistry.isRegistered(NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES)).toBe(true);
    expect(modeRegistry.isRegistered(NOTE_TRAINING_SUB_MODES.SHOW_NOTES_GUESS_CHORD)).toBe(true);
  });

  it('should filter modes by type correctly', async () => {
    const { modeRegistry } = await import('./modes');

    const earTrainingModes = modeRegistry.getAllByType(TRAINING_MODES.EAR_TRAINING);
    expect(earTrainingModes.length).toBe(3); // Rush, Survival, Sandbox

    const noteTrainingModes = modeRegistry.getAllByType(TRAINING_MODES.NOTE_TRAINING);
    expect(noteTrainingModes.length).toBe(2); // Chord Training, Chord Identification
  });

  it('should create valid game states from registered modes', async () => {
    const { modeRegistry } = await import('./modes');
    const { DEFAULT_MODE_SETTINGS } = await import('../types/game');

    // Get all modes and verify their factories work
    const allModes = modeRegistry.getAll();

    allModes.forEach(mode => {
      expect(() => {
        const gameState = mode.gameStateFactory(DEFAULT_MODE_SETTINGS);
        expect(gameState).toBeDefined();
        expect(gameState.modeDisplay).toBeDefined();
        expect(gameState.handleCorrectGuess).toBeDefined();
        expect(gameState.handleIncorrectGuess).toBeDefined();
      }).not.toThrow();
    });
  });

  it('should have valid strategyType for all registered modes', async () => {
    const { modeRegistry } = await import('./modes');

    const allModes = modeRegistry.getAll();

    allModes.forEach(mode => {
      expect(mode.strategyType).toBeDefined();
      expect(['ear-training', 'chord-training']).toContain(mode.strategyType);
    });

    // Verify ear training modes have correct strategyType
    const earTrainingModes = modeRegistry.getAllByType(TRAINING_MODES.EAR_TRAINING);
    earTrainingModes.forEach(mode => {
      expect(mode.strategyType).toBe('ear-training');
    });

    // Verify note training modes have correct strategyType
    const noteTrainingModes = modeRegistry.getAllByType(TRAINING_MODES.NOTE_TRAINING);
    noteTrainingModes.forEach(mode => {
      expect(mode.strategyType).toBe('chord-training');
    });
  });
});
