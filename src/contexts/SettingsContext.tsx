/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppSettings, NoteFilter } from '../types/music';
import { DEFAULT_NOTE_FILTER } from '../types/music';

export interface SettingsContextType {
  settings: AppSettings;
  updateNoteFilter: (filter: Partial<NoteFilter>) => void;
  resetToDefaults: () => void;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
}

const defaultSettings: AppSettings = {
  noteFilter: DEFAULT_NOTE_FILTER
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

