import React from 'react';
import type {
  BaseGameState,
  ModeType,
  RushModeSettings,
  SurvivalModeSettings,
  SandboxModeSettings,
  GameStats
} from '../types/game';
import { EAR_TRAINING_SUB_MODES } from '../constants';
import { RushGameStateImpl } from './RushGameState';
import { SurvivalGameStateImpl } from './SurvivalGameState';
import { SandboxGameStateImpl } from './SandboxGameState';

// Game action results
export interface GameActionResult {
  gameCompleted: boolean;
  feedback: string;
  shouldAdvance: boolean;
  stats?: GameStats;
}

// Common props that all mode displays receive
export interface CommonDisplayProps {
  responseTimeLimit: number | null;
  currentNote: boolean;
  isPaused: boolean;
  timeRemaining?: number; // Current time remaining on note timer
  sessionTimeRemaining?: number; // Current time remaining on session timer (for modes that have one)
  // Callbacks for timer events
  onTimeUp?: () => void;
  onTimerUpdate?: (timeRemaining: number, isActive: boolean) => void;
}


// Enhanced base interface with modeDisplay and game actions
export interface GameStateWithDisplay extends BaseGameState {
  modeDisplay: (props: CommonDisplayProps) => React.ReactElement;
  handleCorrectGuess: () => GameActionResult;
  handleIncorrectGuess: () => GameActionResult;
  updateState: (updates: Partial<BaseGameState>) => void;

  // Hooks for game state to control behavior
  getFeedbackMessage: (currentNote: boolean) => string;
  onStartNewRound: () => void;
  getTimerMode: () => 'count-up' | 'count-down' | 'none';
  getCompletionMessage: () => string;
  getSessionSettings: () => Record<string, any>;
  getSessionResults: (stats: GameStats) => Record<string, any>;

  // Timer management
  initializeTimer: (responseTimeLimit: number | null, isPaused: boolean, onTimeUp: () => void, onTimeUpdate?: (timeRemaining: number) => void) => void;
  getTimerState: () => { timeRemaining: number; isActive: boolean };
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
}

// Factory function
export function createGameState(
  mode: ModeType,
  modeSettings: {
    rush: RushModeSettings;
    survival: SurvivalModeSettings;
    sandbox: SandboxModeSettings;
  }
): GameStateWithDisplay {
  switch (mode) {
    case EAR_TRAINING_SUB_MODES.RUSH:
      return new RushGameStateImpl(modeSettings.rush);
    case EAR_TRAINING_SUB_MODES.SURVIVAL:
      return new SurvivalGameStateImpl(modeSettings.survival);
    case EAR_TRAINING_SUB_MODES.SANDBOX:
    default:
      return new SandboxGameStateImpl(modeSettings.sandbox);
  }
}