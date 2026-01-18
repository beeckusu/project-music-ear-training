import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { CustomChordFilterPreset, CreateCustomPresetData } from '../types/presets';
import type { ChordFilter } from '../types/music';
import {
  loadCustomPresets,
  saveCustomPreset,
  deleteCustomPreset as deletePresetFromStorage,
  updateCustomPreset,
} from '../services/presetStorage';

export interface PresetContextValue {
  /** List of user's custom presets */
  customPresets: CustomChordFilterPreset[];

  /** Whether presets are still loading from storage */
  isLoading: boolean;

  /** Save the current filter configuration as a new custom preset */
  saveCurrentAsPreset: (
    name: string,
    description: string,
    filter: ChordFilter
  ) => CustomChordFilterPreset;

  /** Delete a custom preset by id */
  deletePreset: (id: string) => boolean;

  /** Rename a custom preset */
  renamePreset: (id: string, newName: string) => CustomChordFilterPreset;

  /** Refresh presets from storage */
  refreshPresets: () => void;
}

const defaultContextValue: PresetContextValue = {
  customPresets: [],
  isLoading: true,
  saveCurrentAsPreset: () => {
    throw new Error('PresetContext not initialized');
  },
  deletePreset: () => {
    throw new Error('PresetContext not initialized');
  },
  renamePreset: () => {
    throw new Error('PresetContext not initialized');
  },
  refreshPresets: () => {
    throw new Error('PresetContext not initialized');
  },
};

export const PresetContext = createContext<PresetContextValue>(defaultContextValue);

interface PresetProviderProps {
  children: React.ReactNode;
}

export const PresetProvider: React.FC<PresetProviderProps> = ({ children }) => {
  const [customPresets, setCustomPresets] = useState<CustomChordFilterPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load presets from storage on mount
  useEffect(() => {
    const presets = loadCustomPresets();
    setCustomPresets(presets);
    setIsLoading(false);
  }, []);

  const refreshPresets = useCallback(() => {
    const presets = loadCustomPresets();
    setCustomPresets(presets);
  }, []);

  const saveCurrentAsPreset = useCallback(
    (name: string, description: string, filter: ChordFilter): CustomChordFilterPreset => {
      const data: CreateCustomPresetData = {
        name,
        description,
        filter,
      };
      const newPreset = saveCustomPreset(data);
      setCustomPresets(prev => [...prev, newPreset]);
      return newPreset;
    },
    []
  );

  const deletePreset = useCallback((id: string): boolean => {
    const deleted = deletePresetFromStorage(id);
    if (deleted) {
      setCustomPresets(prev => prev.filter(p => p.id !== id));
    }
    return deleted;
  }, []);

  const renamePreset = useCallback(
    (id: string, newName: string): CustomChordFilterPreset => {
      const updated = updateCustomPreset(id, { name: newName });
      setCustomPresets(prev => prev.map(p => (p.id === id ? updated : p)));
      return updated;
    },
    []
  );

  const value: PresetContextValue = {
    customPresets,
    isLoading,
    saveCurrentAsPreset,
    deletePreset,
    renamePreset,
    refreshPresets,
  };

  return (
    <PresetContext.Provider value={value}>
      {children}
    </PresetContext.Provider>
  );
};
