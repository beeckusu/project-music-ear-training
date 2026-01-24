import { useState, useCallback, useEffect } from 'react';
import type { ChordStats, ChordStatsStore, SerializedChordStats } from '../types/stats';
import { CHORD_STATS_VERSION } from '../types/stats';
import type { NoteTrainingSessionResults, ChordTypeStats } from '../types/game';
import type { ChordType } from '../types/music';
import { STORAGE_KEYS } from '../constants';

export interface ChordStatsHook {
  /** All chord stats as a record keyed by chord name */
  stats: Record<string, ChordStats>;

  /** Get stats for a specific chord by name */
  getChordStats: (chordName: string) => ChordStats | undefined;

  /** Get stats for all chords of a specific type (e.g., "major", "minor7") */
  getStatsByChordType: (chordType: ChordType) => ChordStats[];

  /** Get all stats sorted by a criteria */
  getAllStats: (sortBy?: 'accuracy' | 'attempts' | 'lastPracticed' | 'name') => ChordStats[];

  /** Update stats from a completed Note Training session */
  updateFromSession: (sessionResults: NoteTrainingSessionResults) => void;

  /** Clear all chord stats */
  clearStats: () => void;

  /** Timestamp of last update */
  lastUpdated: Date | null;
}

/**
 * Deserialize stored stats, converting ISO strings back to Date objects.
 */
function deserializeStats(stored: ChordStatsStore): Record<string, ChordStats> {
  const result: Record<string, ChordStats> = {};

  for (const [key, serialized] of Object.entries(stored.stats)) {
    result[key] = {
      ...serialized,
      lastPracticed: new Date(serialized.lastPracticed)
    };
  }

  return result;
}

/**
 * Serialize stats for localStorage, converting Dates to ISO strings.
 */
function serializeStats(stats: Record<string, ChordStats>): Record<string, SerializedChordStats> {
  const result: Record<string, SerializedChordStats> = {};

  for (const [key, stat] of Object.entries(stats)) {
    result[key] = {
      ...stat,
      lastPracticed: stat.lastPracticed.toISOString()
    };
  }

  return result;
}

/**
 * Hook for managing long-term chord statistics across sessions.
 * Persists to localStorage and provides methods for querying and updating stats.
 */
export const useChordStats = (): ChordStatsHook => {
  const [stats, setStats] = useState<Record<string, ChordStats>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load stats from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CHORD_STATS);
      if (stored) {
        const parsed: ChordStatsStore = JSON.parse(stored);

        // Version check for future migrations
        if (parsed.version !== CHORD_STATS_VERSION) {
          console.warn('Chord stats version mismatch, resetting stats');
          setStats({});
          setLastUpdated(null);
          return;
        }

        setStats(deserializeStats(parsed));
        setLastUpdated(new Date(parsed.lastUpdated));
      }
    } catch (error) {
      console.warn('Failed to load chord stats from localStorage:', error);
      setStats({});
      setLastUpdated(null);
    }
  }, []);

  // Save stats to localStorage whenever they change
  useEffect(() => {
    // Skip initial empty state to avoid overwriting stored data
    if (Object.keys(stats).length === 0 && lastUpdated === null) {
      return;
    }

    try {
      const store: ChordStatsStore = {
        version: CHORD_STATS_VERSION,
        stats: serializeStats(stats),
        lastUpdated: (lastUpdated ?? new Date()).toISOString()
      };
      localStorage.setItem(STORAGE_KEYS.CHORD_STATS, JSON.stringify(store));
    } catch (error) {
      console.warn('Failed to save chord stats to localStorage:', error);
    }
  }, [stats, lastUpdated]);

  const getChordStats = useCallback((chordName: string): ChordStats | undefined => {
    return stats[chordName];
  }, [stats]);

  const getStatsByChordType = useCallback((chordType: ChordType): ChordStats[] => {
    // Filter stats where the chord name contains the chord type
    // e.g., "C Major" contains "major", "Am7" contains "minor7"
    const typePattern = chordType.toLowerCase();

    return Object.values(stats).filter(stat => {
      const nameLower = stat.chordName.toLowerCase();
      // Check if the chord type is part of the name
      // Handle both formats: "C Major" and "Cmaj7"
      return nameLower.includes(typePattern) ||
             (typePattern === 'major' && nameLower.includes('maj') && !nameLower.includes('maj7')) ||
             (typePattern === 'minor' && (nameLower.includes('min') || nameLower.includes('m')) && !nameLower.includes('min7')) ||
             (typePattern === 'major7' && nameLower.includes('maj7')) ||
             (typePattern === 'minor7' && (nameLower.includes('min7') || nameLower.includes('m7')));
    });
  }, [stats]);

  const getAllStats = useCallback((
    sortBy: 'accuracy' | 'attempts' | 'lastPracticed' | 'name' = 'attempts'
  ): ChordStats[] => {
    const allStats = Object.values(stats);

    switch (sortBy) {
      case 'accuracy':
        return allStats.sort((a, b) => b.averageAccuracy - a.averageAccuracy);
      case 'attempts':
        return allStats.sort((a, b) => b.totalAttempts - a.totalAttempts);
      case 'lastPracticed':
        return allStats.sort((a, b) => b.lastPracticed.getTime() - a.lastPracticed.getTime());
      case 'name':
        return allStats.sort((a, b) => a.chordName.localeCompare(b.chordName));
      default:
        return allStats;
    }
  }, [stats]);

  const updateFromSession = useCallback((sessionResults: NoteTrainingSessionResults) => {
    const now = new Date();
    const { chordTypeStats } = sessionResults;

    if (!chordTypeStats || Object.keys(chordTypeStats).length === 0) {
      return;
    }

    setStats(prevStats => {
      const updatedStats = { ...prevStats };

      for (const [chordName, sessionStats] of Object.entries(chordTypeStats as Record<string, ChordTypeStats>)) {
        const existing = updatedStats[chordName];

        if (existing) {
          // Update existing stats
          const newTotalAttempts = existing.totalAttempts + sessionStats.attempts;
          const newCorrectAttempts = existing.correctAttempts + sessionStats.correct;
          const newAverageAccuracy = newTotalAttempts > 0
            ? (newCorrectAttempts / newTotalAttempts) * 100
            : 0;

          updatedStats[chordName] = {
            chordName,
            totalAttempts: newTotalAttempts,
            correctAttempts: newCorrectAttempts,
            lastPracticed: now,
            averageAccuracy: Math.round(newAverageAccuracy * 10) / 10 // Round to 1 decimal
          };
        } else {
          // Create new stats entry
          const accuracy = sessionStats.attempts > 0
            ? (sessionStats.correct / sessionStats.attempts) * 100
            : 0;

          updatedStats[chordName] = {
            chordName,
            totalAttempts: sessionStats.attempts,
            correctAttempts: sessionStats.correct,
            lastPracticed: now,
            averageAccuracy: Math.round(accuracy * 10) / 10
          };
        }
      }

      return updatedStats;
    });

    setLastUpdated(now);
  }, []);

  const clearStats = useCallback(() => {
    setStats({});
    setLastUpdated(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.CHORD_STATS);
    } catch (error) {
      console.warn('Failed to clear chord stats from localStorage:', error);
    }
  }, []);

  return {
    stats,
    getChordStats,
    getStatsByChordType,
    getAllStats,
    updateFromSession,
    clearStats,
    lastUpdated
  };
};
