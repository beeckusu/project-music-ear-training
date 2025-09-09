import { useContext } from 'react';
import { SettingsContext } from '../contexts/SettingsContext';
import type { SettingsContextType } from '../contexts/SettingsContext';

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}