import React from 'react';
import type {
  BaseGameState,
  RushGameState,
  RushModeSettings,
  GameStats,
  StatItem,
  HistoryItem,
  GameSession
} from '../types/game';
import type { CommonDisplayProps, GameActionResult } from './GameStateFactory';
import RushModeDisplay from '../components/modes/RushModeDisplay';
import { Timer } from '../utils/Timer';
import '../components/strategies/RushGameEndModal.css';

export class RushGameStateImpl implements RushGameState {
  elapsedTime: number = 0;
  isCompleted: boolean = false;
  totalAttempts: number = 0;
  longestStreak: number = 0;
  currentStreak: number = 0;
  startTime?: Date;
  correctCount: number = 0;
  completionTime?: number;
  rushSettings: RushModeSettings;

  // Timer management
  private rushTimer: Timer;
  private noteTimer: Timer | null = null;

  constructor(rushSettings: RushModeSettings) {
    this.rushSettings = rushSettings;

    // Initialize rush timer (count-up)
    this.rushTimer = new Timer({ initialTime: 0, direction: 'up' }, {
      onTimeUpdate: (time) => {
        this.elapsedTime = time;
      }
    });
  }

  modeDisplay = (props: CommonDisplayProps) => (
    <RushModeDisplay
      gameState={this}
      rushSettings={this.rushSettings}
      {...props}
    />
  );

  handleCorrectGuess = (): GameActionResult => {
    const newCorrectCount = this.correctCount + 1;
    const newCurrentStreak = this.currentStreak + 1;
    const newLongestStreak = Math.max(this.longestStreak, newCurrentStreak);
    const newTotalAttempts = this.totalAttempts + 1;

    // Update state
    this.correctCount = newCorrectCount;
    this.currentStreak = newCurrentStreak;
    this.longestStreak = newLongestStreak;
    this.totalAttempts = newTotalAttempts;

    // Pause note timer on correct guess (will be resumed/reset by game logic)
    this.noteTimer?.pause();

    if (newCorrectCount >= this.rushSettings.targetNotes) {
      this.isCompleted = true;
      this.completionTime = this.elapsedTime;

      // Stop the rush timer when game completes
      this.rushTimer.stop();

      const finalStats: GameStats = {
        completionTime: this.elapsedTime,
        accuracy: (newCorrectCount / newTotalAttempts) * 100,
        averageTimePerNote: this.elapsedTime / newCorrectCount,
        longestStreak: newLongestStreak,
        totalAttempts: newTotalAttempts,
        correctAttempts: newCorrectCount
      };

      return {
        gameCompleted: true,
        feedback: `🎉 Rush Mode Complete! ${newCorrectCount}/${this.rushSettings.targetNotes} notes`,
        shouldAdvance: false,
        stats: finalStats
      };
    } else {
      const minutes = Math.floor(this.elapsedTime / 60);
      const seconds = Math.floor(this.elapsedTime % 60);
      return {
        gameCompleted: false,
        feedback: `Correct! ${newCorrectCount}/${this.rushSettings.targetNotes} notes (${minutes}:${seconds.toString().padStart(2, '0')})`,
        shouldAdvance: true
      };
    }
  };

  handleIncorrectGuess = (): GameActionResult => {
    this.currentStreak = 0;
    this.totalAttempts = this.totalAttempts + 1;

    return {
      gameCompleted: false,
      feedback: 'Try again!',
      shouldAdvance: false
    };
  };

  updateState = (updates: Partial<BaseGameState>) => {
    Object.assign(this, updates);
  };

  getFeedbackMessage = (currentNote: boolean): string => {
    if (!currentNote) {
      return 'Click "Start Practice" to begin your ear training session';
    }
    return `Listen to the note and identify it on the keyboard (${this.correctCount}/${this.rushSettings.targetNotes})`;
  };

  onStartNewRound = (): void => {
    // For Rush mode, start the count-up timer on first round
    if (!this.startTime && !this.isCompleted) {
      this.startTime = new Date();
      this.rushTimer.start();
    }
  };

  getTimerMode = (): 'count-up' | 'count-down' | 'none' => {
    return 'count-up';
  };

  getCompletionMessage = (): string => {
    if (!this.isCompleted) return '';
    return '🎉 Rush Mode Complete! Piano is now in free play mode.';
  };

  getSessionSettings = (): Record<string, any> => {
    return {
      targetNotes: this.rushSettings.targetNotes
    };
  };

  getSessionResults = (stats: GameStats): Record<string, any> => {
    return {
      notesCompleted: stats.correctAttempts,
      longestStreak: stats.longestStreak,
      averageTimePerNote: stats.averageTimePerNote
    };
  };

  // Timer management methods
  initializeTimer = (responseTimeLimit: number | null, isPaused: boolean, onTimeUp: () => void, onTimeUpdate?: (timeRemaining: number) => void): void => {
    if (responseTimeLimit) {
      this.noteTimer = new Timer(
        { initialTime: responseTimeLimit, direction: 'down' },
        { onTimeUp, onTimeUpdate }
      );

      if (!isPaused) {
        this.noteTimer.start();
      }
    }
  };

  getTimerState = (): { timeRemaining: number; isActive: boolean } => {
    return this.noteTimer?.getState() || { timeRemaining: 0, isActive: false };
  };

  pauseTimer = (): void => {
    this.noteTimer?.pause();
  };

  resumeTimer = (): void => {
    this.noteTimer?.resume();
  };

  resetTimer = (): void => {
    this.noteTimer?.reset();
  };

  // End Screen Strategy Methods
  getCelebrationEmoji = (sessionResults: Record<string, any>): string => {
    return '🎉';
  };

  getHeaderTitle = (sessionResults: Record<string, any>): string => {
    return 'Congratulations!';
  };

  getModeCompletionText = (sessionResults: Record<string, any>): string => {
    return 'Rush Mode Complete';
  };

  getPerformanceRating = (gameStats: GameStats, sessionResults: Record<string, any>): string => {
    const avgTimePerNote = gameStats.averageTimePerNote;

    if (avgTimePerNote <= 1.0) return 'Lightning Fast ⚡';
    if (avgTimePerNote <= 1.5) return 'Blazing Speed 🔥';
    if (avgTimePerNote <= 2.0) return 'Quick & Sharp 🎯';
    if (avgTimePerNote <= 3.0) return 'Steady Pace 🎵';
    return 'Methodical 🎭';
  };

  getHeaderThemeClass = (sessionResults: Record<string, any>): string => {
    return 'rush-complete';
  };

  getStatsItems = (gameStats: GameStats, sessionResults: Record<string, any>): StatItem[] => {
    const formatTime = (seconds: number): string => {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    return [
      {
        label: 'Time',
        value: formatTime(gameStats.completionTime),
        className: 'stat-neutral'
      },
      {
        label: 'Accuracy',
        value: `${gameStats.accuracy.toFixed(1)}%`,
        className: gameStats.accuracy >= 90 ? 'stat-success' : gameStats.accuracy >= 70 ? 'stat-neutral' : 'stat-warning'
      },
      {
        label: 'Average per Note',
        value: `${gameStats.averageTimePerNote.toFixed(1)}s`,
        className: gameStats.averageTimePerNote <= 2.0 ? 'stat-success' : 'stat-neutral'
      },
      {
        label: 'Longest Streak',
        value: gameStats.longestStreak.toString(),
        className: 'stat-neutral'
      },
      {
        label: 'Total Notes',
        value: `${gameStats.correctAttempts}/${gameStats.totalAttempts}`,
        className: 'stat-neutral'
      }
    ];
  };

  getAdditionalStatsSection = (): React.ReactNode => {
    return null; // Rush mode doesn't need additional sections
  };

  getHistoryTitle = (settings: Record<string, any>): string => {
    const targetNotes = settings.targetNotes || 25;
    return `Your Recent ${targetNotes} Note Runs`;
  };

  getHistoryItems = (sessions: GameSession[]): HistoryItem[] => {
    const formatTime = (seconds: number): string => {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const formatRelativeTime = (timestamp: Date): string => {
      const now = new Date();
      const diffMs = now.getTime() - timestamp.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMinutes < 1) return 'just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return timestamp.toLocaleDateString();
    };

    return sessions.map(session => ({
      primaryStat: formatTime(session.completionTime),
      secondaryStat: `${session.accuracy.toFixed(1)}%`,
      metadata: formatRelativeTime(session.timestamp),
      className: 'history-neutral'
    }));
  };

  shouldShowHistory = (sessions: GameSession[]): boolean => {
    return sessions.length > 0;
  };
}