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
import type { IGameMode } from './IGameMode';
import type { NoteWithOctave } from '../types/music';
import type { NoteFilter } from '../types/filters';
import { AudioEngine } from '../utils/audioEngine';
import { GAME_MODES } from '../constants';
import SandboxModeDisplay from '../components/modes/SandboxModeDisplay';
import { Timer } from '../utils/Timer';
import '../components/strategies/SandboxGameEndModal.css';

export class SandboxGameStateImpl implements SandboxGameState, IGameMode {
  elapsedTime: number = 0;
  isCompleted: boolean = false;
  totalAttempts: number = 0;
  longestStreak: number = 0;
  currentStreak: number = 0;
  startTime?: Date;
  sessionDuration: number;
  targetAccuracy?: number;
  targetStreak?: number;
  targetNotes?: number;
  sandboxSettings: SandboxModeSettings;
  correctAttempts: number = 0;
  private sessionCompleted: boolean = false;
  private finalStats?: GameStats;
  private completionCallback?: () => void;

  // Timer management
  private sessionTimer: Timer;
  private noteTimer: Timer | null = null;

  constructor(sandboxSettings: SandboxModeSettings) {
    this.sandboxSettings = sandboxSettings;
    this.sessionDuration = sandboxSettings.sessionDuration;
    this.targetAccuracy = sandboxSettings.targetAccuracy;
    this.targetStreak = sandboxSettings.targetStreak;
    this.targetNotes = sandboxSettings.targetNotes;

    // Initialize session timer (count-down from session duration)
    const sessionDurationSeconds = sandboxSettings.sessionDuration * 60; // minutes to seconds
    this.sessionTimer = new Timer({ initialTime: sessionDurationSeconds, direction: 'down' }, {
      onTimeUpdate: (time) => {
        this.elapsedTime = sessionDurationSeconds - time;
      },
      onTimeUp: () => {
        // When session time runs out, complete the game
        if (!this.isCompleted) {
          this.completeSession();
          // Trigger the completion callback
          if (this.completionCallback) {
            this.completionCallback();
          }
        }
      }
    });
  }

  modeDisplay = (props: CommonDisplayProps) => (
    <SandboxModeDisplay
      gameState={this}
      {...props}
    />
  );

  handleCorrectGuess = (): GameActionResult => {
    const newCurrentStreak = this.currentStreak + 1;
    const newLongestStreak = Math.max(this.longestStreak, newCurrentStreak);
    const newTotalAttempts = this.totalAttempts + 1;
    const newCorrectAttempts = this.correctAttempts + 1;

    // Update state
    this.currentStreak = newCurrentStreak;
    this.longestStreak = newLongestStreak;
    this.totalAttempts = newTotalAttempts;
    this.correctAttempts = newCorrectAttempts;

    // Pause note timer on correct guess (will be resumed/reset by game logic)
    this.noteTimer?.pause();

    const currentAccuracy = (newCorrectAttempts / newTotalAttempts) * 100;

    // Build feedback string with relevant progress
    let feedback = `Correct! Accuracy: ${currentAccuracy.toFixed(1)}%`;
    if (this.targetNotes) {
      feedback += ` | Notes: ${newCorrectAttempts}/${this.targetNotes}`;
    }
    feedback += ` | Streak: ${newCurrentStreak}`;

    // Check if any targets are met
    let gameCompleted = false;
    if (this.targetNotes && newCorrectAttempts >= this.targetNotes) {
      gameCompleted = true;
      this.completeSession();
    } else if (this.targetAccuracy && currentAccuracy >= this.targetAccuracy) {
      gameCompleted = true;
      this.completeSession();
    } else if (this.targetStreak && newCurrentStreak >= this.targetStreak) {
      gameCompleted = true;
      this.completeSession();
    }

    return {
      gameCompleted,
      feedback,
      shouldAdvance: true,
      stats: gameCompleted ? this.finalStats : undefined
    };
  };

  handleIncorrectGuess = (): GameActionResult => {
    this.currentStreak = 0;
    this.totalAttempts = this.totalAttempts + 1;

    const currentAccuracy = this.totalAttempts > 0 ? (this.correctAttempts / this.totalAttempts) * 100 : 0;

    return {
      gameCompleted: false,
      feedback: `Incorrect. Accuracy: ${currentAccuracy.toFixed(1)}% | Streak reset`,
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
    // Start session timer on first round
    if (!this.startTime && !this.sessionCompleted) {
      this.startTime = new Date();
      this.sessionTimer.start();
    }
  };

  setCompletionCallback = (callback: () => void): void => {
    this.completionCallback = callback;
  };

  private completeSession = (): void => {
    this.isCompleted = true;
    this.sessionCompleted = true;
    this.sessionTimer.stop();

    // Generate final stats and check if targets were met
    const finalStats: GameStats = {
      completionTime: this.elapsedTime,
      accuracy: this.totalAttempts > 0 ? (this.correctAttempts / this.totalAttempts) * 100 : 0,
      averageTimePerNote: this.correctAttempts > 0 ? this.elapsedTime / this.correctAttempts : 0,
      longestStreak: this.longestStreak,
      totalAttempts: this.totalAttempts,
      correctAttempts: this.correctAttempts
    };

    // Store the final stats for use in completion methods
    this.finalStats = finalStats;
  };

  getTimerMode = (): 'count-up' | 'count-down' | 'none' => {
    return 'count-down';
  };

  getCompletionMessage = (): string => {
    if (!this.isCompleted) return '';

    const targetsMet = this.wereTargetsMet();
    if (targetsMet) {
      return '🎯 Targets Achieved! Piano is now in free play mode.';
    } else {
      return '📈 Practice Complete! Piano is now in free play mode.';
    }
  };

  private wereTargetsMet = (): boolean => {
    if (!this.finalStats) return false;

    let accuracyMet = true;
    let streakMet = true;
    let notesMet = true;

    if (this.targetAccuracy) {
      accuracyMet = this.finalStats.accuracy >= this.targetAccuracy;
    }

    if (this.targetStreak) {
      streakMet = this.finalStats.longestStreak >= this.targetStreak;
    }

    if (this.targetNotes) {
      notesMet = this.finalStats.correctAttempts >= this.targetNotes;
    }

    return accuracyMet && streakMet && notesMet;
  };

  getFinalStats = (): GameStats | null => {
    return this.finalStats || null;
  };

  getSessionSettings = (): Record<string, any> => {
    return {
      sessionDuration: this.sandboxSettings.sessionDuration,
      targetAccuracy: this.sandboxSettings.targetAccuracy,
      targetStreak: this.sandboxSettings.targetStreak,
      targetNotes: this.sandboxSettings.targetNotes
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

  getSessionTimerState = (): { timeRemaining: number; isActive: boolean } => {
    return this.sessionTimer.getState();
  };

  pauseTimer = (): void => {
    this.noteTimer?.pause();
    this.sessionTimer?.pause();
  };

  resumeTimer = (): void => {
    this.noteTimer?.resume();
    this.sessionTimer?.resume();
  };

  resetTimer = (): void => {
    this.noteTimer?.reset();
  };

  // End Screen Strategy Methods
  getCelebrationEmoji = (_sessionResults: Record<string, any>): string => {
    const targetsMet = this.wereTargetsMet();
    return targetsMet ? '🎯' : '🎼';
  };

  getHeaderTitle = (_sessionResults: Record<string, any>): string => {
    const targetsMet = this.wereTargetsMet();
    return targetsMet ? 'Targets Achieved!' : 'Practice Complete!';
  };

  getModeCompletionText = (_sessionResults: Record<string, any>): string => {
    const targetsMet = this.wereTargetsMet();
    if (targetsMet) {
      return 'All practice targets successfully achieved!';
    } else {
      return 'Practice session completed - keep working toward your targets!';
    }
  };

  getPerformanceRating = (gameStats: GameStats, _sessionResults: Record<string, any>): string => {
    const sessionMinutes = Math.floor(gameStats.completionTime / 60);
    const targetsMet = this.wereTargetsMet();

    if (targetsMet) {
      return `Perfect! All targets achieved! 🎆 (${sessionMinutes}m)`;
    }

    const accuracy = gameStats.accuracy;
    if (accuracy >= 90) return `Excellent Practice! 🌟 (${sessionMinutes}m)`;
    if (accuracy >= 75) return `Great Progress! 👍 (${sessionMinutes}m)`;
    if (accuracy >= 60) return `Good Effort! 📈 (${sessionMinutes}m)`;
    return `Keep Practicing! 💪 (${sessionMinutes}m)`;
  };

  getHeaderThemeClass = (_sessionResults: Record<string, any>): string => {
    const targetsMet = this.wereTargetsMet();
    return targetsMet ? 'sandbox-success' : 'sandbox-complete';
  };

  getStatsItems = (gameStats: GameStats, _sessionResults: Record<string, any>): StatItem[] => {
    const formatTime = (seconds: number): string => {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const accuracyMet = !this.targetAccuracy || gameStats.accuracy >= this.targetAccuracy;
    const streakMet = !this.targetStreak || gameStats.longestStreak >= this.targetStreak;
    const notesMet = !this.targetNotes || gameStats.correctAttempts >= this.targetNotes;

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
        value: this.targetAccuracy
          ? `${gameStats.accuracy.toFixed(1)}% / ${this.targetAccuracy}%`
          : `${gameStats.accuracy.toFixed(1)}%`,
        className: accuracyMet ? 'stat-success' : 'stat-warning'
      },
      {
        label: 'Average per Note',
        value: `${gameStats.averageTimePerNote.toFixed(1)}s`,
        className: 'stat-neutral'
      },
      {
        label: 'Longest Streak',
        value: this.targetStreak
          ? `${gameStats.longestStreak} / ${this.targetStreak}`
          : gameStats.longestStreak.toString(),
        className: streakMet ? 'stat-success' : 'stat-warning'
      },
      {
        label: this.targetNotes ? 'Target Notes' : 'Correct Notes',
        value: this.targetNotes
          ? `${gameStats.correctAttempts} / ${this.targetNotes}`
          : `${gameStats.correctAttempts}/${gameStats.totalAttempts}`,
        className: this.targetNotes ? (notesMet ? 'stat-success' : 'stat-warning') : 'stat-neutral'
      }
    ];
  };

  getAdditionalStatsSection = (): React.ReactNode => {
    if (!this.targetAccuracy && !this.targetStreak && !this.targetNotes) {
      return null; // No targets set, no additional section needed
    }

    const targetsMet = this.wereTargetsMet();

    return React.createElement('div', {
      className: `target-achievement ${targetsMet ? 'targets-met' : 'targets-missed'}`
    }, [
      React.createElement('h3', { key: 'title' }, 'Target Achievement'),
      React.createElement('div', { key: 'status', className: 'achievement-status' },
        targetsMet ? '🎯 All targets achieved!' : '📈 Keep working toward your targets!'
      )
    ]);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getHistoryTitle = (_settings: Record<string, any>): string => {
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

  // ========================================
  // IGameMode Implementation
  // ========================================

  generateNote = (filter: NoteFilter): NoteWithOctave => {
    return AudioEngine.getRandomNoteFromFilter(filter);
  };

  validateGuess = (guess: NoteWithOctave, actual: NoteWithOctave): boolean => {
    return guess.note === actual.note;
  };

  isGameComplete = (): boolean => {
    return this.isCompleted;
  };

  getMode = (): string => {
    return GAME_MODES.SANDBOX;
  };
}