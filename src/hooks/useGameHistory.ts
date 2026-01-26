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
  getNoteTrainingSessions: (limit?: number) => GameSession[];
  getSessionsBySubMode: (subMode: string, limit?: number) => GameSession[];
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
    console.log('[useGameHistory] ========== addSession called ==========');
    console.log('[useGameHistory] Session timestamp:', session.timestamp);
    console.log('[useGameHistory] Session mode:', session.mode);
    console.log('[useGameHistory] Session accuracy:', session.accuracy);
    console.log('[useGameHistory] Stack trace:', new Error().stack);

    setHistory(prevHistory => {
      console.log('[useGameHistory] Inside setHistory, prevHistory length:', prevHistory.length);
      console.log('[useGameHistory] prevHistory timestamps:', prevHistory.map(s => s.timestamp.getTime()));

      // Check for duplicate: same timestamp or identical results within last 5 seconds
      const isDuplicate = prevHistory.some(existing => {
        // Exact timestamp match
        if (existing.timestamp.getTime() === session.timestamp.getTime()) {
          console.log('[useGameHistory] Duplicate detected: exact timestamp match');
          return true;
        }
        // Very close timestamp (within 5 seconds) with same mode and accuracy
        const timeDiff = Math.abs(existing.timestamp.getTime() - session.timestamp.getTime());
        if (timeDiff < 5000 &&
            existing.mode === session.mode &&
            existing.accuracy === session.accuracy) {
          console.log('[useGameHistory] Duplicate detected: close timestamp with same mode/accuracy');
          return true;
        }
        return false;
      });

      if (isDuplicate) {
        console.log('[useGameHistory] Duplicate session detected, skipping add');
        return prevHistory;
      }

      console.log('[useGameHistory] Adding new session to history');
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

  /**
   * Gets all Note Training sessions (both sub-modes).
   * Filters for sessions with mode containing 'note-training' or specific sub-mode identifiers.
   *
   * @param limit - Maximum number of sessions to return (default: unlimited)
   * @returns Array of Note Training sessions sorted by timestamp (newest first)
   */
  const getNoteTrainingSessions = useCallback((limit?: number) => {
    const noteTrainingSessions = history
      .filter(session => {
        // Check if it's a Note Training session by looking at the mode or results
        const isNoteTrainingMode = session.mode.includes('note-training') ||
                                   session.mode.includes('show-chord-guess-notes') ||
                                   session.mode.includes('show-notes-guess-chord');

        // Also check if results have subMode property (Note Training specific)
        const hasSubMode = session.results && 'subMode' in session.results;

        return isNoteTrainingMode || hasSubMode;
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit ? noteTrainingSessions.slice(0, limit) : noteTrainingSessions;
  }, [history]);

  /**
   * Gets sessions filtered by Note Training sub-mode.
   * Useful for filtering between "Show Chord, Guess Notes" and "Show Notes, Guess Chord".
   *
   * @param subMode - The Note Training sub-mode to filter by
   * @param limit - Maximum number of sessions to return (default: unlimited)
   * @returns Array of sessions for the specified sub-mode sorted by timestamp (newest first)
   */
  const getSessionsBySubMode = useCallback((subMode: string, limit?: number) => {
    const filteredSessions = history
      .filter(session => {
        // Check if the session has subMode in results
        if (session.results && 'subMode' in session.results) {
          return session.results.subMode === subMode;
        }

        // Fallback: check if the mode string matches
        return session.mode === subMode;
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit ? filteredSessions.slice(0, limit) : filteredSessions;
  }, [history]);

  return {
    history,
    addSession,
    getSessionHistory,
    clearHistory,
    getRecentSessions,
    getNoteTrainingSessions,
    getSessionsBySubMode
  };
};