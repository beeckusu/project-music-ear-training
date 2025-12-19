import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createGameState } from './GameStateFactory';
import { SingleChordGameState } from './SingleChordGameState';
import { EAR_TRAINING_SUB_MODES, NOTE_TRAINING_SUB_MODES } from '../constants';
import type { ModeSettings } from '../types/game';
import { DEFAULT_MODE_SETTINGS } from '../types/game';
// Import modes registration to ensure all modes are registered before tests run
import './modes';

describe('GameStateFactory', () => {
  let defaultModeSettings: ModeSettings;

  beforeEach(() => {
    defaultModeSettings = { ...DEFAULT_MODE_SETTINGS };
  });

  describe('Note Training Mode Support', () => {
    it('should create SingleChordGameState for SHOW_CHORD_GUESS_NOTES mode', () => {
      const gameState = createGameState(
        NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES,
        defaultModeSettings
      );

      expect(gameState).toBeInstanceOf(SingleChordGameState);
    });

    it('should pass correct noteTraining settings to SingleChordGameState', () => {
      const customSettings = {
        ...defaultModeSettings,
        noteTraining: {
          ...defaultModeSettings.noteTraining,
          sessionDuration: 600,
          targetChords: 15,
          targetAccuracy: 90
        }
      };

      const gameState = createGameState(
        NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES,
        customSettings
      );

      // Verify the settings were passed correctly
      const singleChordState = gameState as SingleChordGameState;
      expect(singleChordState.noteTrainingSettings.sessionDuration).toBe(600);
      expect(singleChordState.noteTrainingSettings.targetChords).toBe(15);
      expect(singleChordState.noteTrainingSettings.targetAccuracy).toBe(90);
    });

    it('should handle SHOW_NOTES_GUESS_CHORD mode gracefully when component is missing', () => {
      // ChordIdentificationGameState exists (META-76) but ChordIdentificationModeDisplay does not
      // The factory should fallback to sandbox mode
      const gameState = createGameState(
        NOTE_TRAINING_SUB_MODES.SHOW_NOTES_GUESS_CHORD,
        defaultModeSettings
      );

      // Verify a game state was created (sandbox fallback)
      expect(gameState).toBeDefined();
      expect(gameState.modeDisplay).toBeDefined();
      expect(gameState.handleCorrectGuess).toBeDefined();
      expect(gameState.handleIncorrectGuess).toBeDefined();
    });

    it('should properly extract noteTraining settings from modeSettings object', () => {
      const customNoteTrainingSettings = {
        selectedSubMode: NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES,
        chordFilter: defaultModeSettings.noteTraining.chordFilter,
        sessionDuration: 900,
        targetAccuracy: 85,
        targetStreak: 15,
        targetChords: 25
      };

      const modeSettings = {
        ...defaultModeSettings,
        noteTraining: customNoteTrainingSettings
      };

      const gameState = createGameState(
        NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES,
        modeSettings
      );

      const singleChordState = gameState as SingleChordGameState;
      expect(singleChordState.noteTrainingSettings).toEqual(customNoteTrainingSettings);
    });
  });

  describe('Fallback Behavior', () => {
    it('should fallback to sandbox for unknown mode', () => {
      // Type assertion to bypass TypeScript checking for testing purposes
      const unknownMode = 'unknown-mode' as any;

      const gameState = createGameState(unknownMode, defaultModeSettings);

      // Should still return a valid game state (sandbox fallback)
      expect(gameState).toBeDefined();
      expect(gameState.modeDisplay).toBeDefined();
      expect(gameState.handleCorrectGuess).toBeDefined();
      expect(gameState.handleIncorrectGuess).toBeDefined();
    });

    it('should log warning when falling back to sandbox', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const unknownMode = 'invalid-mode' as any;

      createGameState(unknownMode, defaultModeSettings);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown mode: invalid-mode')
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Ear Training Mode Support', () => {
    it('should create game state for sandbox mode', () => {
      const gameState = createGameState(
        EAR_TRAINING_SUB_MODES.SANDBOX,
        defaultModeSettings
      );

      expect(gameState).toBeDefined();
      expect(gameState.modeDisplay).toBeDefined();
    });

    it('should create game state for rush mode', () => {
      const gameState = createGameState(
        EAR_TRAINING_SUB_MODES.RUSH,
        defaultModeSettings
      );

      expect(gameState).toBeDefined();
      expect(gameState.modeDisplay).toBeDefined();
    });

    it('should create game state for survival mode', () => {
      const gameState = createGameState(
        EAR_TRAINING_SUB_MODES.SURVIVAL,
        defaultModeSettings
      );

      expect(gameState).toBeDefined();
      expect(gameState.modeDisplay).toBeDefined();
    });
  });

  describe('Settings Key Extraction', () => {
    it('should extract correct settings key for Note Training modes', () => {
      // The factory should use settingsKey from registry to extract the right settings
      const noteTrainingSettings = {
        ...defaultModeSettings.noteTraining,
        sessionDuration: 1000
      };

      const modeSettings = {
        ...defaultModeSettings,
        noteTraining: noteTrainingSettings
      };

      const gameState = createGameState(
        NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES,
        modeSettings
      );

      const singleChordState = gameState as SingleChordGameState;
      expect(singleChordState.noteTrainingSettings.sessionDuration).toBe(1000);
    });

    it('should not mix up settings between different mode types', () => {
      // Ensure noteTraining settings aren't accidentally used for ear training modes
      const customModeSettings = {
        ...defaultModeSettings,
        sandbox: {
          ...defaultModeSettings.sandbox,
          sessionDuration: 10
        },
        noteTraining: {
          ...defaultModeSettings.noteTraining,
          sessionDuration: 999 // Different value
        }
      };

      // Create an ear training mode state
      const earTrainingState = createGameState(
        EAR_TRAINING_SUB_MODES.SANDBOX,
        customModeSettings
      );

      // Create a note training mode state
      const noteTrainingState = createGameState(
        NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES,
        customModeSettings
      ) as SingleChordGameState;

      // Verify each got the correct settings
      expect(noteTrainingState.noteTrainingSettings.sessionDuration).toBe(999);
      // The ear training state should have used sandbox settings (10 minutes)
      expect(earTrainingState).toBeDefined();
    });
  });

  describe('GameStateWithDisplay Interface Compliance', () => {
    it('should return object implementing GameStateWithDisplay interface', () => {
      const gameState = createGameState(
        NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES,
        defaultModeSettings
      );

      // Verify all required methods exist
      expect(typeof gameState.modeDisplay).toBe('function');
      expect(typeof gameState.handleCorrectGuess).toBe('function');
      expect(typeof gameState.handleIncorrectGuess).toBe('function');
      expect(typeof gameState.updateState).toBe('function');
      expect(typeof gameState.getFeedbackMessage).toBe('function');
      expect(typeof gameState.onStartNewRound).toBe('function');
      expect(typeof gameState.getTimerMode).toBe('function');
      expect(typeof gameState.getCompletionMessage).toBe('function');
      expect(typeof gameState.getSessionSettings).toBe('function');
      expect(typeof gameState.getSessionResults).toBe('function');

      // Verify BaseGameState properties
      expect(gameState.elapsedTime).toBeDefined();
      expect(gameState.isCompleted).toBeDefined();
      expect(gameState.totalAttempts).toBeDefined();
      expect(gameState.longestStreak).toBeDefined();
      expect(gameState.currentStreak).toBeDefined();
    });

    it('should have modeDisplay that returns React element', () => {
      const gameState = createGameState(
        NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES,
        defaultModeSettings
      );

      const displayProps = {
        responseTimeLimit: null,
        currentNote: false,
        isPaused: false
      };

      const displayElement = gameState.modeDisplay(displayProps);
      expect(displayElement).toBeDefined();
      expect(displayElement.type).toBeDefined();
    });
  });
});
