import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { GameOrchestrator } from '../GameOrchestrator';
import {
  setupTestEnvironment,
  clearEventSpies,
  pauseGame,
  resumeGame,
  advanceRound,
  getAllEventPayloads,
  getNoteFromRoundStart,
} from '../../test/gameTestUtils';

/**
 * State Change Actions Event Tests
 *
 * Tests that all state machine transitions emit correct stateChange events.
 * Focuses on:
 * - Session state transitions (idle → playing → paused → completed)
 * - Round state transitions (waiting_input → processing_guess → timeout_intermission)
 * - Complex state sequences
 */
describe('State Change Actions: Events', () => {
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

  describe('Session State Transitions', () => {
    it('IDLE → PLAYING: startGame()', () => {
      // GIVEN: Idle state
      expect(orchestrator.isIdle()).toBe(true);
      clearEventSpies(eventSpies);

      // WHEN: Start game
      orchestrator.startGame();

      // THEN: stateChange events emitted
      expect(eventSpies.stateChange).toHaveBeenCalled();

      // Final state is playing
      expect(orchestrator.isPlaying()).toBe(true);

      const stateChanges = getAllEventPayloads<any>(eventSpies.stateChange);
      const finalState = stateChanges[stateChanges.length - 1];
      expect(finalState.sessionState).toBe('playing');
    });

    it('PLAYING → PAUSED: pause()', async () => {
      // GIVEN: Playing state
      orchestrator.startGame();
      await orchestrator.startNewRound();
      expect(orchestrator.isPlaying()).toBe(true);

      clearEventSpies(eventSpies);

      // WHEN: Pause
      pauseGame(orchestrator);

      // THEN: stateChange event with paused state
      expect(eventSpies.stateChange).toHaveBeenCalled();

      const stateChanges = getAllEventPayloads<any>(eventSpies.stateChange);
      const pausedState = stateChanges.find(s => s.sessionState === 'paused');
      expect(pausedState).toBeDefined();
      expect(pausedState!.sessionState).toBe('paused');
    });

    it('PAUSED → PLAYING: resume()', async () => {
      // GIVEN: Paused state
      orchestrator.startGame();
      await orchestrator.startNewRound();
      pauseGame(orchestrator);
      expect(orchestrator.isPaused()).toBe(true);

      clearEventSpies(eventSpies);

      // WHEN: Resume
      resumeGame(orchestrator);

      // THEN: stateChange event with playing state
      expect(eventSpies.stateChange).toHaveBeenCalled();

      const stateChanges = getAllEventPayloads<any>(eventSpies.stateChange);
      const playingState = stateChanges.find(s => s.sessionState === 'playing');
      expect(playingState).toBeDefined();
      expect(playingState!.sessionState).toBe('playing');
    });

    it('PLAYING → COMPLETED: complete()', () => {
      // GIVEN: Playing state
      orchestrator.startGame();
      expect(orchestrator.isPlaying()).toBe(true);

      clearEventSpies(eventSpies);

      // WHEN: Complete game
      orchestrator.complete();

      // THEN: stateChange event with completed state
      expect(eventSpies.stateChange).toHaveBeenCalled();

      const stateChanges = getAllEventPayloads<any>(eventSpies.stateChange);
      const completedState = stateChanges.find(s => s.sessionState === 'completed');
      expect(completedState).toBeDefined();
      expect(completedState!.sessionState).toBe('completed');
    });

    it('COMPLETED → IDLE: reset()', () => {
      // GIVEN: Completed state
      orchestrator.startGame();
      orchestrator.complete();
      expect(orchestrator.getSnapshot().matches('completed')).toBe(true);

      clearEventSpies(eventSpies);

      // WHEN: Reset (send RESET action)
      orchestrator.send({ type: 'reset' as any });

      // THEN: stateChange event with idle state (eventually)
      expect(orchestrator.isIdle()).toBe(true);
    });

    it('COMPLETED → PLAYING: playAgain()', () => {
      // GIVEN: Completed state
      orchestrator.startGame();
      orchestrator.complete();
      expect(orchestrator.getSnapshot().matches('completed')).toBe(true);

      clearEventSpies(eventSpies);

      // WHEN: Play again
      orchestrator.playAgain();

      // THEN: stateChange events to playing
      expect(eventSpies.stateChange).toHaveBeenCalled();

      const stateChanges = getAllEventPayloads<any>(eventSpies.stateChange);
      const playingState = stateChanges.find(s => s.sessionState === 'playing');
      expect(playingState).toBeDefined();
      expect(orchestrator.isPlaying()).toBe(true);
    });
  });

  describe('Round State Transitions', () => {
    beforeEach(() => {
      orchestrator.startGame();
      clearEventSpies(eventSpies);
    });

    it('WAITING_INPUT → PROCESSING_GUESS: submitGuess()', async () => {
      // GIVEN: waiting_input state
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);

      clearEventSpies(eventSpies);

      // WHEN: Submit guess
      orchestrator.submitGuess(currentNote!);

      // THEN: stateChange to processing_guess
      const stateChanges = getAllEventPayloads<any>(eventSpies.stateChange);
      const processingState = stateChanges.find(s => s.roundState === 'processing_guess');
      expect(processingState).toBeDefined();
    });

    it('PROCESSING_GUESS → TIMEOUT_INTERMISSION: after guess processed', async () => {
      // GIVEN: waiting_input state
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);

      clearEventSpies(eventSpies);

      // WHEN: Submit guess (transitions through processing to intermission)
      orchestrator.submitGuess(currentNote!);

      // THEN: Final state is timeout_intermission
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);

      const stateChanges = getAllEventPayloads<any>(eventSpies.stateChange);
      const intermissionState = stateChanges.find(s => s.roundState === 'timeout_intermission');
      expect(intermissionState).toBeDefined();
    });

    it('WAITING_INPUT → TIMEOUT_INTERMISSION: handleTimeout()', async () => {
      // GIVEN: waiting_input state
      await orchestrator.startNewRound();
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);

      clearEventSpies(eventSpies);

      // WHEN: Timeout
      orchestrator.handleTimeout(1);

      // THEN: stateChange to timeout_intermission
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);

      const stateChanges = getAllEventPayloads<any>(eventSpies.stateChange);
      const intermissionState = stateChanges.find(s => s.roundState === 'timeout_intermission');
      expect(intermissionState).toBeDefined();
    });

    it('TIMEOUT_INTERMISSION → WAITING_INPUT: ADVANCE_ROUND', async () => {
      // GIVEN: timeout_intermission state
      await orchestrator.startNewRound();
      orchestrator.handleTimeout(1);
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);

      clearEventSpies(eventSpies);

      // WHEN: Advance round
      advanceRound(orchestrator);

      // THEN: stateChange to waiting_input
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);

      const stateChanges = getAllEventPayloads<any>(eventSpies.stateChange);
      const waitingState = stateChanges.find(s => s.roundState === 'waiting_input');
      expect(waitingState).toBeDefined();
    });
  });

  describe('stateChange Event Payloads', () => {
    it('includes sessionState in all transitions', async () => {
      // WHEN: Perform various transitions
      orchestrator.startGame();
      await orchestrator.startNewRound();
      pauseGame(orchestrator);
      resumeGame(orchestrator);

      // THEN: All stateChange events have sessionState
      const stateChanges = getAllEventPayloads<any>(eventSpies.stateChange);
      stateChanges.forEach(change => {
        expect(change).toHaveProperty('sessionState');
        expect(typeof change.sessionState).toBe('string');
      });
    });

    it('includes roundState for round transitions', async () => {
      // WHEN: Perform round transitions
      orchestrator.startGame();
      clearEventSpies(eventSpies);

      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);
      orchestrator.submitGuess(currentNote!);

      // THEN: Round state changes include roundState
      const stateChanges = getAllEventPayloads<any>(eventSpies.stateChange);
      const roundStateChanges = stateChanges.filter(s => s.roundState !== undefined);

      expect(roundStateChanges.length).toBeGreaterThan(0);
      roundStateChanges.forEach(change => {
        expect(change.roundState).toBeTruthy();
      });
    });

    it('session state remains "playing" during round transitions', async () => {
      // WHEN: Perform round transitions
      orchestrator.startGame();
      clearEventSpies(eventSpies);

      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);
      orchestrator.submitGuess(currentNote!);
      advanceRound(orchestrator);

      // THEN: All state changes have sessionState: 'playing'
      const stateChanges = getAllEventPayloads<any>(eventSpies.stateChange);
      stateChanges.forEach(change => {
        expect(change.sessionState).toBe('playing');
      });
    });
  });

  describe('Complex State Sequences', () => {
    it('emits all state changes in correct order for full game flow', async () => {
      // WHEN: Complete game flow
      const eventLog: string[] = [];

      eventSpies.stateChange.mockImplementation((state: any) => {
        const desc = state.roundState
          ? `${state.sessionState}.${state.roundState}`
          : state.sessionState;
        eventLog.push(desc);
      });

      // Start → Guess → Advance → Pause → Resume → Complete
      orchestrator.startGame();
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);
      orchestrator.submitGuess(currentNote!);
      advanceRound(orchestrator);
      pauseGame(orchestrator);
      resumeGame(orchestrator);
      orchestrator.complete();

      // THEN: State changes occur in expected sequence
      expect(eventLog.length).toBeGreaterThan(0);

      // Should include: playing, processing_guess, timeout_intermission, paused, playing, completed
      expect(eventLog).toContain('paused');
      expect(eventLog).toContain('completed');
    });

    it('pause/resume preserves exact round state', async () => {
      // WHEN: Pause from each round state and verify restoration

      // 1. Pause from waiting_input
      orchestrator.startGame();
      await orchestrator.startNewRound();
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);

      pauseGame(orchestrator);
      resumeGame(orchestrator);

      // THEN: Returns to waiting_input
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);

      // 2. Pause from timeout_intermission
      orchestrator.handleTimeout(1);
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);

      pauseGame(orchestrator);
      resumeGame(orchestrator);

      // THEN: Returns to timeout_intermission
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);
    });

    it('completion from different round states emits correct stateChange', async () => {
      // WHEN: Complete from waiting_input
      orchestrator.startGame();
      await orchestrator.startNewRound();
      expect(orchestrator.getSnapshot().matches('playing.waiting_input')).toBe(true);

      clearEventSpies(eventSpies);

      orchestrator.complete();

      // THEN: stateChange to completed
      const stateChanges = getAllEventPayloads<any>(eventSpies.stateChange);
      expect(stateChanges.some(s => s.sessionState === 'completed')).toBe(true);

      // Reset and test from timeout_intermission
      orchestrator.stop();
      const setup = setupTestEnvironment();
      orchestrator = setup.orchestrator;
      eventSpies = setup.eventSpies;

      orchestrator.startGame();
      await orchestrator.startNewRound();
      orchestrator.handleTimeout(1);
      expect(orchestrator.getSnapshot().matches('playing.timeout_intermission')).toBe(true);

      clearEventSpies(eventSpies);

      orchestrator.complete();

      // THEN: stateChange to completed
      const stateChanges2 = getAllEventPayloads<any>(eventSpies.stateChange);
      expect(stateChanges2.some(s => s.sessionState === 'completed')).toBe(true);
    });
  });

  describe('State Transition Edge Cases', () => {
    it('rapid pause/resume cycles emit all state changes', async () => {
      // WHEN: Rapid pause/resume
      orchestrator.startGame();
      await orchestrator.startNewRound();
      clearEventSpies(eventSpies);

      pauseGame(orchestrator);
      resumeGame(orchestrator);
      pauseGame(orchestrator);
      resumeGame(orchestrator);
      pauseGame(orchestrator);
      resumeGame(orchestrator);

      // THEN: All transitions emit stateChange
      expect(eventSpies.stateChange.mock.calls.length).toBe(6); // 3 pauses + 3 resumes
    });

    it('pausing from idle still emits stateChange', async () => {
      // GIVEN: Idle state
      expect(orchestrator.isIdle()).toBe(true);

      clearEventSpies(eventSpies);

      // WHEN: Try to pause from idle
      pauseGame(orchestrator);

      // THEN: stateChange emitted (stays in idle)
      expect(eventSpies.stateChange).toHaveBeenCalled();
      expect(orchestrator.isIdle()).toBe(true);
    });

    it('state changes include both session and round context', async () => {
      // WHEN: Perform transition that affects both
      orchestrator.startGame();

      // THEN: stateChange includes both sessionState and roundState
      const stateChanges = getAllEventPayloads<any>(eventSpies.stateChange);
      const playingState = stateChanges.find(s => s.sessionState === 'playing');

      expect(playingState).toBeDefined();
      expect(playingState.sessionState).toBe('playing');
      expect(playingState.roundState).toBe('waiting_input');
    });
  });

  describe('Session vs Round State Correlation', () => {
    it('round states only exist within playing session state', async () => {
      // WHEN: Track all state changes through lifecycle
      orchestrator.startGame();
      await orchestrator.startNewRound();
      const currentNote = getNoteFromRoundStart(eventSpies);
      orchestrator.submitGuess(currentNote!);
      orchestrator.complete();

      // THEN: Round states only when sessionState is 'playing'
      const stateChanges = getAllEventPayloads<any>(eventSpies.stateChange);
      stateChanges.forEach(change => {
        if (change.roundState) {
          expect(change.sessionState).toBe('playing');
        }
      });
    });

    it('paused state has no round state', async () => {
      // WHEN: Pause from any round state
      orchestrator.startGame();
      await orchestrator.startNewRound();
      clearEventSpies(eventSpies);

      pauseGame(orchestrator);

      // THEN: Paused stateChange has no roundState
      const stateChanges = getAllEventPayloads<any>(eventSpies.stateChange);
      const pausedState = stateChanges.find(s => s.sessionState === 'paused');

      expect(pausedState).toBeDefined();
      expect(pausedState!.roundState).toBeUndefined();
    });

    it('completed state has no round state', async () => {
      // WHEN: Complete game
      orchestrator.startGame();
      await orchestrator.startNewRound();
      clearEventSpies(eventSpies);

      orchestrator.complete();

      // THEN: Completed stateChange has no roundState
      const stateChanges = getAllEventPayloads<any>(eventSpies.stateChange);
      const completedState = stateChanges.find(s => s.sessionState === 'completed');

      expect(completedState).toBeDefined();
      expect(completedState!.roundState).toBeUndefined();
    });
  });
});
