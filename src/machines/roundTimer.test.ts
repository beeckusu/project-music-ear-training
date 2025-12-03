/**
 * Round Timer Integration Tests
 *
 * Tests the round timer behavior in the game state machine:
 * - Timer resets to 3s on new rounds
 * - Timer preserves state when pausing/resuming
 * - Timer triggers timeout behavior at 0
 * - Timer continues on incorrect guess
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createActor } from 'xstate';
import { gameStateMachine } from './gameStateMachine';
import { SessionState, RoundState, GameAction } from './types';

describe('Round Timer Integration Tests', () => {
  let actor: ReturnType<typeof createActor<typeof gameStateMachine>>;

  beforeEach(() => {
    vi.useFakeTimers();
    actor = createActor(gameStateMachine, {
      input: {
        timerConfig: {
          initialTime: 0,
          direction: 'up' as const,
        },
        roundTimerConfig: {
          initialTime: 3,
          direction: 'down' as const,
        },
      },
    });
    actor.start();
  });

  afterEach(() => {
    actor.stop();
    vi.useRealTimers();
  });

  describe('Timer Reset Behavior', () => {
    it('should reset round timer to 3s when starting a new game', () => {
      // Start game
      actor.send({ type: GameAction.START_GAME });

      // Check that we're in WAITING_INPUT
      expect(actor.getSnapshot().matches({
        [SessionState.PLAYING]: RoundState.WAITING_INPUT
      })).toBe(true);

      // Timer should be reset to initial time (3s)
      expect(actor.getSnapshot().context.roundTimeRemaining).toBe(3);
    });

    it('should reset round timer to 3s when advancing to next round', () => {
      // Start game
      actor.send({ type: GameAction.START_GAME });

      // Advance time to reduce timer
      vi.advanceTimersByTime(1500); // 1.5 seconds

      // Transition to intermission (simulate correct guess)
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });
      actor.send({ type: GameAction.CORRECT_GUESS });

      // Verify we're in intermission
      expect(actor.getSnapshot().matches({
        [SessionState.PLAYING]: RoundState.TIMEOUT_INTERMISSION
      })).toBe(true);

      // Advance to next round
      actor.send({ type: GameAction.ADVANCE_ROUND });

      // Verify we're back in WAITING_INPUT
      expect(actor.getSnapshot().matches({
        [SessionState.PLAYING]: RoundState.WAITING_INPUT
      })).toBe(true);

      // Timer should be reset to 3s
      expect(actor.getSnapshot().context.roundTimeRemaining).toBe(3);
    });
  });

  describe('Timer Pause/Resume Behavior', () => {
    it('should preserve timer value when pausing and resuming', () => {
      // Start game
      actor.send({ type: GameAction.START_GAME });

      // Let timer run for 1 second
      vi.advanceTimersByTime(1000);

      // Get timer value before pause (should be around 2s)
      const timerBeforePause = actor.getSnapshot().context.roundTimeRemaining;
      expect(timerBeforePause).toBeGreaterThan(1.9);
      expect(timerBeforePause).toBeLessThan(2.1);

      // Pause the game
      actor.send({ type: GameAction.PAUSE });

      // Verify we're paused
      expect(actor.getSnapshot().matches(SessionState.PAUSED)).toBe(true);

      // Timer should be stopped (not counting down)
      const timerWhilePaused = actor.getSnapshot().context.roundTimeRemaining;

      // Advance time while paused
      vi.advanceTimersByTime(5000);

      // Timer should remain unchanged
      expect(actor.getSnapshot().context.roundTimeRemaining).toBe(timerWhilePaused);

      // Resume the game
      actor.send({ type: GameAction.RESUME });

      // Verify we're back in WAITING_INPUT
      expect(actor.getSnapshot().matches({
        [SessionState.PLAYING]: RoundState.WAITING_INPUT
      })).toBe(true);

      // Timer should be close to the value before pause
      const timerAfterResume = actor.getSnapshot().context.roundTimeRemaining;
      expect(timerAfterResume).toBeCloseTo(timerBeforePause, 1);
    });

    it('should continue countdown after resume', () => {
      // Start game
      actor.send({ type: GameAction.START_GAME });

      // Run for 0.5 seconds
      vi.advanceTimersByTime(500);

      // Pause
      actor.send({ type: GameAction.PAUSE });
      const timerAtPause = actor.getSnapshot().context.roundTimeRemaining;

      // Resume
      actor.send({ type: GameAction.RESUME });

      // Run for another 0.5 seconds
      vi.advanceTimersByTime(500);

      // Timer should have counted down 1 second total
      const expectedTime = 3 - 1; // 3s initial - 1s elapsed
      expect(actor.getSnapshot().context.roundTimeRemaining).toBeCloseTo(expectedTime, 1);
    });
  });

  describe('Timer Timeout Behavior', () => {
    it('should transition to TIMEOUT_INTERMISSION when timer reaches 0', () => {
      // Start game
      actor.send({ type: GameAction.START_GAME });

      // Verify we start in WAITING_INPUT
      expect(actor.getSnapshot().matches({
        [SessionState.PLAYING]: RoundState.WAITING_INPUT
      })).toBe(true);

      // Advance time past the 3 second limit
      vi.advanceTimersByTime(3100);

      // Should transition to TIMEOUT_INTERMISSION
      expect(actor.getSnapshot().matches({
        [SessionState.PLAYING]: RoundState.TIMEOUT_INTERMISSION
      })).toBe(true);

      // Total attempts should be incremented
      expect(actor.getSnapshot().context.totalAttempts).toBe(1);

      // Streak should be reset
      expect(actor.getSnapshot().context.currentStreak).toBe(0);
    });

    it('should have timer at 0 after timeout', () => {
      // Start game
      actor.send({ type: GameAction.START_GAME });

      // Run timer to completion
      vi.advanceTimersByTime(3100);

      // Timer should be at or very close to 0
      expect(actor.getSnapshot().context.roundTimeRemaining).toBeLessThanOrEqual(0.1);
    });
  });

  describe('Timer Behavior on Incorrect Guess', () => {
    it('should continue timer countdown after incorrect guess', () => {
      // Start game
      actor.send({ type: GameAction.START_GAME });

      // Let timer run for 1 second
      vi.advanceTimersByTime(1000);

      // Make a guess (which will be marked incorrect)
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });
      actor.send({ type: GameAction.INCORRECT_GUESS });

      // Should be back in WAITING_INPUT
      expect(actor.getSnapshot().matches({
        [SessionState.PLAYING]: RoundState.WAITING_INPUT
      })).toBe(true);

      // Timer should NOT be reset - should be around 2s
      const timerAfterIncorrect = actor.getSnapshot().context.roundTimeRemaining;
      expect(timerAfterIncorrect).toBeGreaterThan(1.9);
      expect(timerAfterIncorrect).toBeLessThan(2.1);

      // Timer should continue counting down
      vi.advanceTimersByTime(1000);
      expect(actor.getSnapshot().context.roundTimeRemaining).toBeGreaterThan(0.9);
      expect(actor.getSnapshot().context.roundTimeRemaining).toBeLessThan(1.1);
    });

    it('should allow multiple incorrect guesses with same timer', () => {
      // Start game
      actor.send({ type: GameAction.START_GAME });

      // First incorrect guess at 2.5s remaining
      vi.advanceTimersByTime(500);
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });
      actor.send({ type: GameAction.INCORRECT_GUESS });

      const timerAfterFirst = actor.getSnapshot().context.roundTimeRemaining;
      expect(timerAfterFirst).toBeGreaterThan(2.4);
      expect(timerAfterFirst).toBeLessThan(2.6);

      // Second incorrect guess at ~2s remaining
      vi.advanceTimersByTime(500);
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'D' });
      actor.send({ type: GameAction.INCORRECT_GUESS });

      const timerAfterSecond = actor.getSnapshot().context.roundTimeRemaining;
      expect(timerAfterSecond).toBeGreaterThan(1.9);
      expect(timerAfterSecond).toBeLessThan(2.1);

      // Timer should still be running
      expect(actor.getSnapshot().matches({
        [SessionState.PLAYING]: RoundState.WAITING_INPUT
      })).toBe(true);
    });
  });

  describe('Timer Behavior on Correct Guess', () => {
    it('should pause timer when transitioning to intermission after correct guess', () => {
      // Start game
      actor.send({ type: GameAction.START_GAME });

      // Let timer run down
      vi.advanceTimersByTime(1000);

      // Make correct guess
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });
      actor.send({ type: GameAction.CORRECT_GUESS });

      // Should be in TIMEOUT_INTERMISSION
      expect(actor.getSnapshot().matches({
        [SessionState.PLAYING]: RoundState.TIMEOUT_INTERMISSION
      })).toBe(true);

      // Get timer value in intermission
      const timerInIntermission = actor.getSnapshot().context.roundTimeRemaining;

      // Advance time while in intermission
      vi.advanceTimersByTime(2000);

      // Timer should be paused (not counting down)
      expect(actor.getSnapshot().context.roundTimeRemaining).toBe(timerInIntermission);
    });
  });

  describe('Timer State Transitions', () => {
    it('should maintain correct timer state through complete round cycle', () => {
      // 1. Start game - timer resets to 3s
      actor.send({ type: GameAction.START_GAME });
      expect(actor.getSnapshot().context.roundTimeRemaining).toBe(3);

      // 2. Timer counts down
      vi.advanceTimersByTime(1000);
      expect(actor.getSnapshot().context.roundTimeRemaining).toBeGreaterThan(1.9);
      expect(actor.getSnapshot().context.roundTimeRemaining).toBeLessThan(2.1);

      // 3. Correct guess - timer pauses
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });
      actor.send({ type: GameAction.CORRECT_GUESS });
      const timerAtCorrect = actor.getSnapshot().context.roundTimeRemaining;

      vi.advanceTimersByTime(500);
      expect(actor.getSnapshot().context.roundTimeRemaining).toBe(timerAtCorrect);

      // 4. Advance round - timer resets to 3s
      actor.send({ type: GameAction.ADVANCE_ROUND });
      expect(actor.getSnapshot().context.roundTimeRemaining).toBe(3);

      // 5. Timer counts down again
      vi.advanceTimersByTime(500);
      expect(actor.getSnapshot().context.roundTimeRemaining).toBeGreaterThan(2.4);
      expect(actor.getSnapshot().context.roundTimeRemaining).toBeLessThan(2.6);
    });

    it('should handle pause/resume in the middle of round cycle', () => {
      // Start game
      actor.send({ type: GameAction.START_GAME });

      // Run for 0.5s
      vi.advanceTimersByTime(500);

      // Pause
      actor.send({ type: GameAction.PAUSE });
      const timerAtPause = actor.getSnapshot().context.roundTimeRemaining;

      // Time passes while paused
      vi.advanceTimersByTime(1000);

      // Resume
      actor.send({ type: GameAction.RESUME });

      // Timer should be preserved
      expect(actor.getSnapshot().context.roundTimeRemaining).toBeCloseTo(timerAtPause, 1);

      // Continue to incorrect guess
      actor.send({ type: GameAction.MAKE_GUESS, guessedNote: 'C' });
      actor.send({ type: GameAction.INCORRECT_GUESS });

      // Timer should continue from where it was
      vi.advanceTimersByTime(500);
      expect(actor.getSnapshot().context.roundTimeRemaining).toBeGreaterThan(1.9);
      expect(actor.getSnapshot().context.roundTimeRemaining).toBeLessThan(2.1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle pause immediately after game start', () => {
      actor.send({ type: GameAction.START_GAME });

      // Pause immediately
      actor.send({ type: GameAction.PAUSE });

      const timerAtPause = actor.getSnapshot().context.roundTimeRemaining;
      expect(timerAtPause).toBeCloseTo(3, 0.5);

      // Resume
      actor.send({ type: GameAction.RESUME });

      expect(actor.getSnapshot().context.roundTimeRemaining).toBeCloseTo(timerAtPause, 0.5);
    });

    it('should handle rapid pause/resume cycles', () => {
      actor.send({ type: GameAction.START_GAME });

      // Multiple pause/resume cycles
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(200);
        actor.send({ type: GameAction.PAUSE });
        vi.advanceTimersByTime(100);
        actor.send({ type: GameAction.RESUME });
      }

      // Timer should have counted down only for the non-paused periods (~600ms)
      const expectedTime = 3 - 0.6;
      expect(actor.getSnapshot().context.roundTimeRemaining).toBeGreaterThan(expectedTime - 0.5);
      expect(actor.getSnapshot().context.roundTimeRemaining).toBeLessThan(expectedTime + 0.5);
    });

    it('should handle timeout while paused scenario', () => {
      actor.send({ type: GameAction.START_GAME });

      // Run timer almost to 0
      vi.advanceTimersByTime(2900);

      // Pause with very little time left
      actor.send({ type: GameAction.PAUSE });

      const timerAtPause = actor.getSnapshot().context.roundTimeRemaining;
      expect(timerAtPause).toBeGreaterThan(0);
      expect(timerAtPause).toBeLessThan(0.2);

      // Resume
      actor.send({ type: GameAction.RESUME });

      // Should timeout very quickly
      vi.advanceTimersByTime(200);

      expect(actor.getSnapshot().matches({
        [SessionState.PLAYING]: RoundState.TIMEOUT_INTERMISSION
      })).toBe(true);
    });
  });
});
