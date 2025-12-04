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
 * XState-compatible timer service
 *
 * This service manages a timer that can count up or down.
 * It sends TIMER_UPDATE events to the parent machine and TIMEOUT when countdown reaches 0.
 *
 * The parent machine can control the timer via commands (PAUSE, RESUME, STOP, etc.)
 */
export const timerService = fromCallback<TimerServiceEvent, TimerServiceInput>(
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
      sendBack({ type: 'TIMER_UPDATE', elapsed: currentTime });

      intervalId = setInterval(() => {
        if (direction === TIMER_DIRECTION.UP) {
          const elapsed = (Date.now() - startTime! - totalPausedDuration) / 1000;
          currentTime = elapsed;
        } else {
          currentTime = Math.max(0, currentTime - interval / 1000);
        }

        // Send update to parent
        sendBack({ type: 'TIMER_UPDATE', elapsed: currentTime });

        // Check if countdown reached 0
        if (direction === TIMER_DIRECTION.DOWN && currentTime === 0) {
          stop();
          sendBack({ type: 'TIMEOUT' });
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
      sendBack({ type: 'TIMER_UPDATE', elapsed: currentTime });
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
      sendBack({ type: 'TIMER_UPDATE', elapsed: currentTime });
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
  }
);

/**
 * Round timer service - identical to timer service but sends ROUND_TIMER_UPDATE events
 */
export const roundTimerService = fromCallback<RoundTimerServiceEvent, TimerServiceInput>(
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
      sendBack({ type: 'ROUND_TIMER_UPDATE', elapsed: currentTime });

      intervalId = setInterval(() => {
        if (direction === TIMER_DIRECTION.UP) {
          const elapsed = (Date.now() - startTime! - totalPausedDuration) / 1000;
          currentTime = elapsed;
        } else {
          currentTime = Math.max(0, currentTime - interval / 1000);
        }

        // Send update to parent with ROUND_TIMER_UPDATE event type
        sendBack({ type: 'ROUND_TIMER_UPDATE', elapsed: currentTime });

        // Check if countdown reached 0
        if (direction === TIMER_DIRECTION.DOWN && currentTime === 0) {
          stop();
          sendBack({ type: 'ROUND_TIMEOUT' });
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

      // Send update to parent with ROUND_TIMER_UPDATE event type
      sendBack({ type: 'ROUND_TIMER_UPDATE', elapsed: currentTime });
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

      // Send update to parent with ROUND_TIMER_UPDATE event type
      sendBack({ type: 'ROUND_TIMER_UPDATE', elapsed: currentTime });
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
  }
);
