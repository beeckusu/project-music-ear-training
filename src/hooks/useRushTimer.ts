import { useState, useRef, useCallback, useEffect } from 'react';

export interface RushTimerOptions {
  isPaused?: boolean;
  onTick?: (elapsedTime: number) => void;
}

export interface RushTimerReturn {
  elapsedTime: number;
  isTimerActive: boolean;
  startTimer: () => void;
  stopTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
}

export const useRushTimer = (options: RushTimerOptions): RushTimerReturn => {
  const { isPaused = false, onTick } = options;

  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    setIsTimerActive(true);
    setIsManuallyPaused(false);

    // Record start time, accounting for any previously paused time
    startTimeRef.current = Date.now() - (pausedTimeRef.current * 1000);

    // Update timer every 100ms for smooth elapsed time display
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const currentElapsed = (Date.now() - startTimeRef.current) / 1000;
        setElapsedTime(currentElapsed);
        onTick?.(currentElapsed);
      }
    }, 100);
  }, [clearTimer, onTick]);

  const stopTimer = useCallback(() => {
    clearTimer();
    setIsTimerActive(false);
    pausedTimeRef.current = 0;
    startTimeRef.current = null;
  }, [clearTimer]);

  const pauseTimer = useCallback(() => {
    clearTimer();
    setIsTimerActive(false);
    setIsManuallyPaused(true);
    // Store the current elapsed time for resuming later
    pausedTimeRef.current = elapsedTime;
  }, [clearTimer, elapsedTime]);

  const resetTimer = useCallback(() => {
    clearTimer();
    setIsTimerActive(false);
    setElapsedTime(0);
    setIsManuallyPaused(false);
    pausedTimeRef.current = 0;
    startTimeRef.current = null;
  }, [clearTimer]);

  // Handle pause state changes from external source
  useEffect(() => {
    if (isPaused && isTimerActive) {
      // Pause the timer but keep the elapsed time (app-level pause)
      clearTimer();
      setIsTimerActive(false);
      pausedTimeRef.current = elapsedTime;
    } else if (!isPaused && !isTimerActive && !isManuallyPaused && pausedTimeRef.current > 0) {
      // Resume the timer from where it was paused
      startTimer();
    }
  }, [isPaused, isTimerActive, isManuallyPaused, startTimer, clearTimer]); // Remove elapsedTime dependency

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    elapsedTime,
    isTimerActive,
    startTimer,
    stopTimer,
    pauseTimer,
    resetTimer,
  };
};