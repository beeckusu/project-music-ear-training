import { fromCallback } from 'xstate';
import { TIMER_DIRECTION, type TimerDirection } from '../../constants';

/**
 * Timer service configuration
 */
export interface TimerServiceInput {
  initialTime: number;      // Starting time in seconds
  direction: TimerDirection; // 'up' or 'down'
  interval?: number;        // Update interval in ms (default: 100)
}

/**
 * Events sent from timer service to parent machine
 */
export type TimerServiceEvent =
  | { type: 'TIMER_UPDATE'; elapsed: number }
  | { type: 'TIMEOUT' };

/**
 * Events sent from round timer service to parent machine
 */
export type RoundTimerServiceEvent =
  | { type: 'ROUND_TIMER_UPDATE'; elapsed: number }
  | { type: 'ROUND_TIMEOUT' };

/**
 * Commands received by timer service from parent machine
 */
export type TimerServiceCommand =
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STOP' }
  | { type: 'RESET' }
  | { type: 'SET_TIME'; time: number };

/**
 * Event type mapping for timer service factory
 */
interface TimerEventTypes {
  update: 'TIMER_UPDATE' | 'ROUND_TIMER_UPDATE';
  timeout: 'TIMEOUT' | 'ROUND_TIMEOUT';
}

/**
 * Generic timer service factory
 *
 * Creates a timer service that sends custom event types to the parent machine.
 * This eliminates code duplication between session and round timers.
 */
function createTimerService<TEvent>(
  eventTypes: TimerEventTypes
) {
  return fromCallback<TEvent, TimerServiceInput>(
  ({ input, sendBack, receive }) => {
    const { initialTime, direction, interval = 100 } = input;

    let currentTime = initialTime;
    let isActive = false;
    let isPaused = false;
    let intervalId: number | null = null;
    let startTime: number | null = null;
    let pausedTime: number = 0;
    let totalPausedDuration: number = 0;

    /**
     * Start the timer
     */
    const start = () => {
      if (isActive) return;

      isActive = true;
      isPaused = false;

      const now = Date.now();

      if (direction === TIMER_DIRECTION.UP) {
        if (!startTime) {
          startTime = now;
          totalPausedDuration = 0;
        } else {
          // Resume from pause
          if (pausedTime > 0) {
            totalPausedDuration += now - pausedTime;
            pausedTime = 0;
          }
        }
      }

      // Send initial update immediately so context is initialized
      sendBack({ type: eventTypes.update, elapsed: currentTime } as TEvent);

      intervalId = setInterval(() => {
        if (direction === TIMER_DIRECTION.UP) {
          const elapsed = (Date.now() - startTime! - totalPausedDuration) / 1000;
          currentTime = elapsed;
        } else {
          currentTime = Math.max(0, currentTime - interval / 1000);
        }

        // Send update to parent
        sendBack({ type: eventTypes.update, elapsed: currentTime } as TEvent);

        // Check if countdown reached 0
        if (direction === TIMER_DIRECTION.DOWN && currentTime <= 0) {
          stop();
          sendBack({ type: eventTypes.timeout } as TEvent);
        }
      }, interval);
    };

    /**
     * Stop the timer
     */
    const stop = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      isActive = false;
      isPaused = false;
    };

    /**
     * Pause the timer
     */
    const pause = () => {
      if (!isActive) return;

      stop();
      isPaused = true;

      if (direction === TIMER_DIRECTION.UP) {
        pausedTime = Date.now();
      }
      // For countdown, currentTime is already preserved
    };

    /**
     * Resume the timer (or start it if not yet started)
     */
    const resume = () => {
      if (!isPaused && isActive) return; // Already running
      start();
    };

    /**
     * Reset the timer
     */
    const reset = () => {
      stop();
      currentTime = initialTime;
      startTime = null;
      pausedTime = 0;
      totalPausedDuration = 0;
      isPaused = false;

      // Send update to parent
      sendBack({ type: eventTypes.update, elapsed: currentTime } as TEvent);
    };

    /**
     * Set timer to specific time
     */
    const setTime = (time: number) => {
      currentTime = time;

      if (direction === TIMER_DIRECTION.UP && isActive) {
        const now = Date.now();
        startTime = now - time * 1000 - totalPausedDuration;
      }

      // Send update to parent
      sendBack({ type: eventTypes.update, elapsed: currentTime } as TEvent);
    };

    // Listen for commands from parent machine
    receive((event: TimerServiceCommand) => {
      switch (event.type) {
        case 'PAUSE':
          pause();
          break;
        case 'RESUME':
          resume();
          break;
        case 'STOP':
          stop();
          break;
        case 'RESET':
          reset();
          break;
        case 'SET_TIME':
          setTime(event.time);
          break;
      }
    });

    // Don't auto-start - let the state machine control when timer starts via RESUME command

    // Cleanup on service stop
    return () => {
      stop();
    };
  });
}

/**
 * Session timer service - sends TIMER_UPDATE and TIMEOUT events
 */
export const timerService = createTimerService<TimerServiceEvent>({
  update: 'TIMER_UPDATE',
  timeout: 'TIMEOUT'
});

/**
 * Round timer service - sends ROUND_TIMER_UPDATE and ROUND_TIMEOUT events
 */
export const roundTimerService = createTimerService<RoundTimerServiceEvent>({
  update: 'ROUND_TIMER_UPDATE',
  timeout: 'ROUND_TIMEOUT'
});
