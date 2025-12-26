import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameOrchestrator } from './GameOrchestrator';
import type { IGameMode } from './IGameMode';
import type { NoteFilter, NoteWithOctave } from '../types/music';
import { SessionState, RoundState } from '../machines/types';
// Import to register modes in test environment
import './modes/earTrainingModes';

/**
 * GameOrchestrator Timeout Intermission Tests
 *
 * Critical tests to prevent regression of correct note highlighting during timeout.
 * These tests ensure that stateChange events are properly emitted when rounds timeout,
 * allowing the UI to show the correct note to the user.
 *
 * REGRESSION PROTECTION: These tests protect against the bug where applySettings()
 * creates a new subscription without the stateChange event emission logic.
 */
describe('GameOrchestrator - Timeout Intermission', () => {
  let orchestrator: GameOrchestrator;
  let gameMode: IGameMode;
  let noteFilter: NoteFilter;
  let stateChangeEvents: Array<{ sessionState: SessionState; roundState?: RoundState }>;

  beforeEach(() => {
    vi.useFakeTimers();

    orchestrator = new GameOrchestrator();

    // Create note filter
    noteFilter = {
      keyType: 'chromatic',
      includeNaturals: true,
      includeSharps: false,
      includeFlats: false,
      octaveRange: { min: 4, max: 4 }
    };

    // Create mock game mode
    gameMode = {
      generateNote: vi.fn().mockReturnValue({ note: 'C', octave: 4 } as NoteWithOctave),
      validateGuess: vi.fn().mockReturnValue(false), // Default to incorrect
      onStartNewRound: vi.fn(),
      handleCorrectGuess: vi.fn().mockReturnValue({
        feedback: 'Correct!',
        shouldAdvance: true,
        gameCompleted: false
      }),
      handleIncorrectGuess: vi.fn().mockReturnValue({
        feedback: 'Incorrect',
        shouldAdvance: false,
        gameCompleted: false
      }),
      isGameComplete: vi.fn().mockReturnValue(false),
      getMode: vi.fn().mockReturnValue('sandbox'),
      getFeedbackMessage: vi.fn().mockReturnValue('Listen to the note and identify it on the keyboard'),
      isCompleted: false,
      elapsedTime: 0
    } as any;

    // Track stateChange events
    stateChangeEvents = [];
    orchestrator.on('stateChange', ({ sessionState, roundState }) => {
      stateChangeEvents.push({ sessionState, roundState });
    });

    orchestrator.start();
  });

  afterEach(() => {
    orchestrator.stop();
    vi.useRealTimers();
  });

  describe('stateChange event emission', () => {
    it('should emit stateChange event when entering TIMEOUT_INTERMISSION', async () => {
      // Apply settings (this recreates the actor and subscription)
      orchestrator.applySettings(
        'sandbox',
        { sandbox: { sessionDuration: 1, accuracyTarget: 80, streakTarget: 5 } },
        noteFilter,
        '4n',
        3, // 3 second timeout
        1500, // autoAdvanceSpeed
        vi.fn(), // onTimerUpdate
        vi.fn()  // onSessionTimerUpdate
      );

      orchestrator.setGameMode(gameMode);
      orchestrator.setNoteFilter(noteFilter);

      // Start a round
      await orchestrator.beginNewRound();

      // Clear any stateChange events from setup
      stateChangeEvents = [];

      // Wait for round timeout (3 seconds)
      await vi.advanceTimersByTimeAsync(3000);

      // Should have emitted stateChange for entering TIMEOUT_INTERMISSION
      const timeoutIntermissionEvent = stateChangeEvents.find(
        event => event.roundState === RoundState.TIMEOUT_INTERMISSION
      );

      expect(timeoutIntermissionEvent).toBeDefined();
      expect(timeoutIntermissionEvent?.sessionState).toBe(SessionState.PLAYING);
      expect(timeoutIntermissionEvent?.roundState).toBe(RoundState.TIMEOUT_INTERMISSION);
    });

    it.skip('should emit stateChange event when exiting TIMEOUT_INTERMISSION', async () => {
      // Apply settings
      orchestrator.applySettings(
        'sandbox',
        { sandbox: { sessionDuration: 1, accuracyTarget: 80, streakTarget: 5 } },
        noteFilter,
        '4n',
        3,
        1500,
        vi.fn(),
        vi.fn()
      );

      orchestrator.setGameMode(gameMode);
      orchestrator.setNoteFilter(noteFilter);

      // Start a round
      await orchestrator.beginNewRound();

      // Clear setup events
      stateChangeEvents = [];

      // Wait for timeout
      await vi.advanceTimersByTimeAsync(3000);

      // Wait for auto-advance (1500ms)
      await vi.advanceTimersByTimeAsync(1500);

      // Should have emitted stateChange for exiting TIMEOUT_INTERMISSION
      // Last event should be WAITING_INPUT for the next round
      const lastEvent = stateChangeEvents[stateChangeEvents.length - 1];
      expect(lastEvent.roundState).toBe(RoundState.WAITING_INPUT);
    });

    it('should emit stateChange events even after applySettings recreates actor', async () => {
      // First, apply settings once
      orchestrator.applySettings(
        'sandbox',
        { sandbox: { sessionDuration: 1, accuracyTarget: 80, streakTarget: 5 } },
        noteFilter,
        '4n',
        3,
        1500,
        vi.fn(),
        vi.fn()
      );

      orchestrator.setGameMode(gameMode);
      orchestrator.setNoteFilter(noteFilter);

      // Now apply settings AGAIN (simulating settings change)
      // This is where the bug occurred - the new subscription didn't have stateChange emission
      orchestrator.applySettings(
        'sandbox',
        { sandbox: { sessionDuration: 2, accuracyTarget: 90, streakTarget: 10 } }, // Different settings
        noteFilter,
        '4n',
        3,
        1500,
        vi.fn(),
        vi.fn()
      );

      // Clear any events from setup
      stateChangeEvents = [];

      // Start a round
      await orchestrator.beginNewRound();

      // Clear events from round start
      stateChangeEvents = [];

      // Wait for timeout
      await vi.advanceTimersByTimeAsync(3000);

      // CRITICAL: stateChange event MUST still be emitted after applySettings
      const timeoutEvent = stateChangeEvents.find(
        event => event.roundState === RoundState.TIMEOUT_INTERMISSION
      );

      expect(timeoutEvent).toBeDefined();
      expect(timeoutEvent?.roundState).toBe(RoundState.TIMEOUT_INTERMISSION);
    });
  });

  describe('Integration: Complete timeout flow', () => {
    it.skip('should emit correct sequence of stateChange events during timeout', async () => {
      orchestrator.applySettings(
        'sandbox',
        { sandbox: { sessionDuration: 1, accuracyTarget: 80, streakTarget: 5 } },
        noteFilter,
        '4n',
        3,
        1500,
        vi.fn(),
        vi.fn()
      );

      orchestrator.setGameMode(gameMode);
      orchestrator.setNoteFilter(noteFilter);

      // Start round
      await orchestrator.beginNewRound();

      stateChangeEvents = [];

      // Wait for timeout (3s) + auto-advance (1.5s)
      await vi.advanceTimersByTimeAsync(3000);
      await vi.advanceTimersByTimeAsync(1500);

      // Should have sequence:
      // 1. Enter TIMEOUT_INTERMISSION
      // 2. Exit to WAITING_INPUT (next round)
      const roundStates = stateChangeEvents
        .filter(e => e.roundState !== undefined)
        .map(e => e.roundState);

      expect(roundStates).toContain(RoundState.TIMEOUT_INTERMISSION);
      expect(roundStates).toContain(RoundState.WAITING_INPUT);

      // TIMEOUT_INTERMISSION should come before WAITING_INPUT
      const timeoutIndex = roundStates.indexOf(RoundState.TIMEOUT_INTERMISSION);
      const waitingIndex = roundStates.lastIndexOf(RoundState.WAITING_INPUT);
      expect(timeoutIndex).toBeLessThan(waitingIndex);
    });

    it.skip('should allow UI to show correct note during TIMEOUT_INTERMISSION', async () => {
      // This test simulates what NoteIdentification.tsx does
      let correctNoteVisible = false;
      let currentNote: any = null;

      // Subscribe to events like NoteIdentification does
      orchestrator.on('roundStart', ({ context }) => {
        currentNote = context.note;
        correctNoteVisible = false; // Hide correct note on new round
      });

      orchestrator.on('stateChange', ({ sessionState, roundState }) => {
        // Show correct note when entering TIMEOUT_INTERMISSION
        if (roundState === RoundState.TIMEOUT_INTERMISSION) {
          correctNoteVisible = true;
        }
        // Hide correct note when exiting to WAITING_INPUT
        if (roundState === RoundState.WAITING_INPUT && correctNoteVisible) {
          correctNoteVisible = false;
        }
      });

      // Setup
      orchestrator.applySettings(
        'sandbox',
        { sandbox: { sessionDuration: 1, accuracyTarget: 80, streakTarget: 5 } },
        noteFilter,
        '4n',
        3,
        1500,
        vi.fn(),
        vi.fn()
      );

      orchestrator.setGameMode(gameMode);
      orchestrator.setNoteFilter(noteFilter);

      // Start round
      await orchestrator.beginNewRound();
      expect(currentNote).toBeDefined();
      expect(correctNoteVisible).toBe(false);

      // Wait for timeout
      await vi.advanceTimersByTimeAsync(3000);

      // CRITICAL: Correct note should now be visible
      expect(correctNoteVisible).toBe(true);

      // Wait for auto-advance to next round
      await vi.advanceTimersByTimeAsync(1500);

      // Correct note should be hidden again
      expect(correctNoteVisible).toBe(false);
    });
  });

  describe('Regression protection', () => {
    it('should not break stateChange emission when actor is recreated', async () => {
      // This test specifically protects against the bug where applySettings()
      // recreates the actor and sets up a subscription without stateChange emission

      const stateChangeHandler = vi.fn();
      orchestrator.on('stateChange', stateChangeHandler);

      // Apply settings (creates actor and subscription)
      orchestrator.applySettings(
        'sandbox',
        { sandbox: { sessionDuration: 1, accuracyTarget: 80, streakTarget: 5 } },
        noteFilter,
        '4n',
        3,
        1500,
        vi.fn(),
        vi.fn()
      );

      orchestrator.setGameMode(gameMode);
      orchestrator.setNoteFilter(noteFilter);

      // Start round
      await orchestrator.beginNewRound();

      // Reset mock to ignore setup calls
      stateChangeHandler.mockClear();

      // Trigger timeout
      await vi.advanceTimersByTimeAsync(3000);

      // Verify stateChange was called with TIMEOUT_INTERMISSION
      const calls = stateChangeHandler.mock.calls;
      const timeoutCall = calls.find(
        ([{ roundState }]) => roundState === RoundState.TIMEOUT_INTERMISSION
      );

      expect(timeoutCall).toBeDefined();
      expect(timeoutCall![0]).toMatchObject({
        sessionState: SessionState.PLAYING,
        roundState: RoundState.TIMEOUT_INTERMISSION
      });
    });

    it('should emit stateChange from BOTH start() and applySettings() subscriptions', async () => {
      // Track which subscription emitted the event
      const eventsFromStart: any[] = [];
      const eventsFromApplySettings: any[] = [];

      // Spy on console.log to see which subscription fired
      const originalLog = console.log;
      console.log = vi.fn((...args) => {
        if (args[0]?.includes('State changed (applySettings subscription)')) {
          eventsFromApplySettings.push(args);
        } else if (args[0]?.includes('State changed:') && !args[0]?.includes('applySettings')) {
          eventsFromStart.push(args);
        }
        originalLog(...args);
      });

      try {
        orchestrator.applySettings(
          'sandbox',
          { sandbox: { sessionDuration: 1, accuracyTarget: 80, streakTarget: 5 } },
          noteFilter,
          '4n',
          3,
          1500,
          vi.fn(),
          vi.fn()
        );

        orchestrator.setGameMode(gameMode);
        orchestrator.setNoteFilter(noteFilter);

        await orchestrator.beginNewRound();
        await vi.advanceTimersByTimeAsync(3000);

        // After applySettings(), events should come from the applySettings subscription
        expect(eventsFromApplySettings.length).toBeGreaterThan(0);
      } finally {
        console.log = originalLog;
      }
    });
  });
});
