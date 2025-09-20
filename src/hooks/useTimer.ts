import { useState, useRef, useCallback, useEffect } from 'react';

export interface TimerConfig {
  initialTime: number;           // Starting time in seconds
  direction: 'up' | 'down';      // Count up or down
  interval?: number;             // Update interval in ms (default: 100)
  autoStart?: boolean;           // Auto-start on mount
  isPaused?: boolean;            // External pause control
}

export interface TimerAPI {
  // Core controls
  startTimer: () => void;
  stopTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  setTime: (seconds: number) => void;
  setDirection: (direction: 'up' | 'down') => void;

  // State
  currentTime: number;
  isActive: boolean;
  isPaused: boolean;

  // Events
  onTimeUpdate?: (time: number) => void;
  onTimeUp?: () => void;          // When countdown reaches 0
  onStart?: () => void;
  onStop?: () => void;
  onPause?: () => void;
  onReset?: () => void;
}

export interface TimerOptions {
  onTimeUpdate?: (time: number) => void;
  onTimeUp?: () => void;
  onStart?: () => void;
  onStop?: () => void;
  onPause?: () => void;
  onReset?: () => void;
}

export const useTimer = (config: TimerConfig, options: TimerOptions = {}): TimerAPI => {
  const {
    initialTime,
    direction,
    interval = 100,
    autoStart = false,
    isPaused: externalPause = false
  } = config;

  const {
    onTimeUpdate,
    onTimeUp,
    onStart,
    onStop,
    onPause,
    onReset
  } = options;

  const [currentTime, setCurrentTime] = useState<number>(initialTime);
  const [isActive, setIsActive] = useState(false);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [timerDirection, setTimerDirection] = useState<'up' | 'down'>(direction);

  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0); // Total time spent paused
  const lastPauseStartRef = useRef<number | null>(null);
  const savedTimeRef = useRef<number>(initialTime); // For count-down, saves remaining time during pause

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const updatePausedTime = useCallback(() => {
    if (lastPauseStartRef.current !== null) {
      const pauseDuration = Date.now() - lastPauseStartRef.current;
      pausedTimeRef.current += pauseDuration;
      lastPauseStartRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    setIsActive(true);
    setIsManuallyPaused(false);

    const now = Date.now();

    if (timerDirection === 'up') {
      // Count-up timer: track elapsed time excluding paused duration
      if (!startTimeRef.current) {
        startTimeRef.current = now;
        pausedTimeRef.current = 0;
      } else {
        // Resume from pause - update pausedTime
        updatePausedTime();
      }

      intervalRef.current = setInterval(() => {
        const elapsedMs = Date.now() - startTimeRef.current! - pausedTimeRef.current;
        const elapsedSeconds = elapsedMs / 1000;
        setCurrentTime(elapsedSeconds);
        onTimeUpdate?.(elapsedSeconds);
      }, interval);
    } else {
      // Count-down timer: use saved remaining time or initial time
      const startingTime = savedTimeRef.current;
      setCurrentTime(startingTime);

      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = Math.max(0, prev - (interval / 1000));

          if (newTime === 0) {
            clearTimer();
            setIsActive(false);
            onTimeUp?.();
          } else {
            onTimeUpdate?.(newTime);
          }

          return newTime;
        });
      }, interval);
    }

    onStart?.();
  }, [clearTimer, timerDirection, interval, onTimeUpdate, onTimeUp, onStart, updatePausedTime]);

  const stopTimer = useCallback(() => {
    clearTimer();
    setIsActive(false);
    setIsManuallyPaused(false);

    // Reset tracking refs
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
    lastPauseStartRef.current = null;
    savedTimeRef.current = initialTime;

    onStop?.();
  }, [clearTimer, initialTime, onStop]);

  const pauseTimer = useCallback(() => {
    if (!isActive) return;

    clearTimer();
    setIsActive(false);
    setIsManuallyPaused(true);

    if (timerDirection === 'down') {
      // For count-down, save the current remaining time
      savedTimeRef.current = currentTime;
    } else {
      // For count-up, mark when pause started
      lastPauseStartRef.current = Date.now();
    }

    onPause?.();
  }, [clearTimer, isActive, timerDirection, currentTime, onPause]);

  const resetTimer = useCallback(() => {
    clearTimer();
    setIsActive(false);
    setIsManuallyPaused(false);
    setCurrentTime(initialTime);

    // Reset all tracking refs
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
    lastPauseStartRef.current = null;
    savedTimeRef.current = initialTime;

    onReset?.();
  }, [clearTimer, initialTime, onReset]);

  const setTime = useCallback((seconds: number) => {
    setCurrentTime(seconds);
    savedTimeRef.current = seconds;

    if (timerDirection === 'up' && isActive) {
      // For count-up, adjust start time to reflect the new current time
      const now = Date.now();
      startTimeRef.current = now - (seconds * 1000) - pausedTimeRef.current;
    }
  }, [timerDirection, isActive]);

  const setDirection = useCallback((newDirection: 'up' | 'down') => {
    const wasActive = isActive;
    if (wasActive) {
      stopTimer();
    }
    setTimerDirection(newDirection);
    resetTimer();
  }, [isActive, stopTimer, resetTimer]);

  // Handle external pause state changes
  useEffect(() => {
    const shouldBePaused = externalPause || isManuallyPaused;

    if (shouldBePaused && isActive) {
      // Need to pause
      clearTimer();
      setIsActive(false);

      if (timerDirection === 'down') {
        savedTimeRef.current = currentTime;
      } else {
        lastPauseStartRef.current = Date.now();
      }
    } else if (!shouldBePaused && !isActive && !isManuallyPaused &&
               (startTimeRef.current !== null || savedTimeRef.current !== initialTime)) {
      // Need to resume (was previously running)
      startTimer();
    }
  }, [externalPause, isActive, isManuallyPaused, timerDirection, currentTime, initialTime, startTimer, clearTimer]);

  // Auto-start if configured
  useEffect(() => {
    if (autoStart && !isActive && !isManuallyPaused && !externalPause) {
      startTimer();
    }
  }, [autoStart, isActive, isManuallyPaused, externalPause, startTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    // Controls
    startTimer,
    stopTimer,
    pauseTimer,
    resetTimer,
    setTime,
    setDirection,

    // State
    currentTime,
    isActive,
    isPaused: externalPause || isManuallyPaused,

    // Events are passed through options, not returned
  };
};