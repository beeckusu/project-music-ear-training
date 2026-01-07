import React from 'react';
import { useSettings } from '../../hooks/useSettings';

const NoteTrainingModeSettings: React.FC = () => {
  const { pendingSettings, updateModeSettings } = useSettings();
  const noteTrainingSettings = pendingSettings.modes.noteTraining;

  const handleDurationChange = (sessionDuration: number) => {
    updateModeSettings({
      noteTraining: {
        ...noteTrainingSettings,
        sessionDuration
      }
    });
  };

  const handleTargetAccuracyChange = (targetAccuracy: number | undefined) => {
    updateModeSettings({
      noteTraining: {
        ...noteTrainingSettings,
        targetAccuracy
      }
    });
  };

  const handleTargetStreakChange = (targetStreak: number | undefined) => {
    updateModeSettings({
      noteTraining: {
        ...noteTrainingSettings,
        targetStreak
      }
    });
  };

  const handleTargetChordsChange = (targetChords: number | undefined) => {
    updateModeSettings({
      noteTraining: {
        ...noteTrainingSettings,
        targetChords
      }
    });
  };

  const durationOptions = [
    { value: 60, label: '1 minute' },
    { value: 180, label: '3 minutes' },
    { value: 300, label: '5 minutes' },
    { value: 600, label: '10 minutes' },
    { value: 900, label: '15 minutes' },
    { value: 1800, label: '30 minutes' }
  ];

  // Helper to format duration for display
  const formatDuration = (seconds: number): string => {
    const minutes = Math.round(seconds / 60);
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  };

  return (
    <div className="mode-settings-container">
      <div className="mode-info">
        <h4>🎹 Note Training Mode</h4>
        <p>Practice identifying chord notes visually. Perfect for developing your understanding of chord structure and harmony!</p>
      </div>

      <div className="setting-group">
        <label>Session Duration</label>
        <select
          value={noteTrainingSettings.sessionDuration}
          onChange={(e) => handleDurationChange(parseInt(e.target.value, 10))}
        >
          {durationOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <small>How long your practice session will last</small>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={noteTrainingSettings.targetAccuracy !== undefined}
            onChange={(e) => {
              if (e.target.checked) {
                handleTargetAccuracyChange(80);
              } else {
                handleTargetAccuracyChange(undefined);
              }
            }}
          />
          Enable Accuracy Target
        </label>
        {noteTrainingSettings.targetAccuracy !== undefined && (
          <>
            <input
              type="range"
              min="50"
              max="100"
              step="5"
              value={noteTrainingSettings.targetAccuracy}
              onChange={(e) => handleTargetAccuracyChange(parseInt(e.target.value, 10))}
            />
            <span className="range-value">{noteTrainingSettings.targetAccuracy}% accuracy</span>
          </>
        )}
        <small>Optional accuracy goal to strive for during practice</small>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={noteTrainingSettings.targetStreak !== undefined}
            onChange={(e) => {
              if (e.target.checked) {
                handleTargetStreakChange(10);
              } else {
                handleTargetStreakChange(undefined);
              }
            }}
          />
          Enable Streak Target
        </label>
        {noteTrainingSettings.targetStreak !== undefined && (
          <>
            <input
              type="range"
              min="3"
              max="50"
              value={noteTrainingSettings.targetStreak}
              onChange={(e) => handleTargetStreakChange(parseInt(e.target.value, 10))}
            />
            <span className="range-value">{noteTrainingSettings.targetStreak} chords in a row</span>
          </>
        )}
        <small>Optional streak goal to challenge yourself</small>
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
              max="100"
              step="5"
              value={noteTrainingSettings.targetChords}
              onChange={(e) => handleTargetChordsChange(parseInt(e.target.value, 10))}
            />
            <span className="range-value">{noteTrainingSettings.targetChords} correct chords</span>
          </>
        )}
        <small>Optional total chords goal for the session</small>
      </div>

      <div className="mode-preview">
        <h5>Session Preview</h5>
        <div className="preview-stats">
          <div className="preview-stat">
            <span className="stat-label">Duration:</span>
            <span className="stat-value">{formatDuration(noteTrainingSettings.sessionDuration)}</span>
          </div>
          <div className="preview-stat">
            <span className="stat-label">Accuracy Target:</span>
            <span className="stat-value">
              {noteTrainingSettings.targetAccuracy ? `${noteTrainingSettings.targetAccuracy}%` : 'None (open practice)'}
            </span>
          </div>
          <div className="preview-stat">
            <span className="stat-label">Streak Target:</span>
            <span className="stat-value">
              {noteTrainingSettings.targetStreak ? `${noteTrainingSettings.targetStreak} chords` : 'None (no pressure)'}
            </span>
          </div>
          <div className="preview-stat">
            <span className="stat-label">Chord Target:</span>
            <span className="stat-value">
              {noteTrainingSettings.targetChords ? `${noteTrainingSettings.targetChords} correct chords` : 'None (practice freely)'}
            </span>
          </div>
          <div className="preview-stat">
            <span className="stat-label">Tracked Stats:</span>
            <span className="stat-value">All metrics, comprehensive report</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteTrainingModeSettings;
