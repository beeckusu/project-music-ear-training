import React from 'react';
import type { NoteWithOctave } from './music';
import type { EarTrainingSubMode } from '../constants';

export interface GuessAttempt {
  id: string;
  timestamp: Date;
  actualNote: NoteWithOctave;
  guessedNote: NoteWithOctave | null;
  isCorrect: boolean;
}

export type ModeType = EarTrainingSubMode;

export interface RushModeSettings {
  targetNotes: number; // Number of correct notes to hit
}

export interface SurvivalModeSettings {
  sessionDuration: number; // Minutes to survive
  healthDrainRate: number; // Health lost per second
  healthRecovery: number; // Health gained per correct note
  healthDamage: number; // Health lost per wrong note
}

export interface SandboxModeSettings {
  sessionDuration: number; // Minutes to practice
  targetAccuracy?: number; // Optional accuracy target
  targetStreak?: number; // Optional streak target
  targetNotes?: number; // Optional notes target
}

export interface ModeSettings {
  selectedMode: ModeType;
  rush: RushModeSettings;
  survival: SurvivalModeSettings;
  sandbox: SandboxModeSettings;
}

export interface StatItem {
  label: string;
  value: string;
  className?: string;
}

export interface HistoryItem {
  primaryStat: string;
  secondaryStat: string;
  metadata: string;
  className?: string;
}

export interface BaseGameState {
  elapsedTime: number;
  isCompleted: boolean;
  totalAttempts: number;
  longestStreak: number;
  currentStreak: number;
  startTime?: Date;

  // End Screen Strategy Methods
  getCelebrationEmoji(sessionResults: Record<string, any>): string;
  getHeaderTitle(sessionResults: Record<string, any>): string;
  getModeCompletionText(sessionResults: Record<string, any>): string;
  getPerformanceRating(gameStats: GameStats, sessionResults: Record<string, any>): string;
  getHeaderThemeClass(sessionResults: Record<string, any>): string;
  getStatsItems(gameStats: GameStats, sessionResults: Record<string, any>): StatItem[];
  getAdditionalStatsSection?(sessionResults: Record<string, any>): React.ReactNode;
  getHistoryTitle(settings: Record<string, any>): string;
  getHistoryItems(sessions: GameSession[]): HistoryItem[];
  shouldShowHistory(sessions: GameSession[]): boolean;
}

export interface RushGameState extends BaseGameState {
  correctCount: number;
  completionTime?: number;
}

export interface SurvivalGameState extends BaseGameState {
  health: number;
  maxHealth: number;
  healthDrainRate: number;
  healthRecovery: number;
  healthDamage: number;
  correctCount: number;
  survivalSettings: SurvivalModeSettings;
}

export interface SandboxGameState extends BaseGameState {
  sessionDuration: number;
  targetAccuracy?: number;
  targetStreak?: number;
  targetNotes?: number;
  correctAttempts: number;
}

export interface GameSession {
  mode: string;
  timestamp: Date;
  completionTime: number;
  accuracy: number;
  totalAttempts: number;
  settings: Record<string, any>;
  results: Record<string, any>;
}

export interface GameStats {
  completionTime: number;
  accuracy: number;
  averageTimePerNote: number;
  longestStreak: number;
  totalAttempts: number;
  correctAttempts: number;
}

export const DEFAULT_MODE_SETTINGS: ModeSettings = {
  selectedMode: 'sandbox',
  rush: {
    targetNotes: 10
  },
  survival: {
    sessionDuration: 1, // 1 minute
    healthDrainRate: 2, // 2 health per second
    healthRecovery: 15, // 15 health per correct note
    healthDamage: 25 // 25 health per wrong note
  },
  sandbox: {
    sessionDuration: 5 / 60, // 5 seconds (converted to minutes)
    targetAccuracy: 80,
    targetStreak: 10,
    targetNotes: 20
  }
};