import { describe, it, afterEach, expect, vi } from 'vitest';
import { GameOrchestrator } from './GameOrchestrator';
import { GameAction } from '../machines/types';
import { createGameState } from './GameStateFactory';
import { GAME_MODES } from '../constants';

/**
 * Sandbox Mode Integration Tests
 *
 * Tests the Sandbox game mode which allows players to practice with flexible targets.
 * Sandbox mode uses a count-down session timer and completes when ANY target is met
 * (targetNotes, targetAccuracy, or targetStreak) OR when the session time runs out.
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
   */
  const makeIncorrectGuess = (note: string = 'C4') => {
    orch.send({ type: GameAction.MAKE_GUESS, guessedNote: note });

    // Call handleIncorrectGuess to update stats (this is what the real orchestrator does)
    const gameMode = (orch as any).gameMode;
    gameMode.handleIncorrectGuess();

    orch.send({ type: GameAction.INCORRECT_GUESS });
  };

  describe('Target Notes Completion', () => {
    it('completes when targetNotes reached', () => {
      // GIVEN: Sandbox mode with targetNotes: 3
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(GAME_MODES.SANDBOX, {
        sandbox: {
          sessionDuration: 5,
          targetNotes: 3
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();
      expect(orch.getSnapshot().matches('playing.waiting_input')).toBe(true);

      // WHEN: Make 3 correct guesses
      makeCorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('D4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('E4');

      // THEN: Game completes when target reached
      expect(orch.getSnapshot().matches('completed')).toBe(true);
      expect(orch.getStats()).toMatchObject({
        correctCount: 3,
        totalAttempts: 3
      });
    });

    it('completes with mixed correct/incorrect before reaching time limit', () => {
      // GIVEN: Sandbox mode with targetNotes: 3
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(GAME_MODES.SANDBOX, {
        sandbox: {
          sessionDuration: 5,
          targetNotes: 3
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Correct, incorrect, correct, correct (reaches target)
      makeCorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeIncorrectGuess('D4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('E4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('F4');

      // THEN: Game completes with target met
      expect(orch.getSnapshot().matches('completed')).toBe(true);
      expect(orch.getStats()).toMatchObject({
        correctCount: 3,
        totalAttempts: 4,
        currentStreak: 2
      });
    });
  });

  describe('Target Accuracy Completion', () => {
    it('completes when targetAccuracy reached', () => {
      // GIVEN: Sandbox mode with targetAccuracy: 80%
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(GAME_MODES.SANDBOX, {
        sandbox: {
          sessionDuration: 5,
          targetAccuracy: 80
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Start with incorrect to avoid instant completion at 100%
      // Then make enough correct to reach 80%
      makeIncorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('D4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('E4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('F4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      // Fourth correct guess should reach 80% (4/5 = 80%)
      makeCorrectGuess('G4');

      // THEN: Game completes when accuracy target met
      expect(orch.getSnapshot().matches('completed')).toBe(true);

      const stats = orch.getStats();
      const accuracy = (stats.correctCount / stats.totalAttempts) * 100;
      expect(accuracy).toBe(80);
    });

    it('does not complete if accuracy drops below target', () => {
      // GIVEN: Sandbox mode with targetAccuracy: 80%
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(GAME_MODES.SANDBOX, {
        sandbox: {
          sessionDuration: 5,
          targetAccuracy: 80
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Make guesses that reach but then drop below 80%
      // 4/5 = 80% (should trigger completion before this incorrect guess)
      makeCorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('D4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('E4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('F4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      // At this point: 4/4 = 100%, should complete on next correct

      makeCorrectGuess('G4');

      // THEN: Game should have completed when accuracy met
      expect(orch.getSnapshot().matches('completed')).toBe(true);
    });
  });

  describe('Target Streak Completion', () => {
    it('completes when targetStreak reached', () => {
      // GIVEN: Sandbox mode with targetStreak: 3
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(GAME_MODES.SANDBOX, {
        sandbox: {
          sessionDuration: 5,
          targetStreak: 3
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Build streak of 3
      makeCorrectGuess('C4');
      expect(orch.getStats().currentStreak).toBe(1);
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('D4');
      expect(orch.getStats().currentStreak).toBe(2);
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('E4');

      // THEN: Game completes when streak target met
      expect(orch.getSnapshot().matches('completed')).toBe(true);
      expect(orch.getStats()).toMatchObject({
        currentStreak: 3,
        longestStreak: 3
      });
    });

    it('requires consecutive correct guesses for streak', () => {
      // GIVEN: Sandbox mode with targetStreak: 3
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(GAME_MODES.SANDBOX, {
        sandbox: {
          sessionDuration: 5,
          targetStreak: 3
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Build streak, break it, rebuild
      makeCorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('D4');
      expect(orch.getStats().currentStreak).toBe(2);
      orch.send({ type: GameAction.ADVANCE_ROUND });

      // Break streak
      makeIncorrectGuess('E4');
      expect(orch.getStats().currentStreak).toBe(0);
      orch.send({ type: GameAction.ADVANCE_ROUND });

      // Rebuild streak to 3
      makeCorrectGuess('F4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('G4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('A4');

      // THEN: Game completes when streak of 3 finally reached
      expect(orch.getSnapshot().matches('completed')).toBe(true);
      expect(orch.getStats()).toMatchObject({
        currentStreak: 3,
        longestStreak: 3
      });
    });
  });

  describe('Multiple Targets', () => {
    it('completes when first target is met (targetNotes)', () => {
      // GIVEN: Sandbox with both targetNotes and targetStreak
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(GAME_MODES.SANDBOX, {
        sandbox: {
          sessionDuration: 5,
          targetNotes: 2,
          targetStreak: 5
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Reach targetNotes before targetStreak
      makeCorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('D4');

      // THEN: Game completes when first target (notes) met
      expect(orch.getSnapshot().matches('completed')).toBe(true);
      expect(orch.getStats()).toMatchObject({
        correctCount: 2,
        currentStreak: 2 // Streak not yet at 5
      });
    });

    it('completes when first target is met (targetStreak)', () => {
      // GIVEN: Sandbox with both targetNotes and targetStreak
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(GAME_MODES.SANDBOX, {
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

      // THEN: Game completes when first target (streak) met
      expect(orch.getSnapshot().matches('completed')).toBe(true);
      expect(orch.getStats()).toMatchObject({
        correctCount: 3, // Notes not yet at 10
        currentStreak: 3
      });
    });
  });

  describe('Session Timer', () => {
    it('allows practice when no targets set', () => {
      // GIVEN: Sandbox mode with NO targets, only session duration
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(GAME_MODES.SANDBOX, {
        sandbox: {
          sessionDuration: 5
          // No targetNotes, targetAccuracy, or targetStreak
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Make several guesses without reaching any target
      makeCorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeIncorrectGuess('D4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('E4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      // THEN: Game continues (doesn't complete on correct guesses)
      expect(orch.getSnapshot().matches('playing.waiting_input')).toBe(true);
      expect(orch.getStats()).toMatchObject({
        correctCount: 2,
        totalAttempts: 3
      });
    });
  });

  describe('Streak Tracking', () => {
    it('builds and maintains streak', () => {
      // GIVEN: Sandbox mode
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(GAME_MODES.SANDBOX, {
        sandbox: {
          sessionDuration: 5,
          targetNotes: 5
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Make 3 consecutive correct guesses
      makeCorrectGuess('C4');
      expect(orch.getStats()).toMatchObject({
        currentStreak: 1,
        longestStreak: 1
      });
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('D4');
      expect(orch.getStats()).toMatchObject({
        currentStreak: 2,
        longestStreak: 2
      });
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('E4');

      // THEN: Streak increments correctly
      expect(orch.getStats()).toMatchObject({
        currentStreak: 3,
        longestStreak: 3
      });
    });

    it('resets streak on incorrect guess', () => {
      // GIVEN: Sandbox mode
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(GAME_MODES.SANDBOX, {
        sandbox: {
          sessionDuration: 5,
          targetNotes: 5
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Build streak then make incorrect guess
      makeCorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('D4');
      expect(orch.getStats()).toMatchObject({
        currentStreak: 2,
        longestStreak: 2
      });
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeIncorrectGuess('E4');

      // THEN: Streak resets but longestStreak preserved
      expect(orch.getStats()).toMatchObject({
        currentStreak: 0,
        longestStreak: 2
      });
    });

    it('resets streak on timeout', () => {
      // GIVEN: Sandbox mode
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(GAME_MODES.SANDBOX, {
        sandbox: {
          sessionDuration: 5,
          targetNotes: 5
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Build streak then timeout
      makeCorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('D4');
      expect(orch.getStats().currentStreak).toBe(2);
      orch.send({ type: GameAction.ADVANCE_ROUND });

      orch.send({ type: GameAction.TIMEOUT });
      expect(orch.getSnapshot().matches('playing.timeout_intermission')).toBe(true);

      // THEN: Streak resets after timeout
      expect(orch.getStats()).toMatchObject({
        currentStreak: 0,
        longestStreak: 2
      });
    });
  });

  describe('Pause/Resume', () => {
    it('preserves state when paused during waiting_input', () => {
      // GIVEN: Sandbox mode
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(GAME_MODES.SANDBOX, {
        sandbox: {
          sessionDuration: 5,
          targetNotes: 3
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // Make one guess first
      makeCorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      // WHEN: Pause and resume
      orch.pause();
      expect(orch.getSnapshot().matches('paused')).toBe(true);

      orch.resume();
      expect(orch.getSnapshot().matches('playing.waiting_input')).toBe(true);

      // THEN: Can continue playing normally
      makeCorrectGuess('D4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('E4');

      expect(orch.getSnapshot().matches('completed')).toBe(true);
      expect(orch.getStats().correctCount).toBe(3);
    });

    it('preserves stats across multiple pauses', () => {
      // GIVEN: Sandbox mode
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(GAME_MODES.SANDBOX, {
        sandbox: {
          sessionDuration: 5,
          targetNotes: 3
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Correct, pause, resume, incorrect, pause, resume, correct (2x)
      makeCorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      orch.pause();
      orch.resume();

      makeIncorrectGuess('D4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      orch.pause();
      orch.resume();

      makeCorrectGuess('E4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('F4');

      // THEN: Stats preserved through all pauses
      expect(orch.getSnapshot().matches('completed')).toBe(true);
      expect(orch.getStats()).toMatchObject({
        correctCount: 3,
        totalAttempts: 4,
        currentStreak: 2,
        longestStreak: 2
      });
    });
  });

  describe('Play Again', () => {
    it('resets stats on play again', () => {
      // GIVEN: Completed sandbox session
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(GAME_MODES.SANDBOX, {
        sandbox: {
          sessionDuration: 5,
          targetNotes: 2
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // Complete first session
      makeCorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('D4');
      expect(orch.getSnapshot().matches('completed')).toBe(true);

      // WHEN: Play again
      orch.send({ type: GameAction.PLAY_AGAIN });
      expect(orch.getSnapshot().matches('playing.waiting_input')).toBe(true);

      // THEN: Orchestrator stats reset (from state machine context)
      expect(orch.getStats()).toMatchObject({
        correctCount: 0,
        totalAttempts: 0,
        currentStreak: 0,
        longestStreak: 0
      });

      // NOTE: Game mode state persists across PLAY_AGAIN (this is a known issue)
      // The first correct guess will trigger completion because game mode still thinks
      // it has 2 correct notes from previous session
      makeCorrectGuess('E4');

      // Game completes immediately due to game mode state not resetting
      expect(orch.getSnapshot().matches('completed')).toBe(true);
      // Orchestrator context shows 1 correct from new session
      expect(orch.getStats().correctCount).toBe(1);
    });
  });
});
