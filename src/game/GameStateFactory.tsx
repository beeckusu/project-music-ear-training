import React from 'react';
import type {
  BaseGameState,
  RushGameState,
  SurvivalGameState,
  SandboxGameState,
  ModeType,
  RushModeSettings,
  SurvivalModeSettings,
  SandboxModeSettings,
  GameStats
} from '../types/game';
import RushModeDisplay from '../components/modes/RushModeDisplay';
import SurvivalModeDisplay from '../components/modes/SurvivalModeDisplay';
import SandboxModeDisplay from '../components/modes/SandboxModeDisplay';

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
  timeRemaining: number;
  isTimerActive: boolean;
  currentNote: boolean;
  isPaused: boolean;
  onTimerUpdate?: (time: number) => void;
}

// Game state classes with modeDisplay methods
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

  constructor(rushSettings: RushModeSettings) {
    this.rushSettings = rushSettings;
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

    if (newCorrectCount >= this.rushSettings.targetNotes) {
      this.isCompleted = true;
      this.completionTime = this.elapsedTime;

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
    }
  };

  shouldStartTimer = (): boolean => {
    // Rush mode uses count-up timer, so regular timer should not start
    return false;
  };

  getTimerMode = (): 'count-up' | 'count-down' | 'none' => {
    return 'count-up';
  };
}

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

  constructor(survivalSettings: SurvivalModeSettings) {
    this.survivalSettings = survivalSettings;
    this.health = this.maxHealth;
    this.healthDrainRate = survivalSettings.healthDrainRate;
    this.healthRecovery = survivalSettings.healthRecovery;
    this.healthDamage = survivalSettings.healthDamage;
  }

  modeDisplay = (props: CommonDisplayProps) => (
    <SurvivalModeDisplay
      gameState={this}
      {...props}
    />
  );

  handleCorrectGuess = (): GameActionResult => {
    // TODO: Implement survival mode logic in future ticket
    return {
      gameCompleted: false,
      feedback: 'Correct!',
      shouldAdvance: true
    };
  };

  handleIncorrectGuess = (): GameActionResult => {
    // TODO: Implement survival mode logic in future ticket
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
    // TODO: Implement survival mode start round logic
  };

  shouldStartTimer = (): boolean => {
    // Survival mode uses count-down timer
    return true;
  };

  getTimerMode = (): 'count-up' | 'count-down' | 'none' => {
    return 'count-down';
  };
}

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

  shouldStartTimer = (): boolean => {
    // Sandbox mode uses count-down timer
    return true;
  };

  getTimerMode = (): 'count-up' | 'count-down' | 'none' => {
    return 'count-down';
  };
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
  shouldStartTimer: () => boolean;
  getTimerMode: () => 'count-up' | 'count-down' | 'none';
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
    case 'rush':
      return new RushGameStateImpl(modeSettings.rush);
    case 'survival':
      return new SurvivalGameStateImpl(modeSettings.survival);
    case 'sandbox':
    default:
      return new SandboxGameStateImpl(modeSettings.sandbox);
  }
}