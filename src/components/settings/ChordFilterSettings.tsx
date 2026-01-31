import React, { useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { usePresets } from '../../hooks/usePresets';
import { CHORD_FILTER_PRESETS } from '../../constants/chordPresets';
import { detectCurrentPreset } from '../../utils/chordFilterHelpers';
import ChordPresetSelector from './ChordPresetSelector';
import RootNoteSelector from './RootNoteSelector';
import KeyFilterSelector from './KeyFilterSelector';
import ChordTypeSelector from './ChordTypeSelector';
import SavePresetModal from './SavePresetModal';
import type { ChordType, Note, ChordFilter } from '../../types/music';
import type { CustomChordFilterPreset } from '../../types/presets';

const ChordFilterSettings: React.FC = () => {
  const { pendingSettings, updateModeSettings } = useSettings();
  const { customPresets } = usePresets();
  const noteTrainingSettings = pendingSettings.modes.noteTraining;
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  // Check if current filter is a custom configuration (not matching any preset)
  const currentPresetKey = detectCurrentPreset(noteTrainingSettings.chordFilter, customPresets);
  const isCustomConfiguration = currentPresetKey === 'CUSTOM';

  const handleChordPresetChange = (presetKey: string, customPreset?: CustomChordFilterPreset) => {
    // Handle custom preset
    if (customPreset) {
      updateModeSettings({
        noteTraining: {
          ...noteTrainingSettings,
          chordFilter: { ...customPreset.filter }
        }
      });
      return;
    }

    // Handle predefined preset
    const preset = CHORD_FILTER_PRESETS[presetKey as keyof typeof CHORD_FILTER_PRESETS];
    if (preset) {
      updateModeSettings({
        noteTraining: {
          ...noteTrainingSettings,
          chordFilter: preset.filter
        }
      });
    }
  };

  const updateChordFilter = (updates: Partial<ChordFilter>) => {
    updateModeSettings({
      noteTraining: {
        ...noteTrainingSettings,
        chordFilter: {
          ...noteTrainingSettings.chordFilter,
          ...updates
        }
      }
    });
  };

  const handleChordTypesChange = (chordTypes: ChordType[]) => {
    updateChordFilter({ allowedChordTypes: chordTypes });
  };

  const handleRootNotesChange = (rootNotes: Note[] | null) => {
    updateChordFilter({ allowedRootNotes: rootNotes });
  };

  const handleKeyFilterChange = (keyFilter?: { key: Note; scale: 'major' | 'minor' }) => {
    updateChordFilter({ keyFilter });
  };

  return (
    <div className="mode-settings-container">
      <div className="mode-info">
        <h4>🎹 Chord Filtering</h4>
        <p>Configure which types of chords to practice with in Note Training mode.</p>
      </div>

      <ChordPresetSelector
        currentFilter={noteTrainingSettings.chordFilter}
        onPresetSelect={handleChordPresetChange}
      />

      {isCustomConfiguration && (
        <div className="save-preset-section">
          <button
            type="button"
            className="save-preset-button"
            onClick={() => setIsSaveModalOpen(true)}
          >
            Save as Preset
          </button>
          <small>Save your current configuration for quick access later</small>
        </div>
      )}

      <ChordTypeSelector
        selectedChordTypes={noteTrainingSettings.chordFilter.allowedChordTypes}
        onChange={handleChordTypesChange}
      />

      <RootNoteSelector
        selectedRootNotes={noteTrainingSettings.chordFilter.allowedRootNotes}
        onChange={handleRootNotesChange}
      />

      <KeyFilterSelector
        keyFilter={noteTrainingSettings.chordFilter.keyFilter}
        onChange={handleKeyFilterChange}
      />

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={noteTrainingSettings.chordFilter.includeInversions}
            onChange={(e) => updateChordFilter({ includeInversions: e.target.checked })}
          />
          Include Inversions
        </label>
        <small>Practice chords in root position and all inversions (1st, 2nd, etc.)</small>
      </div>

      <SavePresetModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        filter={noteTrainingSettings.chordFilter}
        onSaved={() => {
          // Modal handles closing itself
        }}
      />
    </div>
  );
};

export default ChordFilterSettings;
