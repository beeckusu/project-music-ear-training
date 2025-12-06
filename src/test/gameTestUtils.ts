import { vi } from 'vitest';
import { GameOrchestrator } from '../game/GameOrchestrator';
import { GameAction } from '../machines/types';
import { createGameState } from '../game/GameStateFactory';
import { EAR_TRAINING_SUB_MODES } from '../constants';
import type { NoteWithOctave } from '../types/music';
import type { OrchestratorEvents } from '../game/OrchestratorEvents';

/**
 * Common test note constants
 */
export const TEST_NOTES = {
  C4: { note: 'C' as const, octave: 4 },
  D4: { note: 'D' as const, octave: 4 },
  E4: { note: 'E' as const, octave: 4 },
  F4: { note: 'F' as const, octave: 4 },
  G4: { note: 'G' as const, octave: 4 },
  A4: { note: 'A' as const, octave: 4 },
  B4: { note: 'B' as const, octave: 4 },
  C5: { note: 'C' as const, octave: 5 },
} as const;

/**
 * Default note filter for tests (naturals only, octave 4)
 */
export const DEFAULT_NOTE_FILTER = {
  includeNaturals: true,
  includeSharps: false,
  includeFlats: false,
  octaveRange: { min: 4, max: 4 }
};

/**
 * Default game mode settings
 */
export const DEFAULT_SANDBOX_SETTINGS = {
  sandbox: {
    sessionDuration: 5,
    targetNotes: 10,
    targetAccuracy: 80
  }
};

export const DEFAULT_RUSH_SETTINGS = {
  rush: { targetNotes: 10 }
};

export const DEFAULT_SURVIVAL_SETTINGS = {
  survival: {
    sessionDuration: 5,
    healthDrainRate: 1,
    healthRecovery: 10,
    healthDamage: 20
  }
};

/**
 * Creates event spies for all orchestrator events
 */
export function createEventSpies() {
  return {
    roundStart: vi.fn(),
    roundEnd: vi.fn(),
    guessAttempt: vi.fn(),
    guessResult: vi.fn(),
    sessionStart: vi.fn(),
    sessionComplete: vi.fn(),
    feedbackUpdate: vi.fn(),
    stateChange: vi.fn(),
  };
}

/**
 * Sets up a GameOrchestrator with specified mode and settings
 */
export function setupOrchestrator(
  mode = EAR_TRAINING_SUB_MODES.SANDBOX,
  settings = DEFAULT_SANDBOX_SETTINGS
) {
  const orch = new GameOrchestrator();
  orch.start();

  const gameState = createGameState(mode, settings);
  orch.setGameMode(gameState);
  orch.setNoteFilter(DEFAULT_NOTE_FILTER);

  return orch;
}

/**
 * Subscribes event spies to orchestrator events
 */
export function subscribeToEvents(
  orchestrator: GameOrchestrator,
  spies: ReturnType<typeof createEventSpies>
) {
  Object.keys(spies).forEach((event) => {
    orchestrator.on(
      event as keyof OrchestratorEvents,
      spies[event as keyof typeof spies]
    );
  });
}

/**
 * Helper function to make a correct guess and handle completion.
 * This mimics what the real orchestrator does when handling guesses.
 */
export function makeCorrectGuess(orch: GameOrchestrator, note: string = 'C4') {
  orch.send({ type: GameAction.MAKE_GUESS, guessedNote: note });

  // Call handleCorrectGuess to update stats (this is what the real orchestrator does)
  const gameMode = (orch as any).gameMode;
  const result = gameMode.handleCorrectGuess();

  orch.send({ type: GameAction.CORRECT_GUESS });

  // Check if game is complete and call complete
  if (result.gameCompleted) {
    orch.complete();
  }
}

/**
 * Helper function to make an incorrect guess and handle game over.
 */
export function makeIncorrectGuess(orch: GameOrchestrator, note: string = 'C4') {
  orch.send({ type: GameAction.MAKE_GUESS, guessedNote: note });

  // Call handleIncorrectGuess to update stats (this is what the real orchestrator does)
  const gameMode = (orch as any).gameMode;
  const result = gameMode.handleIncorrectGuess();

  orch.send({ type: GameAction.INCORRECT_GUESS });

  // Check if game over (health depleted in Survival mode)
  if (result.gameCompleted) {
    orch.complete();
  }
}

/**
 * Helper to advance to the next round
 */
export function advanceRound(orch: GameOrchestrator) {
  orch.send({ type: GameAction.ADVANCE_ROUND });
}

/**
 * Helper to trigger a timeout
 */
export function triggerTimeout(orch: GameOrchestrator) {
  orch.send({ type: GameAction.TIMEOUT });
}

/**
 * Helper to pause the game
 */
export function pauseGame(orch: GameOrchestrator) {
  orch.pause();
}

/**
 * Helper to resume the game
 */
export function resumeGame(orch: GameOrchestrator) {
  orch.resume();
}

/**
 * Complete setup: creates orchestrator, subscribes spies, and returns both
 */
export function setupTestEnvironment(
  mode = EAR_TRAINING_SUB_MODES.SANDBOX,
  settings = DEFAULT_SANDBOX_SETTINGS
) {
  const orchestrator = setupOrchestrator(mode, settings);
  const eventSpies = createEventSpies();
  subscribeToEvents(orchestrator, eventSpies);

  // CRITICAL: Subscribe to state machine to activate stateChange event emissions
  // This mimics what the UI does in NoteIdentification.tsx
  orchestrator.subscribe(() => {
    // Empty callback - we only need this to trigger stateChange events
  });

  return { orchestrator, eventSpies };
}

/**
 * Gets the current note from the most recent roundStart event.
 * This is the correct way to get the note in tests - DO NOT use orchestrator.getCurrentNote()
 * which reads from stale state machine context.
 */
export function getNoteFromRoundStart(spies: ReturnType<typeof createEventSpies>) {
  const roundStartData = getLastEventPayload<any>(spies.roundStart);
  return roundStartData?.note || null;
}

/**
 * Clears all event spy call history
 */
export function clearEventSpies(spies: ReturnType<typeof createEventSpies>) {
  Object.values(spies).forEach(spy => spy.mockClear());
}

/**
 * Helper to get the last call's first argument from a spy
 */
export function getLastEventPayload<T>(spy: ReturnType<typeof vi.fn>): T {
  const calls = spy.mock.calls;
  if (calls.length === 0) {
    throw new Error('Spy has no calls');
  }
  return calls[calls.length - 1][0] as T;
}

/**
 * Helper to get all event payloads from a spy
 */
export function getAllEventPayloads<T>(spy: ReturnType<typeof vi.fn>): T[] {
  return spy.mock.calls.map(call => call[0] as T);
}

/**
 * Waits for a specified amount of time (for async timer tests)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Gets the game mode instance from orchestrator (useful for checking internal state)
 */
export function getGameMode(orch: GameOrchestrator) {
  return (orch as any).gameMode;
}

/**
 * Gets health from Survival mode game state
 */
export function getHealth(orch: GameOrchestrator): number {
  const gameMode = getGameMode(orch);
  return gameMode.health;
}

/**
 * Sets health for Survival mode (useful for testing edge cases)
 */
export function setHealth(orch: GameOrchestrator, health: number) {
  const gameMode = getGameMode(orch);
  gameMode.health = health;
}
