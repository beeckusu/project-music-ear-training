import React, { useState } from 'react';
import type { ChordFilter } from '../../types/music';
import type { CustomChordFilterPreset } from '../../types/presets';
import { CHORD_FILTER_PRESETS, CHORD_FILTER_PRESET_NAMES } from '../../constants/chordPresets';
import { usePresets } from '../../hooks/usePresets';
import { detectCurrentPreset } from '../../utils/chordFilterHelpers';

interface ChordPresetSelectorProps {
  currentFilter: ChordFilter;
  onPresetSelect: (presetKey: string, customPreset?: CustomChordFilterPreset) => void;
}

const ChordPresetSelector: React.FC<ChordPresetSelectorProps> = ({
  currentFilter,
  onPresetSelect,
}) => {
  const { customPresets, deletePreset } = usePresets();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Check predefined presets first, then custom presets
  const currentPresetKey = detectCurrentPreset(currentFilter, customPresets);

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'CUSTOM') {
      return;
    }

    // Check if it's a custom preset (prefixed with 'custom:')
    if (value.startsWith('custom:')) {
      const customId = value.slice(7);
      const customPreset = customPresets.find(p => p.id === customId);
      if (customPreset) {
        onPresetSelect(value, customPreset);
      }
    } else {
      onPresetSelect(value);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, presetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirmId(presetId);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (deleteConfirmId) {
      deletePreset(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirmId(null);
  };

  const getPresetDescription = (): string => {
    if (currentPresetKey === 'CUSTOM') {
      return 'You have customized the chord filter settings';
    }

    if (currentPresetKey.startsWith('custom:')) {
      const customId = currentPresetKey.slice(7);
      const customPreset = customPresets.find(p => p.id === customId);
      return customPreset?.description || 'Custom preset';
    }

    return CHORD_FILTER_PRESETS[currentPresetKey as keyof typeof CHORD_FILTER_PRESETS]?.description || '';
  };

  return (
    <div className="setting-group">
      <label>Chord Type Preset</label>
      <div className="preset-selector-container">
        <select
          value={currentPresetKey}
          onChange={handlePresetChange}
          className="chord-preset-selector"
        >
          {currentPresetKey === 'CUSTOM' && (
            <option value="CUSTOM">Custom Configuration</option>
          )}

          {/* Predefined Presets */}
          <optgroup label="Predefined Presets">
            {CHORD_FILTER_PRESET_NAMES.map((presetKey) => {
              const preset = CHORD_FILTER_PRESETS[presetKey as keyof typeof CHORD_FILTER_PRESETS];
              return (
                <option key={presetKey} value={presetKey}>
                  {preset.name}
                </option>
              );
            })}
          </optgroup>

          {/* Custom Presets */}
          {customPresets.length > 0 && (
            <optgroup label="My Presets">
              {customPresets.map((preset) => (
                <option key={preset.id} value={`custom:${preset.id}`}>
                  {preset.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>

        {/* Delete button for custom presets */}
        {currentPresetKey.startsWith('custom:') && (
          <button
            type="button"
            className="preset-delete-btn"
            onClick={(e) => handleDeleteClick(e, currentPresetKey.slice(7))}
            title="Delete this preset"
          >
            ×
          </button>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteConfirmId && (
        <div className="preset-delete-confirm">
          <span>Delete this preset?</span>
          <button type="button" onClick={handleConfirmDelete} className="confirm-yes">
            Yes
          </button>
          <button type="button" onClick={handleCancelDelete} className="confirm-no">
            No
          </button>
        </div>
      )}

      <small>{getPresetDescription()}</small>
    </div>
  );
};

export default ChordPresetSelector;
