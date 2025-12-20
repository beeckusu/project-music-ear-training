/**
 * Interface Compliance Tests for GameStateWithDisplay
 *
 * These tests verify that both SingleChordGameState and ChordIdentificationGameState
 * fully implement the GameStateWithDisplay interface and have all required methods.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SingleChordGameState } from './SingleChordGameState';
import { ChordIdentificationGameState } from './ChordIdentificationGameState';
import type { NoteTrainingModeSettings } from '../types/game';
import type { ChordFilter } from '../types/music';

describe('GameStateWithDisplay Interface Compliance', () => {
  const mockSettings: NoteTrainingModeSettings = {
    selectedSubMode: 'show_chord_guess_notes',
    targetChords: 10,
    sessionDuration: 0,
    chordFilter: {
      allowedChordTypes: ['major', 'minor'],
      allowedRoots: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
      allowedInversions: [0],
    } as ChordFilter,
  };

  describe('SingleChordGameState', () => {
    let gameState: SingleChordGameState;

    beforeEach(() => {
      gameState = new SingleChordGameState(mockSettings);
    });

    describe('GameStateWithDisplay interface methods', () => {
      it('should have modeDisplay method', () => {
        expect(gameState.modeDisplay).toBeDefined();
        expect(typeof gameState.modeDisplay).toBe('function');
      });

      it('should have handleCorrectGuess method', () => {
        expect(gameState.handleCorrectGuess).toBeDefined();
        expect(typeof gameState.handleCorrectGuess).toBe('function');
      });

      it('should have handleIncorrectGuess method', () => {
        expect(gameState.handleIncorrectGuess).toBeDefined();
        expect(typeof gameState.handleIncorrectGuess).toBe('function');
      });

      it('should have updateState method', () => {
        expect(gameState.updateState).toBeDefined();
        expect(typeof gameState.updateState).toBe('function');
      });

      it('should have getFeedbackMessage method', () => {
        expect(gameState.getFeedbackMessage).toBeDefined();
        expect(typeof gameState.getFeedbackMessage).toBe('function');
      });

      it('should have onStartNewRound method', () => {
        expect(gameState.onStartNewRound).toBeDefined();
        expect(typeof gameState.onStartNewRound).toBe('function');
      });

      it('should have getTimerMode method', () => {
        expect(gameState.getTimerMode).toBeDefined();
        expect(typeof gameState.getTimerMode).toBe('function');
      });

      it('should have getCompletionMessage method', () => {
        expect(gameState.getCompletionMessage).toBeDefined();
        expect(typeof gameState.getCompletionMessage).toBe('function');
      });

      it('should have getSessionSettings method', () => {
        expect(gameState.getSessionSettings).toBeDefined();
        expect(typeof gameState.getSessionSettings).toBe('function');
      });

      it('should have getSessionResults method', () => {
        expect(gameState.getSessionResults).toBeDefined();
        expect(typeof gameState.getSessionResults).toBe('function');
      });
    });

    describe('IGameMode interface methods', () => {
      it('should have generateNote method', () => {
        expect(gameState.generateNote).toBeDefined();
        expect(typeof gameState.generateNote).toBe('function');
      });

      it('should have validateGuess method', () => {
        expect(gameState.validateGuess).toBeDefined();
        expect(typeof gameState.validateGuess).toBe('function');
      });

      it('should have isGameComplete method', () => {
        expect(gameState.isGameComplete).toBeDefined();
        expect(typeof gameState.isGameComplete).toBe('function');
      });

      it('should have getMode method', () => {
        expect(gameState.getMode).toBeDefined();
        expect(typeof gameState.getMode).toBe('function');
      });
    });

    describe('Timer Management Methods', () => {
      it('should have initializeTimer method', () => {
        expect(gameState.initializeTimer).toBeDefined();
        expect(typeof gameState.initializeTimer).toBe('function');
      });

      it('should have getTimerState method', () => {
        expect(gameState.getTimerState).toBeDefined();
        expect(typeof gameState.getTimerState).toBe('function');
      });

      it('should have pauseTimer method', () => {
        expect(gameState.pauseTimer).toBeDefined();
        expect(typeof gameState.pauseTimer).toBe('function');
      });

      it('should have resumeTimer method', () => {
        expect(gameState.resumeTimer).toBeDefined();
        expect(typeof gameState.resumeTimer).toBe('function');
      });

      it('should have resetTimer method', () => {
        expect(gameState.resetTimer).toBeDefined();
        expect(typeof gameState.resetTimer).toBe('function');
      });

      it('should correctly initialize timer', () => {
        const onTimeUp = () => {};
        const onTimeUpdate = (time: number) => {};

        gameState.initializeTimer(30, false, onTimeUp, onTimeUpdate);

        const state = gameState.getTimerState();
        expect(state.timeRemaining).toBe(30);
        expect(state.isActive).toBe(true);
      });

      it('should pause and resume timer', () => {
        const onTimeUp = () => {};
        gameState.initializeTimer(30, false, onTimeUp);

        gameState.pauseTimer();
        let state = gameState.getTimerState();
        expect(state.isActive).toBe(false);

        gameState.resumeTimer();
        state = gameState.getTimerState();
        expect(state.isActive).toBe(true);
      });

      it('should reset timer', () => {
        const onTimeUp = () => {};
        gameState.initializeTimer(30, false, onTimeUp);

        gameState.resetTimer();
        const state = gameState.getTimerState();
        expect(state.timeRemaining).toBe(0);
        expect(state.isActive).toBe(false);
      });
    });

    describe('End Screen Strategy Methods', () => {
      it('should have getCelebrationEmoji method', () => {
        expect(gameState.getCelebrationEmoji).toBeDefined();
        expect(typeof gameState.getCelebrationEmoji).toBe('function');
      });

      it('should have getHeaderTitle method', () => {
        expect(gameState.getHeaderTitle).toBeDefined();
        expect(typeof gameState.getHeaderTitle).toBe('function');
      });

      it('should have getModeCompletionText method', () => {
        expect(gameState.getModeCompletionText).toBeDefined();
        expect(typeof gameState.getModeCompletionText).toBe('function');
      });

      it('should have getPerformanceRating method', () => {
        expect(gameState.getPerformanceRating).toBeDefined();
        expect(typeof gameState.getPerformanceRating).toBe('function');
      });

      it('should have getHeaderThemeClass method', () => {
        expect(gameState.getHeaderThemeClass).toBeDefined();
        expect(typeof gameState.getHeaderThemeClass).toBe('function');
      });

      it('should have getStatsItems method', () => {
        expect(gameState.getStatsItems).toBeDefined();
        expect(typeof gameState.getStatsItems).toBe('function');
      });

      it('should have getAdditionalStatsSection method', () => {
        expect(gameState.getAdditionalStatsSection).toBeDefined();
        expect(typeof gameState.getAdditionalStatsSection).toBe('function');
      });

      it('should have getHistoryTitle method', () => {
        expect(gameState.getHistoryTitle).toBeDefined();
        expect(typeof gameState.getHistoryTitle).toBe('function');
      });

      it('should have getHistoryItems method', () => {
        expect(gameState.getHistoryItems).toBeDefined();
        expect(typeof gameState.getHistoryItems).toBe('function');
      });

      it('should have shouldShowHistory method', () => {
        expect(gameState.shouldShowHistory).toBeDefined();
        expect(typeof gameState.shouldShowHistory).toBe('function');
      });
    });
  });

  describe('ChordIdentificationGameState', () => {
    let gameState: ChordIdentificationGameState;

    beforeEach(() => {
      gameState = new ChordIdentificationGameState(mockSettings);
    });

    describe('GameStateWithDisplay interface methods', () => {
      it('should have modeDisplay method', () => {
        expect(gameState.modeDisplay).toBeDefined();
        expect(typeof gameState.modeDisplay).toBe('function');
      });

      it('should have handleCorrectGuess method', () => {
        expect(gameState.handleCorrectGuess).toBeDefined();
        expect(typeof gameState.handleCorrectGuess).toBe('function');
      });

      it('should have handleIncorrectGuess method', () => {
        expect(gameState.handleIncorrectGuess).toBeDefined();
        expect(typeof gameState.handleIncorrectGuess).toBe('function');
      });

      it('should have updateState method', () => {
        expect(gameState.updateState).toBeDefined();
        expect(typeof gameState.updateState).toBe('function');
      });

      it('should have getFeedbackMessage method', () => {
        expect(gameState.getFeedbackMessage).toBeDefined();
        expect(typeof gameState.getFeedbackMessage).toBe('function');
      });

      it('should have onStartNewRound method', () => {
        expect(gameState.onStartNewRound).toBeDefined();
        expect(typeof gameState.onStartNewRound).toBe('function');
      });

      it('should have getTimerMode method', () => {
        expect(gameState.getTimerMode).toBeDefined();
        expect(typeof gameState.getTimerMode).toBe('function');
      });

      it('should have getCompletionMessage method', () => {
        expect(gameState.getCompletionMessage).toBeDefined();
        expect(typeof gameState.getCompletionMessage).toBe('function');
      });

      it('should have getSessionSettings method', () => {
        expect(gameState.getSessionSettings).toBeDefined();
        expect(typeof gameState.getSessionSettings).toBe('function');
      });

      it('should have getSessionResults method', () => {
        expect(gameState.getSessionResults).toBeDefined();
        expect(typeof gameState.getSessionResults).toBe('function');
      });
    });

    describe('IGameMode interface methods', () => {
      it('should have generateNote method', () => {
        expect(gameState.generateNote).toBeDefined();
        expect(typeof gameState.generateNote).toBe('function');
      });

      it('should have validateGuess method', () => {
        expect(gameState.validateGuess).toBeDefined();
        expect(typeof gameState.validateGuess).toBe('function');
      });

      it('should have isGameComplete method', () => {
        expect(gameState.isGameComplete).toBeDefined();
        expect(typeof gameState.isGameComplete).toBe('function');
      });

      it('should have getMode method', () => {
        expect(gameState.getMode).toBeDefined();
        expect(typeof gameState.getMode).toBe('function');
      });
    });

    describe('Timer Management Methods', () => {
      it('should have initializeTimer method', () => {
        expect(gameState.initializeTimer).toBeDefined();
        expect(typeof gameState.initializeTimer).toBe('function');
      });

      it('should have getTimerState method', () => {
        expect(gameState.getTimerState).toBeDefined();
        expect(typeof gameState.getTimerState).toBe('function');
      });

      it('should have pauseTimer method', () => {
        expect(gameState.pauseTimer).toBeDefined();
        expect(typeof gameState.pauseTimer).toBe('function');
      });

      it('should have resumeTimer method', () => {
        expect(gameState.resumeTimer).toBeDefined();
        expect(typeof gameState.resumeTimer).toBe('function');
      });

      it('should have resetTimer method', () => {
        expect(gameState.resetTimer).toBeDefined();
        expect(typeof gameState.resetTimer).toBe('function');
      });

      it('should correctly initialize timer', () => {
        const onTimeUp = () => {};
        const onTimeUpdate = (time: number) => {};

        gameState.initializeTimer(30, false, onTimeUp, onTimeUpdate);

        const state = gameState.getTimerState();
        expect(state.timeRemaining).toBe(30);
        expect(state.isActive).toBe(true);
      });

      it('should pause and resume timer', () => {
        const onTimeUp = () => {};
        gameState.initializeTimer(30, false, onTimeUp);

        gameState.pauseTimer();
        let state = gameState.getTimerState();
        expect(state.isActive).toBe(false);

        gameState.resumeTimer();
        state = gameState.getTimerState();
        expect(state.isActive).toBe(true);
      });

      it('should reset timer', () => {
        const onTimeUp = () => {};
        gameState.initializeTimer(30, false, onTimeUp);

        gameState.resetTimer();
        const state = gameState.getTimerState();
        expect(state.timeRemaining).toBe(0);
        expect(state.isActive).toBe(false);
      });
    });

    describe('End Screen Strategy Methods', () => {
      it('should have getCelebrationEmoji method', () => {
        expect(gameState.getCelebrationEmoji).toBeDefined();
        expect(typeof gameState.getCelebrationEmoji).toBe('function');
      });

      it('should have getHeaderTitle method', () => {
        expect(gameState.getHeaderTitle).toBeDefined();
        expect(typeof gameState.getHeaderTitle).toBe('function');
      });

      it('should have getModeCompletionText method', () => {
        expect(gameState.getModeCompletionText).toBeDefined();
        expect(typeof gameState.getModeCompletionText).toBe('function');
      });

      it('should have getPerformanceRating method', () => {
        expect(gameState.getPerformanceRating).toBeDefined();
        expect(typeof gameState.getPerformanceRating).toBe('function');
      });

      it('should have getHeaderThemeClass method', () => {
        expect(gameState.getHeaderThemeClass).toBeDefined();
        expect(typeof gameState.getHeaderThemeClass).toBe('function');
      });

      it('should have getStatsItems method', () => {
        expect(gameState.getStatsItems).toBeDefined();
        expect(typeof gameState.getStatsItems).toBe('function');
      });

      it('should have getAdditionalStatsSection method', () => {
        expect(gameState.getAdditionalStatsSection).toBeDefined();
        expect(typeof gameState.getAdditionalStatsSection).toBe('function');
      });

      it('should have getHistoryTitle method', () => {
        expect(gameState.getHistoryTitle).toBeDefined();
        expect(typeof gameState.getHistoryTitle).toBe('function');
      });

      it('should have getHistoryItems method', () => {
        expect(gameState.getHistoryItems).toBeDefined();
        expect(typeof gameState.getHistoryItems).toBe('function');
      });

      it('should have shouldShowHistory method', () => {
        expect(gameState.shouldShowHistory).toBeDefined();
        expect(typeof gameState.shouldShowHistory).toBe('function');
      });
    });
  });
});
