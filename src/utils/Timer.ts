import { TIMER_DIRECTION, type TimerDirection } from '../constants';

export interface TimerConfig {
  initialTime: number;           // Starting time in seconds
  direction: TimerDirection;      // Count up or down
  interval?: number;             // Update interval in ms (default: 100)
}

export interface TimerCallbacks {
  onTimeUpdate?: (time: number) => void;
  onTimeUp?: () => void;          // When countdown reaches 0
}

export class Timer {
  private currentTime: number;
  private isActive: boolean = false;
  private isPaused: boolean = false;
  private direction: TimerDirection;
  private interval: number;
  private intervalId: number | null = null;
  private startTime: number | null = null;
  private pausedTime: number = 0;
  private totalPausedDuration: number = 0;
  private callbacks: TimerCallbacks;

  constructor(config: TimerConfig, callbacks: TimerCallbacks = {}) {
    this.currentTime = config.initialTime;
    this.direction = config.direction;
    this.interval = config.interval || 100;
    this.callbacks = callbacks;
  }

  start(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.isPaused = false;

    const now = Date.now();

    if (this.direction === TIMER_DIRECTION.UP) {
      if (!this.startTime) {
        this.startTime = now;
        this.totalPausedDuration = 0;
      } else {
        // Resume from pause
        if (this.pausedTime > 0) {
          this.totalPausedDuration += now - this.pausedTime;
          this.pausedTime = 0;
        }
      }
    }

    this.intervalId = setInterval(() => {
      if (this.direction === TIMER_DIRECTION.UP) {
        const elapsed = (Date.now() - this.startTime! - this.totalPausedDuration) / 1000;
        this.currentTime = elapsed;
      } else {
        this.currentTime = Math.max(0, this.currentTime - (this.interval / 1000));
      }

      this.callbacks.onTimeUpdate?.(this.currentTime);

      // Check if countdown reached 0 AFTER updating UI
      if (this.direction === TIMER_DIRECTION.DOWN && this.currentTime === 0) {
        this.stop();
        this.callbacks.onTimeUp?.();
        return;
      }
    }, this.interval);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isActive = false;
    this.isPaused = false;
  }

  pause(): void {
    if (!this.isActive) return;

    this.stop();
    this.isPaused = true;

    if (this.direction === TIMER_DIRECTION.UP) {
      this.pausedTime = Date.now();
    }
    // For countdown, currentTime is already preserved
  }

  resume(): void {
    if (!this.isPaused) return;
    this.start();
  }

  reset(): void {
    this.stop();
    this.startTime = null;
    this.pausedTime = 0;
    this.totalPausedDuration = 0;
    this.isPaused = false;
  }

  setTime(time: number): void {
    this.currentTime = time;
    if (this.direction === TIMER_DIRECTION.UP) {
      this.startTime = Date.now() - (time * 1000) - this.totalPausedDuration;
    }
  }

  setDirection(direction: TimerDirection): void {
    const wasActive = this.isActive;
    this.stop();
    this.direction = direction;
    this.reset();
    if (wasActive) {
      this.start();
    }
  }

  getState(): { timeRemaining: number; isActive: boolean } {
    return {
      timeRemaining: this.currentTime,
      isActive: this.isActive
    };
  }

  updateCallbacks(callbacks: TimerCallbacks): void {
    this.callbacks = callbacks;
  }
}