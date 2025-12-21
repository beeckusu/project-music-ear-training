import React from 'react';
import type { ModeType, ModeSettings } from './game';
import type { TrainingType } from '../constants';
import type { GameStateWithDisplay } from '../game/GameStateFactory';
import type { StrategyType } from './orchestrator';

/**
 * Metadata for a registered game mode
 */
export interface ModeMetadata {
  /** Unique identifier for the mode */
  id: ModeType;

  /** Category of the mode (ear-training or note-training) */
  type: TrainingType;

  /** Strategy type determining which orchestration strategy to use */
  strategyType: StrategyType;

  /** Icon to display in the UI (emoji or icon identifier) */
  icon: string;

  /** Display name for the mode */
  title: string;

  /** Brief description shown in the mode selector */
  description: string;

  /** React component for mode-specific settings */
  settingsComponent: React.ComponentType;

  /**
   * Key in ModeSettings object where this mode's settings are stored
   * e.g., 'rush', 'survival', 'sandbox', 'noteTraining'
   */
  settingsKey: keyof Omit<ModeSettings, 'selectedMode'>;

  /**
   * Factory function to create the game state implementation
   * Receives only the settings specific to this mode (extracted via settingsKey)
   */
  gameStateFactory: (modeSpecificSettings: any) => GameStateWithDisplay;

  /** Default settings for this mode */
  defaultSettings: Partial<ModeSettings>;
}

/**
 * Registry for managing game modes
 */
export interface ModeRegistry {
  /**
   * Register a new mode
   * @throws Error if mode ID is already registered or metadata is invalid
   */
  register(metadata: ModeMetadata): void;

  /**
   * Get metadata for a specific mode
   * @returns Mode metadata or undefined if not registered
   */
  get(modeId: ModeType): ModeMetadata | undefined;

  /**
   * Get all registered modes
   */
  getAll(): ModeMetadata[];

  /**
   * Get all modes of a specific type
   */
  getAllByType(type: TrainingType): ModeMetadata[];

  /**
   * Check if a mode is registered
   */
  isRegistered(modeId: ModeType): boolean;
}
