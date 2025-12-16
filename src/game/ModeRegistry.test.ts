import { describe, it, expect } from 'vitest';
import { EAR_TRAINING_SUB_MODES, NOTE_TRAINING_SUB_MODES, TRAINING_MODES } from '../constants';

describe('Mode Registration Integration', () => {
  // This test ensures all modes are properly registered when the module is imported
  it('should have all expected modes registered', async () => {
    // Import the modes initialization module
    const { modeRegistry } = await import('./modes');

    // Verify all modes are registered
    const allModes = modeRegistry.getAll();
    expect(allModes.length).toBe(4); // Rush, Survival, Sandbox, Single Chord

    // Verify ear training modes exist
    expect(modeRegistry.isRegistered(EAR_TRAINING_SUB_MODES.RUSH)).toBe(true);
    expect(modeRegistry.isRegistered(EAR_TRAINING_SUB_MODES.SURVIVAL)).toBe(true);
    expect(modeRegistry.isRegistered(EAR_TRAINING_SUB_MODES.SANDBOX)).toBe(true);

    // Verify note training modes exist
    expect(modeRegistry.isRegistered(NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES)).toBe(true);
  });

  it('should filter modes by type correctly', async () => {
    const { modeRegistry } = await import('./modes');

    const earTrainingModes = modeRegistry.getAllByType(TRAINING_MODES.EAR_TRAINING);
    expect(earTrainingModes.length).toBe(3); // Rush, Survival, Sandbox

    const noteTrainingModes = modeRegistry.getAllByType(TRAINING_MODES.NOTE_TRAINING);
    expect(noteTrainingModes.length).toBe(1); // Single Chord
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
});
