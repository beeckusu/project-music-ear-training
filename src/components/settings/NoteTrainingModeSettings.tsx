import React from 'react';
import { useSettings } from '../../hooks/useSettings';
import { CHORD_FILTER_PRESETS } from '../../constants/chordPresets';

const NoteTrainingModeSettings: React.FC = () => {
  const { settings, updateModeSettings } = useSettings();
  const noteTrainingSettings = settings.modes.noteTraining;

  const handleTargetChordsChange = (targetChords: number | undefined) => {
    updateModeSettings({
      noteTraining: {
        ...noteTrainingSettings,
        targetChords
      }
    });
  };

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
        <h4>🎹 Chord Training Mode</h4>
        <p>Listen to chords and identify individual notes. Perfect for developing your ear for harmony and chord structure!</p>
      </div>

      <div className="setting-group">
        <label>Chord Type</label>
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
    </div>
  );
};

export default NoteTrainingModeSettings;
