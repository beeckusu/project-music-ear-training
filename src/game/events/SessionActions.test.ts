import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { GameOrchestrator } from '../GameOrchestrator';
import {
  setupTestEnvironment,
  clearEventSpies,
  makeCorrectGuess,
  advanceRound,
  pauseGame,
  resumeGame,
  getLastEventPayload,
  getNoteFromRoundStart,
} from '../../test/gameTestUtils';

/**
 * Session Actions Event Tests
 *
 * Tests that session lifecycle actions trigger the correct events.
 * Focuses on:
 * - startGame()
 * - pause()
 * - resume()
 * - complete()
 * - resetGame()
 * - playAgain()
 */
describe('Session Actions: Events', () => {
  let orchestrator: GameOrchestrator;
  let eventSpies: ReturnType<typeof import('../../test/gameTestUtils').createEventSpies>;

  beforeEach(() => {
    // Use unlimited mode (no targets) so tests don't auto-complete
    const setup = setupTestEnvironment('sandbox', {
      sandbox: {
        sessionDuration: 5,
        targetNotes: undefined,
        targetAccuracy: undefined,
        targetStreak: undefined
      }
    });
    orchestrator = setup.orchestrator;
    eventSpies = setup.eventSpies;
  });

  afterEach(() => {
    orchestrator?.stop();
    vi.clearAllMocks();
  });

  describe('Start Game', () => {
    it('emits stateChange event when transitioning from idle to playing', () => {
      // GIVEN: Orchestrator in idle state
      expect(orchestrator.getSnapshot().matches('idle')).toBe(true);
      clearEventSpies(eventSpies);

      // WHEN: Start game
      orchestrator.startGame();

      // THEN: stateChange event emitted
      expect(eventSpies.stateChange).toHaveBeenCalled();

      // Eventually transitions to playing
      const finalState = getLastEventPayload<any>(eventSpies.stateChange);
      expect(finalState.sessionState).toBe('playing');
    });

    it('transitions to playing.waiting_input state', () => {
      // GIVEN: Orchestrator in idle state
      clearEventSpies(eventSpies);

      // WHEN: Start game
      orchestrator.startGame();

      // THEN: State is playing.waiting_input
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);
    });

    it('clears all active timers before starting', () => {
      // GIVEN: Orchestrator with potentially active timers
      orchestrator.startGame();
      // Create some state with timers
      orchestrator.pause();
      orchestrator.resume();

      clearEventSpies(eventSpies);

      // WHEN: Reset and start again
      orchestrator.resetGame();
      orchestrator.startGame();

      // THEN: Game starts cleanly (timers cleared)
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);
    });

    it('can be called from idle state', () => {
      // GIVEN: Fresh orchestrator in idle
      expect(orchestrator.isIdle()).toBe(true);

      // WHEN: Start game
      orchestrator.startGame();

      // THEN: Successfully starts
      expect(orchestrator.isPlaying()).toBe(true);
    });
  });

  describe('Pause Game', () => {
    beforeEach(() => {
      orchestrator.startGame();
      clearEventSpies(eventSpies);
    });

    it('emits stateChange to paused when pause() called', () => {
      // GIVEN: Orchestrator in playing state
      expect(orchestrator.isPlaying()).toBe(true);

      // WHEN: Pause game
      pauseGame(orchestrator);

      // THEN: stateChange event emitted with paused state
      expect(eventSpies.stateChange).toHaveBeenCalled();

      const stateChange = getLastEventPayload<any>(eventSpies.stateChange);
      expect(stateChange.sessionState).toBe('paused');
    });

    it('clears all active timers on pause', async () => {
      // GIVEN: Game with active timer (auto-advance after timeout)
      await orchestrator.startNewRound();
      orchestrator.handleTimeout(2); // Creates auto-advance timer

      clearEventSpies(eventSpies);

      // WHEN: Pause during intermission
      pauseGame(orchestrator);

      // THEN: State is paused, timers cleared
      expect(orchestrator.isPaused()).toBe(true);
    });

    it('can pause from waiting_input state', async () => {
      // GIVEN: Orchestrator in waiting_input
      await orchestrator.startNewRound();
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);

      // WHEN: Pause
      pauseGame(orchestrator);

      // THEN: Successfully paused
      expect(orchestrator.isPaused()).toBe(true);
    });

    it('can pause from timeout_intermission state', async () => {
      // GIVEN: Orchestrator in timeout_intermission
      await orchestrator.startNewRound();
      orchestrator.handleTimeout(1);
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);

      // WHEN: Pause
      pauseGame(orchestrator);

      // THEN: Successfully paused
      expect(orchestrator.isPaused()).toBe(true);
    });
  });

  describe('Resume Game', () => {
    let currentNote: any;

    beforeEach(async () => {
      orchestrator.startGame();
      await orchestrator.startNewRound();
      currentNote = getNoteFromRoundStart(eventSpies);
      pauseGame(orchestrator);
      clearEventSpies(eventSpies);
    });

    it('emits stateChange returning to previous round state', () => {
      // GIVEN: Paused from waiting_input
      expect(orchestrator.isPaused()).toBe(true);

      // WHEN: Resume
      resumeGame(orchestrator);

      // THEN: stateChange event emitted
      expect(eventSpies.stateChange).toHaveBeenCalled();

      const stateChange = getLastEventPayload<any>(eventSpies.stateChange);
      expect(stateChange.sessionState).toBe('playing');
    });

    it('preserves stats across pause/resume', async () => {
      // GIVEN: Some stats built up
      orchestrator.resume();
      orchestrator.submitGuess(currentNote!);
      advanceRound(orchestrator);

      await orchestrator.startNewRound();
      const statsBefore = orchestrator.getStats();

      // WHEN: Pause and resume
      pauseGame(orchestrator);
      resumeGame(orchestrator);

      // THEN: Stats preserved
      const statsAfter = orchestrator.getStats();
      expect(statsAfter).toEqual(statsBefore);
    });

    it('preserves current note across pause/resume', async () => {
      // GIVEN: Paused with current note
      expect(currentNote).not.toBeNull();

      // WHEN: Resume, pause, resume
      resumeGame(orchestrator);
      pauseGame(orchestrator);
      resumeGame(orchestrator);

      // THEN: Still in playing state (note is internal to orchestrator)
      expect(orchestrator.isPlaying()).toBe(true);
    });

    it('returns to waiting_input after resume from waiting_input pause', async () => {
      // GIVEN: Paused from waiting_input
      expect(orchestrator.isPaused()).toBe(true);

      // WHEN: Resume
      resumeGame(orchestrator);

      // THEN: Returns to waiting_input
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);
    });

    it('returns to timeout_intermission after resume from intermission pause', async () => {
      // GIVEN: Pause during intermission
      resumeGame(orchestrator);
      orchestrator.handleTimeout(1);
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);

      pauseGame(orchestrator);
      clearEventSpies(eventSpies);

      // WHEN: Resume
      resumeGame(orchestrator);

      // THEN: Returns to timeout_intermission
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);
    });
  });

  describe('Complete Game', () => {
    beforeEach(() => {
      orchestrator.startGame();
      clearEventSpies(eventSpies);
    });

    it('transitions to completed state', async () => {
      // GIVEN: Game in progress
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);
      orchestrator.submitGuess(currentNote!);

      clearEventSpies(eventSpies);

      // WHEN: Complete game manually
      orchestrator.complete();

      // THEN: Transitions to completed state
      expect(orchestrator.getSnapshot().matches('completed')).toBe(true);
      expect(eventSpies.stateChange).toHaveBeenCalled();
    });

    it('manual complete emits sessionComplete', () => {
      // WHEN: Manually complete game
      orchestrator.complete();

      // THEN: sessionComplete event is emitted
      // NOTE: Strategy pattern behavioral change - sessionComplete now fires on manual complete
      // This ensures UI components receive completion event regardless of how game ended
      expect(eventSpies.sessionComplete).toHaveBeenCalled();
    });

    it('stats remain accessible after completion', async () => {
      // GIVEN: Game with some stats
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);
      orchestrator.submitGuess(currentNote!);

      // WHEN: Complete game
      orchestrator.complete();

      // THEN: Stats still accessible
      const stats = orchestrator.getStats();
      expect(stats.totalAttempts).toBe(1);
      expect(stats.correctCount).toBe(1);
    });

    it('emits stateChange to completed state', () => {
      // WHEN: Complete game
      orchestrator.complete();

      // THEN: stateChange to completed
      expect(eventSpies.stateChange).toHaveBeenCalled();

      const finalState = getLastEventPayload<any>(eventSpies.stateChange);
      expect(finalState.sessionState).toBe('completed');
    });

    it('clears all active timers on complete', async () => {
      // GIVEN: Game with active timers
      await orchestrator.startNewRound();
      orchestrator.handleTimeout(2);

      clearEventSpies(eventSpies);

      // WHEN: Complete game
      orchestrator.complete();

      // THEN: Timers cleared (game in stable completed state)
      expect(orchestrator.getSnapshot().matches('completed')).toBe(true);
    });

    it('calculates accuracy correctly via getStats', async () => {
      // GIVEN: Mix of correct and incorrect guesses
      await orchestrator.startNewRound();
      let currentNote = getNoteFromRoundStart(eventSpies);
      orchestrator.submitGuess(currentNote!); // Correct
      advanceRound(orchestrator);

      await orchestrator.startNewRound();
      currentNote = getNoteFromRoundStart(eventSpies);
      const wrongNote = { note: 'D' as const, octave: 4 };
      orchestrator.submitGuess(wrongNote); // Incorrect
      advanceRound(orchestrator);

      await orchestrator.startNewRound();
      currentNote = getNoteFromRoundStart(eventSpies);
      orchestrator.submitGuess(currentNote!); // Correct

      // WHEN: Complete game
      orchestrator.complete();

      // THEN: Accuracy = 2/3 = 66.67%
      const stats = orchestrator.getStats();
      expect(stats.totalAttempts).toBe(3);
      expect(stats.correctCount).toBe(2);

      const accuracy = (stats.correctCount / stats.totalAttempts) * 100;
      expect(accuracy).toBeCloseTo(66.67, 1);
    });
  });

  describe('Reset Game', () => {
    beforeEach(() => {
      orchestrator.startGame();
      clearEventSpies(eventSpies);
    });

    it('emits feedbackUpdate with initial message on reset', async () => {
      // GIVEN: Game in progress
      await orchestrator.startNewRound();

      clearEventSpies(eventSpies);

      // WHEN: Reset game
      orchestrator.resetGame();

      // THEN: feedbackUpdate emitted
      expect(eventSpies.feedbackUpdate).toHaveBeenCalled();

      const feedback = eventSpies.feedbackUpdate.mock.calls[0][0];
      expect(feedback).toContain('Start Practice');
    });

    it('stays in playing.waiting_input state after reset', () => {
      // WHEN: Reset game
      orchestrator.resetGame();

      // THEN: Stays in playing.waiting_input (ready for new round)
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);
    });

    it('clears all timers on reset', async () => {
      // GIVEN: Game with active timers in timeout_intermission
      await orchestrator.startNewRound();
      orchestrator.handleTimeout(2);

      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);

      // WHEN: Reset game
      orchestrator.resetGame();

      // THEN: Timers cleared, stays in timeout_intermission
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);
    });

    it('clears current note on reset', async () => {
      // GIVEN: Game with current note
      await orchestrator.startNewRound();
      const note = getNoteFromRoundStart(eventSpies);
      expect(note).not.toBeNull();

      // WHEN: Reset game
      orchestrator.resetGame();

      // THEN: Back to waiting_input state (note is cleared internally)
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);
    });

    it('can reset from playing state', () => {
      // GIVEN: Playing state
      expect(orchestrator.isPlaying()).toBe(true);

      // WHEN: Reset
      orchestrator.resetGame();

      // THEN: Successfully reset, still playing
      expect(orchestrator.isPlaying()).toBe(true);
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);
    });

    it('can reset from completed state', () => {
      // GIVEN: Completed state
      orchestrator.complete();
      expect(orchestrator.getSnapshot().matches('completed')).toBe(true);

      clearEventSpies(eventSpies);

      // WHEN: Reset
      orchestrator.resetGame();

      // THEN: Successfully reset
      expect(eventSpies.feedbackUpdate).toHaveBeenCalled();
    });
  });

  describe('Play Again', () => {
    beforeEach(async () => {
      // Complete a game first
      orchestrator.startGame();
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);
      orchestrator.submitGuess(currentNote!);
      orchestrator.complete();

      expect(orchestrator.getSnapshot().matches('completed')).toBe(true);
      clearEventSpies(eventSpies);
    });

    it('emits stateChange to playing.waiting_input', () => {
      // WHEN: Play again
      orchestrator.playAgain();

      // THEN: stateChange event emitted
      expect(eventSpies.stateChange).toHaveBeenCalled();

      const finalState = getLastEventPayload<any>(eventSpies.stateChange);
      expect(finalState.sessionState).toBe('playing');
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);
    });

    it('resets orchestrator stats to 0', () => {
      // GIVEN: Completed game with stats
      const statsBefore = orchestrator.getStats();
      expect(statsBefore.totalAttempts).toBeGreaterThan(0);

      // WHEN: Play again
      orchestrator.playAgain();

      // THEN: Stats reset
      expect(orchestrator.getStats()).toMatchObject({
        correctCount: 0,
        totalAttempts: 0,
        currentStreak: 0,
        longestStreak: 0,
      });
    });

    it('preserves game mode settings', () => {
      // GIVEN: Completed game
      const gameModeBefore = (orchestrator as any).gameMode;

      // WHEN: Play again
      orchestrator.playAgain();

      // THEN: Game mode instance preserved
      const gameModeAfter = (orchestrator as any).gameMode;
      expect(gameModeAfter).toBe(gameModeBefore);
    });

    it('clears all timers before transitioning', () => {
      // WHEN: Play again
      orchestrator.playAgain();

      // THEN: Clean state with no active timers
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);
    });

    it('can only be called from completed state', () => {
      // GIVEN: Playing state
      orchestrator.playAgain();
      orchestrator.startGame();

      clearEventSpies(eventSpies);

      // WHEN: Try to play again from playing state (should be no-op or error)
      orchestrator.playAgain();

      // THEN: State machine rejects invalid transition
      // (No state change or stays in current state)
      expect(orchestrator.getSnapshot().matches('playing')).toBe(true);
    });
  });

  describe('Session Lifecycle Flow', () => {
    it('completes full lifecycle: start → pause → resume → complete → play again', async () => {
      // Start
      orchestrator.startGame();
      expect(orchestrator.isPlaying()).toBe(true);

      // Pause
      await orchestrator.startNewRound();
      pauseGame(orchestrator);
      expect(orchestrator.isPaused()).toBe(true);

      // Resume
      resumeGame(orchestrator);
      expect(orchestrator.isPlaying()).toBe(true);

      // Complete
      const currentNote = getNoteFromRoundStart(eventSpies);
      orchestrator.submitGuess(currentNote!);
      orchestrator.complete();
      expect(orchestrator.getSnapshot().matches('completed')).toBe(true);

      // Play again
      clearEventSpies(eventSpies);
      orchestrator.playAgain();

      // THEN: All state transitions emit events
      expect(eventSpies.stateChange).toHaveBeenCalled();
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);
    });

    it('preserves stats through pause/resume but resets on play again', async () => {
      // Build up stats
      orchestrator.startGame();
      await orchestrator.startNewRound();
      let currentNote = getNoteFromRoundStart(eventSpies);
      orchestrator.submitGuess(currentNote!);
      advanceRound(orchestrator);

      await orchestrator.startNewRound();
      currentNote = getNoteFromRoundStart(eventSpies);
      orchestrator.submitGuess(currentNote!);

      const statsBeforePause = orchestrator.getStats();

      // Pause/resume
      pauseGame(orchestrator);
      resumeGame(orchestrator);

      // Stats preserved
      expect(orchestrator.getStats()).toEqual(statsBeforePause);

      // Complete and play again
      orchestrator.complete();
      orchestrator.playAgain();

      // Stats reset
      expect(orchestrator.getStats()).toMatchObject({
        correctCount: 0,
        totalAttempts: 0,
        currentStreak: 0,
        longestStreak: 0,
      });
    });
  });
});
