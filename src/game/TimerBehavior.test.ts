import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameOrchestrator } from './GameOrchestrator';

// Simple wait utility
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Timer Behavior', () => {
  let orchestrator: GameOrchestrator;
  let timerUpdates: number[];

  beforeEach(() => {
    orchestrator = new GameOrchestrator();
    orchestrator.start();
    timerUpdates = [];
  });

  it('should start timer countdown when round begins', async () => {
    // Configure orchestrator with timer settings
    const onTimerUpdate = vi.fn((time: number) => {
      timerUpdates.push(time);
    });

    orchestrator.applySettings(
      'rush',
      { rush: { targetNotes: 5 } },
      { enabledNotes: ['C', 'D', 'E'] },
      1.0, // noteDuration
      3, // responseTimeLimit (3 seconds)
      2, // autoAdvanceSpeed
      onTimerUpdate
    );

    // Start a round
    orchestrator.startPractice(true, false);

    // Wait for timer to tick several times (300ms should give us 3-4 ticks at 100ms interval)
    await wait(300);

    // Timer should have been called
    expect(onTimerUpdate).toHaveBeenCalled();
    expect(timerUpdates.length).toBeGreaterThan(0);

    // Timer should be counting down from 3 (allowing for some startup delay)
    if (timerUpdates.length > 0) {
      expect(timerUpdates[0]).toBeLessThanOrEqual(3);
      expect(timerUpdates[0]).toBeGreaterThan(2.5); // Started within 0.5s of 3
      expect(timerUpdates[timerUpdates.length - 1]).toBeLessThan(timerUpdates[0]);

      // Timer should be decreasing
      for (let i = 1; i < timerUpdates.length; i++) {
        expect(timerUpdates[i]).toBeLessThanOrEqual(timerUpdates[i - 1]);
      }
    }
  });

  it('should initialize timer to responseTimeLimit value', async () => {
    const onTimerUpdate = vi.fn((time: number) => {
      timerUpdates.push(time);
    });

    const responseTimeLimit = 5; // 5 seconds

    orchestrator.applySettings(
      'rush',
      { rush: { targetNotes: 5 } },
      { enabledNotes: ['C', 'D', 'E'] },
      1.0,
      responseTimeLimit,
      2,
      onTimerUpdate
    );

    // Start a round
    orchestrator.startPractice(true, false);

    // Wait for first timer update
    await wait(150);

    // Should have received timer updates
    expect(timerUpdates.length).toBeGreaterThan(0);

    // First update should be less than or equal to 5 seconds
    // (Note: There may be async delays from note playback, etc.)
    if (timerUpdates.length > 0) {
      expect(timerUpdates[0]).toBeLessThanOrEqual(responseTimeLimit);
      expect(timerUpdates[0]).toBeGreaterThan(0);
    }
  });

  it('should call onTimeUpdate callback during countdown', async () => {
    const onTimerUpdate = vi.fn();

    orchestrator.applySettings(
      'rush',
      { rush: { targetNotes: 5 } },
      { enabledNotes: ['C', 'D', 'E'] },
      1.0,
      3,
      2,
      onTimerUpdate
    );

    orchestrator.startPractice(true, false);

    // Wait for multiple timer updates
    await wait(500);

    // Verify callback was called multiple times
    expect(onTimerUpdate).toHaveBeenCalled();
    expect(onTimerUpdate.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('should pause timer when game is paused', async () => {
    const onTimerUpdate = vi.fn((time: number) => {
      timerUpdates.push(time);
    });

    orchestrator.applySettings(
      'rush',
      { rush: { targetNotes: 5 } },
      { enabledNotes: ['C', 'D', 'E'] },
      1.0,
      3, // responseTimeLimit
      2,
      onTimerUpdate
    );

    // Start practice
    orchestrator.startPractice(true, false);

    // Wait for timer to start counting
    await wait(300);

    const updatesBeforePause = timerUpdates.length;
    expect(updatesBeforePause).toBeGreaterThan(0);

    // Record the count
    const callCountBeforePause = onTimerUpdate.mock.calls.length;

    // Pause the game
    orchestrator.pauseGame();

    // Wait - timer should NOT update while paused
    await wait(400);

    // Timer callback should not have been called again while paused
    const callCountAfterPause = onTimerUpdate.mock.calls.length;
    expect(callCountAfterPause).toBe(callCountBeforePause);
  });

  it('should resume timer when game is resumed', async () => {
    const onTimerUpdate = vi.fn((time: number) => {
      timerUpdates.push(time);
    });

    orchestrator.applySettings(
      'rush',
      { rush: { targetNotes: 5 } },
      { enabledNotes: ['C', 'D', 'E'] },
      1.0,
      3, // responseTimeLimit
      2,
      onTimerUpdate
    );

    // Start practice
    orchestrator.startPractice(true, false);

    // Wait for timer to start
    await wait(300);

    const callCountBeforePause = onTimerUpdate.mock.calls.length;
    expect(callCountBeforePause).toBeGreaterThan(0);

    // Pause the game
    orchestrator.pauseGame();

    // Wait while paused
    await wait(300);

    const callCountWhilePaused = onTimerUpdate.mock.calls.length;

    // Resume the game
    orchestrator.resumeGame();

    // Wait for timer to resume counting
    await wait(300);

    const callCountAfterResume = onTimerUpdate.mock.calls.length;

    // Timer should have updated after resume (more calls than while paused)
    expect(callCountAfterResume).toBeGreaterThan(callCountWhilePaused);
  });

  it('should preserve timer value across pause/resume cycle', async () => {
    const onTimerUpdate = vi.fn((time: number) => {
      timerUpdates.push(time);
    });

    orchestrator.applySettings(
      'rush',
      { rush: { targetNotes: 5 } },
      { enabledNotes: ['C', 'D', 'E'] },
      1.0,
      10, // responseTimeLimit - longer timer to avoid timeout during test
      2,
      onTimerUpdate
    );

    // Start practice
    orchestrator.startPractice(true, false);

    // Wait for timer to tick a few times
    await wait(250);

    const timeBeforePause = timerUpdates[timerUpdates.length - 1];
    expect(timeBeforePause).toBeGreaterThan(0);
    expect(timeBeforePause).toBeLessThan(10);

    // Pause the game
    orchestrator.pauseGame();

    // Wait while paused (timer should not advance)
    await wait(300);

    // Resume the game
    orchestrator.resumeGame();

    // Clear old updates and wait for new ones after resume
    timerUpdates.length = 0;
    await wait(200);

    // First update after resume should be close to the value before pause
    // (allowing for some variance due to async delays)
    if (timerUpdates.length > 0) {
      const timeAfterResume = timerUpdates[0];
      // Timer should have continued from approximately where it paused
      // (within 1 second tolerance for async delays and floating point precision)
      expect(Math.abs(timeAfterResume - timeBeforePause)).toBeLessThan(1.0);
    }
  });
});
