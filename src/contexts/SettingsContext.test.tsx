import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { SettingsProvider, SettingsContext } from './SettingsContext';
import { useContext } from 'react';
import { TRAINING_MODES } from '../constants';

describe('SettingsContext - Staged Settings', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SettingsProvider>{children}</SettingsProvider>
  );

  const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
      throw new Error('useSettings must be used within SettingsProvider');
    }
    return context;
  };

  describe('Settings Staging', () => {
    it('should initialize pending settings equal to current settings', () => {
      const { result } = renderHook(() => useSettings(), { wrapper });

      expect(result.current.pendingSettings).toEqual(result.current.settings);
    });

    it('should update pendingSettings without affecting current settings', () => {
      const { result } = renderHook(() => useSettings(), { wrapper });

      const originalSettings = { ...result.current.settings };

      act(() => {
        result.current.updateNoteFilter({ octaveRange: { min: 2, max: 6 } });
      });

      // Pending settings should be updated
      expect(result.current.pendingSettings.noteFilter.octaveRange).toEqual({ min: 2, max: 6 });

      // Current settings should remain unchanged
      expect(result.current.settings.noteFilter.octaveRange).toEqual(
        originalSettings.noteFilter.octaveRange
      );
    });

    it('should stage multiple setting changes independently', () => {
      const { result } = renderHook(() => useSettings(), { wrapper });

      const originalSettings = { ...result.current.settings };

      act(() => {
        result.current.updateNoteFilter({ octaveRange: { min: 3, max: 5 } });
        result.current.updateTimingSettings({ autoAdvanceSpeed: 2.5 });
        result.current.updateTrainingType(TRAINING_MODES.NOTE_TRAINING);
      });

      // All pending settings should be updated
      expect(result.current.pendingSettings.noteFilter.octaveRange).toEqual({ min: 3, max: 5 });
      expect(result.current.pendingSettings.timing.autoAdvanceSpeed).toBe(2.5);
      expect(result.current.pendingSettings.trainingType).toBe(TRAINING_MODES.NOTE_TRAINING);

      // Current settings should remain unchanged
      expect(result.current.settings.noteFilter.octaveRange).toEqual(
        originalSettings.noteFilter.octaveRange
      );
      expect(result.current.settings.timing.autoAdvanceSpeed).toBe(
        originalSettings.timing.autoAdvanceSpeed
      );
      expect(result.current.settings.trainingType).toBe(originalSettings.trainingType);
    });

    it('should stage mode settings changes', () => {
      const { result } = renderHook(() => useSettings(), { wrapper });

      const originalMode = result.current.settings.modes.selectedMode;

      act(() => {
        result.current.updateModeSettings({ selectedMode: 'survival' });
      });

      expect(result.current.pendingSettings.modes.selectedMode).toBe('survival');
      expect(result.current.settings.modes.selectedMode).toBe(originalMode);
    });

    it('should stage audio settings changes', () => {
      const { result } = renderHook(() => useSettings(), { wrapper });

      const originalVolume = result.current.settings.audio.volume;

      act(() => {
        result.current.updateAudioSettings({ volume: 75 });
      });

      expect(result.current.pendingSettings.audio.volume).toBe(75);
      expect(result.current.settings.audio.volume).toBe(originalVolume);
    });

    it('should stage show note labels changes', () => {
      const { result } = renderHook(() => useSettings(), { wrapper });

      const originalShowNoteLabels = result.current.settings.showNoteLabels;

      act(() => {
        result.current.updateShowNoteLabels(true);
      });

      expect(result.current.pendingSettings.showNoteLabels).toBe(true);
      expect(result.current.settings.showNoteLabels).toBe(originalShowNoteLabels);
    });
  });

  describe('Commit Pending Settings', () => {
    it('should apply pending settings to current settings', () => {
      const { result } = renderHook(() => useSettings(), { wrapper });

      act(() => {
        result.current.updateNoteFilter({ octaveRange: { min: 2, max: 6 } });
        result.current.updateTimingSettings({ autoAdvanceSpeed: 3.0 });
        result.current.updateTrainingType(TRAINING_MODES.NOTE_TRAINING);
      });

      act(() => {
        result.current.commitPendingSettings();
      });

      // Current settings should now match pending settings
      expect(result.current.settings.noteFilter.octaveRange).toEqual({ min: 2, max: 6 });
      expect(result.current.settings.timing.autoAdvanceSpeed).toBe(3.0);
      expect(result.current.settings.trainingType).toBe(TRAINING_MODES.NOTE_TRAINING);

      // Pending and current should be equal
      expect(result.current.pendingSettings).toEqual(result.current.settings);
    });

    it('should commit all staged changes at once', () => {
      const { result } = renderHook(() => useSettings(), { wrapper });

      act(() => {
        result.current.updateNoteFilter({ keyType: 'white' });
        result.current.updateModeSettings({ selectedMode: 'rush' });
        result.current.updateAudioSettings({ volume: 50 });
        result.current.updateShowNoteLabels(true);
      });

      act(() => {
        result.current.commitPendingSettings();
      });

      expect(result.current.settings.noteFilter.keyType).toBe('white');
      expect(result.current.settings.modes.selectedMode).toBe('rush');
      expect(result.current.settings.audio.volume).toBe(50);
      expect(result.current.settings.showNoteLabels).toBe(true);
    });
  });

  describe('Revert Pending Settings', () => {
    it('should discard pending changes and reset to current settings', () => {
      const { result } = renderHook(() => useSettings(), { wrapper });

      const originalSettings = { ...result.current.settings };

      act(() => {
        result.current.updateNoteFilter({ octaveRange: { min: 1, max: 8 } });
        result.current.updateTimingSettings({ autoAdvanceSpeed: 1.5 });
      });

      // Verify changes were staged
      expect(result.current.pendingSettings.noteFilter.octaveRange).toEqual({ min: 1, max: 8 });
      expect(result.current.pendingSettings.timing.autoAdvanceSpeed).toBe(1.5);

      act(() => {
        result.current.revertPendingSettings();
      });

      // Pending settings should revert to current settings
      expect(result.current.pendingSettings.noteFilter.octaveRange).toEqual(
        originalSettings.noteFilter.octaveRange
      );
      expect(result.current.pendingSettings.timing.autoAdvanceSpeed).toBe(
        originalSettings.timing.autoAdvanceSpeed
      );

      // Current settings should remain unchanged
      expect(result.current.settings).toEqual(originalSettings);
    });

    it('should revert all pending changes', () => {
      const { result } = renderHook(() => useSettings(), { wrapper });

      const originalSettings = { ...result.current.settings };

      act(() => {
        result.current.updateNoteFilter({ keyType: 'black' });
        result.current.updateModeSettings({ selectedMode: 'survival' });
        result.current.updateAudioSettings({ volume: 100 });
        result.current.updateShowNoteLabels(true);
        result.current.updateTrainingType(TRAINING_MODES.NOTE_TRAINING);
      });

      act(() => {
        result.current.revertPendingSettings();
      });

      expect(result.current.pendingSettings).toEqual(originalSettings);
      expect(result.current.settings).toEqual(originalSettings);
    });
  });

  describe('Open/Close Settings Modal', () => {
    it('should initialize pending settings when opening settings', () => {
      const { result } = renderHook(() => useSettings(), { wrapper });

      // Update pending settings
      act(() => {
        result.current.updateNoteFilter({ octaveRange: { min: 3, max: 5 } });
      });

      // Commit the changes in a separate act
      act(() => {
        result.current.commitPendingSettings();
      });

      // Verify the commit worked
      expect(result.current.settings.noteFilter.octaveRange).toEqual({ min: 3, max: 5 });

      // Make some pending changes (without committing)
      act(() => {
        result.current.updateNoteFilter({ octaveRange: { min: 1, max: 8 } });
      });

      // Verify pending is different from current
      expect(result.current.pendingSettings.noteFilter.octaveRange).toEqual({ min: 1, max: 8 });
      expect(result.current.settings.noteFilter.octaveRange).toEqual({ min: 3, max: 5 });

      // Open settings (should reinitialize pending from current)
      act(() => {
        result.current.openSettings();
      });

      expect(result.current.pendingSettings).toEqual(result.current.settings);
      expect(result.current.pendingSettings.noteFilter.octaveRange).toEqual({ min: 3, max: 5 });
      expect(result.current.isSettingsOpen).toBe(true);
    });

    it('should revert pending changes when closing settings', () => {
      const { result } = renderHook(() => useSettings(), { wrapper });

      const originalSettings = { ...result.current.settings };

      act(() => {
        result.current.openSettings();
      });

      act(() => {
        result.current.updateNoteFilter({ octaveRange: { min: 2, max: 7 } });
        result.current.updateTimingSettings({ autoAdvanceSpeed: 4.0 });
      });

      act(() => {
        result.current.closeSettings();
      });

      // Pending settings should be reverted
      expect(result.current.pendingSettings).toEqual(originalSettings);
      expect(result.current.settings).toEqual(originalSettings);
      expect(result.current.isSettingsOpen).toBe(false);
    });
  });

  describe('Reset to Defaults', () => {
    it('should reset pending settings to defaults without affecting current', () => {
      const { result } = renderHook(() => useSettings(), { wrapper });

      // Update pending settings
      act(() => {
        result.current.updateNoteFilter({ octaveRange: { min: 2, max: 6 } });
      });

      // Commit in a separate act
      act(() => {
        result.current.commitPendingSettings();
      });

      // Verify the commit worked
      expect(result.current.settings.noteFilter.octaveRange).toEqual({ min: 2, max: 6 });

      act(() => {
        result.current.resetToDefaults();
      });

      // Pending settings should be reset to defaults
      expect(result.current.pendingSettings.noteFilter.octaveRange).toEqual({ min: 4, max: 4 });

      // Current settings should remain unchanged (still have the committed values)
      expect(result.current.settings.noteFilter.octaveRange).toEqual({ min: 2, max: 6 });
    });
  });
});
