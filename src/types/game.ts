import React from 'react';
import type { NoteWithOctave, ChordFilter, Chord } from './music';
import { DEFAULT_CHORD_FILTER } from './music';
import type { EarTrainingSubMode, NoteTrainingSubMode } from '../constants';
import { NOTE_TRAINING_SUB_MODES } from '../constants';

export interface GuessAttempt {
  id: string;
  timestamp: Date;
  actualNote: NoteWithOctave;
  guessedNote: NoteWithOctave | null;
  isCorrect: boolean;
}

export interface ChordGuessAttempt {
  id: string;
  timestamp: Date;
  actualChord: Chord;
  isCorrect: boolean;
  accuracy?: number; // For Chord Training mode (0-100%)
  guessedChordName?: string; // For Chord Identification mode
  correctNotes?: NoteWithOctave[]; // For Chord Training
  missedNotes?: NoteWithOctave[]; // For Chord Training
  incorrectNotes?: NoteWithOctave[]; // For Chord Training
}

export type GuessResult = 'correct' | 'wrong' | 'partial';

export type ModeType = EarTrainingSubMode | NoteTrainingSubMode;

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

/**
 * Settings for Note Training mode
 */
export interface NoteTrainingModeSettings {
  /** The selected sub-mode for note training */
  selectedSubMode: NoteTrainingSubMode;
  /** Configuration for chord filtering */
  chordFilter: ChordFilter;
  /** Duration in seconds */
  sessionDuration: number;
  /** Optional percentage goal for accuracy */
  targetAccuracy?: number;
  /** Optional goal for total number of chords */
  targetChords?: number;
  /** Optional goal for consecutive correct answers */
  targetStreak?: number;
}

export interface ModeSettings {
  selectedMode: ModeType;
  rush: RushModeSettings;
  survival: SurvivalModeSettings;
  sandbox: SandboxModeSettings;
  noteTraining: NoteTrainingModeSettings;
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

/**
 * Chord-specific statistics for a single chord type.
 * Used in Note Training session results to track performance per chord.
 */
export interface ChordTypeStats {
  attempts: number;
  correct: number;
  accuracy: number;
}

/**
 * Serialized chord guess attempt for history tracking.
 * Simplified version of ChordGuessAttempt for localStorage storage.
 */
export interface SerializedChordGuessAttempt {
  id: string;
  timestamp: string; // ISO string
  chordName: string;
  isCorrect: boolean;
  // For SingleChord mode (Show Chord, Guess Notes)
  accuracy?: number;
  correctNotesCount?: number;
  missedNotesCount?: number;
  incorrectNotesCount?: number;
  // For ChordIdentification mode (Show Notes, Guess Chord)
  guessedChordName?: string;
}

/**
 * Enhanced session results for Note Training modes.
 * Extends the base session results with chord-specific tracking data.
 */
export interface NoteTrainingSessionResults {
  chordsCompleted: number;
  longestStreak: number;
  averageTimePerChord: number;
  accuracy: number;
  // Chord-specific data for historical tracking and analysis
  chordTypeStats: Record<string, ChordTypeStats>;
  guessHistory: SerializedChordGuessAttempt[];
  firstTryCorrect: number;
  totalChordsAttempted: number;
  subMode: NoteTrainingSubMode;
}

export interface GameSession {
  mode: string;
  timestamp: Date;
  completionTime: number;
  accuracy: number;
  totalAttempts: number;
  settings: Record<string, any>;
  results: Record<string, any> | NoteTrainingSessionResults;
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
  },
  noteTraining: {
    selectedSubMode: NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES,
    chordFilter: DEFAULT_CHORD_FILTER,
    sessionDuration: 300, // 5 minutes in seconds
    targetAccuracy: 80,
    targetStreak: 10,
    targetChords: 20
  }
};