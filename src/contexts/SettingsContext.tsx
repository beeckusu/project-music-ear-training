/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { NoteFilter, TimingSettings, AudioSettings } from '../types/music';
import type { ModeSettings } from '../types/game';
import type { AppSettings } from '../types/settings';
import { DEFAULT_NOTE_FILTER, DEFAULT_TIMING_SETTINGS, DEFAULT_AUDIO_SETTINGS } from '../types/music';
import { SETTINGS_TABS, TRAINING_MODES } from '../constants';
import type { TrainingType } from '../constants';
import { DEFAULT_MODE_SETTINGS } from '../types/game';

export interface SettingsContextType {
  settings: AppSettings; // Current active settings used by the game
  pendingSettings: AppSettings; // Staged settings shown in UI
  updateNoteFilter: (filter: Partial<NoteFilter>) => void;
  updateTimingSettings: (timing: Partial<TimingSettings>) => void;
  updateAudioSettings: (audio: Partial<AudioSettings>) => void;
  updateModeSettings: (modes: Partial<ModeSettings>) => void;
  updateShowNoteLabels: (show: boolean) => void;
  updateTrainingType: (type: TrainingType) => void;
  resetToDefaults: () => void;
  commitPendingSettings: () => void; // Apply pending settings to current
  revertPendingSettings: () => void; // Discard pending changes
  isSettingsOpen: boolean;
  openSettings: (tab?: string) => void;
  closeSettings: () => void;
  isFirstTimeSetup: boolean;
  hasCompletedModeSetup: boolean;
  completeModeSetup: () => void;
  startFirstTimeSetup: () => void;
  defaultTab: string;
}

const defaultSettings: AppSettings = {
  noteFilter: DEFAULT_NOTE_FILTER,
  timing: DEFAULT_TIMING_SETTINGS,
  audio: DEFAULT_AUDIO_SETTINGS,
  modes: DEFAULT_MODE_SETTINGS,
  showNoteLabels: false,
  trainingType: TRAINING_MODES.EAR_TRAINING
};

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings); // Current active settings
  const [pendingSettings, setPendingSettings] = useState<AppSettings>(defaultSettings); // Staged settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const [hasCompletedModeSetup, setHasCompletedModeSetup] = useState(false);
  const [defaultTab, setDefaultTab] = useState<string>(SETTINGS_TABS.MODES);

  const updateNoteFilter = (filterUpdates: Partial<NoteFilter>) => {
    setPendingSettings(prevSettings => ({
      ...prevSettings,
      noteFilter: {
        ...prevSettings.noteFilter,
        ...filterUpdates
      }
    }));
  };

  const updateTimingSettings = (timingUpdates: Partial<TimingSettings>) => {
    setPendingSettings(prevSettings => ({
      ...prevSettings,
      timing: {
        ...prevSettings.timing,
        ...timingUpdates
      }
    }));
  };

  const updateAudioSettings = (audioUpdates: Partial<AudioSettings>) => {
    setPendingSettings(prevSettings => ({
      ...prevSettings,
      audio: {
        ...prevSettings.audio,
        ...audioUpdates
      }
    }));
  };

  const updateModeSettings = (modeUpdates: Partial<ModeSettings>) => {
    setPendingSettings(prevSettings => ({
      ...prevSettings,
      modes: {
        ...prevSettings.modes,
        ...modeUpdates
      }
    }));
  };

  const updateShowNoteLabels = (show: boolean) => {
    setPendingSettings(prevSettings => ({
      ...prevSettings,
      showNoteLabels: show
    }));
  };

  const updateTrainingType = (type: TrainingType) => {
    setPendingSettings(prevSettings => ({
      ...prevSettings,
      trainingType: type
    }));
  };

  const resetToDefaults = () => {
    setPendingSettings(defaultSettings);
  };

  const commitPendingSettings = () => {
    setSettings(pendingSettings);
  };

  const revertPendingSettings = () => {
    setPendingSettings(settings);
  };

  const openSettings = (tab: string = SETTINGS_TABS.MODES) => {
    setDefaultTab(tab);
    setPendingSettings(settings); // Initialize pending with current settings
    setIsSettingsOpen(true);
  };

  const closeSettings = () => {
    if (isFirstTimeSetup) {
      return; // Prevent closing during first-time setup
    }
    revertPendingSettings(); // Discard pending changes
    setIsSettingsOpen(false);
  };

  const startFirstTimeSetup = () => {
    setIsFirstTimeSetup(true);
    setDefaultTab(SETTINGS_TABS.MODES);
    setIsSettingsOpen(true);
  };

  const completeModeSetup = () => {
    setHasCompletedModeSetup(true);
    setIsFirstTimeSetup(false);
    setIsSettingsOpen(false);
  };

  const value: SettingsContextType = {
    settings,
    pendingSettings,
    updateNoteFilter,
    updateTimingSettings,
    updateAudioSettings,
    updateModeSettings,
    updateShowNoteLabels,
    updateTrainingType,
    resetToDefaults,
    commitPendingSettings,
    revertPendingSettings,
    isSettingsOpen,
    openSettings,
    closeSettings,
    isFirstTimeSetup,
    hasCompletedModeSetup,
    completeModeSetup,
    startFirstTimeSetup,
    defaultTab
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

