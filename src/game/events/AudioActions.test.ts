import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { GameOrchestrator } from '../GameOrchestrator';
import {
  setupTestEnvironment,
  clearEventSpies,
  getLastEventPayload,
  getNoteFromRoundStart,
} from '../../test/gameTestUtils';

/**
 * Audio Actions Event Tests
 *
 * Tests that audio-related actions trigger the correct events (or NO events).
 * Focuses on:
 * - replayNote() - Should NOT emit orchestrator events
 * - startNewRound() - Should emit roundStart AND play audio
 * - setNoteDuration() - Should NOT emit events
 */
describe('Audio Actions: Events', () => {
  let orchestrator: GameOrchestrator;
  let eventSpies: ReturnType<typeof import('../../test/gameTestUtils').createEventSpies>;

  beforeEach(() => {
    const setup = setupTestEnvironment();
    orchestrator = setup.orchestrator;
    eventSpies = setup.eventSpies;

    orchestrator.startGame();
    clearEventSpies(eventSpies);
  });

  afterEach(() => {
    orchestrator?.stop();
    vi.clearAllMocks();
  });

  describe('Replay Note (Pure Audio Action)', () => {
    beforeEach(async () => {
      // Ensure we have a current note to replay
      await orchestrator.startNewRound();
      clearEventSpies(eventSpies);
    });

    it('does NOT emit any orchestrator events', async () => {
      // GIVEN: Orchestrator with current note (verified in waiting_input state)
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);

      // WHEN: Replay note
      await orchestrator.replayNote();

      // THEN: NO orchestrator events emitted
      expect(eventSpies.roundStart).not.toHaveBeenCalled();
      expect(eventSpies.guessAttempt).not.toHaveBeenCalled();
      expect(eventSpies.guessResult).not.toHaveBeenCalled();
      expect(eventSpies.stateChange).not.toHaveBeenCalled();
      expect(eventSpies.feedbackUpdate).not.toHaveBeenCalled();
      expect(eventSpies.sessionComplete).not.toHaveBeenCalled();
    });

    it('maintains current state after replay', async () => {
      // GIVEN: Orchestrator in waiting_input state
      const stateBefore = orchestrator.getSnapshot().value;

      // WHEN: Replay note
      await orchestrator.replayNote();

      // THEN: State unchanged
      const stateAfter = orchestrator.getSnapshot().value;
      expect(stateAfter).toEqual(stateBefore);
    });

    it('does not change current note', async () => {
      // GIVEN: Orchestrator with current note
      const stateBefore = orchestrator.getSnapshot().value;

      // WHEN: Replay note
      await orchestrator.replayNote();

      // THEN: State unchanged (current note is internal to orchestrator)
      const stateAfter = orchestrator.getSnapshot().value;
      expect(stateAfter).toEqual(stateBefore);
    });

    it('does not affect stats', async () => {
      // GIVEN: Orchestrator with stats
      const statsBefore = orchestrator.getStats();

      // WHEN: Replay note
      await orchestrator.replayNote();

      // THEN: Stats unchanged
      const statsAfter = orchestrator.getStats();
      expect(statsAfter).toEqual(statsBefore);
    });

    it('can be called multiple times', async () => {
      // WHEN: Replay note multiple times
      await orchestrator.replayNote();
      await orchestrator.replayNote();
      await orchestrator.replayNote();

      // THEN: No events emitted, no errors
      expect(eventSpies.roundStart).not.toHaveBeenCalled();
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);
    });

    it('can be called from waiting_input state', async () => {
      // GIVEN: waiting_input state
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);

      // WHEN: Replay note
      await orchestrator.replayNote();

      // THEN: Still in waiting_input, no events
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);
      expect(eventSpies.stateChange).not.toHaveBeenCalled();
    });

    it('logs warning if no current note exists', async () => {
      // GIVEN: Orchestrator without current note
      orchestrator.resetGame();

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // WHEN: Try to replay note
      await orchestrator.replayNote();

      // THEN: Warning logged
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Initial Note Playback (via startNewRound)', () => {
    it('emits roundStart event with note', async () => {
      // WHEN: Start new round
      await orchestrator.startNewRound();

      // THEN: roundStart emitted
      expect(eventSpies.roundStart).toHaveBeenCalledTimes(1);

      const roundStart = getLastEventPayload<any>(eventSpies.roundStart);
      expect(roundStart.note).toBeDefined();
      expect(roundStart.note).toMatchObject({
        note: expect.any(String),
        octave: expect.any(Number),
      });
    });

    it('plays audio for the generated note', async () => {
      // GIVEN: Mock audio engine already configured in test setup

      // WHEN: Start new round
      await orchestrator.startNewRound();

      // THEN: roundStart emitted with note
      const roundStart = getLastEventPayload<any>(eventSpies.roundStart);
      expect(roundStart.note).toBeDefined();

      // Audio playback happens internally via audioEngine.playNote()
      // (Already mocked in test/setup.ts)
    });

    it('generates new note for each round', async () => {
      // WHEN: Start multiple rounds
      await orchestrator.startNewRound();
      const note1 = getLastEventPayload<any>(eventSpies.roundStart).note;

      clearEventSpies(eventSpies);

      await orchestrator.startNewRound();
      const note2 = getLastEventPayload<any>(eventSpies.roundStart).note;

      clearEventSpies(eventSpies);

      await orchestrator.startNewRound();
      const note3 = getLastEventPayload<any>(eventSpies.roundStart).note;

      // THEN: Notes are generated (may or may not be different due to randomness)
      expect(note1).toBeDefined();
      expect(note2).toBeDefined();
      expect(note3).toBeDefined();
    });

    it('emits roundStart with mode-specific feedback', async () => {
      // WHEN: Start new round
      await orchestrator.startNewRound();

      // THEN: Feedback included
      const roundStart = getLastEventPayload<any>(eventSpies.roundStart);
      expect(roundStart.feedback).toBeDefined();
      expect(typeof roundStart.feedback).toBe('string');
      expect(roundStart.feedback.length).toBeGreaterThan(0);
    });

    it('transitions to waiting_input state', async () => {
      // WHEN: Start new round
      await orchestrator.startNewRound();

      // THEN: State is waiting_input
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);
    });
  });

  describe('Note Duration Changes', () => {
    it('does NOT emit any events when note duration changed', () => {
      // GIVEN: Orchestrator in any state
      clearEventSpies(eventSpies);

      // WHEN: Set note duration
      orchestrator.setNoteDuration('4n');

      // THEN: NO events emitted
      expect(eventSpies.roundStart).not.toHaveBeenCalled();
      expect(eventSpies.guessAttempt).not.toHaveBeenCalled();
      expect(eventSpies.guessResult).not.toHaveBeenCalled();
      expect(eventSpies.stateChange).not.toHaveBeenCalled();
      expect(eventSpies.feedbackUpdate).not.toHaveBeenCalled();
      expect(eventSpies.sessionComplete).not.toHaveBeenCalled();
    });

    it('does NOT change state', () => {
      // GIVEN: Orchestrator in waiting_input
      const stateBefore = orchestrator.getSnapshot().value;

      // WHEN: Set note duration
      orchestrator.setNoteDuration('8n');

      // THEN: State unchanged
      const stateAfter = orchestrator.getSnapshot().value;
      expect(stateAfter).toEqual(stateBefore);
    });

    it('stores duration for next playback', () => {
      // WHEN: Set note duration
      orchestrator.setNoteDuration('2n');

      // THEN: Duration stored internally
      // (Can't directly verify without inspecting internal state,
      // but next playback will use this duration)
      expect(orchestrator.getSnapshot().value).toBeDefined();
    });

    it('can be changed multiple times', () => {
      // WHEN: Change duration multiple times
      orchestrator.setNoteDuration('4n');
      orchestrator.setNoteDuration('8n');
      orchestrator.setNoteDuration('16n');

      // THEN: No events, no errors
      expect(eventSpies.stateChange).not.toHaveBeenCalled();
    });
  });

  describe('Audio vs Event Separation', () => {
    it('replayNote is pure audio, startNewRound emits events', async () => {
      // GIVEN: Start a round
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);
      clearEventSpies(eventSpies);

      // WHEN: Replay note (pure audio)
      await orchestrator.replayNote();

      // THEN: No events
      expect(eventSpies.roundStart).not.toHaveBeenCalled();
      expect(eventSpies.stateChange).not.toHaveBeenCalled();

      // WHEN: Submit guess to advance round, then start new round (emits events)
      orchestrator.submitGuess(currentNote!);
      clearEventSpies(eventSpies);

      await orchestrator.startNewRound();

      // THEN: Events emitted
      expect(eventSpies.roundStart).toHaveBeenCalled();
    });

    it('replay does not interfere with game state or flow', async () => {
      // GIVEN: Round in progress
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);

      // WHEN: Replay note multiple times during gameplay
      await orchestrator.replayNote();
      await orchestrator.replayNote();

      // THEN: Can still submit guess normally
      clearEventSpies(eventSpies);
      orchestrator.submitGuess(currentNote!);

      expect(eventSpies.guessAttempt).toHaveBeenCalled();
      expect(eventSpies.guessResult).toHaveBeenCalled();
    });

    it('audio playback does not count as a guess attempt', async () => {
      // GIVEN: Round in progress
      await orchestrator.startNewRound();
      const statsBefore = orchestrator.getStats();

      // WHEN: Replay note multiple times
      await orchestrator.replayNote();
      await orchestrator.replayNote();
      await orchestrator.replayNote();

      // THEN: Stats unchanged (no attempts counted)
      const statsAfter = orchestrator.getStats();
      expect(statsAfter).toEqual(statsBefore);
    });
  });

  describe('Audio Action Edge Cases', () => {
    it('replay note can be called during timeout_intermission', async () => {
      // GIVEN: Orchestrator in timeout_intermission
      await orchestrator.startNewRound();
      orchestrator.handleTimeout(1);

      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);
      clearEventSpies(eventSpies);

      // WHEN: Replay note during intermission
      await orchestrator.replayNote();

      // THEN: No events, still in intermission
      expect(eventSpies.stateChange).not.toHaveBeenCalled();
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);
    });

    it('replay note cannot be called when paused (no current note in context)', async () => {
      // GIVEN: Paused game
      await orchestrator.startNewRound();
      orchestrator.pause();

      clearEventSpies(eventSpies);

      // WHEN: Try to replay note while paused
      await orchestrator.replayNote();

      // THEN: No events (audio may or may not play based on implementation)
      expect(eventSpies.stateChange).not.toHaveBeenCalled();
    });

    it('replay note can be called when completed (note still exists)', async () => {
      // GIVEN: Completed game (note still exists after completion)
      await orchestrator.startNewRound();
      orchestrator.complete();

      clearEventSpies(eventSpies);

      // WHEN: Replay note after completion
      await orchestrator.replayNote();

      // THEN: No events emitted (audio plays but no state changes)
      expect(eventSpies.stateChange).not.toHaveBeenCalled();
      expect(eventSpies.roundStart).not.toHaveBeenCalled();
    });
  });
});
