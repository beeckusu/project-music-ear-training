import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameOrchestrator } from './GameOrchestrator';

// Simple wait utility
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Session Timer Behavior (Sandbox Mode)', () => {
  let orchestrator: GameOrchestrator;
  let sessionTimerUpdates: number[];

  beforeEach(() => {
    orchestrator = new GameOrchestrator();
    orchestrator.start();
    sessionTimerUpdates = [];
  });

  it('should initialize session timer to configured duration', async () => {
    const sessionDuration = 5; // 5 minutes
    const expectedInitialSeconds = sessionDuration * 60; // 300 seconds

    const onSessionTimerUpdate = vi.fn((time: number) => {
      sessionTimerUpdates.push(time);
    });

    orchestrator.applySettings(
      'sandbox',
      {
        sandbox: {
          sessionDuration,
          targetNotes: 10,
          targetAccuracy: 80,
          targetStreak: 5
        }
      },
      { enabledNotes: ['C', 'D', 'E'] },
      1.0, // noteDuration
      3, // responseTimeLimit
      2, // autoAdvanceSpeed
      (time) => {}, // round timer callback
      onSessionTimerUpdate
    );

    // Start practice to trigger timer
    orchestrator.startPractice(true, false);

    // Wait for first timer update
    await wait(200);

    // Session timer should have been called with initial value close to 300 seconds
    expect(onSessionTimerUpdate).toHaveBeenCalled();
    expect(sessionTimerUpdates.length).toBeGreaterThan(0);

    // First update should be at or very close to the configured duration
    const firstUpdate = sessionTimerUpdates[0];
    expect(firstUpdate).toBeLessThanOrEqual(expectedInitialSeconds);
    expect(firstUpdate).toBeGreaterThan(expectedInitialSeconds - 1); // Within 1 second
  });

  it('should count down session timer over time', async () => {
    const sessionDuration = 5; // 5 minutes
    const expectedInitialSeconds = sessionDuration * 60; // 300 seconds

    const onSessionTimerUpdate = vi.fn((time: number) => {
      sessionTimerUpdates.push(time);
    });

    orchestrator.applySettings(
      'sandbox',
      {
        sandbox: {
          sessionDuration,
          targetNotes: 10,
          targetAccuracy: 80,
          targetStreak: 5
        }
      },
      { enabledNotes: ['C', 'D', 'E'] },
      1.0,
      3,
      2,
      (time) => {},
      onSessionTimerUpdate
    );

    orchestrator.startPractice(true, false);

    // Wait for initial updates
    await wait(200);
    const initialTime = sessionTimerUpdates[sessionTimerUpdates.length - 1];

    // Clear updates and wait more
    sessionTimerUpdates.length = 0;
    await wait(500);

    // Get time after waiting
    const laterTime = sessionTimerUpdates[sessionTimerUpdates.length - 1];

    // Timer should be counting down
    expect(laterTime).toBeLessThan(initialTime);

    // Timer should generally be decreasing
    // (allow small increases due to floating point precision and async timing)
    const firstValue = sessionTimerUpdates[0];
    const lastValue = sessionTimerUpdates[sessionTimerUpdates.length - 1];
    expect(lastValue).toBeLessThan(firstValue);
  });

  it('should show correct time after specific duration', async () => {
    const sessionDuration = 5; // 5 minutes
    const expectedInitialSeconds = sessionDuration * 60; // 300 seconds

    const onSessionTimerUpdate = vi.fn((time: number) => {
      sessionTimerUpdates.push(time);
    });

    orchestrator.applySettings(
      'sandbox',
      {
        sandbox: {
          sessionDuration,
          targetNotes: 10,
          targetAccuracy: 80,
          targetStreak: 5
        }
      },
      { enabledNotes: ['C', 'D', 'E'] },
      1.0,
      3,
      2,
      (time) => {},
      onSessionTimerUpdate
    );

    orchestrator.startPractice(true, false);

    // Wait for timer to update several times
    await wait(700);

    // Should have multiple updates
    expect(sessionTimerUpdates.length).toBeGreaterThan(3);

    // First update should be close to initial value
    const firstUpdate = sessionTimerUpdates[0];
    expect(firstUpdate).toBeGreaterThan(expectedInitialSeconds - 2);
    expect(firstUpdate).toBeLessThanOrEqual(expectedInitialSeconds);

    // Last update should be less than first (timer counting down)
    const lastUpdate = sessionTimerUpdates[sessionTimerUpdates.length - 1];
    expect(lastUpdate).toBeLessThan(firstUpdate);

    // At least 0.5 seconds should have passed
    expect(firstUpdate - lastUpdate).toBeGreaterThan(0.5);
  });

  it('should pause session timer when game is paused', async () => {
    const sessionDuration = 5; // 5 minutes

    const onSessionTimerUpdate = vi.fn((time: number) => {
      sessionTimerUpdates.push(time);
    });

    orchestrator.applySettings(
      'sandbox',
      {
        sandbox: {
          sessionDuration,
          targetNotes: 10,
          targetAccuracy: 80,
          targetStreak: 5
        }
      },
      { enabledNotes: ['C', 'D', 'E'] },
      1.0,
      3,
      2,
      (time) => {},
      onSessionTimerUpdate
    );

    orchestrator.startPractice(true, false);

    // Wait for timer to start
    await wait(300);

    const callCountBeforePause = onSessionTimerUpdate.mock.calls.length;
    expect(callCountBeforePause).toBeGreaterThan(0);

    // Pause the game
    orchestrator.pauseGame();

    // Wait - session timer should NOT update while paused
    await wait(400);

    // Session timer callback should not have been called again while paused
    const callCountAfterPause = onSessionTimerUpdate.mock.calls.length;
    expect(callCountAfterPause).toBe(callCountBeforePause);
  });

  it('should resume session timer when game is resumed', async () => {
    const sessionDuration = 5; // 5 minutes

    const onSessionTimerUpdate = vi.fn((time: number) => {
      sessionTimerUpdates.push(time);
    });

    orchestrator.applySettings(
      'sandbox',
      {
        sandbox: {
          sessionDuration,
          targetNotes: 10,
          targetAccuracy: 80,
          targetStreak: 5
        }
      },
      { enabledNotes: ['C', 'D', 'E'] },
      1.0,
      3,
      2,
      (time) => {},
      onSessionTimerUpdate
    );

    orchestrator.startPractice(true, false);

    // Wait for timer to start
    await wait(300);

    const callCountBeforePause = onSessionTimerUpdate.mock.calls.length;

    // Pause the game
    orchestrator.pauseGame();

    // Wait while paused
    await wait(300);

    const callCountWhilePaused = onSessionTimerUpdate.mock.calls.length;

    // Resume the game
    orchestrator.resumeGame();

    // Wait for timer to resume
    await wait(300);

    const callCountAfterResume = onSessionTimerUpdate.mock.calls.length;

    // Session timer should have updated after resume
    expect(callCountAfterResume).toBeGreaterThan(callCountWhilePaused);
  });
});
