import React from 'react';
import { useSettings } from '../../hooks/useSettings';
import { CHORD_FILTER_PRESETS } from '../../constants/chordPresets';

const ChordFilterSettings: React.FC = () => {
  const { pendingSettings, updateModeSettings } = useSettings();
  const noteTrainingSettings = pendingSettings.modes.noteTraining;

  const handleChordPresetChange = (presetName: string) => {
    const preset = CHORD_FILTER_PRESETS[presetName as keyof typeof CHORD_FILTER_PRESETS];
    if (preset) {
      updateModeSettings({
        noteTraining: {
          ...noteTrainingSettings,
          chordFilter: preset.filter
        }
      });
    }
  };

  return (
    <div className="mode-settings-container">
      <div className="mode-info">
        <h4>🎹 Chord Filtering</h4>
        <p>Configure which types of chords to practice with in Note Training mode.</p>
      </div>

      <div className="setting-group">
        <label>Chord Preset</label>
        <select
          value={Object.keys(CHORD_FILTER_PRESETS).find(key =>
            JSON.stringify(CHORD_FILTER_PRESETS[key as keyof typeof CHORD_FILTER_PRESETS].filter) === JSON.stringify(noteTrainingSettings.chordFilter)
          ) || 'BASIC_TRIADS'}
          onChange={(e) => handleChordPresetChange(e.target.value)}
        >
          <option value="BASIC_TRIADS">Basic Triads (Beginner)</option>
          <option value="ALL_MAJOR_MINOR_TRIADS">All Major & Minor Triads</option>
          <option value="ALL_7TH_CHORDS">All 7th Chords</option>
          <option value="JAZZ_CHORDS">Jazz Chords</option>
          <option value="ALL_CHORDS_C_MAJOR">All Chords in C Major</option>
        </select>
        <small>Choose which types of chords to practice</small>
      </div>

      <div className="mode-preview">
        <h5>Current Filter</h5>
        <div className="preview-stats">
          <div className="preview-stat">
            <span className="stat-label">Active Preset:</span>
            <span className="stat-value">
              {Object.entries(CHORD_FILTER_PRESETS).find(([, preset]) =>
                JSON.stringify(preset.filter) === JSON.stringify(noteTrainingSettings.chordFilter)
              )?.[1].name || 'Custom'}
            </span>
          </div>
          <div className="preview-stat">
            <span className="stat-label">Note:</span>
            <span className="stat-value">This affects all Note Training modes</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChordFilterSettings;
