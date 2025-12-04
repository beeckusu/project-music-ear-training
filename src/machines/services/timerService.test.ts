import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createActor } from 'xstate';
import { createMachine, sendTo } from 'xstate';
import { timerService } from './timerService';
import type { TimerServiceEvent, TimerServiceInput } from './timerService';
import { TIMER_DIRECTION } from '../../constants';

describe('timerService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('count-up timer', () => {
    it('should send TIMER_UPDATE events when timer is running', async () => {
      const events: TimerServiceEvent[] = [];

      // Create a simple test machine that invokes the timer service
      const testMachine = createMachine({
        id: 'test',
        initial: 'running',
        invoke: {
          id: 'timer',
          src: timerService,
          input: {
            initialTime: 0,
            direction: TIMER_DIRECTION.UP,
            interval: 100,
          } as TimerServiceInput,
        },
        on: {
          TIMER_UPDATE: {
            actions: ({ event }) => {
              events.push(event);
            },
          },
        },
        states: {
          running: {
            entry: sendTo('timer', { type: 'RESUME' }),
          },
        },
      });

      const actor = createActor(testMachine);
      actor.start();

      // Wait for 500ms worth of timer updates (should be ~5 updates at 100ms intervals)
      await vi.advanceTimersByTimeAsync(500);

      // Should have received multiple TIMER_UPDATE events
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('TIMER_UPDATE');
      expect(events[events.length - 1].elapsed).toBeGreaterThan(0);

      actor.stop();
    });

    it('should start from 0 and count up', async () => {
      const events: TimerServiceEvent[] = [];

      const testMachine = createMachine({
        id: 'test',
        initial: 'running',
        invoke: {
          id: 'timer',
          src: timerService,
          input: {
            initialTime: 0,
            direction: TIMER_DIRECTION.UP,
            interval: 100,
          } as TimerServiceInput,
        },
        on: {
          TIMER_UPDATE: {
            actions: ({ event }) => {
              events.push(event);
            },
          },
        },
        states: {
          running: {
            entry: sendTo('timer', { type: 'RESUME' }),
          },
        },
      });

      const actor = createActor(testMachine);
      actor.start();

      await vi.advanceTimersByTimeAsync(1000);

      // Timer should be counting up from 0
      const lastEvent = events[events.length - 1];
      expect(lastEvent.elapsed).toBeCloseTo(1.0, 1); // Should be around 1 second

      actor.stop();
    });

    it('should pause and resume correctly', async () => {
      const events: TimerServiceEvent[] = [];

      const testMachine = createMachine({
        id: 'test',
        initial: 'running',
        invoke: {
          id: 'timer',
          src: timerService,
          input: {
            initialTime: 0,
            direction: TIMER_DIRECTION.UP,
            interval: 100,
          } as TimerServiceInput,
        },
        on: {
          TIMER_UPDATE: {
            actions: ({ event }) => {
              events.push(event);
            },
          },
          PAUSE_TIMER: {
            actions: sendTo('timer', { type: 'PAUSE' }),
          },
          RESUME_TIMER: {
            actions: sendTo('timer', { type: 'RESUME' }),
          },
        },
        states: {
          running: {
            entry: sendTo('timer', { type: 'RESUME' }),
          },
        },
      });

      const actor = createActor(testMachine);
      actor.start();

      // Run for 500ms
      await vi.advanceTimersByTimeAsync(500);
      const timeBeforePause = events[events.length - 1].elapsed;

      // Pause
      actor.send({ type: 'PAUSE_TIMER' });
      await vi.advanceTimersByTimeAsync(500);
      const timeAfterPause = events[events.length - 1].elapsed;

      // Time should not have advanced during pause
      expect(timeAfterPause).toBeCloseTo(timeBeforePause, 1);

      // Resume
      actor.send({ type: 'RESUME_TIMER' });
      await vi.advanceTimersByTimeAsync(500);
      const timeAfterResume = events[events.length - 1].elapsed;

      // Time should have advanced after resume
      expect(timeAfterResume).toBeGreaterThan(timeAfterPause);

      actor.stop();
    });

    it('should reset to initial time', async () => {
      const events: TimerServiceEvent[] = [];

      const testMachine = createMachine({
        id: 'test',
        initial: 'running',
        invoke: {
          id: 'timer',
          src: timerService,
          input: {
            initialTime: 0,
            direction: TIMER_DIRECTION.UP,
            interval: 100,
          } as TimerServiceInput,
        },
        on: {
          TIMER_UPDATE: {
            actions: ({ event }) => {
              events.push(event);
            },
          },
          RESET_TIMER: {
            actions: sendTo('timer', { type: 'RESET' }),
          },
        },
        states: {
          running: {
            entry: sendTo('timer', { type: 'RESUME' }),
          },
        },
      });

      const actor = createActor(testMachine);
      actor.start();

      // Run for 1 second
      await vi.advanceTimersByTimeAsync(1000);

      // Reset
      events.length = 0; // Clear events
      actor.send({ type: 'RESET_TIMER' });

      // Should immediately get a TIMER_UPDATE with elapsed = 0
      expect(events.length).toBeGreaterThan(0);
      expect(events[events.length - 1].elapsed).toBe(0);

      actor.stop();
    });
  });

  describe('count-down timer', () => {
    it('should count down from initial time', async () => {
      const events: TimerServiceEvent[] = [];

      const testMachine = createMachine({
        id: 'test',
        initial: 'running',
        invoke: {
          id: 'timer',
          src: timerService,
          input: {
            initialTime: 5,
            direction: TIMER_DIRECTION.DOWN,
            interval: 100,
          } as TimerServiceInput,
        },
        on: {
          TIMER_UPDATE: {
            actions: ({ event }) => {
              events.push(event);
            },
          },
        },
        states: {
          running: {
            entry: sendTo('timer', { type: 'RESUME' }),
          },
        },
      });

      const actor = createActor(testMachine);
      actor.start();

      await vi.advanceTimersByTimeAsync(1000);

      // Timer should have counted down from 5
      const lastEvent = events[events.length - 1];
      expect(lastEvent.elapsed).toBeLessThan(5);
      expect(lastEvent.elapsed).toBeCloseTo(4.0, 1);

      actor.stop();
    });

    it('should send TIMEOUT when reaching 0', async () => {
      const events: any[] = [];

      const testMachine = createMachine({
        id: 'test',
        initial: 'running',
        invoke: {
          id: 'timer',
          src: timerService,
          input: {
            initialTime: 0.5, // Start at 0.5 seconds
            direction: TIMER_DIRECTION.DOWN,
            interval: 100,
          } as TimerServiceInput,
        },
        on: {
          TIMER_UPDATE: {
            actions: ({ event }) => {
              events.push(event);
            },
          },
          TIMEOUT: {
            actions: () => {
              events.push({ type: 'TIMEOUT' });
            },
          },
        },
        states: {
          running: {
            entry: sendTo('timer', { type: 'RESUME' }),
          },
        },
      });

      const actor = createActor(testMachine);
      actor.start();

      // Wait long enough for timer to reach 0
      await vi.advanceTimersByTimeAsync(1000);

      // Should have received a TIMEOUT event
      const timeoutEvents = events.filter(e => e.type === 'TIMEOUT');
      expect(timeoutEvents.length).toBe(1);

      actor.stop();
    });
  });

  describe('timer control without auto-start', () => {
    it('should not auto-start timer on creation', async () => {
      const events: TimerServiceEvent[] = [];

      const testMachine = createMachine({
        id: 'test',
        initial: 'idle',
        invoke: {
          id: 'timer',
          src: timerService,
          input: {
            initialTime: 0,
            direction: TIMER_DIRECTION.UP,
            interval: 100,
          } as TimerServiceInput,
        },
        on: {
          TIMER_UPDATE: {
            actions: ({ event }) => {
              events.push(event);
            },
          },
        },
        states: {
          idle: {
            // Don't send RESUME - timer should NOT start
          },
        },
      });

      const actor = createActor(testMachine);
      actor.start();

      // Wait some time
      await vi.advanceTimersByTimeAsync(500);

      // Should NOT have received any timer updates (timer not started)
      expect(events.length).toBe(0);

      actor.stop();
    });

    it('should only start when RESUME is sent', async () => {
      const events: TimerServiceEvent[] = [];

      const testMachine = createMachine({
        id: 'test',
        initial: 'idle',
        invoke: {
          id: 'timer',
          src: timerService,
          input: {
            initialTime: 0,
            direction: TIMER_DIRECTION.UP,
            interval: 100,
          } as TimerServiceInput,
        },
        on: {
          TIMER_UPDATE: {
            actions: ({ event }) => {
              events.push(event);
            },
          },
          START_TIMER: {
            actions: sendTo('timer', { type: 'RESUME' }),
          },
        },
        states: {
          idle: {},
        },
      });

      const actor = createActor(testMachine);
      actor.start();

      // Wait - should not start
      await vi.advanceTimersByTimeAsync(200);
      expect(events.length).toBe(0);

      // Send RESUME
      actor.send({ type: 'START_TIMER' });
      await vi.advanceTimersByTimeAsync(500);

      // Now should have timer updates
      expect(events.length).toBeGreaterThan(0);

      actor.stop();
    });
  });
});
