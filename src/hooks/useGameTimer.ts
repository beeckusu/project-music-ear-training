import { useState, useRef, useCallback, useEffect } from 'react';

export interface GameTimerOptions {
  timeLimit: number | null; // seconds, null = unlimited
  isPaused?: boolean;
  onTimeUp?: () => void;
  onTick?: (timeRemaining: number) => void;
}

export interface GameTimerReturn {
  timeRemaining: number;
  isTimerActive: boolean;
  startTimer: () => void;
  stopTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
}

export const useGameTimer = (options: GameTimerOptions): GameTimerReturn => {
  const { timeLimit, isPaused = false, onTimeUp, onTick } = options;
  
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    if (!timeLimit) return; // Unlimited time
    clearTimers();
    setTimeRemaining(timeLimit);
    setIsTimerActive(true);
    setIsManuallyPaused(false);
    
    // Update timer every 100ms for smooth countdown
    intervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 0.1;
        if (newTime <= 0) {
          // Time's up - clear the interval to prevent further updates
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsTimerActive(false);
          return 0;
        }
        onTick?.(newTime);
        return newTime;
      });
    }, 100);
    
    // Auto-fail when time is up
    timeoutRef.current = setTimeout(() => {
      onTimeUp?.();
    }, timeLimit * 1000);
  }, [timeLimit, clearTimers, onTimeUp, onTick]);

  const stopTimer = useCallback(() => {
    clearTimers();
    setIsTimerActive(false);
    setTimeRemaining(0);
  }, [clearTimers]);

  const pauseTimer = useCallback(() => {
    clearTimers();
    setIsTimerActive(false);
    setIsManuallyPaused(true);
  }, [clearTimers]);

  const resetTimer = useCallback(() => {
    clearTimers();
    setIsTimerActive(false);
    setTimeRemaining(0);
    setIsManuallyPaused(false);
  }, [clearTimers]);

  // Handle pause state changes from external source
  useEffect(() => {
    if (isPaused && isTimerActive) {
      // Pause the timer but keep the remaining time (app-level pause)
      clearTimers();
      setIsTimerActive(false);
    } else if (!isPaused && timeRemaining > 0 && !isTimerActive && timeLimit && !isManuallyPaused) {
      // Resume the timer with remaining time
      setIsTimerActive(true);
      
      // Restart interval with current remaining time
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 0.1;
          if (newTime <= 0) {
            // Time's up - clear the interval to prevent further updates
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setIsTimerActive(false);
            return 0;
          }
          onTick?.(newTime);
          return newTime;
        });
      }, 100);
      
      // Set timeout for remaining time
      timeoutRef.current = setTimeout(() => {
        onTimeUp?.();
      }, timeRemaining * 1000);
    }
  }, [isPaused, isTimerActive, timeRemaining, timeLimit, isManuallyPaused, pauseTimer, onTimeUp, onTick]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return {
    timeRemaining,
    isTimerActive,
    startTimer,
    stopTimer,
    pauseTimer,
    resetTimer,
  };
};