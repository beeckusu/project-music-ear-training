import { useState, useCallback, useEffect } from 'react';
import type { GameSession } from '../types/game';
import { STORAGE_KEYS } from '../constants';
const MAX_SESSIONS_PER_MODE = 50; // Prevent unlimited storage growth

export interface GameHistoryHook {
  history: GameSession[];
  addSession: (session: GameSession) => void;
  getSessionHistory: (mode: string, settingsFilter?: Record<string, any>) => GameSession[];
  clearHistory: (mode?: string) => void;
  getRecentSessions: (mode: string, limit?: number) => GameSession[];
}

export const useGameHistory = (): GameHistoryHook => {
  const [history, setHistory] = useState<GameSession[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(STORAGE_KEYS.GAME_HISTORY);
      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory);
        // Convert timestamp strings back to Date objects
        const historyWithDates = parsedHistory.map((session: any) => ({
          ...session,
          timestamp: new Date(session.timestamp)
        }));
        setHistory(historyWithDates);
      }
    } catch (error) {
      console.warn('Failed to load game history from localStorage:', error);
      setHistory([]);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.GAME_HISTORY, JSON.stringify(history));
    } catch (error) {
      console.warn('Failed to save game history to localStorage:', error);
    }
  }, [history]);

  const addSession = useCallback((session: GameSession) => {
    setHistory(prevHistory => {
      const newHistory = [session, ...prevHistory];

      // Group by mode and limit sessions per mode to prevent storage bloat
      const groupedByMode = newHistory.reduce((acc, s) => {
        if (!acc[s.mode]) acc[s.mode] = [];
        acc[s.mode].push(s);
        return acc;
      }, {} as Record<string, GameSession[]>);

      // Keep only the most recent sessions per mode
      const trimmedHistory = Object.values(groupedByMode).flatMap(sessions =>
        sessions
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, MAX_SESSIONS_PER_MODE)
      );

      // Sort all sessions by timestamp (newest first)
      return trimmedHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    });
  }, []);

  const getSessionHistory = useCallback((mode: string, settingsFilter?: Record<string, any>) => {
    return history
      .filter(session => session.mode === mode)
      .filter(session => {
        if (!settingsFilter) return true;
        return Object.entries(settingsFilter).every(([key, value]) =>
          session.settings[key] === value
        );
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [history]);

  const getRecentSessions = useCallback((mode: string, limit: number = 10) => {
    return history
      .filter(session => session.mode === mode)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }, [history]);

  const clearHistory = useCallback((mode?: string) => {
    if (mode) {
      setHistory(prevHistory => prevHistory.filter(session => session.mode !== mode));
    } else {
      setHistory([]);
    }
  }, []);

  return {
    history,
    addSession,
    getSessionHistory,
    clearHistory,
    getRecentSessions
  };
};