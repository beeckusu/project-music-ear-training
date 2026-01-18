import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadCustomPresets,
  saveCustomPreset,
  updateCustomPreset,
  deleteCustomPreset,
  getCustomPreset,
  isPresetNameAvailable,
} from '../presetStorage';
import type { CustomChordFilterPreset } from '../../types/presets';
import { ChordType } from '../../types/music';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

describe('presetStorage', () => {
  const mockFilter = {
    allowedChordTypes: [ChordType.MAJOR, ChordType.MINOR],
    allowedRootNotes: null,
    allowedOctaves: [3, 4],
    includeInversions: false,
  };

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('loadCustomPresets', () => {
    it('should return empty array when no presets exist', () => {
      const presets = loadCustomPresets();
      expect(presets).toEqual([]);
    });

    it('should return empty array when localStorage has invalid data', () => {
      localStorageMock.getItem.mockReturnValueOnce('not-json');
      const presets = loadCustomPresets();
      expect(presets).toEqual([]);
    });

    it('should return empty array when localStorage has non-array data', () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ foo: 'bar' }));
      const presets = loadCustomPresets();
      expect(presets).toEqual([]);
    });

    it('should filter out invalid presets', () => {
      const data = [
        { id: '1', name: 'Valid', filter: mockFilter, isCustom: true },
        { name: 'Missing ID', filter: mockFilter, isCustom: true },
        { id: '3', filter: mockFilter, isCustom: true }, // Missing name
        { id: '4', name: 'Missing isCustom', filter: mockFilter },
      ];
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(data));
      const presets = loadCustomPresets();
      expect(presets).toHaveLength(1);
      expect(presets[0].id).toBe('1');
    });

    it('should load valid presets', () => {
      const validPreset: CustomChordFilterPreset = {
        id: 'preset-123',
        name: 'My Preset',
        description: 'A test preset',
        filter: mockFilter,
        isCustom: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([validPreset]));

      const presets = loadCustomPresets();
      expect(presets).toHaveLength(1);
      expect(presets[0]).toEqual(validPreset);
    });
  });

  describe('saveCustomPreset', () => {
    it('should create a new preset with generated id and timestamps', () => {
      const result = saveCustomPreset({
        name: 'New Preset',
        description: 'A new preset',
        filter: mockFilter,
      });

      expect(result.id).toMatch(/^preset-\d+-[a-z0-9]+$/);
      expect(result.name).toBe('New Preset');
      expect(result.description).toBe('A new preset');
      expect(result.filter).toEqual(mockFilter);
      expect(result.isCustom).toBe(true);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should save to localStorage', () => {
      saveCustomPreset({
        name: 'New Preset',
        description: 'A new preset',
        filter: mockFilter,
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].name).toBe('New Preset');
    });

    it('should throw error for duplicate name', () => {
      saveCustomPreset({
        name: 'Unique Name',
        description: '',
        filter: mockFilter,
      });

      expect(() => {
        saveCustomPreset({
          name: 'unique name', // case-insensitive match
          description: '',
          filter: mockFilter,
        });
      }).toThrow('A preset named "unique name" already exists');
    });

    it('should throw error when max presets reached', () => {
      // Create 20 presets
      const existingPresets = Array.from({ length: 20 }, (_, i) => ({
        id: `preset-${i}`,
        name: `Preset ${i}`,
        description: '',
        filter: mockFilter,
        isCustom: true as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(existingPresets));

      expect(() => {
        saveCustomPreset({
          name: 'One Too Many',
          description: '',
          filter: mockFilter,
        });
      }).toThrow('Maximum of 20 custom presets allowed');
    });
  });

  describe('updateCustomPreset', () => {
    it('should update preset name', () => {
      const preset = saveCustomPreset({
        name: 'Original Name',
        description: 'Original description',
        filter: mockFilter,
      });

      const updated = updateCustomPreset(preset.id, { name: 'New Name' });

      expect(updated.name).toBe('New Name');
      expect(updated.description).toBe('Original description');
      // updatedAt should be set (may be same as createdAt if test runs fast)
      expect(updated.updatedAt).toBeDefined();
      expect(typeof updated.updatedAt).toBe('string');
    });

    it('should throw error for non-existent preset', () => {
      expect(() => {
        updateCustomPreset('non-existent-id', { name: 'New Name' });
      }).toThrow('Preset with id "non-existent-id" not found');
    });

    it('should throw error for duplicate name when renaming', () => {
      saveCustomPreset({ name: 'First', description: '', filter: mockFilter });
      const second = saveCustomPreset({ name: 'Second', description: '', filter: mockFilter });

      expect(() => {
        updateCustomPreset(second.id, { name: 'First' });
      }).toThrow('A preset named "First" already exists');
    });
  });

  describe('deleteCustomPreset', () => {
    it('should delete an existing preset', () => {
      const preset = saveCustomPreset({
        name: 'To Delete',
        description: '',
        filter: mockFilter,
      });

      const result = deleteCustomPreset(preset.id);

      expect(result).toBe(true);
      expect(loadCustomPresets()).toHaveLength(0);
    });

    it('should return false for non-existent preset', () => {
      const result = deleteCustomPreset('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('getCustomPreset', () => {
    it('should return a preset by id', () => {
      const preset = saveCustomPreset({
        name: 'Find Me',
        description: '',
        filter: mockFilter,
      });

      const found = getCustomPreset(preset.id);

      expect(found).toBeDefined();
      expect(found?.name).toBe('Find Me');
    });

    it('should return undefined for non-existent preset', () => {
      const found = getCustomPreset('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('isPresetNameAvailable', () => {
    it('should return true for available name', () => {
      expect(isPresetNameAvailable('New Name')).toBe(true);
    });

    it('should return false for taken name (case-insensitive)', () => {
      saveCustomPreset({ name: 'Taken', description: '', filter: mockFilter });

      expect(isPresetNameAvailable('taken')).toBe(false);
      expect(isPresetNameAvailable('TAKEN')).toBe(false);
    });

    it('should exclude specified id from check', () => {
      const preset = saveCustomPreset({ name: 'My Preset', description: '', filter: mockFilter });

      // Should be available when excluding the preset's own id
      expect(isPresetNameAvailable('My Preset', preset.id)).toBe(true);

      // Should be unavailable without exclusion
      expect(isPresetNameAvailable('My Preset')).toBe(false);
    });
  });
});
