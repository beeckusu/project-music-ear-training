import React from 'react';
import type {
  BaseGameState,
  ModeType,
  RushModeSettings,
  SurvivalModeSettings,
  SandboxModeSettings,
  NoteTrainingModeSettings,
  GameStats
} from '../types/game';
import { EAR_TRAINING_SUB_MODES } from '../constants';
import { modeRegistry } from './ModeRegistry';

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
}

// Factory function
export function createGameState(
  mode: ModeType,
  modeSettings: {
    rush: RushModeSettings;
    survival: SurvivalModeSettings;
    sandbox: SandboxModeSettings;
    noteTraining: NoteTrainingModeSettings;
  }
): GameStateWithDisplay {
  const modeMetadata = modeRegistry.get(mode);

  if (!modeMetadata) {
    console.warn(`Unknown mode: ${mode}, falling back to sandbox`);
    const sandboxMetadata = modeRegistry.get(EAR_TRAINING_SUB_MODES.SANDBOX)!;
    const sandboxSettings = modeSettings[sandboxMetadata.settingsKey];
    return sandboxMetadata.gameStateFactory(sandboxSettings);
  }

  // Extract only the settings this mode needs using its settingsKey
  const modeSpecificSettings = modeSettings[modeMetadata.settingsKey];
  return modeMetadata.gameStateFactory(modeSpecificSettings);
}