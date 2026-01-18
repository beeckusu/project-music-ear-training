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

const NoteTrainingModeSettings: React.FC = () => {
  const { pendingSettings, updateModeSettings } = useSettings();
  const { customPresets } = usePresets();
  const noteTrainingSettings = pendingSettings.modes.noteTraining;
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  // Check if current filter is a custom configuration (not matching any preset)
  const currentPresetKey = detectCurrentPreset(noteTrainingSettings.chordFilter, customPresets);
  const isCustomConfiguration = currentPresetKey === 'CUSTOM';

  const handleTargetChordsChange = (targetChords: number | undefined) => {
    updateModeSettings({
      noteTraining: {
        ...noteTrainingSettings,
        targetChords
      }
    });
  };

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
        <h4>🎹 Chord Training Mode</h4>
        <p>Listen to chords and identify individual notes. Perfect for developing your ear for harmony and chord structure!</p>
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
            checked={noteTrainingSettings.targetChords !== undefined}
            onChange={(e) => {
              if (e.target.checked) {
                handleTargetChordsChange(10);
              } else {
                handleTargetChordsChange(undefined);
              }
            }}
          />
          Enable Chord Target
        </label>
        {noteTrainingSettings.targetChords !== undefined && (
          <>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={noteTrainingSettings.targetChords}
              onChange={(e) => handleTargetChordsChange(parseInt(e.target.value, 10))}
            />
            <span className="range-value">{noteTrainingSettings.targetChords} chords</span>
          </>
        )}
        <small>Number of chords to identify correctly to complete the session</small>
      </div>

      <div className="mode-preview">
        <h5>Session Preview</h5>
        <div className="preview-stats">
          <div className="preview-stat">
            <span className="stat-label">Goal:</span>
            <span className="stat-value">
              {noteTrainingSettings.targetChords ? `${noteTrainingSettings.targetChords} chords` : 'Practice freely'}
            </span>
          </div>
          <div className="preview-stat">
            <span className="stat-label">Feedback:</span>
            <span className="stat-value">Visual multi-note highlighting</span>
          </div>
        </div>
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

export default NoteTrainingModeSettings;
