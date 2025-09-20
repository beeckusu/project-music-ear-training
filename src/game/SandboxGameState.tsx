import React from 'react';
import type {
  BaseGameState,
  SandboxGameState,
  SandboxModeSettings,
  GameStats,
  StatItem,
  HistoryItem,
  GameSession
} from '../types/game';
import type { CommonDisplayProps, GameActionResult } from './GameStateFactory';
import SandboxModeDisplay from '../components/modes/SandboxModeDisplay';
import { Timer } from '../utils/Timer';
import '../components/strategies/SandboxGameEndModal.css';

export class SandboxGameStateImpl implements SandboxGameState {
  elapsedTime: number = 0;
  isCompleted: boolean = false;
  totalAttempts: number = 0;
  longestStreak: number = 0;
  currentStreak: number = 0;
  startTime?: Date;
  sessionDuration: number;
  targetAccuracy?: number;
  targetStreak?: number;
  sandboxSettings: SandboxModeSettings;

  // Timer management
  private noteTimer: Timer | null = null;

  constructor(sandboxSettings: SandboxModeSettings) {
    this.sandboxSettings = sandboxSettings;
    this.sessionDuration = sandboxSettings.sessionDuration;
    this.targetAccuracy = sandboxSettings.targetAccuracy;
    this.targetStreak = sandboxSettings.targetStreak;
  }

  modeDisplay = (props: CommonDisplayProps) => (
    <SandboxModeDisplay
      gameState={this}
      {...props}
    />
  );

  handleCorrectGuess = (): GameActionResult => {
    // Pause note timer on correct guess (will be resumed/reset by game logic)
    this.noteTimer?.pause();

    // TODO: Implement sandbox mode logic in future ticket
    return {
      gameCompleted: false,
      feedback: 'Correct!',
      shouldAdvance: true
    };
  };

  handleIncorrectGuess = (): GameActionResult => {
    // TODO: Implement sandbox mode logic in future ticket
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
    return 'Listen to the note and identify it on the keyboard';
  };

  onStartNewRound = (): void => {
    // TODO: Implement sandbox mode start round logic
  };

  getTimerMode = (): 'count-up' | 'count-down' | 'none' => {
    return 'count-down';
  };

  getCompletionMessage = (): string => {
    if (!this.isCompleted) return '';
    return '🎉 Sandbox Mode Complete! Piano is now in free play mode.';
  };

  getSessionSettings = (): Record<string, any> => {
    return {
      sessionDuration: this.sandboxSettings.sessionDuration,
      targetAccuracy: this.sandboxSettings.targetAccuracy,
      targetStreak: this.sandboxSettings.targetStreak
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
    return '🎼';
  };

  getHeaderTitle = (sessionResults: Record<string, any>): string => {
    return 'Practice Complete!';
  };

  getModeCompletionText = (sessionResults: Record<string, any>): string => {
    return 'Sandbox Practice Session';
  };

  getPerformanceRating = (gameStats: GameStats, sessionResults: Record<string, any>): string => {
    const accuracy = gameStats.accuracy;
    const sessionMinutes = Math.floor(gameStats.completionTime / 60);

    if (accuracy >= 90) return `Excellent Practice! 🌟 (${sessionMinutes}m)`;
    if (accuracy >= 75) return `Great Progress! 👍 (${sessionMinutes}m)`;
    if (accuracy >= 60) return `Good Effort! 📈 (${sessionMinutes}m)`;
    return `Keep Practicing! 💪 (${sessionMinutes}m)`;
  };

  getHeaderThemeClass = (sessionResults: Record<string, any>): string => {
    return 'sandbox-complete';
  };

  getStatsItems = (gameStats: GameStats, sessionResults: Record<string, any>): StatItem[] => {
    const formatTime = (seconds: number): string => {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    return [
      {
        label: 'Session Duration',
        value: formatTime(gameStats.completionTime),
        className: 'stat-neutral'
      },
      {
        label: 'Notes Practiced',
        value: gameStats.totalAttempts.toString(),
        className: 'stat-neutral'
      },
      {
        label: 'Accuracy',
        value: `${gameStats.accuracy.toFixed(1)}%`,
        className: gameStats.accuracy >= 80 ? 'stat-success' : gameStats.accuracy >= 60 ? 'stat-neutral' : 'stat-warning'
      },
      {
        label: 'Average per Note',
        value: `${gameStats.averageTimePerNote.toFixed(1)}s`,
        className: 'stat-neutral'
      },
      {
        label: 'Longest Streak',
        value: gameStats.longestStreak.toString(),
        className: 'stat-neutral'
      },
      {
        label: 'Correct Notes',
        value: `${gameStats.correctAttempts}/${gameStats.totalAttempts}`,
        className: 'stat-neutral'
      }
    ];
  };

  getAdditionalStatsSection = (): React.ReactNode => {
    return null; // Sandbox mode doesn't need additional sections
  };

  getHistoryTitle = (settings: Record<string, any>): string => {
    return 'Your Recent Practice Sessions';
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