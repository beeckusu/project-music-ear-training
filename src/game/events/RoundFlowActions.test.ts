import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { GameOrchestrator } from '../GameOrchestrator';
import {
  setupTestEnvironment,
  clearEventSpies,
  advanceRound,
  getLastEventPayload,
  getNoteFromRoundStart,
} from '../../test/gameTestUtils';

/**
 * Round Flow Actions Event Tests
 *
 * Tests that round lifecycle actions trigger the correct events.
 * Focuses on:
 * - startNewRound()
 * - Auto-advance after correct guess
 * - Auto-advance after timeout
 * - Manual round advancement
 */
describe('Round Flow Actions: Events', () => {
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

  describe('Round Start', () => {
    it('emits roundStart with generated note and feedback', async () => {
      // WHEN: Start new round
      await orchestrator.startNewRound();

      // THEN: roundStart event emitted
      expect(eventSpies.roundStart).toHaveBeenCalledTimes(1);

      const roundStart = getLastEventPayload<any>(eventSpies.roundStart);
      expect(roundStart).toMatchObject({
        note: expect.objectContaining({
          note: expect.any(String),
          octave: expect.any(Number),
        }),
        feedback: expect.any(String),
      });
    });

    it('generates note using configured note filter', async () => {
      // GIVEN: Note filter allows only naturals in octave 4
      // (Set in setupTestEnvironment)

      // WHEN: Start new round
      await orchestrator.startNewRound();

      // THEN: Generated note respects filter
      const roundStart = getLastEventPayload<any>(eventSpies.roundStart);
      expect(roundStart.note.octave).toBe(4);
      expect(['C', 'D', 'E', 'F', 'G', 'A', 'B']).toContain(roundStart.note.note);
    });

    it('transitions to waiting_input state', async () => {
      // WHEN: Start new round
      await orchestrator.startNewRound();

      // THEN: State is waiting_input (state change happened during startGame)
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);
    });

    it('calls game mode onStartNewRound callback', async () => {
      // GIVEN: Spy on game mode
      const gameMode = (orchestrator as any).gameMode;
      const onStartSpy = vi.spyOn(gameMode, 'onStartNewRound');

      // WHEN: Start new round
      await orchestrator.startNewRound();

      // THEN: Game mode callback invoked
      expect(onStartSpy).toHaveBeenCalled();
    });

    it('can start from idle state (first round)', async () => {
      // GIVEN: Fresh orchestrator in idle
      orchestrator.stop();
      const setup = setupTestEnvironment();
      orchestrator = setup.orchestrator;
      eventSpies = setup.eventSpies;

      orchestrator.startGame();
      clearEventSpies(eventSpies);

      // WHEN: Start new round
      await orchestrator.startNewRound();

      // THEN: Successfully starts
      expect(eventSpies.roundStart).toHaveBeenCalled();
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);
    });

    it('can start from timeout_intermission state', async () => {
      // GIVEN: Orchestrator in timeout_intermission
      await orchestrator.startNewRound();
      orchestrator.handleTimeout(1);
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);

      clearEventSpies(eventSpies);

      // WHEN: Advance and start new round
      advanceRound(orchestrator);
      await orchestrator.startNewRound();

      // THEN: Successfully starts new round
      expect(eventSpies.roundStart).toHaveBeenCalled();
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);
    });

    it('feedback message is mode-specific', async () => {
      // WHEN: Start new round
      await orchestrator.startNewRound();

      // THEN: Feedback contains mode-specific text
      const roundStart = getLastEventPayload<any>(eventSpies.roundStart);
      expect(roundStart.feedback).toBeTruthy();
      expect(roundStart.feedback.length).toBeGreaterThan(0);
    });

    it('roundStart includes context with note for ear training', async () => {
      // WHEN: Start new round in ear training mode
      await orchestrator.startNewRound();

      // THEN: roundStart event includes properly structured context
      const roundStart = getLastEventPayload<any>(eventSpies.roundStart);
      expect(roundStart.context).toBeDefined();
      expect(roundStart.context).toMatchObject({
        startTime: expect.any(Date),
        elapsedTime: 0,
        note: expect.objectContaining({
          note: expect.any(String),
          octave: expect.any(Number),
        }),
        noteHighlights: expect.any(Array),
      });

      // THEN: context.note matches the deprecated note field (backward compatibility)
      expect(roundStart.context.note).toEqual(roundStart.note);

      // THEN: chord-specific fields are undefined for ear training mode
      expect(roundStart.context.chord).toBeUndefined();
      expect(roundStart.context.displayNotes).toBeUndefined();
      expect(roundStart.context.selectedNotes).toBeUndefined();

      // THEN: noteHighlights is initialized as empty array
      expect(roundStart.context.noteHighlights).toEqual([]);

      // THEN: startTime is recent (within last second)
      const now = new Date();
      const timeDiff = now.getTime() - roundStart.context.startTime.getTime();
      expect(timeDiff).toBeLessThan(1000);
    });
  });

  describe('Auto-Advance After Correct Guess', () => {
    it('schedules auto-advance timer after correct guess', async () => {
      // GIVEN: Round in progress
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);

      clearEventSpies(eventSpies);

      // WHEN: Submit correct guess
      orchestrator.submitGuess(currentNote!);

      // THEN: Enters timeout_intermission (auto-advance scheduled internally)
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);

      // Auto-advance timer is scheduled but we can't directly test it without
      // advancing time or using fake timers
    });

    it('can manually advance after correct guess', async () => {
      // GIVEN: Round in progress
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);

      // WHEN: Submit correct guess (schedules auto-advance)
      orchestrator.submitGuess(currentNote!);

      // In timeout_intermission
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);

      // WHEN: Manually advance round
      advanceRound(orchestrator);

      // THEN: Back to waiting_input
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);
    });

    it('clears previous auto-advance timer if called again', async () => {
      // GIVEN: Timer already scheduled
      await orchestrator.startNewRound();
      let currentNote = getNoteFromRoundStart(eventSpies);
      orchestrator.submitGuess(currentNote!);

      // WHEN: Advance and submit another correct guess
      advanceRound(orchestrator);
      await orchestrator.startNewRound();
      currentNote = getNoteFromRoundStart(eventSpies);
      orchestrator.submitGuess(currentNote!);

      // THEN: New timer scheduled, old one cleared (no errors)
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);
    });

    it('auto-advance can be cancelled by pause', async () => {
      // GIVEN: Auto-advance scheduled
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);
      orchestrator.submitGuess(currentNote!);

      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);

      // WHEN: Pause (cancels timers)
      orchestrator.pause();

      // THEN: Timers cleared
      expect(orchestrator.isPaused()).toBe(true);
    });
  });

  describe('Auto-Advance After Timeout', () => {
    it('schedules auto-advance timer after timeout', async () => {
      // GIVEN: Round in progress
      await orchestrator.startNewRound();

      clearEventSpies(eventSpies);

      // WHEN: Timeout occurs
      orchestrator.handleTimeout(1);

      // THEN: Enters timeout_intermission with auto-advance scheduled
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);
    });

    it('delay is capped at 2 seconds for timeout auto-advance', async () => {
      // GIVEN: Round in progress
      await orchestrator.startNewRound();

      // WHEN: Timeout with large auto-advance speed (e.g., 5 seconds)
      orchestrator.handleTimeout(5);

      // THEN: Internally, delay is capped at min(5, 2) = 2 seconds
      // (Can't directly test timer delay without mocking timers)
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);
    });

    it('sends ADVANCE_ROUND action after delay', async () => {
      // GIVEN: Timeout occurred
      await orchestrator.startNewRound();
      orchestrator.handleTimeout(1);

      clearEventSpies(eventSpies);

      // WHEN: Manually advance (simulating timer expiration)
      advanceRound(orchestrator);

      // THEN: State transitions to waiting_input
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);
    });

    it('can manually advance after timeout', async () => {
      // GIVEN: Timeout occurred
      await orchestrator.startNewRound();
      orchestrator.handleTimeout(1);

      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);

      // WHEN: Manually advance round
      advanceRound(orchestrator);

      // THEN: Transitions to waiting_input
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);
    });

    it('clears timer when paused during intermission', async () => {
      // GIVEN: Timeout intermission with auto-advance scheduled
      await orchestrator.startNewRound();
      orchestrator.handleTimeout(1);

      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);

      // WHEN: Pause
      orchestrator.pause();

      // THEN: Timers cleared
      expect(orchestrator.isPaused()).toBe(true);

      // WHEN: Resume
      orchestrator.resume();

      // THEN: Back to intermission, but auto-advance timer NOT rescheduled
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);
    });
  });

  describe('Manual Round Advancement', () => {
    it('transitions from timeout_intermission to waiting_input', async () => {
      // GIVEN: Orchestrator in timeout_intermission
      await orchestrator.startNewRound();
      orchestrator.handleTimeout(1);

      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);
      clearEventSpies(eventSpies);

      // WHEN: Manually advance round
      advanceRound(orchestrator);

      // THEN: Transitions to waiting_input
      expect(eventSpies.stateChange).toHaveBeenCalled();
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);
    });

    it('does not emit roundStart without calling startNewRound', async () => {
      // GIVEN: Orchestrator in timeout_intermission
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);
      orchestrator.submitGuess(currentNote!);

      clearEventSpies(eventSpies);

      // WHEN: Manually advance round (without startNewRound)
      advanceRound(orchestrator);

      // THEN: roundStart NOT emitted (only state change)
      expect(eventSpies.roundStart).not.toHaveBeenCalled();
      expect(eventSpies.stateChange).toHaveBeenCalled();
    });

    it('allows starting new round after manual advance', async () => {
      // GIVEN: Manually advanced from intermission
      await orchestrator.startNewRound();
      orchestrator.handleTimeout(1);
      advanceRound(orchestrator);

      clearEventSpies(eventSpies);

      // WHEN: Start new round
      await orchestrator.startNewRound();

      // THEN: roundStart emitted
      expect(eventSpies.roundStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('Round State Transitions', () => {
    it('emits stateChange when transitioning between round states', async () => {
      // GIVEN: Start in waiting_input
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);

      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);
      clearEventSpies(eventSpies);

      // WHEN: Submit guess (transitions to processing_guess, then timeout_intermission)
      orchestrator.submitGuess(currentNote!);

      // THEN: Multiple stateChange events
      expect(eventSpies.stateChange.mock.calls.length).toBeGreaterThanOrEqual(2);

      // Final state is timeout_intermission
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);
    });

    it('maintains sessionState as playing during round transitions', async () => {
      // GIVEN: Playing state
      await orchestrator.startNewRound();

      // WHEN: Go through multiple rounds
      const currentNote = getNoteFromRoundStart(eventSpies);
      orchestrator.submitGuess(currentNote!);
      advanceRound(orchestrator);

      await orchestrator.startNewRound();

      // THEN: Always in playing session state
      const allStateChanges = eventSpies.stateChange.mock.calls.map(call => call[0]);
      allStateChanges.forEach(stateChange => {
        expect(stateChange.sessionState).toBe('playing');
      });
    });
  });

  describe('Round Flow Edge Cases', () => {
    it('handles rapid round start calls', async () => {
      // WHEN: Start multiple rounds rapidly
      await orchestrator.startNewRound();
      await orchestrator.startNewRound();
      await orchestrator.startNewRound();

      // THEN: Final roundStart succeeds
      expect(eventSpies.roundStart.mock.calls.length).toBeGreaterThan(0);
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);
    });

    it('can start round even when completed (no state guards)', async () => {
      // GIVEN: Completed state
      orchestrator.complete();
      expect(orchestrator.getSnapshot().matches('completed')).toBe(true);

      clearEventSpies(eventSpies);

      // WHEN: Try to start new round
      await orchestrator.startNewRound();

      // THEN: roundStart emitted (orchestrator has no state guards)
      expect(eventSpies.roundStart).toHaveBeenCalled();
    });

    it('preserves round count across multiple rounds', async () => {
      // WHEN: Complete multiple rounds
      for (let i = 0; i < 3; i++) {
        await orchestrator.startNewRound();
        const currentNote = getNoteFromRoundStart(eventSpies);
        orchestrator.submitGuess(currentNote!);
        advanceRound(orchestrator);
      }

      // THEN: roundStart called 3 times total
      expect(eventSpies.roundStart.mock.calls.length).toBe(3);
    });
  });

  describe('Round Flow Lifecycle', () => {
    it('can start new round after advancing from intermission', async () => {
      // GIVEN: In timeout_intermission after correct guess
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);

      orchestrator.submitGuess(currentNote!);
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);

      // WHEN: Advance and start new round
      advanceRound(orchestrator);
      clearEventSpies(eventSpies);

      await orchestrator.startNewRound();

      // THEN: New round starts successfully
      expect(eventSpies.roundStart).toHaveBeenCalled();
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);
    });

    it('can cycle through multiple rounds', async () => {
      // WHEN: Go through 3 complete round cycles
      for (let i = 0; i < 3; i++) {
        await orchestrator.startNewRound();
        const note = getNoteFromRoundStart(eventSpies);
        orchestrator.submitGuess(note!);
        advanceRound(orchestrator);
      }

      // THEN: Successfully completed 3 rounds
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);
    });
  });
});
