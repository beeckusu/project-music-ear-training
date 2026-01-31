import React from 'react';
import { useSettings } from '../../hooks/useSettings';

const NoteTrainingModeSettings: React.FC = () => {
  const { pendingSettings, updateModeSettings } = useSettings();
  const noteTrainingSettings = pendingSettings.modes.noteTraining;

  const handleTargetChordsChange = (targetChords: number | undefined) => {
    updateModeSettings({
      noteTraining: {
        ...noteTrainingSettings,
        targetChords
      }
    });
  };

  return (
    <div className="mode-settings-container">
      <div className="mode-info">
        <h4>🎹 Chord Training Mode</h4>
        <p>Listen to chords and identify individual notes. Perfect for developing your ear for harmony and chord structure!</p>
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
