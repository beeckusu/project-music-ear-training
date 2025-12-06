import { describe, it, afterEach, expect, vi } from 'vitest';
import { GameOrchestrator } from './GameOrchestrator';
import { GameAction } from '../machines/types';
import { createGameState } from './GameStateFactory';
import { EAR_TRAINING_SUB_MODES } from '../constants';

/**
 * Survival Mode Integration Tests
 *
 * Tests the Survival game mode which challenges players to survive for a duration
 * while managing their health. Survival mode has:
 * - Health that drains continuously over time
 * - Correct guesses restore health
 * - Incorrect guesses deal damage
 * - Win condition: survive until session timer reaches 0
 * - Lose condition: health reaches 0
 */
describe('Survival Mode Integration Tests', () => {
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
   * Helper function to make an incorrect guess and handle game over
   *
   * NOTE: This pattern is also available in ../test/gameTestUtils.ts as:
   * makeIncorrectGuess(orch, note) for reuse across test files
   */
  const makeIncorrectGuess = (note: string = 'C4') => {
    orch.send({ type: GameAction.MAKE_GUESS, guessedNote: note });

    // Call handleIncorrectGuess to update stats (this is what the real orchestrator does)
    const gameMode = (orch as any).gameMode;
    const result = gameMode.handleIncorrectGuess();

    orch.send({ type: GameAction.INCORRECT_GUESS });

    // Check if game over (health depleted)
    if (result.gameCompleted) {
      orch.complete();
    }
  };

  describe('Health System', () => {
    it('starts with full health', () => {
      // GIVEN: Survival mode
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SURVIVAL, {
        survival: {
          sessionDuration: 5,
          healthDrainRate: 1,
          healthRecovery: 10,
          healthDamage: 20
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // THEN: Health starts at 100
      const gameMode = (orch as any).gameMode;
      expect(gameMode.health).toBe(100);
      expect(gameMode.maxHealth).toBe(100);
    });

    it('recovers health on correct guess', () => {
      // GIVEN: Survival mode with healthRecovery: 15
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SURVIVAL, {
        survival: {
          sessionDuration: 5,
          healthDrainRate: 0, // Disable drain for this test
          healthRecovery: 15,
          healthDamage: 20
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // Set health to 50 to test recovery
      const gameMode = (orch as any).gameMode;
      gameMode.health = 50;

      // WHEN: Make correct guess
      makeCorrectGuess('C4');

      // THEN: Health recovers by healthRecovery amount
      expect(gameMode.health).toBe(65); // 50 + 15
    });

    it('caps health at maxHealth', () => {
      // GIVEN: Survival mode
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SURVIVAL, {
        survival: {
          sessionDuration: 5,
          healthDrainRate: 0,
          healthRecovery: 30,
          healthDamage: 20
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // Set health to 90
      const gameMode = (orch as any).gameMode;
      gameMode.health = 90;

      // WHEN: Make correct guess (would recover to 120)
      makeCorrectGuess('C4');

      // THEN: Health capped at maxHealth (100)
      expect(gameMode.health).toBe(100);
    });

    it('loses health on incorrect guess', () => {
      // GIVEN: Survival mode with healthDamage: 25
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SURVIVAL, {
        survival: {
          sessionDuration: 5,
          healthDrainRate: 0,
          healthRecovery: 10,
          healthDamage: 25
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      const gameMode = (orch as any).gameMode;
      const initialHealth = gameMode.health;

      // WHEN: Make incorrect guess
      makeIncorrectGuess('C4');

      // THEN: Health reduced by healthDamage amount
      expect(gameMode.health).toBe(initialHealth - 25);
    });
  });

  describe('Game Over Conditions', () => {
    it('completes when health reaches zero', () => {
      // GIVEN: Survival mode with high damage
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SURVIVAL, {
        survival: {
          sessionDuration: 5,
          healthDrainRate: 0,
          healthRecovery: 10,
          healthDamage: 100 // One-shot damage
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Make incorrect guess (depletes all health)
      makeIncorrectGuess('C4');

      // THEN: Game over
      expect(orch.getSnapshot().matches('completed')).toBe(true);
      const gameMode = (orch as any).gameMode;
      expect(gameMode.health).toBe(0);
      expect(gameMode.isVictory).toBe(false);
    });

    it('allows multiple incorrect guesses before death', () => {
      // GIVEN: Survival mode
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SURVIVAL, {
        survival: {
          sessionDuration: 5,
          healthDrainRate: 0,
          healthRecovery: 10,
          healthDamage: 30 // 30 damage per incorrect
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Make 3 incorrect guesses (90 total damage)
      makeIncorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeIncorrectGuess('D4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeIncorrectGuess('E4');

      // THEN: Still alive with 10 HP
      const gameMode = (orch as any).gameMode;
      expect(gameMode.health).toBe(10);
      // After incorrect guess, we're in playing state (not intermission)
      expect(orch.getSnapshot().matches('playing')).toBe(true);

      // Fourth incorrect guess kills
      orch.send({ type: GameAction.ADVANCE_ROUND });
      makeIncorrectGuess('F4');

      expect(orch.getSnapshot().matches('completed')).toBe(true);
      expect(gameMode.health).toBe(0);
    });

    it('continues game with correct guesses maintaining health', () => {
      // GIVEN: Survival mode
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SURVIVAL, {
        survival: {
          sessionDuration: 5,
          healthDrainRate: 0,
          healthRecovery: 20,
          healthDamage: 15
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Mix of correct and incorrect guesses
      makeCorrectGuess('C4'); // 100 HP (capped at max)
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeIncorrectGuess('D4'); // 85 HP (100 - 15)
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('E4'); // 105 HP -> 100 HP (capped)
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('F4'); // 100 HP (already at max)

      // THEN: Still playing with full health
      const gameMode = (orch as any).gameMode;
      expect(gameMode.health).toBe(100);
      expect(orch.getSnapshot().matches('playing')).toBe(true);
    });
  });

  describe('Streak Tracking', () => {
    it('builds streak with correct guesses', () => {
      // GIVEN: Survival mode
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SURVIVAL, {
        survival: {
          sessionDuration: 5,
          healthDrainRate: 0,
          healthRecovery: 10,
          healthDamage: 20
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

      // THEN: Streak continues to build
      expect(orch.getStats()).toMatchObject({
        currentStreak: 3,
        longestStreak: 3
      });
    });

    it('resets streak on incorrect guess', () => {
      // GIVEN: Survival mode
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SURVIVAL, {
        survival: {
          sessionDuration: 5,
          healthDrainRate: 0,
          healthRecovery: 10,
          healthDamage: 20
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Build streak then make incorrect guess
      makeCorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('D4');
      expect(orch.getStats().currentStreak).toBe(2);
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeIncorrectGuess('E4');

      // THEN: Streak resets but longestStreak preserved
      expect(orch.getStats()).toMatchObject({
        currentStreak: 0,
        longestStreak: 2
      });
    });

    it('resets streak on timeout', () => {
      // GIVEN: Survival mode
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SURVIVAL, {
        survival: {
          sessionDuration: 5,
          healthDrainRate: 0,
          healthRecovery: 10,
          healthDamage: 20
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

      // THEN: Streak resets
      expect(orch.getStats()).toMatchObject({
        currentStreak: 0,
        longestStreak: 2
      });
    });
  });

  describe('Stats Tracking', () => {
    it('tracks correct and incorrect attempts', () => {
      // GIVEN: Survival mode
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SURVIVAL, {
        survival: {
          sessionDuration: 5,
          healthDrainRate: 0,
          healthRecovery: 10,
          healthDamage: 20
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Mix of correct and incorrect guesses
      makeCorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('D4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeIncorrectGuess('E4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('F4');

      // THEN: Stats tracked correctly
      expect(orch.getStats()).toMatchObject({
        correctCount: 3,
        totalAttempts: 4
      });
    });
  });

  describe('Pause/Resume', () => {
    it('preserves state when paused during waiting_input', () => {
      // GIVEN: Survival mode
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SURVIVAL, {
        survival: {
          sessionDuration: 5,
          healthDrainRate: 0,
          healthRecovery: 10,
          healthDamage: 30
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // Make some guesses first
      makeCorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeIncorrectGuess('D4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      const gameMode = (orch as any).gameMode;
      const healthBeforePause = gameMode.health;

      // WHEN: Pause and resume
      orch.pause();
      expect(orch.getSnapshot().matches('paused')).toBe(true);

      orch.resume();
      expect(orch.getSnapshot().matches('playing.waiting_input')).toBe(true);

      // THEN: Health preserved, game continues normally
      expect(gameMode.health).toBe(healthBeforePause);

      makeCorrectGuess('E4');
      expect(gameMode.health).toBe(healthBeforePause + 10);
    });

    it('preserves stats across multiple pauses', () => {
      // GIVEN: Survival mode
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SURVIVAL, {
        survival: {
          sessionDuration: 5,
          healthDrainRate: 0,
          healthRecovery: 15,
          healthDamage: 25
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Correct, pause, resume, incorrect, pause, resume, correct
      makeCorrectGuess('C4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      orch.pause();
      orch.resume();

      makeIncorrectGuess('D4');
      orch.send({ type: GameAction.ADVANCE_ROUND });

      orch.pause();
      orch.resume();

      makeCorrectGuess('E4');

      // THEN: Stats preserved through all pauses
      expect(orch.getStats()).toMatchObject({
        correctCount: 2,
        totalAttempts: 3,
        currentStreak: 1,
        longestStreak: 1
      });

      const gameMode = (orch as any).gameMode;
      // Health: 100 + 15 (first correct) - 25 (incorrect) + 15 (second correct) = 90 + 15 = 105 -> 100 (capped)
      // But first correct doesn't add to 100 since it's already at max, so: 100 - 25 + 15 = 90
      expect(gameMode.health).toBe(90);
    });
  });

  describe('Edge Cases', () => {
    it('prevents health from going negative', () => {
      // GIVEN: Survival mode with massive damage
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SURVIVAL, {
        survival: {
          sessionDuration: 5,
          healthDrainRate: 0,
          healthRecovery: 10,
          healthDamage: 500 // Way more than max health
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Take massive damage
      makeIncorrectGuess('C4');

      // THEN: Health clamped at 0, not negative
      const gameMode = (orch as any).gameMode;
      expect(gameMode.health).toBe(0);
      expect(orch.getSnapshot().matches('completed')).toBe(true);
    });

    it('survives with 1 HP remaining', () => {
      // GIVEN: Survival mode
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SURVIVAL, {
        survival: {
          sessionDuration: 5,
          healthDrainRate: 0,
          healthRecovery: 10,
          healthDamage: 99 // Leaves exactly 1 HP
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      // WHEN: Take 99 damage
      makeIncorrectGuess('C4');

      // THEN: Still alive with 1 HP
      const gameMode = (orch as any).gameMode;
      expect(gameMode.health).toBe(1);
      expect(orch.getSnapshot().matches('playing')).toBe(true);

      // Can recover from 1 HP
      orch.send({ type: GameAction.ADVANCE_ROUND });
      makeCorrectGuess('D4');
      expect(gameMode.health).toBe(11);
    });

    it('handles rapid health fluctuations', () => {
      // GIVEN: Survival mode with volatile health changes
      orch = new GameOrchestrator();
      orch.start();

      const gameState = createGameState(EAR_TRAINING_SUB_MODES.SURVIVAL, {
        survival: {
          sessionDuration: 5,
          healthDrainRate: 0,
          healthRecovery: 40,
          healthDamage: 45
        }
      });
      orch.setGameMode(gameState);

      orch.startGame();

      const gameMode = (orch as any).gameMode;

      // WHEN: Alternating correct/incorrect rapidly
      // Start: 100
      makeIncorrectGuess('C4'); // 55
      expect(gameMode.health).toBe(55);
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('D4'); // 95
      expect(gameMode.health).toBe(95);
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeIncorrectGuess('E4'); // 50
      expect(gameMode.health).toBe(50);
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeCorrectGuess('F4'); // 90
      expect(gameMode.health).toBe(90);
      orch.send({ type: GameAction.ADVANCE_ROUND });

      makeIncorrectGuess('G4'); // 45
      expect(gameMode.health).toBe(45);

      // THEN: Health fluctuates correctly, still alive
      expect(orch.getSnapshot().matches('playing')).toBe(true);
    });
  });
});
