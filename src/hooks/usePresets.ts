import { useContext } from 'react';
import { PresetContext } from '../contexts/PresetContext';
import type { PresetContextValue } from '../contexts/PresetContext';

export function usePresets(): PresetContextValue {
  const context = useContext(PresetContext);
  if (context === undefined) {
    throw new Error('usePresets must be used within a PresetProvider');
  }
  return context;
}
