import type { NoteWithOctave } from './music';

export interface GuessAttempt {
  id: string;
  timestamp: Date;
  actualNote: NoteWithOctave;
  guessedNote: NoteWithOctave | null;
  isCorrect: boolean;
}

export type ModeType = 'rush' | 'survival' | 'sandbox';

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
}

export interface ModeSettings {
  selectedMode: ModeType;
  rush: RushModeSettings;
  survival: SurvivalModeSettings;
  sandbox: SandboxModeSettings;
}

export interface BaseGameState {
  elapsedTime: number;
  isCompleted: boolean;
  totalAttempts: number;
  longestStreak: number;
  currentStreak: number;
  startTime?: Date;
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
}

export interface SandboxGameState extends BaseGameState {
  sessionDuration: number;
  targetAccuracy?: number;
  targetStreak?: number;
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
  selectedMode: 'rush',
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
    sessionDuration: 1, // 1 minute
    targetAccuracy: 80,
    targetStreak: 10
  }
};