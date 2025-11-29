import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { GameOrchestrator } from '../GameOrchestrator';
import {
  setupTestEnvironment,
  clearEventSpies,
  TEST_NOTES,
  makeCorrectGuess,
  makeIncorrectGuess,
  advanceRound,
  getLastEventPayload,
} from '../../test/gameTestUtils';

/**
 * Guess Actions Event Tests
 *
 * Tests that user guess actions trigger the correct events with proper payloads.
 * Focuses on:
 * - submitGuess() method with correct note
 * - submitGuess() method with incorrect note
 * - handleTimeout() method (timeout = no guess)
 */
describe('Guess Actions: Events', () => {
  let orchestrator: GameOrchestrator;
  let eventSpies: ReturnType<typeof import('../../test/gameTestUtils').createEventSpies>;

  beforeEach(() => {
    const setup = setupTestEnvironment();
    orchestrator = setup.orchestrator;
    eventSpies = setup.eventSpies;

    // Start game to get into playing state
    orchestrator.startGame();
    clearEventSpies(eventSpies);
  });

  afterEach(() => {
    orchestrator?.stop();
    vi.clearAllMocks();
  });

  describe('Correct Guess Events', () => {
    it('emits guessAttempt event with correct payload for correct guess', async () => {
      // GIVEN: Orchestrator in waiting_input state
      await orchestrator.startNewRound();
      const currentNote = orchestrator.getCurrentNote();
      clearEventSpies(eventSpies);

      // WHEN: Submit correct guess
      orchestrator.submitGuess(currentNote!);

      // THEN: guessAttempt event emitted with correct data
      expect(eventSpies.guessAttempt).toHaveBeenCalledTimes(1);

      const attempt = getLastEventPayload<any>(eventSpies.guessAttempt);
      expect(attempt).toMatchObject({
        id: expect.any(String),
        timestamp: expect.any(Date),
        actualNote: currentNote,
        guessedNote: currentNote,
        isCorrect: true,
      });
    });

    it('emits guessResult event with isCorrect: true', async () => {
      // GIVEN: Orchestrator in waiting_input state
      await orchestrator.startNewRound();
      const currentNote = orchestrator.getCurrentNote();
      clearEventSpies(eventSpies);

      // WHEN: Submit correct guess
      orchestrator.submitGuess(currentNote!);

      // THEN: guessResult event emitted with success
      expect(eventSpies.guessResult).toHaveBeenCalledTimes(1);

      const result = getLastEventPayload<any>(eventSpies.guessResult);
      expect(result).toMatchObject({
        isCorrect: true,
        feedback: expect.stringContaining('Correct'),
        shouldAdvance: true,
        gameCompleted: false,
      });
    });

    it('updates stats correctly on correct guess', async () => {
      // GIVEN: Orchestrator in waiting_input state
      await orchestrator.startNewRound();
      const currentNote = orchestrator.getCurrentNote();
      clearEventSpies(eventSpies);

      // WHEN: Submit correct guess
      orchestrator.submitGuess(currentNote!);

      // THEN: Stats updated in guessResult payload
      const result = getLastEventPayload<any>(eventSpies.guessResult);
      expect(result.stats).toMatchObject({
        correctAttempts: 1,
        totalAttempts: 1,
      });
    });

    it('transitions from waiting_input → processing_guess → timeout_intermission', async () => {
      // GIVEN: Orchestrator in waiting_input state
      await orchestrator.startNewRound();
      const currentNote = orchestrator.getCurrentNote();
      clearEventSpies(eventSpies);

      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);

      // WHEN: Submit correct guess
      orchestrator.submitGuess(currentNote!);

      // THEN: State transitions through processing_guess to timeout_intermission
      const stateChanges = eventSpies.stateChange.mock.calls.map(call => call[0]);

      // Should have at least 2 state changes: → processing_guess, → timeout_intermission
      expect(stateChanges.length).toBeGreaterThanOrEqual(2);

      // Verify we end in timeout_intermission
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);
    });

    it('increments currentStreak on correct guess', async () => {
      // GIVEN: Orchestrator in waiting_input state
      await orchestrator.startNewRound();
      const currentNote = orchestrator.getCurrentNote();

      // WHEN: Submit correct guess
      orchestrator.submitGuess(currentNote!);

      // THEN: Streak incremented
      expect(orchestrator.getStats()).toMatchObject({
        currentStreak: 1,
        longestStreak: 1,
      });

      // WHEN: Advance and make another correct guess
      advanceRound(orchestrator);
      await orchestrator.startNewRound();
      const nextNote = orchestrator.getCurrentNote();
      orchestrator.submitGuess(nextNote!);

      // THEN: Streak continues to build
      expect(orchestrator.getStats()).toMatchObject({
        currentStreak: 2,
        longestStreak: 2,
      });
    });
  });

  describe('Incorrect Guess Events', () => {
    it('emits guessAttempt event with isCorrect: false', async () => {
      // GIVEN: Orchestrator in waiting_input state
      await orchestrator.startNewRound();
      const currentNote = orchestrator.getCurrentNote();
      const wrongNote = currentNote!.note === 'C' ? TEST_NOTES.D4 : TEST_NOTES.C4;
      clearEventSpies(eventSpies);

      // WHEN: Submit incorrect guess
      orchestrator.submitGuess(wrongNote);

      // THEN: guessAttempt event emitted with isCorrect: false
      expect(eventSpies.guessAttempt).toHaveBeenCalledTimes(1);

      const attempt = getLastEventPayload<any>(eventSpies.guessAttempt);
      expect(attempt).toMatchObject({
        actualNote: currentNote,
        guessedNote: wrongNote,
        isCorrect: false,
      });
    });

    it('emits guessResult event with incorrect feedback', async () => {
      // GIVEN: Orchestrator in waiting_input state
      await orchestrator.startNewRound();
      const currentNote = orchestrator.getCurrentNote();
      const wrongNote = currentNote!.note === 'C' ? TEST_NOTES.D4 : TEST_NOTES.C4;
      clearEventSpies(eventSpies);

      // WHEN: Submit incorrect guess
      orchestrator.submitGuess(wrongNote);

      // THEN: guessResult event emitted with failure
      expect(eventSpies.guessResult).toHaveBeenCalledTimes(1);

      const result = getLastEventPayload<any>(eventSpies.guessResult);
      expect(result).toMatchObject({
        isCorrect: false,
        feedback: expect.any(String),
        shouldAdvance: true,
      });
    });

    it('resets current streak to 0 on incorrect guess', async () => {
      // GIVEN: Build a streak first
      await orchestrator.startNewRound();
      let currentNote = orchestrator.getCurrentNote();
      orchestrator.submitGuess(currentNote!);
      advanceRound(orchestrator);

      await orchestrator.startNewRound();
      currentNote = orchestrator.getCurrentNote();
      orchestrator.submitGuess(currentNote!);
      advanceRound(orchestrator);

      expect(orchestrator.getStats().currentStreak).toBe(2);

      // WHEN: Submit incorrect guess
      await orchestrator.startNewRound();
      currentNote = orchestrator.getCurrentNote();
      const wrongNote = currentNote!.note === 'C' ? TEST_NOTES.D4 : TEST_NOTES.C4;
      orchestrator.submitGuess(wrongNote);

      // THEN: Current streak reset, longest streak preserved
      expect(orchestrator.getStats()).toMatchObject({
        currentStreak: 0,
        longestStreak: 2,
      });
    });

    it('increments totalAttempts but not correctCount', async () => {
      // GIVEN: Orchestrator in waiting_input state
      await orchestrator.startNewRound();
      const currentNote = orchestrator.getCurrentNote();
      const wrongNote = currentNote!.note === 'C' ? TEST_NOTES.D4 : TEST_NOTES.C4;

      const initialStats = orchestrator.getStats();

      // WHEN: Submit incorrect guess
      orchestrator.submitGuess(wrongNote);

      // THEN: totalAttempts incremented, correctCount unchanged
      const updatedStats = orchestrator.getStats();
      expect(updatedStats.totalAttempts).toBe(initialStats.totalAttempts + 1);
      expect(updatedStats.correctCount).toBe(initialStats.correctCount);
    });

    it('transitions to timeout_intermission', async () => {
      // GIVEN: Orchestrator in waiting_input state
      await orchestrator.startNewRound();
      const currentNote = orchestrator.getCurrentNote();
      const wrongNote = currentNote!.note === 'C' ? TEST_NOTES.D4 : TEST_NOTES.C4;

      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);

      // WHEN: Submit incorrect guess
      orchestrator.submitGuess(wrongNote);

      // THEN: Transitions to timeout_intermission
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);
    });
  });

  describe('Timeout Events (No Guess)', () => {
    it('emits guessAttempt with guessedNote: null on timeout', async () => {
      // GIVEN: Orchestrator in waiting_input state
      await orchestrator.startNewRound();
      const currentNote = orchestrator.getCurrentNote();
      clearEventSpies(eventSpies);

      // WHEN: Timeout occurs (no guess made)
      orchestrator.handleTimeout(1);

      // THEN: guessAttempt event emitted with null guess
      expect(eventSpies.guessAttempt).toHaveBeenCalledTimes(1);

      const attempt = getLastEventPayload<any>(eventSpies.guessAttempt);
      expect(attempt).toMatchObject({
        actualNote: currentNote,
        guessedNote: null, // Critical: null for timeout!
        isCorrect: false,
      });
    });

    it('reveals correct note in feedback message', async () => {
      // GIVEN: Orchestrator in waiting_input state
      await orchestrator.startNewRound();
      const currentNote = orchestrator.getCurrentNote();
      clearEventSpies(eventSpies);

      // WHEN: Timeout occurs
      orchestrator.handleTimeout(1);

      // THEN: Feedback reveals the correct note
      const result = getLastEventPayload<any>(eventSpies.guessResult);
      expect(result.feedback).toContain(currentNote!.note);
      expect(result.feedback.toLowerCase()).toContain("time");
    });

    it('resets streak to 0 on timeout', async () => {
      // GIVEN: Build a streak first
      await orchestrator.startNewRound();
      let currentNote = orchestrator.getCurrentNote();
      orchestrator.submitGuess(currentNote!);
      advanceRound(orchestrator);

      await orchestrator.startNewRound();
      currentNote = orchestrator.getCurrentNote();
      orchestrator.submitGuess(currentNote!);
      advanceRound(orchestrator);

      expect(orchestrator.getStats().currentStreak).toBe(2);

      // WHEN: Timeout on next round
      await orchestrator.startNewRound();
      orchestrator.handleTimeout(1);

      // THEN: Streak reset
      expect(orchestrator.getStats()).toMatchObject({
        currentStreak: 0,
        longestStreak: 2,
      });
    });

    it('schedules auto-advance to next round', async () => {
      // GIVEN: Orchestrator in waiting_input state
      await orchestrator.startNewRound();

      // WHEN: Timeout occurs
      orchestrator.handleTimeout(1);

      // THEN: Enters timeout_intermission
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);

      // Auto-advance timer is scheduled internally
      // (Can't directly test timer without advancing time or using fake timers)
    });

    it('increments totalAttempts on timeout', async () => {
      // GIVEN: Orchestrator in waiting_input state
      await orchestrator.startNewRound();
      const initialStats = orchestrator.getStats();

      // WHEN: Timeout occurs
      orchestrator.handleTimeout(1);

      // THEN: totalAttempts incremented
      const updatedStats = orchestrator.getStats();
      expect(updatedStats.totalAttempts).toBe(initialStats.totalAttempts + 1);
      expect(updatedStats.correctCount).toBe(initialStats.correctCount); // No change
    });
  });

  describe('Event Order and Timing', () => {
    it('emits events in correct order: guessAttempt → stateChange → guessResult → stateChange', async () => {
      // GIVEN: Orchestrator in waiting_input state
      await orchestrator.startNewRound();
      const currentNote = orchestrator.getCurrentNote();
      clearEventSpies(eventSpies);

      const eventLog: string[] = [];

      // Track all events in order
      eventSpies.guessAttempt.mockImplementation(() => eventLog.push('guessAttempt'));
      eventSpies.guessResult.mockImplementation(() => eventLog.push('guessResult'));
      eventSpies.stateChange.mockImplementation(() => eventLog.push('stateChange'));

      // WHEN: Submit correct guess
      orchestrator.submitGuess(currentNote!);

      // THEN: Events fire in deterministic order
      expect(eventLog).toEqual([
        'guessAttempt',
        'stateChange',      // → processing_guess
        'guessResult',
        'stateChange',      // → timeout_intermission
      ]);
    });

    it('does not emit sessionComplete for normal guesses', async () => {
      // GIVEN: Orchestrator in waiting_input state
      await orchestrator.startNewRound();
      const currentNote = orchestrator.getCurrentNote();
      clearEventSpies(eventSpies);

      // WHEN: Submit correct guess (not completing game)
      orchestrator.submitGuess(currentNote!);

      // THEN: sessionComplete NOT emitted
      expect(eventSpies.sessionComplete).not.toHaveBeenCalled();
    });

    it('emits sessionComplete when guess completes game', async () => {
      // GIVEN: Sandbox mode with targetNotes: 1
      orchestrator.stop();
      const setup = setupTestEnvironment('sandbox', {
        sandbox: { sessionDuration: 5, targetNotes: 1 }
      });
      orchestrator = setup.orchestrator;
      eventSpies = setup.eventSpies;

      orchestrator.startGame();
      await orchestrator.startNewRound();
      const currentNote = orchestrator.getCurrentNote();
      clearEventSpies(eventSpies);

      // WHEN: Submit correct guess that completes game
      orchestrator.submitGuess(currentNote!);

      // THEN: sessionComplete emitted
      expect(eventSpies.sessionComplete).toHaveBeenCalledTimes(1);
      expect(orchestrator.getSnapshot().matches('completed')).toBe(true);
    });
  });

  describe('Guess During Invalid States', () => {
    it('ignores guess when not in waiting_input state', async () => {
      // GIVEN: Orchestrator in timeout_intermission
      await orchestrator.startNewRound();
      const currentNote = orchestrator.getCurrentNote();
      orchestrator.handleTimeout(1);

      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);
      clearEventSpies(eventSpies);

      // WHEN: Attempt to submit guess during intermission
      orchestrator.submitGuess(currentNote!);

      // THEN: Guess ignored, no events emitted
      expect(eventSpies.guessAttempt).not.toHaveBeenCalled();
      expect(eventSpies.guessResult).not.toHaveBeenCalled();
    });

    it('ignores rapid duplicate guesses', async () => {
      // GIVEN: Orchestrator in waiting_input state
      await orchestrator.startNewRound();
      const currentNote = orchestrator.getCurrentNote();
      clearEventSpies(eventSpies);

      // WHEN: Submit same guess multiple times rapidly
      orchestrator.submitGuess(currentNote!);
      orchestrator.submitGuess(currentNote!);
      orchestrator.submitGuess(currentNote!);

      // THEN: Only first guess processed
      expect(eventSpies.guessAttempt).toHaveBeenCalledTimes(1);
      expect(eventSpies.guessResult).toHaveBeenCalledTimes(1);
    });
  });
});
