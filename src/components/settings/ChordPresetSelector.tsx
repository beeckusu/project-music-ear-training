import React from 'react';
import type { ChordFilter } from '../../types/music';
import { CHORD_FILTER_PRESETS, CHORD_FILTER_PRESET_NAMES } from '../../constants/chordPresets';
import { detectCurrentPreset } from '../../utils/chordFilterHelpers';

interface ChordPresetSelectorProps {
  currentFilter: ChordFilter;
  onPresetSelect: (presetKey: string) => void;
}

const ChordPresetSelector: React.FC<ChordPresetSelectorProps> = ({
  currentFilter,
  onPresetSelect,
}) => {
  const currentPresetKey = detectCurrentPreset(currentFilter);

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetKey = e.target.value;
    if (presetKey !== 'CUSTOM') {
      onPresetSelect(presetKey);
    }
  };

  return (
    <div className="setting-group">
      <label>Chord Type Preset</label>
      <select
        value={currentPresetKey}
        onChange={handlePresetChange}
        className="chord-preset-selector"
      >
        {currentPresetKey === 'CUSTOM' && (
          <option value="CUSTOM">Custom Configuration</option>
        )}
        {CHORD_FILTER_PRESET_NAMES.map((presetKey) => {
          const preset = CHORD_FILTER_PRESETS[presetKey as keyof typeof CHORD_FILTER_PRESETS];
          return (
            <option key={presetKey} value={presetKey}>
              {preset.name}
            </option>
          );
        })}
      </select>
      <small>
        {currentPresetKey === 'CUSTOM'
          ? 'You have customized the chord filter settings'
          : CHORD_FILTER_PRESETS[currentPresetKey as keyof typeof CHORD_FILTER_PRESETS]?.description}
      </small>
    </div>
  );
};

export default ChordPresetSelector;
