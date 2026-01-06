import React from 'react';
import { useSettings } from '../../hooks/useSettings';

const RushModeSettings: React.FC = () => {
  const { pendingSettings, updateModeSettings } = useSettings();
  const rushSettings = pendingSettings.modes.rush;

  const handleTargetNotesChange = (targetNotes: number) => {
    updateModeSettings({
      rush: {
        ...rushSettings,
        targetNotes
      }
    });
  };

  const targetOptions = [
    { value: 10, label: '10 notes - Quick Sprint' },
    { value: 25, label: '25 notes - Standard Race' },
    { value: 50, label: '50 notes - Marathon' },
    { value: 100, label: '100 notes - Ultra Challenge' }
  ];

  return (
    <div className="mode-settings-container">
      <div className="mode-info">
        <h4>🏃‍♂️ Rush Mode</h4>
        <p>Race against time to hit your target note count as quickly as possible. Your speed and accuracy will be recorded!</p>
      </div>

      <div className="setting-group">
        <label>Target Notes</label>
        <select
          value={rushSettings.targetNotes}
          onChange={(e) => handleTargetNotesChange(parseInt(e.target.value, 10))}
        >
          {targetOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <small>How many correct notes you need to hit to complete the challenge</small>
      </div>

      <div className="mode-preview">
        <h5>Session Preview</h5>
        <div className="preview-stats">
          <div className="preview-stat">
            <span className="stat-label">Target:</span>
            <span className="stat-value">{rushSettings.targetNotes} correct notes</span>
          </div>
          <div className="preview-stat">
            <span className="stat-label">Win Condition:</span>
            <span className="stat-value">Hit target as fast as possible</span>
          </div>
          <div className="preview-stat">
            <span className="stat-label">Tracked Stats:</span>
            <span className="stat-value">Completion time, accuracy, longest streak</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RushModeSettings;