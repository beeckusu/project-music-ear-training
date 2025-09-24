/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { NoteFilter, TimingSettings, AudioSettings } from '../types/music';
import type { ModeSettings } from '../types/game';
import type { AppSettings } from '../types/settings';
import { DEFAULT_NOTE_FILTER, DEFAULT_TIMING_SETTINGS, DEFAULT_AUDIO_SETTINGS } from '../types/music';
import { DEFAULT_MODE_SETTINGS } from '../types/game';

export interface SettingsContextType {
  settings: AppSettings;
  updateNoteFilter: (filter: Partial<NoteFilter>) => void;
  updateTimingSettings: (timing: Partial<TimingSettings>) => void;
  updateAudioSettings: (audio: Partial<AudioSettings>) => void;
  updateModeSettings: (modes: Partial<ModeSettings>) => void;
  updateShowNoteLabels: (show: boolean) => void;
  resetToDefaults: () => void;
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
  showNoteLabels: false
};

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const [hasCompletedModeSetup, setHasCompletedModeSetup] = useState(false);
  const [defaultTab, setDefaultTab] = useState<string>('modes');

  const updateNoteFilter = (filterUpdates: Partial<NoteFilter>) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      noteFilter: {
        ...prevSettings.noteFilter,
        ...filterUpdates
      }
    }));
  };

  const updateTimingSettings = (timingUpdates: Partial<TimingSettings>) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      timing: {
        ...prevSettings.timing,
        ...timingUpdates
      }
    }));
  };

  const updateAudioSettings = (audioUpdates: Partial<AudioSettings>) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      audio: {
        ...prevSettings.audio,
        ...audioUpdates
      }
    }));
  };

  const updateModeSettings = (modeUpdates: Partial<ModeSettings>) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      modes: {
        ...prevSettings.modes,
        ...modeUpdates
      }
    }));
  };

  const updateShowNoteLabels = (show: boolean) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      showNoteLabels: show
    }));
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
  };

  const openSettings = (tab: string = 'modes') => {
    setDefaultTab(tab);
    setIsSettingsOpen(true);
  };

  const closeSettings = () => {
    if (isFirstTimeSetup) {
      return; // Prevent closing during first-time setup
    }
    setIsSettingsOpen(false);
  };

  const startFirstTimeSetup = () => {
    setIsFirstTimeSetup(true);
    setDefaultTab('modes');
    setIsSettingsOpen(true);
  };

  const completeModeSetup = () => {
    setHasCompletedModeSetup(true);
    setIsFirstTimeSetup(false);
    setIsSettingsOpen(false);
  };

  const value: SettingsContextType = {
    settings,
    updateNoteFilter,
    updateTimingSettings,
    updateAudioSettings,
    updateModeSettings,
    updateShowNoteLabels,
    resetToDefaults,
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

