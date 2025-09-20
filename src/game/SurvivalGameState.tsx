import React from 'react';
import type {
  BaseGameState,
  SurvivalGameState,
  SurvivalModeSettings,
  GameStats,
  StatItem,
  HistoryItem,
  GameSession
} from '../types/game';
import type { CommonDisplayProps, GameActionResult } from './GameStateFactory';
import SurvivalModeDisplay from '../components/modes/SurvivalModeDisplay';
import { Timer } from '../utils/Timer';
import '../components/strategies/SurvivalGameEndModal.css';

export class SurvivalGameStateImpl implements SurvivalGameState {
  elapsedTime: number = 0;
  isCompleted: boolean = false;
  totalAttempts: number = 0;
  longestStreak: number = 0;
  currentStreak: number = 0;
  startTime?: Date;
  health: number;
  maxHealth: number = 100;
  healthDrainRate: number;
  healthRecovery: number;
  healthDamage: number;
  survivalSettings: SurvivalModeSettings;
  correctCount: number = 0;
  private healthDrainInterval?: ReturnType<typeof setInterval>;
  private isVictory: boolean = false;

  // Timer management
  private survivalTimer: Timer;
  private noteTimer: Timer | null = null;

  constructor(survivalSettings: SurvivalModeSettings) {
    this.survivalSettings = survivalSettings;
    this.health = this.maxHealth;
    this.healthDrainRate = survivalSettings.healthDrainRate;
    this.healthRecovery = survivalSettings.healthRecovery;
    this.healthDamage = survivalSettings.healthDamage;

    // Initialize survival timer (count-down from session duration)
    const sessionDuration = survivalSettings.sessionDuration * 60; // minutes to seconds
    this.survivalTimer = new Timer({ initialTime: sessionDuration, direction: 'down' }, {
      onTimeUpdate: (time) => {
        this.elapsedTime = sessionDuration - time;
      },
      onTimeUp: () => {
        // When survival time runs out, complete the game
        if (!this.isCompleted) {
          this.isCompleted = true;
          this.isVictory = true;
          this.stopHealthDrain();
        }
      }
    });
  }

  modeDisplay = (props: CommonDisplayProps) => (
    <SurvivalModeDisplay
      gameState={this}
      {...props}
    />
  );

  handleCorrectGuess = (): GameActionResult => {
    const newCurrentStreak = this.currentStreak + 1;
    const newLongestStreak = Math.max(this.longestStreak, newCurrentStreak);
    const newTotalAttempts = this.totalAttempts + 1;
    const newCorrectCount = this.correctCount + 1;

    // Update state
    this.currentStreak = newCurrentStreak;
    this.longestStreak = newLongestStreak;
    this.totalAttempts = newTotalAttempts;
    this.correctCount = newCorrectCount;

    // Recover health
    this.health = Math.min(this.maxHealth, this.health + this.healthRecovery);

    // Pause note timer on correct guess (will be resumed/reset by game logic)
    this.noteTimer?.pause();

    // Check if survived full duration
    const targetDurationMs = this.survivalSettings.sessionDuration * 60 * 1000;
    const hasWon = this.elapsedTime >= targetDurationMs / 1000;

    if (hasWon) {
      this.isCompleted = true;
      this.isVictory = true;
      this.stopHealthDrain();

      // Stop the survival timer when game completes
      this.survivalTimer.stop();

      const finalStats: GameStats = {
        completionTime: this.elapsedTime,
        accuracy: (this.correctCount / newTotalAttempts) * 100,
        averageTimePerNote: this.elapsedTime / this.correctCount,
        longestStreak: newLongestStreak,
        totalAttempts: newTotalAttempts,
        correctAttempts: this.correctCount
      };

      return {
        gameCompleted: true,
        feedback: `🎉 Survival Complete! You survived ${this.survivalSettings.sessionDuration} minutes!`,
        shouldAdvance: false,
        stats: finalStats
      };
    }

    const healthPercentage = Math.round((this.health / this.maxHealth) * 100);

    return {
      gameCompleted: false,
      feedback: `Correct! +${this.healthRecovery} HP (${healthPercentage}% health)`,
      shouldAdvance: true
    };
  };

  handleIncorrectGuess = (): GameActionResult => {
    this.currentStreak = 0;
    this.totalAttempts = this.totalAttempts + 1;

    // Take damage
    this.health = Math.max(0, this.health - this.healthDamage);

    // Check if health depleted (game over)
    if (this.health <= 0) {
      this.isCompleted = true;
      this.isVictory = false;
      this.stopHealthDrain();

      // Stop the survival timer when game completes
      this.survivalTimer.stop();

      const finalStats: GameStats = {
        completionTime: this.elapsedTime,
        accuracy: this.totalAttempts > 0 ? (this.correctCount / this.totalAttempts) * 100 : 0,
        averageTimePerNote: this.correctCount > 0 ? this.elapsedTime / this.correctCount : 0,
        longestStreak: this.longestStreak,
        totalAttempts: this.totalAttempts,
        correctAttempts: this.correctCount
      };

      return {
        gameCompleted: true,
        feedback: `💀 Game Over! You survived ${Math.floor(this.elapsedTime / 60)}:${Math.floor(this.elapsedTime % 60).toString().padStart(2, '0')}`,
        shouldAdvance: false,
        stats: finalStats
      };
    }

    const healthPercentage = Math.round((this.health / this.maxHealth) * 100);
    return {
      gameCompleted: false,
      feedback: `Wrong! -${this.healthDamage} HP (${healthPercentage}% health remaining)`,
      shouldAdvance: false
    };
  };

  updateState = (updates: Partial<BaseGameState>) => {
    Object.assign(this, updates);
  };

  getFeedbackMessage = (currentNote: boolean): string => {
    if (!currentNote) {
      return 'Click "Start Practice" to begin survival mode';
    }
    return `Health: ${Math.round((this.health / this.maxHealth) * 100)}%`;
  };

  onStartNewRound = (): void => {
    // Start health drain timer and survival timer on first round
    if (!this.startTime && !this.isCompleted) {
      this.startTime = new Date();
      this.startHealthDrain();
      this.survivalTimer.start();
    }
  };

  getTimerMode = (): 'count-up' | 'count-down' | 'none' => {
    return 'count-down';
  };

  private startHealthDrain = (): void => {
    // Clear any existing interval
    this.stopHealthDrain();

    // Start health drain interval (every second)
    this.healthDrainInterval = setInterval(() => {
      if (this.isCompleted) {
        this.stopHealthDrain();
        return;
      }

      this.health = Math.max(0, this.health - this.healthDrainRate);

      // Check if health depleted
      if (this.health <= 0) {
        this.isCompleted = true;
        this.isVictory = false;
        this.stopHealthDrain();

        // Stop the survival timer when game completes
        this.survivalTimer.stop();
      }
    }, 1000);
  };

  private stopHealthDrain = (): void => {
    if (this.healthDrainInterval) {
      clearInterval(this.healthDrainInterval);
      this.healthDrainInterval = undefined;
    }
  };

  getCompletionMessage = (): string => {
    if (!this.isCompleted) return '';

    if (this.isVictory) {
      return '🎉 Survival Mode Complete! You survived the full duration! Piano is now in free play mode.';
    } else {
      return '💀 Game Over! You ran out of health. Piano is now in free play mode.';
    }
  };

  getSessionSettings = (): Record<string, any> => {
    return {
      sessionDuration: this.survivalSettings.sessionDuration,
      healthDrainRate: this.survivalSettings.healthDrainRate,
      healthRecovery: this.survivalSettings.healthRecovery,
      healthDamage: this.survivalSettings.healthDamage
    };
  };

  getSessionResults = (stats: GameStats): Record<string, any> => {
    return {
      notesCompleted: stats.correctAttempts,
      longestStreak: stats.longestStreak,
      averageTimePerNote: stats.averageTimePerNote,
      finalHealth: this.health,
      survived: this.isVictory
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
    return sessionResults.survived ? '🎉' : '💀';
  };

  getHeaderTitle = (sessionResults: Record<string, any>): string => {
    return sessionResults.survived ? 'Victory!' : 'Game Over';
  };

  getModeCompletionText = (sessionResults: Record<string, any>): string => {
    return sessionResults.survived
      ? 'Survival Mode Complete'
      : 'Survival Mode Ended';
  };

  getPerformanceRating = (gameStats: GameStats, sessionResults: Record<string, any>): string => {
    if (sessionResults.survived) {
      const finalHealthPercent = (sessionResults.finalHealth / 100) * 100;
      if (finalHealthPercent >= 80) return 'Flawless Survival! 💎';
      if (finalHealthPercent >= 60) return 'Strong Survivor! 💪';
      if (finalHealthPercent >= 40) return 'Barely Made It! 😅';
      return 'Survived by a Thread! 🩹';
    } else {
      const survivalMinutes = Math.floor(gameStats.completionTime / 60);
      if (survivalMinutes >= 10) return 'Valiant Effort! 🛡️';
      if (survivalMinutes >= 5) return 'Good Fight! ⚔️';
      if (survivalMinutes >= 2) return 'Keep Practicing! 📚';
      return 'Try Again! 💭';
    }
  };

  getHeaderThemeClass = (sessionResults: Record<string, any>): string => {
    return sessionResults.survived ? 'survival-victory' : 'survival-defeat';
  };

  getStatsItems = (gameStats: GameStats, sessionResults: Record<string, any>): StatItem[] => {
    const formatTime = (seconds: number): string => {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    return [
      {
        label: 'Result',
        value: sessionResults.survived ? 'Victory' : 'Defeat',
        className: sessionResults.survived ? 'stat-success' : 'stat-failure'
      },
      {
        label: 'Final Health',
        value: `${sessionResults.finalHealth}/100 HP`,
        className: sessionResults.finalHealth > 50 ? 'stat-success' : 'stat-warning'
      },
      {
        label: 'Survival Time',
        value: formatTime(gameStats.completionTime),
        className: 'stat-neutral'
      },
      {
        label: 'Notes Completed',
        value: sessionResults.notesCompleted.toString(),
        className: 'stat-neutral'
      },
      {
        label: 'Accuracy',
        value: `${gameStats.accuracy.toFixed(1)}%`,
        className: gameStats.accuracy >= 80 ? 'stat-success' : 'stat-neutral'
      },
      {
        label: 'Longest Streak',
        value: sessionResults.longestStreak.toString(),
        className: 'stat-neutral'
      }
    ];
  };

  getAdditionalStatsSection = (sessionResults: Record<string, any>): React.ReactNode => {
    return React.createElement('div', { className: 'survival-outcome-section' }, [
      React.createElement('h4', { key: 'title' }, 'Battle Summary'),
      React.createElement('div', { key: 'summary', className: 'outcome-summary' }, [
        React.createElement('div', {
          key: 'status',
          className: `outcome-status ${sessionResults.survived ? 'victory' : 'defeat'}`
        }, sessionResults.survived
          ? `🏆 You survived the full challenge with ${sessionResults.finalHealth} HP remaining!`
          : `⚰️ You ran out of health and survived for ${Math.floor(sessionResults.averageTimePerNote * sessionResults.notesCompleted / 60)} minutes.`
        )
      ])
    ]);
  };

  getHistoryTitle = (settings: Record<string, any>): string => {
    return `Your Recent Survival Runs (${settings.sessionDuration || 'Unknown'} min)`;
  };

  getHistoryItems = (sessions: GameSession[]): HistoryItem[] => {
    const formatTime = (seconds: number): string => {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    return sessions.map(session => ({
      primaryStat: formatTime(session.completionTime),
      secondaryStat: session.results?.survived ? '🏆 Victory' : '💀 Defeat',
      metadata: `${session.results?.finalHealth || 0} HP`,
      className: session.results?.survived ? 'history-victory' : 'history-defeat'
    }));
  };

  shouldShowHistory = (sessions: GameSession[]): boolean => {
    return sessions.length > 0;
  };

}