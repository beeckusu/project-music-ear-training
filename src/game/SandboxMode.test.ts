import { describe, it, afterEach, expect, vi } from 'vitest';
import { GameOrchestrator } from './GameOrchestrator';
import { GameAction } from '../machines/types';
import { createGameState } from './GameStateFactory';
import { EAR_TRAINING_SUB_MODES } from '../constants';

/**
 * Sandbox Mode Integration Tests
 *
 * Tests the Sandbox game mode which allows players to practice with flexible targets.
 * Sandbox mode uses a count-down session timer and ONLY completes when the session
 * time runs out. Targets (targetNotes, targetAccuracy, targetStreak) are goals to
 * achieve during the session, not completion conditions.
 */
describe('Sandbox Mode Integration Tests', () => {
  let orch: GameOrchestrator;

  afterEach(() => {
    orch?.stop();
    vi.restoreAllMocks();
  });

  /**
   * Helper function to make a correct guess and handle completion
   * This mimics what the real orchestrator does when handling guesses
   *
   * NOTE: This pattern is also available in ../test/gameTestUtils.ts as:
   * makeCorrectGuess(orch, note) for reuse across test files
   */
  const makeCorrectGuess = (note: string = 'C4') => {
    orch.send({ type: GameAction.MAKE_GUESS, guessedNote: note });

    // Call handleCorrectGuess to update stats (this is what the real orchestrator does)
    const gameMode = (orch as any).gameMode;
    const result = gameMode.handleCorrectGuess();

    orch.send({ type: GameAction.CORRECT_GUESS });

    // Check if game is complete and call complete
    if (result.gameCompleted) {
      orch.complete();
    }
  };

  /**
   * Helper function to make an incorrect guess
   *
   * NOTE: This pattern is also available in ../test/gameTestUtils.ts as:
   * makeIncorrectGuess(orch, note) for reuse across test files
   */
  const makeIncorrectGuess = (note: string = 'C4') => {
    orch.send({ type: GameAction.MAKE_GUESS, guessedNote: note });

    // Call handleIncorrectGuess to update stats
    const gameMode = (orch as any).gameMode;
    const result = gameMode.handleIncorrectGuess();

    orch.send({ type: GameAction.INCORRECT_GUESS });

    // Check if game is complete and call complete
    if (result.gameCompleted) {
      orch.complete();
    }
  };

  describe('Target Notes Tracking', () => {
    it('tracks progress toward targetNotes but does not complete', () => {
      // GIVEN: Sandbox mode with targetNotes: 3
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SANDBOX, {
        sandbox: {
          sessionDuration: 5,
          targetNotes: 3
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();
      expect(orch.getSnapshot().matches('playing.waiting_input')).toBe(true);

      // WHEN: Make 3 correct guesses (reach target)
      makeCorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('D4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('E4');

      // THEN: Game continues (target is a goal, not completion condition)
      expect(orch.getSnapshot().matches('playing')).toBe(true);
      expect(orch.getStats()).toMatchObject({
        correctCount: 3,
        totalAttempts: 3
      });
    });

    it('continues beyond target with mixed correct/incorrect', () => {
      // GIVEN: Sandbox mode with targetNotes: 3
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SANDBOX, {
        sandbox: {
          sessionDuration: 5,
          targetNotes: 3
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Correct, incorrect, correct, correct (reaches target at 3 correct)
      makeCorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeIncorrectGuess('D4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('E4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('F4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      // Continue beyond target
      makeCorrectGuess('G4');

      // THEN: Game continues even after target met
      expect(orch.getSnapshot().matches('playing')).toBe(true);
      expect(orch.getStats()).toMatchObject({
        correctCount: 4,
        totalAttempts: 5,
        currentStreak: 3
      });
    });
  });

  describe('Target Accuracy Tracking', () => {
    it('tracks accuracy toward target but does not complete', () => {
      // GIVEN: Sandbox mode with targetAccuracy: 80%
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SANDBOX, {
        sandbox: {
          sessionDuration: 5,
          targetAccuracy: 80
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Achieve 80% accuracy (4 correct out of 5)
      makeIncorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('D4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('E4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('F4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('G4');

      // THEN: Game continues (4/5 = 80% accuracy achieved)
      expect(orch.getSnapshot().matches('playing')).toBe(true);
      expect(orch.getStats()).toMatchObject({
        correctCount: 4,
        totalAttempts: 5
      });
    });

    it('continues even with 100% accuracy on first guess', () => {
      // GIVEN: Sandbox mode with targetAccuracy: 80%
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SANDBOX, {
        sandbox: {
          sessionDuration: 5,
          targetAccuracy: 80
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Make correct guess (100% accuracy)
      makeCorrectGuess('C4');

      // THEN: Game continues (even though accuracy is 100% > 80%)
      expect(orch.getSnapshot().matches('playing')).toBe(true);
      expect(orch.getStats()).toMatchObject({
        correctCount: 1,
        totalAttempts: 1
      });
    });
  });

  describe('Target Streak Tracking', () => {
    it('tracks streak toward target but does not complete', () => {
      // GIVEN: Sandbox mode with targetStreak: 5
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SANDBOX, {
        sandbox: {
          sessionDuration: 5,
          targetStreak: 5
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Achieve 5 streak
      makeCorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('D4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('E4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('F4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('G4');

      // THEN: Game continues (streak of 5 achieved)
      expect(orch.getSnapshot().matches('playing')).toBe(true);
      expect(orch.getStats()).toMatchObject({
        correctCount: 5,
        currentStreak: 5
      });
    });

    it('requires consecutive correct guesses for streak', () => {
      // GIVEN: Sandbox mode with targetStreak: 3
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SANDBOX, {
        sandbox: {
          sessionDuration: 5,
          targetStreak: 3
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Build streak, break it, then rebuild
      makeCorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('D4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeIncorrectGuess('E4'); // Breaks streak
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('F4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('G4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('A4');

      // THEN: Game continues with streak of 3 achieved
      expect(orch.getSnapshot().matches('playing')).toBe(true);
      expect(orch.getStats()).toMatchObject({
        correctCount: 5,
        totalAttempts: 6,
        currentStreak: 3
      });
    });
  });

  describe('Multiple Targets', () => {
    it('continues when one target is met but not others', () => {
      // GIVEN: Sandbox mode with targetNotes: 10 and targetStreak: 3
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SANDBOX, {
        sandbox: {
          sessionDuration: 5,
          targetNotes: 10,
          targetStreak: 3
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Reach targetStreak before targetNotes
      makeCorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('D4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('E4');

      // THEN: Game continues (streak met, but notes not met)
      expect(orch.getSnapshot().matches('playing')).toBe(true);
      expect(orch.getStats()).toMatchObject({
        correctCount: 3,
        currentStreak: 3
      });
    });

    it('allows practice when no targets set', () => {
      // GIVEN: Sandbox mode with NO targets, only session duration
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SANDBOX, {
        sandbox: {
          sessionDuration: 5,
          targetNotes: undefined,
          targetAccuracy: undefined,
          targetStreak: undefined
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Make multiple correct guesses
      makeCorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('D4');

      // THEN: Game continues (no targets to complete)
      expect(orch.getSnapshot().matches('playing')).toBe(true);
      expect(orch.getStats()).toMatchObject({
        correctCount: 2,
        totalAttempts: 2
      });
    });
  });

  describe('Session Timer', () => {
    it('does not complete when targets are met (only timer expiration completes)', () => {
      // GIVEN: Sandbox mode with targetNotes: 1
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SANDBOX, {
        sandbox: {
          sessionDuration: 5,
          targetNotes: 1
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Reach target notes
      makeCorrectGuess('C4');

      // THEN: Game continues (only timer expiration completes the game)
      expect(orch.getSnapshot().matches('playing')).toBe(true);
      expect(orch.getStats()).toMatchObject({
        correctCount: 1
      });
    });

    it('timer configuration is passed correctly for countdown mode', async () => {
      // GIVEN: Sandbox mode with 5 second duration
      orch = new GameOrchestrator();
      orch.start();

      // Use applySettings to properly configure timer (like production code does)
      orch.applySettings(
        'sandbox',
        { sandbox: { sessionDuration: 5 / 60 } }, // 5 seconds in minutes
        {},
        0.5,
        null,
        0,
        () => {}, // onTimerUpdate
        () => {}  // onSessionTimerUpdate
      );

      // WHEN: Start game
      orch.startGame();

      // Wait for timer to update (timers update every 100ms)
      await new Promise(resolve => setTimeout(resolve, 150));

      // THEN: Timer should be counting down from 5 seconds
      const initialTime = orch.getStats().elapsedTime;
      expect(initialTime).toBeGreaterThan(0);
      expect(initialTime).toBeLessThanOrEqual(5);

      // Wait 500ms
      await new Promise(resolve => setTimeout(resolve, 500));

      // THEN: Timer should have decreased
      const timeAfter500ms = orch.getStats().elapsedTime;
      expect(timeAfter500ms).toBeLessThan(initialTime);
    });

    it('game completes automatically when timer reaches 0', async () => {
      // GIVEN: Sandbox mode with very short duration (0.5 seconds)
      orch = new GameOrchestrator();
      orch.start();

      // Listen for sessionComplete event
      let sessionCompleteEmitted = false;
      orch.on('sessionComplete', () => {
        sessionCompleteEmitted = true;
      });

      // Use applySettings to properly configure timer
      orch.applySettings(
        'sandbox',
        { sandbox: { sessionDuration: 0.5 / 60 } }, // 0.5 seconds in minutes
        {},
        0.5,
        null,
        0,
        () => {},
        () => {}
      );

      // WHEN: Start game and wait for timer to expire
      orch.startGame();
      expect(orch.getSnapshot().matches('playing')).toBe(true);

      // Wait for timer to reach 0 (add extra buffer for timer updates)
      await new Promise(resolve => setTimeout(resolve, 800)); // Wait 800ms

      // THEN: State machine should be in COMPLETED state
      expect(orch.getSnapshot().matches('completed')).toBe(true);

      // AND: sessionComplete event should have been emitted
      expect(sessionCompleteEmitted).toBe(true);
    });
  });

  describe('Pause/Resume', () => {
    it('preserves state when paused during waiting_input', () => {
      // GIVEN: Sandbox mode in progress
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SANDBOX, {
        sandbox: {
          sessionDuration: 5,
          targetNotes: 5
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      makeCorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('D4');

      const statsBeforePause = orch.getStats();

      // WHEN: Pause the game
      orch.pause();
      expect(orch.getSnapshot().matches('paused')).toBe(true);

      // THEN: Stats are preserved
      expect(orch.getStats()).toMatchObject(statsBeforePause);

      // Resume and verify state
      orch.resume();
      expect(orch.getSnapshot().matches('playing')).toBe(true);
      expect(orch.getStats()).toMatchObject(statsBeforePause);
    });

    it('preserves stats across multiple pauses', () => {
      // GIVEN: Sandbox mode
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SANDBOX, {
        sandbox: {
          sessionDuration: 5,
          targetNotes: 5
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Make guess, pause, resume, make another guess
      makeCorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      orch.pause();
      orch.resume();
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('D4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      orch.pause();
      orch.resume();
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('E4');

      // THEN: Stats are accurate across pauses
      expect(orch.getSnapshot().matches('playing')).toBe(true);
      expect(orch.getStats()).toMatchObject({
        correctCount: 3,
        totalAttempts: 3,
        currentStreak: 3
      });
    });
  });

  describe('Play Again', () => {
    it('resets stats on play again', () => {
      // GIVEN: Completed sandbox session
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SANDBOX, {
        sandbox: {
          sessionDuration: 5,
          targetNotes: 3
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      makeCorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('D4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('E4');

      // Manually complete for testing
      orch.complete();
      expect(orch.getSnapshot().matches('completed')).toBe(true);

      // WHEN: Play again
      orch.playAgain();

      // THEN: Stats reset and game ready to start
      expect(orch.getSnapshot().matches('playing')).toBe(true);
      expect(orch.getStats()).toMatchObject({
        correctCount: 0,
        totalAttempts: 0,
        currentStreak: 0,
        longestStreak: 0
      });
    });
  });
});
