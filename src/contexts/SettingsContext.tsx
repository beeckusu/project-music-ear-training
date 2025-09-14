/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppSettings, NoteFilter, TimingSettings, AudioSettings } from '../types/music';
import { DEFAULT_NOTE_FILTER, DEFAULT_TIMING_SETTINGS, DEFAULT_AUDIO_SETTINGS } from '../types/music';

export interface SettingsContextType {
  settings: AppSettings;
  updateNoteFilter: (filter: Partial<NoteFilter>) => void;
  updateTimingSettings: (timing: Partial<TimingSettings>) => void;
  updateAudioSettings: (audio: Partial<AudioSettings>) => void;
  resetToDefaults: () => void;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
}

const defaultSettings: AppSettings = {
  noteFilter: DEFAULT_NOTE_FILTER,
  timing: DEFAULT_TIMING_SETTINGS,
  audio: DEFAULT_AUDIO_SETTINGS
};

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  const resetToDefaults = () => {
    setSettings(defaultSettings);
  };

  const openSettings = () => {
    setIsSettingsOpen(true);
  };

  const closeSettings = () => {
    setIsSettingsOpen(false);
  };

  const value: SettingsContextType = {
    settings,
    updateNoteFilter,
    updateTimingSettings,
    updateAudioSettings,
    resetToDefaults,
    isSettingsOpen,
    openSettings,
    closeSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

