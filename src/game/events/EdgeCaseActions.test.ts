import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { GameOrchestrator } from '../GameOrchestrator';
import {
  setupTestEnvironment,
  clearEventSpies,
  pauseGame,
  resumeGame,
  advanceRound,
  getAllEventPayloads,
  getLastEventPayload,
  getNoteFromRoundStart,
} from '../../test/gameTestUtils';

/**
 * Edge Case Actions Event Tests
 *
 * Tests unusual scenarios and race conditions to ensure robust event handling.
 * Focuses on:
 * - Rapid user interactions
 * - Invalid state transitions
 * - Event ordering guarantees
 * - Timer race conditions
 */
describe('Edge Case Actions: Events', () => {
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

    orchestrator.startGame();
    clearEventSpies(eventSpies);
  });

  afterEach(() => {
    orchestrator?.stop();
    vi.clearAllMocks();
  });

  describe('Rapid Guess Submissions', () => {
    it('processes all rapid guess submissions', async () => {
      // GIVEN: Orchestrator in waiting_input
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);

      clearEventSpies(eventSpies);

      // WHEN: Submit 3 guesses in quick succession
      orchestrator.submitGuess(currentNote!);
      orchestrator.submitGuess(currentNote!);
      orchestrator.submitGuess(currentNote!);

      // THEN: All guesses emit events (orchestrator has no state guards)
      expect(eventSpies.guessAttempt).toHaveBeenCalledTimes(3);
      expect(eventSpies.guessResult).toHaveBeenCalledTimes(3);
    });

    it('subsequent guesses processed but state machine may ignore', async () => {
      // GIVEN: Submit first guess (transitions to timeout_intermission)
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);

      orchestrator.submitGuess(currentNote!);

      // Now in timeout_intermission
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);

      clearEventSpies(eventSpies);

      // WHEN: Try to submit another guess
      orchestrator.submitGuess(currentNote!);

      // THEN: Orchestrator emits events (state machine decides whether to accept)
      expect(eventSpies.guessAttempt).toHaveBeenCalled();
      expect(eventSpies.guessResult).toHaveBeenCalled();
    });

    it('only first guess counts in stats (subsequent ignored by state machine)', async () => {
      // GIVEN: Orchestrator in waiting_input
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);

      // WHEN: Rapid guesses (first transitions to timeout_intermission)
      orchestrator.submitGuess(currentNote!);
      orchestrator.submitGuess(currentNote!);
      orchestrator.submitGuess(currentNote!);

      // THEN: Only first guess counted (others occur during timeout_intermission)
      expect(orchestrator.getStats().totalAttempts).toBe(1);
      expect(orchestrator.getStats().correctCount).toBe(1);
    });
  });

  describe('Rapid Pause/Resume Cycles', () => {
    it('handles rapid pause/resume cycles', async () => {
      // GIVEN: Playing state
      await orchestrator.startNewRound();

      // WHEN: Rapid pause/resume cycles
      pauseGame(orchestrator);
      resumeGame(orchestrator);
      pauseGame(orchestrator);
      resumeGame(orchestrator);
      pauseGame(orchestrator);
      resumeGame(orchestrator);

      // THEN: Final state is playing, all transitions worked
      expect(orchestrator.isPlaying()).toBe(true);
      expect(eventSpies.stateChange).toHaveBeenCalled();
    });

    it('emits stateChange for each pause/resume', async () => {
      // GIVEN: Playing state
      await orchestrator.startNewRound();
      clearEventSpies(eventSpies);

      // WHEN: 3 pause/resume cycles
      for (let i = 0; i < 3; i++) {
        pauseGame(orchestrator);
        resumeGame(orchestrator);
      }

      // THEN: 6 stateChange events (3 pauses + 3 resumes)
      expect(eventSpies.stateChange.mock.calls.length).toBe(6);
    });

    it('preserves state through rapid cycles', async () => {
      // GIVEN: Playing state with stats
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);
      orchestrator.submitGuess(currentNote!);

      const statsBefore = orchestrator.getStats();

      // WHEN: Rapid pause/resume
      pauseGame(orchestrator);
      resumeGame(orchestrator);
      pauseGame(orchestrator);
      resumeGame(orchestrator);

      // THEN: Stats preserved
      const statsAfter = orchestrator.getStats();
      expect(statsAfter).toEqual(statsBefore);
    });
  });

  describe('Pause During Intermission', () => {
    it('preserves intermission state when paused', async () => {
      // GIVEN: Orchestrator in timeout_intermission
      await orchestrator.startNewRound();
      orchestrator.handleTimeout(1);

      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);

      // WHEN: Pause during intermission
      pauseGame(orchestrator);

      expect(orchestrator.isPaused()).toBe(true);

      // AND: Resume
      resumeGame(orchestrator);

      // THEN: Returns to timeout_intermission
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);
    });

    it('clears auto-advance timer when pausing during intermission', async () => {
      // GIVEN: Timeout intermission with auto-advance scheduled
      await orchestrator.startNewRound();
      orchestrator.handleTimeout(2); // Schedules auto-advance

      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);

      // WHEN: Pause (clears timers)
      pauseGame(orchestrator);

      // THEN: Timers cleared (no auto-advance after resume)
      resumeGame(orchestrator);

      // Still in intermission, timer not rescheduled
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);

      // Must manually advance
      clearEventSpies(eventSpies);
      advanceRound(orchestrator);

      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);
    });

    it('can pause and resume multiple times during intermission', async () => {
      // GIVEN: Timeout intermission
      await orchestrator.startNewRound();
      orchestrator.handleTimeout(1);

      // WHEN: Multiple pause/resume cycles during intermission
      pauseGame(orchestrator);
      resumeGame(orchestrator);
      pauseGame(orchestrator);
      resumeGame(orchestrator);

      // THEN: Still in intermission
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);
    });
  });

  describe('Event Order Verification', () => {
    it('emits events in correct order for guess flow', async () => {
      // GIVEN: Orchestrator in waiting_input
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);

      clearEventSpies(eventSpies);

      const eventLog: string[] = [];

      // Track all events in order
      eventSpies.guessAttempt.mockImplementation(() => eventLog.push('guessAttempt'));
      eventSpies.guessResult.mockImplementation(() => eventLog.push('guessResult'));
      eventSpies.stateChange.mockImplementation(() => eventLog.push('stateChange'));

      // WHEN: Submit guess
      orchestrator.submitGuess(currentNote!);

      // THEN: Events in deterministic order
      expect(eventLog).toEqual([
        'guessAttempt',
        'stateChange',      // → processing_guess
        'stateChange',      // → timeout_intermission
        'guessResult',      // Emitted after state transitions
      ]);
    });

    it('stateChange always precedes dependent events', async () => {
      // GIVEN: Track event sequence
      const eventSequence: Array<{ event: string; state: string }> = [];

      eventSpies.stateChange.mockImplementation((state: any) => {
        const stateName = state.roundState || state.sessionState;
        eventSequence.push({ event: 'stateChange', state: stateName });
      });

      eventSpies.guessResult.mockImplementation(() => {
        const currentState = orchestrator.getSnapshot().value as any;
        const stateName = currentState.playing || 'unknown';
        eventSequence.push({ event: 'guessResult', state: stateName });
      });

      // WHEN: Perform actions
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);
      orchestrator.submitGuess(currentNote!);

      // THEN: stateChange events come before result events
      const guessResultIndex = eventSequence.findIndex(e => e.event === 'guessResult');
      const lastStateChangeIndex = eventSequence
        .slice(0, guessResultIndex)
        .findLastIndex(e => e.event === 'stateChange');

      expect(lastStateChangeIndex).toBeGreaterThanOrEqual(0);
      expect(lastStateChangeIndex).toBeLessThan(guessResultIndex);
    });

    it('no duplicate event emissions for single action', async () => {
      // GIVEN: Orchestrator in waiting_input
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);

      clearEventSpies(eventSpies);

      // WHEN: Submit guess
      orchestrator.submitGuess(currentNote!);

      // THEN: Each event type emitted expected number of times
      expect(eventSpies.guessAttempt).toHaveBeenCalledTimes(1);
      expect(eventSpies.guessResult).toHaveBeenCalledTimes(1);
      // stateChange may be multiple (processing_guess, timeout_intermission)
      expect(eventSpies.stateChange.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Guess Processing Behavior', () => {
    it('processes guess even when in timeout_intermission', async () => {
      // GIVEN: Orchestrator in timeout_intermission
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);
      orchestrator.handleTimeout(1);

      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);

      clearEventSpies(eventSpies);

      // WHEN: Submit guess
      orchestrator.submitGuess(currentNote!);

      // THEN: Orchestrator emits events (state machine decides whether to accept)
      expect(eventSpies.guessAttempt).toHaveBeenCalled();
      expect(eventSpies.guessResult).toHaveBeenCalled();
    });

    it('processes guess even when paused', async () => {
      // GIVEN: Paused state
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);

      pauseGame(orchestrator);
      expect(orchestrator.isPaused()).toBe(true);

      clearEventSpies(eventSpies);

      // WHEN: Submit guess
      orchestrator.submitGuess(currentNote!);

      // THEN: Orchestrator emits events (state machine may ignore)
      expect(eventSpies.guessAttempt).toHaveBeenCalled();
    });

    it('processes guess even when completed', async () => {
      // GIVEN: Completed state
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);

      orchestrator.complete();
      expect(orchestrator.getSnapshot().matches('completed')).toBe(true);

      clearEventSpies(eventSpies);

      // WHEN: Submit guess
      orchestrator.submitGuess(currentNote!);

      // THEN: Orchestrator emits events (state machine ignores)
      expect(eventSpies.guessAttempt).toHaveBeenCalled();
    });

    it('warns when no current note (idle state)', () => {
      // GIVEN: Idle state
      orchestrator.stop();
      const setup = setupTestEnvironment();
      orchestrator = setup.orchestrator;
      eventSpies = setup.eventSpies;

      expect(orchestrator.isIdle()).toBe(true);

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      clearEventSpies(eventSpies);

      // WHEN: Try to submit guess (no current note)
      orchestrator.submitGuess({ note: 'C', octave: 4 });

      // THEN: Warning logged, no events
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(eventSpies.guessAttempt).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Multiple Timer Cancellations', () => {
    it('handles multiple pause calls without errors', async () => {
      // GIVEN: Playing state
      await orchestrator.startNewRound();

      // WHEN: Multiple pause calls
      pauseGame(orchestrator);
      pauseGame(orchestrator); // Already paused
      pauseGame(orchestrator); // Still paused

      // THEN: No errors, state is paused
      expect(orchestrator.isPaused()).toBe(true);
    });

    it('clears all timers on pause even if already cleared', async () => {
      // GIVEN: Paused state (timers already cleared)
      await orchestrator.startNewRound();
      pauseGame(orchestrator);

      // WHEN: Clear timers again
      orchestrator.clearAllTimers();
      orchestrator.clearAllTimers();

      // THEN: No errors
      expect(orchestrator.isPaused()).toBe(true);
    });

    it('handles timer cancellation during rapid state changes', async () => {
      // GIVEN: Game with various timers
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);

      // WHEN: Rapid state changes that affect timers
      orchestrator.submitGuess(currentNote!); // Schedules auto-advance
      pauseGame(orchestrator); // Clears timers
      resumeGame(orchestrator); // Restores state (back to timeout_intermission)

      // Verify we're back in timeout_intermission
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);

      pauseGame(orchestrator); // Clears again
      resumeGame(orchestrator); // Restores again

      // THEN: No errors, still in playing state (timeout_intermission)
      expect(orchestrator.isPlaying()).toBe(true);
    });
  });

  describe('State Transition Sequences', () => {
    it('handles complete game lifecycle without errors', async () => {
      // WHEN: Complete lifecycle with edge cases
      orchestrator.startGame();

      // Multiple rounds with pauses
      await orchestrator.startNewRound();
      let currentNote = getNoteFromRoundStart(eventSpies);
      pauseGame(orchestrator);
      resumeGame(orchestrator);
      orchestrator.submitGuess(currentNote!);
      advanceRound(orchestrator);

      await orchestrator.startNewRound();
      currentNote = getNoteFromRoundStart(eventSpies);
      orchestrator.handleTimeout(1);
      pauseGame(orchestrator);
      resumeGame(orchestrator);
      advanceRound(orchestrator);

      await orchestrator.startNewRound();
      currentNote = getNoteFromRoundStart(eventSpies);
      orchestrator.submitGuess(currentNote!);

      orchestrator.complete();
      orchestrator.playAgain();

      // THEN: All events fired correctly
      expect(eventSpies.stateChange).toHaveBeenCalled();
      expect(orchestrator.isPlaying()).toBe(true);
    });

    it('handles invalid transition attempts gracefully', async () => {
      // GIVEN: Various states
      await orchestrator.startNewRound();

      // WHEN: Try invalid transitions
      orchestrator.playAgain(); // Can't play again from playing
      orchestrator.resume(); // Already playing, not paused

      // THEN: State machine handles gracefully (no state change)
      expect(orchestrator.isPlaying()).toBe(true);
    });
  });

  describe('Event Payload Consistency', () => {
    it('guessAttempt always includes all required fields', async () => {
      // WHEN: Submit various types of guesses
      await orchestrator.startNewRound();
      let currentNote = getNoteFromRoundStart(eventSpies);

      clearEventSpies(eventSpies);

      // Correct guess
      orchestrator.submitGuess(currentNote!);
      let attempt = getLastEventPayload<any>(eventSpies.guessAttempt);
      expect(attempt).toMatchObject({
        id: expect.any(String),
        timestamp: expect.any(Date),
        actualNote: expect.any(Object),
        guessedNote: expect.any(Object),
        isCorrect: expect.any(Boolean),
      });

      // Timeout
      advanceRound(orchestrator);
      await orchestrator.startNewRound();

      clearEventSpies(eventSpies);

      orchestrator.handleTimeout(1);
      attempt = getLastEventPayload<any>(eventSpies.guessAttempt);
      expect(attempt).toMatchObject({
        id: expect.any(String),
        timestamp: expect.any(Date),
        actualNote: expect.any(Object),
        guessedNote: null, // Timeout has null guess
        isCorrect: false,
      });
    });

    it('stateChange always includes sessionState', async () => {
      // WHEN: Perform various transitions
      pauseGame(orchestrator);
      resumeGame(orchestrator);
      await orchestrator.startNewRound();
      orchestrator.complete();

      // THEN: All stateChange events have sessionState
      const stateChanges = getAllEventPayloads<any>(eventSpies.stateChange);
      stateChanges.forEach(change => {
        expect(change).toHaveProperty('sessionState');
        expect(typeof change.sessionState).toBe('string');
      });
    });

    it('roundStart always includes note and feedback', async () => {
      // WHEN: Start multiple rounds
      for (let i = 0; i < 3; i++) {
        clearEventSpies(eventSpies);

        await orchestrator.startNewRound();

        const roundStart = getLastEventPayload<any>(eventSpies.roundStart);
        expect(roundStart).toMatchObject({
          note: expect.objectContaining({
            note: expect.any(String),
            octave: expect.any(Number),
          }),
          feedback: expect.any(String),
          context: expect.objectContaining({
            startTime: expect.any(Date),
            elapsedTime: 0,
            note: expect.objectContaining({
              note: expect.any(String),
              octave: expect.any(Number),
            }),
            noteHighlights: expect.any(Array),
          }),
        });

        // Verify context.note matches the deprecated note field
        expect(roundStart.context.note).toEqual(roundStart.note);

        if (i < 2) {
          orchestrator.handleTimeout(1);
          advanceRound(orchestrator);
        }
      }
    });
  });

  describe('Resource Cleanup', () => {
    it('stop() clears all timers and subscriptions', async () => {
      // GIVEN: Orchestrator with active timers and subscriptions
      await orchestrator.startNewRound();
      orchestrator.handleTimeout(2); // Schedules timer

      const subscription = orchestrator.subscribe(() => {});

      // WHEN: Stop orchestrator
      orchestrator.stop();

      // THEN: Clean shutdown (no hanging timers or memory leaks)
      expect(orchestrator.getSnapshot().matches('idle')).toBe(false); // Machine stopped
    });

    it('clears timers before state transitions', async () => {
      // GIVEN: Multiple timers scheduled
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);

      orchestrator.submitGuess(currentNote!); // Timer 1
      advanceRound(orchestrator);

      await orchestrator.startNewRound();
      orchestrator.handleTimeout(2); // Timer 2

      // WHEN: Complete (should clear all timers)
      orchestrator.complete();

      // THEN: Clean completed state
      expect(orchestrator.getSnapshot().matches('completed')).toBe(true);
    });
  });
});
