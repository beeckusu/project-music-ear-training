import React from 'react';
import type {
  BaseGameState,
  ModeType,
  RushModeSettings,
  SurvivalModeSettings,
  SandboxModeSettings,
  GameStats
} from '../types/game';
import { GAME_MODES } from '../constants';
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
    case GAME_MODES.RUSH:
      return new RushGameStateImpl(modeSettings.rush);
    case GAME_MODES.SURVIVAL:
      return new SurvivalGameStateImpl(modeSettings.survival);
    case GAME_MODES.SANDBOX:
    default:
      return new SandboxGameStateImpl(modeSettings.sandbox);
  }
}