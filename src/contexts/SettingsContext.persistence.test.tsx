import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React, { useContext } from 'react';
import { TRAINING_MODES, NOTE_TRAINING_SUB_MODES, STORAGE_KEYS } from '../constants';
import { ChordType } from '../types/music';
import {
  setupLocalStorageMock,
  getStoredJSON,
  type LocalStorageMock,
} from '../test/localStorageMock';

describe('SettingsContext - Persistence', () => {
  let localStorageMock: LocalStorageMock;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
    // Clear real localStorage to prevent data leaking from previous runs
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    localStorageMock = setupLocalStorageMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // Helper to get fresh module and create wrapper/hook
  const createTestHelpers = async () => {
    vi.resetModules();
    const { SettingsProvider, SettingsContext } = await import('./SettingsContext');

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

    return { wrapper, useSettings };
  };

  // Direct tests for helper functions - these bypass React context initialization issues
  describe('loadSettingsFromStorage (direct function tests)', () => {
    const createDefaults = () => ({
      noteFilter: {
        keyType: 'all' as const,
        octaveRange: { min: 4, max: 4 },
        enabledNotes: {},
      },
      timing: { autoAdvanceSpeed: 2 },
      audio: { volume: 100 },
      modes: { selectedMode: 'sandbox' },
      showNoteLabels: false,
      trainingType: TRAINING_MODES.EAR_TRAINING,
    });

    it.each([
      ['no saved settings exist', undefined],
      ['localStorage has invalid JSON', 'not-valid-json{{{'],
      ['localStorage has null', 'null'],
    ])('should return defaults when %s', async (_description, storageValue) => {
      if (storageValue !== undefined) {
        localStorageMock = setupLocalStorageMock({
          [STORAGE_KEYS.APP_SETTINGS]: storageValue,
        });
      }

      const { loadSettingsFromStorage } = await import('./SettingsContext');
      const defaults = createDefaults();

      const result = loadSettingsFromStorage(defaults as any);

      expect(result.noteFilter.keyType).toBe('all');
      expect(result.showNoteLabels).toBe(false);
      expect(result.trainingType).toBe(TRAINING_MODES.EAR_TRAINING);
    });

    it('should load and merge settings from localStorage', async () => {
      const savedSettings = {
        noteFilter: { keyType: 'black' },
        showNoteLabels: true,
      };

      localStorageMock = setupLocalStorageMock({
        [STORAGE_KEYS.APP_SETTINGS]: JSON.stringify(savedSettings),
      });

      const { loadSettingsFromStorage } = await import('./SettingsContext');
      const defaults = createDefaults();

      const result = loadSettingsFromStorage(defaults as any);

      expect(result.noteFilter.keyType).toBe('black');
      expect(result.noteFilter.octaveRange).toEqual({ min: 4, max: 4 }); // Merged from defaults
      expect(result.showNoteLabels).toBe(true);
      expect(result.timing.autoAdvanceSpeed).toBe(2); // From defaults
    });
  });

  describe('Save to localStorage', () => {
    it('should save settings when commitPendingSettings is called', async () => {
      const { wrapper, useSettings } = await createTestHelpers();
      const { result } = renderHook(() => useSettings(), { wrapper });

      act(() => {
        result.current.updateNoteFilter({ octaveRange: { min: 2, max: 6 } });
      });

      act(() => {
        result.current.commitPendingSettings();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.APP_SETTINGS,
        expect.any(String)
      );

      const savedData = getStoredJSON(localStorageMock, STORAGE_KEYS.APP_SETTINGS);
      expect(savedData).toBeDefined();
      expect((savedData as any).noteFilter.octaveRange).toEqual({ min: 2, max: 6 });
    });

    it('should save all settings sections', async () => {
      const { wrapper, useSettings } = await createTestHelpers();
      const { result } = renderHook(() => useSettings(), { wrapper });

      act(() => {
        result.current.updateNoteFilter({ keyType: 'white' });
        result.current.updateTimingSettings({ autoAdvanceSpeed: 2.5 });
        result.current.updateAudioSettings({ volume: 75 });
        result.current.updateModeSettings({ selectedMode: 'rush' });
        result.current.updateShowNoteLabels(true);
        result.current.updateTrainingType(TRAINING_MODES.NOTE_TRAINING);
      });

      act(() => {
        result.current.commitPendingSettings();
      });

      const savedData = getStoredJSON<any>(localStorageMock, STORAGE_KEYS.APP_SETTINGS);
      expect(savedData.noteFilter.keyType).toBe('white');
      expect(savedData.timing.autoAdvanceSpeed).toBe(2.5);
      expect(savedData.audio.volume).toBe(75);
      expect(savedData.modes.selectedMode).toBe('rush');
      expect(savedData.showNoteLabels).toBe(true);
      expect(savedData.trainingType).toBe(TRAINING_MODES.NOTE_TRAINING);
    });

    it('should save Note Training chord filter settings', async () => {
      const { wrapper, useSettings } = await createTestHelpers();
      const { result } = renderHook(() => useSettings(), { wrapper });

      act(() => {
        result.current.updateModeSettings({
          noteTraining: {
            selectedSubMode: NOTE_TRAINING_SUB_MODES.SHOW_NOTES_GUESS_CHORD,
            chordFilter: {
              allowedChordTypes: [ChordType.MAJOR, ChordType.MINOR],
              allowedRootNotes: ['C', 'G'],
              allowedOctaves: [3, 4, 5],
              includeInversions: true,
            },
            sessionDuration: 600,
            targetAccuracy: 90,
            targetChords: 30,
            targetStreak: 15,
          },
        });
      });

      act(() => {
        result.current.commitPendingSettings();
      });

      const savedData = getStoredJSON<any>(localStorageMock, STORAGE_KEYS.APP_SETTINGS);
      const noteTraining = savedData.modes.noteTraining;

      expect(noteTraining.selectedSubMode).toBe(NOTE_TRAINING_SUB_MODES.SHOW_NOTES_GUESS_CHORD);
      expect(noteTraining.chordFilter.allowedChordTypes).toEqual([ChordType.MAJOR, ChordType.MINOR]);
      expect(noteTraining.chordFilter.allowedRootNotes).toEqual(['C', 'G']);
      expect(noteTraining.chordFilter.allowedOctaves).toEqual([3, 4, 5]);
      expect(noteTraining.chordFilter.includeInversions).toBe(true);
      expect(noteTraining.sessionDuration).toBe(600);
      expect(noteTraining.targetAccuracy).toBe(90);
      expect(noteTraining.targetChords).toBe(30);
      expect(noteTraining.targetStreak).toBe(15);
    });
  });

  describe('Load from localStorage', () => {
    it('should load settings on mount', async () => {
      const savedSettings = {
        noteFilter: {
          keyType: 'black',
          octaveRange: { min: 3, max: 5 },
          enabledNotes: { C: true, D: true, E: true, F: true, G: true, A: true, B: true },
        },
        timing: {
          autoAdvanceSpeed: 3.0,
          autoAdvance: true,
          timerDirection: 'up',
        },
        audio: {
          volume: 80,
          enabled: true,
        },
        modes: {
          selectedMode: 'survival',
          rush: { targetNotes: 10 },
          survival: { sessionDuration: 1, healthDrainRate: 2, healthRecovery: 15, healthDamage: 25 },
          sandbox: { sessionDuration: 5 / 60, targetAccuracy: 80, targetStreak: 10, targetNotes: 20 },
          noteTraining: {
            selectedSubMode: NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES,
            chordFilter: {
              allowedChordTypes: null,
              allowedRootNotes: null,
              allowedOctaves: [4],
              includeInversions: false,
            },
            sessionDuration: 300,
            targetAccuracy: 80,
            targetStreak: 10,
            targetChords: 20,
          },
        },
        showNoteLabels: true,
        trainingType: TRAINING_MODES.NOTE_TRAINING,
      };

      localStorageMock = setupLocalStorageMock({
        [STORAGE_KEYS.APP_SETTINGS]: JSON.stringify(savedSettings),
      });

      const { wrapper, useSettings } = await createTestHelpers();
      const { result } = renderHook(() => useSettings(), { wrapper });

      expect(result.current.settings.noteFilter.keyType).toBe('black');
      expect(result.current.settings.noteFilter.octaveRange).toEqual({ min: 3, max: 5 });
      expect(result.current.settings.timing.autoAdvanceSpeed).toBe(3.0);
      expect(result.current.settings.audio.volume).toBe(80);
      expect(result.current.settings.modes.selectedMode).toBe('survival');
      expect(result.current.settings.showNoteLabels).toBe(true);
      expect(result.current.settings.trainingType).toBe(TRAINING_MODES.NOTE_TRAINING);
    });

    it('should merge partial settings with defaults', async () => {
      const partialSettings = {
        noteFilter: {
          keyType: 'white',
        },
        showNoteLabels: true,
      };

      localStorageMock = setupLocalStorageMock({
        [STORAGE_KEYS.APP_SETTINGS]: JSON.stringify(partialSettings),
      });

      const { wrapper, useSettings } = await createTestHelpers();
      const { result } = renderHook(() => useSettings(), { wrapper });

      // Loaded values should be applied
      expect(result.current.settings.noteFilter.keyType).toBe('white');
      expect(result.current.settings.showNoteLabels).toBe(true);

      // Default values should be preserved for missing fields
      expect(result.current.settings.noteFilter.octaveRange).toBeDefined();
      expect(result.current.settings.timing).toBeDefined();
      expect(result.current.settings.audio).toBeDefined();
      expect(result.current.settings.modes).toBeDefined();
    });

    it('should handle null values in chordFilter correctly', async () => {
      const savedSettings = {
        modes: {
          selectedMode: 'sandbox',
          rush: { targetNotes: 10 },
          survival: { sessionDuration: 1, healthDrainRate: 2, healthRecovery: 15, healthDamage: 25 },
          sandbox: { sessionDuration: 5 / 60, targetAccuracy: 80, targetStreak: 10, targetNotes: 20 },
          noteTraining: {
            selectedSubMode: NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES,
            chordFilter: {
              allowedChordTypes: null,
              allowedRootNotes: null,
              allowedOctaves: [4],
              includeInversions: false,
            },
            sessionDuration: 300,
            targetAccuracy: 80,
            targetStreak: 10,
            targetChords: 20,
          },
        },
        noteFilter: {
          keyType: 'all',
          octaveRange: { min: 4, max: 4 },
          enabledNotes: { C: true, D: true, E: true, F: true, G: true, A: true, B: true },
        },
        timing: { autoAdvanceSpeed: 2, autoAdvance: true, timerDirection: 'up' },
        audio: { volume: 100, enabled: true },
        showNoteLabels: false,
        trainingType: TRAINING_MODES.EAR_TRAINING,
      };

      localStorageMock = setupLocalStorageMock({
        [STORAGE_KEYS.APP_SETTINGS]: JSON.stringify(savedSettings),
      });

      const { wrapper, useSettings } = await createTestHelpers();
      const { result } = renderHook(() => useSettings(), { wrapper });

      expect(result.current.settings.modes.noteTraining.chordFilter.allowedChordTypes).toBeNull();
      expect(result.current.settings.modes.noteTraining.chordFilter.allowedRootNotes).toBeNull();
    });
  });

  describe('Note Training specific persistence', () => {
    // Parameterized tests for chordFilter properties
    it.each([
      [
        'allowedChordTypes',
        { allowedChordTypes: [ChordType.MAJOR, ChordType.MINOR, ChordType.DIMINISHED] },
        (data: any) => data.modes.noteTraining.chordFilter.allowedChordTypes,
        [ChordType.MAJOR, ChordType.MINOR, ChordType.DIMINISHED],
      ],
      [
        'allowedRootNotes',
        { allowedRootNotes: ['C', 'E', 'G'] },
        (data: any) => data.modes.noteTraining.chordFilter.allowedRootNotes,
        ['C', 'E', 'G'],
      ],
      [
        'allowedOctaves',
        { allowedOctaves: [2, 3, 4, 5] },
        (data: any) => data.modes.noteTraining.chordFilter.allowedOctaves,
        [2, 3, 4, 5],
      ],
      [
        'includeInversions',
        { includeInversions: true },
        (data: any) => data.modes.noteTraining.chordFilter.includeInversions,
        true,
      ],
    ])(
      'should persist chordFilter.%s',
      async (propertyName, chordFilterUpdate, extractValue, expectedValue) => {
        const { wrapper, useSettings } = await createTestHelpers();
        const { result } = renderHook(() => useSettings(), { wrapper });

        act(() => {
          result.current.updateModeSettings({
            noteTraining: {
              ...result.current.pendingSettings.modes.noteTraining,
              chordFilter: {
                ...result.current.pendingSettings.modes.noteTraining.chordFilter,
                ...chordFilterUpdate,
              },
            },
          });
        });

        act(() => {
          result.current.commitPendingSettings();
        });

        const savedData = getStoredJSON<any>(localStorageMock, STORAGE_KEYS.APP_SETTINGS);
        expect(extractValue(savedData)).toEqual(expectedValue);
      }
    );

    it('should persist selectedSubMode', async () => {
      const { wrapper, useSettings } = await createTestHelpers();
      const { result } = renderHook(() => useSettings(), { wrapper });

      act(() => {
        result.current.updateModeSettings({
          noteTraining: {
            ...result.current.pendingSettings.modes.noteTraining,
            selectedSubMode: NOTE_TRAINING_SUB_MODES.SHOW_NOTES_GUESS_CHORD,
          },
        });
      });

      act(() => {
        result.current.commitPendingSettings();
      });

      const savedData = getStoredJSON<any>(localStorageMock, STORAGE_KEYS.APP_SETTINGS);
      expect(savedData.modes.noteTraining.selectedSubMode).toBe(
        NOTE_TRAINING_SUB_MODES.SHOW_NOTES_GUESS_CHORD
      );
    });

    // Parameterized tests for numeric target properties
    it.each([
      ['sessionDuration', 900],
      ['targetAccuracy', 95],
      ['targetChords', 50],
      ['targetStreak', 25],
    ])('should persist %s', async (propertyName, value) => {
      const { wrapper, useSettings } = await createTestHelpers();
      const { result } = renderHook(() => useSettings(), { wrapper });

      act(() => {
        result.current.updateModeSettings({
          noteTraining: {
            ...result.current.pendingSettings.modes.noteTraining,
            [propertyName]: value,
          },
        });
      });

      act(() => {
        result.current.commitPendingSettings();
      });

      const savedData = getStoredJSON<any>(localStorageMock, STORAGE_KEYS.APP_SETTINGS);
      expect(savedData.modes.noteTraining[propertyName]).toBe(value);
    });
  });

  describe('Edge cases', () => {
    it('should handle localStorage quota exceeded gracefully', async () => {
      const { wrapper, useSettings } = await createTestHelpers();
      const { result } = renderHook(() => useSettings(), { wrapper });

      // Make setItem throw a quota exceeded error
      localStorageMock.setItem.mockImplementationOnce(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      act(() => {
        result.current.updateNoteFilter({ keyType: 'white' });
      });

      // Should not throw when committing
      expect(() => {
        act(() => {
          result.current.commitPendingSettings();
        });
      }).not.toThrow();

      // Settings should still be applied in memory
      expect(result.current.settings.noteFilter.keyType).toBe('white');
    });

    it('should not persist uncommitted changes', async () => {
      const { wrapper, useSettings } = await createTestHelpers();
      const { result } = renderHook(() => useSettings(), { wrapper });

      act(() => {
        result.current.updateNoteFilter({ keyType: 'black' });
        result.current.updateShowNoteLabels(true);
      });

      // Changes are only in pending, not committed
      const appSettingsCalls = localStorageMock.setItem.mock.calls.filter(
        (call) => call[0] === STORAGE_KEYS.APP_SETTINGS
      );
      expect(appSettingsCalls.length).toBe(0);

      // Revert the changes
      act(() => {
        result.current.revertPendingSettings();
      });

      // Still no saves should have happened
      const appSettingsCallsAfterRevert = localStorageMock.setItem.mock.calls.filter(
        (call) => call[0] === STORAGE_KEYS.APP_SETTINGS
      );
      expect(appSettingsCallsAfterRevert.length).toBe(0);
    });
  });
});
