import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameOrchestrator } from './GameOrchestrator';
import { GameAction } from '../machines/types';

describe('GameOrchestrator', () => {
  let orchestrator: GameOrchestrator;

  beforeEach(() => {
    orchestrator = new GameOrchestrator();
    orchestrator.start();
  });

  afterEach(() => {
    orchestrator.stop();
  });

  describe('Initialization', () => {
    it('should start in IDLE state', () => {
      expect(orchestrator.isIdle()).toBe(true);
      expect(orchestrator.isPlaying()).toBe(false);
      expect(orchestrator.isPaused()).toBe(false);
      expect(orchestrator.isCompleted()).toBe(false);
    });

    it('should initialize with empty context', () => {
      const context = orchestrator.getContext();
      expect(context.currentNote).toBeNull();
      expect(context.userGuess).toBeNull();
      expect(context.correctCount).toBe(0);
      expect(context.totalAttempts).toBe(0);
      expect(context.currentStreak).toBe(0);
      expect(context.longestStreak).toBe(0);
    });
  });

  describe('Session State Transitions', () => {
    it('should transition from IDLE to PLAYING on START_GAME', () => {
      orchestrator.startGame();
      expect(orchestrator.isIdle()).toBe(false);
      expect(orchestrator.isPlaying()).toBe(true);
    });

    it('should transition from PLAYING to PAUSED on PAUSE', () => {
      orchestrator.startGame();
      orchestrator.pause();
      expect(orchestrator.isPlaying()).toBe(false);
      expect(orchestrator.isPaused()).toBe(true);
    });

    it('should transition from PAUSED to PLAYING on RESUME', () => {
      orchestrator.startGame();
      orchestrator.pause();
      orchestrator.resume();
      expect(orchestrator.isPaused()).toBe(false);
      expect(orchestrator.isPlaying()).toBe(true);
    });

    it('should transition from PLAYING to COMPLETED on COMPLETE', () => {
      orchestrator.startGame();
      orchestrator.complete();
      expect(orchestrator.isPlaying()).toBe(false);
      expect(orchestrator.isCompleted()).toBe(true);
    });

    it('should transition from COMPLETED to IDLE on RESET', () => {
      orchestrator.startGame();
      orchestrator.complete();
      orchestrator.reset();
      expect(orchestrator.isCompleted()).toBe(false);
      expect(orchestrator.isIdle()).toBe(true);
    });

    it('should transition from COMPLETED to PLAYING on PLAY_AGAIN', () => {
      orchestrator.startGame();
      orchestrator.complete();
      orchestrator.playAgain();
      expect(orchestrator.isCompleted()).toBe(false);
      expect(orchestrator.isPlaying()).toBe(true);
    });
  });

  describe('Round State Queries', () => {
    beforeEach(() => {
      orchestrator.startGame();
    });

    it('should start in PLAYING_NOTE round state', () => {
      expect(orchestrator.isPlayingNote()).toBe(true);
      expect(orchestrator.isWaitingInput()).toBe(false);
      expect(orchestrator.isProcessingGuess()).toBe(false);
      expect(orchestrator.isInIntermission()).toBe(false);
    });

    it('should transition to WAITING_INPUT after NOTE_PLAYED', () => {
      orchestrator.send({ type: GameAction.NOTE_PLAYED });
      expect(orchestrator.isPlayingNote()).toBe(false);
      expect(orchestrator.isWaitingInput()).toBe(true);
    });

    it('should transition to PROCESSING_GUESS after MAKE_GUESS', () => {
      orchestrator.send({ type: GameAction.NOTE_PLAYED });
      orchestrator.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });
      expect(orchestrator.isWaitingInput()).toBe(false);
      expect(orchestrator.isProcessingGuess()).toBe(true);
    });

    it('should transition to TIMEOUT_INTERMISSION after CORRECT_GUESS', () => {
      orchestrator.send({ type: GameAction.NOTE_PLAYED });
      orchestrator.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });
      orchestrator.send({ type: GameAction.CORRECT_GUESS });
      expect(orchestrator.isProcessingGuess()).toBe(false);
      expect(orchestrator.isInIntermission()).toBe(true);
    });

    it('should transition back to PLAYING_NOTE after ADVANCE_ROUND', () => {
      orchestrator.send({ type: GameAction.NOTE_PLAYED });
      orchestrator.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });
      orchestrator.send({ type: GameAction.CORRECT_GUESS });
      orchestrator.send({ type: GameAction.ADVANCE_ROUND });
      expect(orchestrator.isInIntermission()).toBe(false);
      expect(orchestrator.isPlayingNote()).toBe(true);
    });
  });

  describe('Context Accessors', () => {
    it('should get current note from context', () => {
      expect(orchestrator.getCurrentNote()).toBeNull();
    });

    it('should get user guess from context', () => {
      expect(orchestrator.getUserGuess()).toBeNull();
    });

    it('should get stats from context', () => {
      const stats = orchestrator.getStats();
      expect(stats.correctCount).toBe(0);
      expect(stats.totalAttempts).toBe(0);
      expect(stats.currentStreak).toBe(0);
      expect(stats.longestStreak).toBe(0);
    });

    it('should get feedback message from context', () => {
      expect(orchestrator.getFeedbackMessage()).toBe('');
    });

    it('should update stats after correct guess', () => {
      orchestrator.startGame();
      orchestrator.send({ type: GameAction.NOTE_PLAYED });
      orchestrator.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });
      orchestrator.send({ type: GameAction.CORRECT_GUESS });

      const stats = orchestrator.getStats();
      expect(stats.correctCount).toBe(1);
      expect(stats.totalAttempts).toBe(1);
      expect(stats.currentStreak).toBe(1);
      expect(stats.longestStreak).toBe(1);
    });
  });

  describe('Subscription', () => {
    it('should notify subscribers on state changes', () => {
      let callCount = 0;
      orchestrator.subscribe(() => {
        callCount++;
      });

      orchestrator.startGame();
      expect(callCount).toBeGreaterThan(0);
    });

    it('should unsubscribe correctly', () => {
      let callCount = 0;
      const unsubscribe = orchestrator.subscribe(() => {
        callCount++;
      });

      orchestrator.startGame();
      expect(callCount).toBeGreaterThan(0);
      const countAfterFirst = callCount;

      unsubscribe();
      orchestrator.pause();

      // Count should not increase after unsubscribe
      expect(callCount).toBe(countAfterFirst);
    });
  });

  describe('Cleanup', () => {
    it('should clean up all subscriptions on stop', () => {
      let callCount = 0;
      orchestrator.subscribe(() => {
        callCount++;
      });

      orchestrator.stop();

      // After stop, create new orchestrator since the old one is stopped
      orchestrator = new GameOrchestrator();
      orchestrator.start();
      orchestrator.startGame();

      // Old subscription should not fire
      expect(callCount).toBe(0);
    });
  });
});
