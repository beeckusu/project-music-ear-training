import React from 'react';
import { useSettings } from '../../hooks/useSettings';

const SandboxModeSettings: React.FC = () => {
  const { pendingSettings, updateModeSettings } = useSettings();
  const sandboxSettings = pendingSettings.modes.sandbox;

  const handleDurationChange = (sessionDuration: number) => {
    updateModeSettings({
      sandbox: {
        ...sandboxSettings,
        sessionDuration
      }
    });
  };

  const handleTargetAccuracyChange = (targetAccuracy: number | undefined) => {
    updateModeSettings({
      sandbox: {
        ...sandboxSettings,
        targetAccuracy
      }
    });
  };

  const handleTargetStreakChange = (targetStreak: number | undefined) => {
    updateModeSettings({
      sandbox: {
        ...sandboxSettings,
        targetStreak
      }
    });
  };

  const handleTargetNotesChange = (targetNotes: number | undefined) => {
    updateModeSettings({
      sandbox: {
        ...sandboxSettings,
        targetNotes
      }
    });
  };

  const durationOptions = [
    { value: 5 / 60, label: '5 seconds' },
    { value: 1, label: '1 minute' },
    { value: 3, label: '3 minutes' },
    { value: 5, label: '5 minutes' },
    { value: 10, label: '10 minutes' }
  ];

  return (
    <div className="mode-settings-container">
      <div className="mode-info">
        <h4>🎯 Sandbox Mode</h4>
        <p>Practice at your own pace with optional targets. Perfect for learning and improving your skills without pressure!</p>
      </div>

      <div className="setting-group">
        <label>Session Duration</label>
        <select
          value={sandboxSettings.sessionDuration}
          onChange={(e) => handleDurationChange(parseFloat(e.target.value))}
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
            checked={sandboxSettings.targetAccuracy !== undefined}
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
        {sandboxSettings.targetAccuracy !== undefined && (
          <>
            <input
              type="range"
              min="50"
              max="100"
              value={sandboxSettings.targetAccuracy}
              onChange={(e) => handleTargetAccuracyChange(parseInt(e.target.value, 10))}
            />
            <span className="range-value">{sandboxSettings.targetAccuracy}% accuracy</span>
          </>
        )}
        <small>Optional accuracy goal to strive for during practice</small>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={sandboxSettings.targetStreak !== undefined}
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
        {sandboxSettings.targetStreak !== undefined && (
          <>
            <input
              type="range"
              min="3"
              max="50"
              value={sandboxSettings.targetStreak}
              onChange={(e) => handleTargetStreakChange(parseInt(e.target.value, 10))}
            />
            <span className="range-value">{sandboxSettings.targetStreak} notes in a row</span>
          </>
        )}
        <small>Optional streak goal to challenge yourself</small>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={sandboxSettings.targetNotes !== undefined}
            onChange={(e) => {
              if (e.target.checked) {
                handleTargetNotesChange(20);
              } else {
                handleTargetNotesChange(undefined);
              }
            }}
          />
          Enable Notes Target
        </label>
        {sandboxSettings.targetNotes !== undefined && (
          <>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={sandboxSettings.targetNotes}
              onChange={(e) => handleTargetNotesChange(parseInt(e.target.value, 10))}
            />
            <span className="range-value">{sandboxSettings.targetNotes} correct notes</span>
          </>
        )}
        <small>Optional total notes goal for the session</small>
      </div>

      <div className="mode-preview">
        <h5>Session Preview</h5>
        <div className="preview-stats">
          <div className="preview-stat">
            <span className="stat-label">Duration:</span>
            <span className="stat-value">{sandboxSettings.sessionDuration} minutes</span>
          </div>
          <div className="preview-stat">
            <span className="stat-label">Accuracy Target:</span>
            <span className="stat-value">
              {sandboxSettings.targetAccuracy ? `${sandboxSettings.targetAccuracy}%` : 'None (open practice)'}
            </span>
          </div>
          <div className="preview-stat">
            <span className="stat-label">Streak Target:</span>
            <span className="stat-value">
              {sandboxSettings.targetStreak ? `${sandboxSettings.targetStreak} notes` : 'None (no pressure)'}
            </span>
          </div>
          <div className="preview-stat">
            <span className="stat-label">Notes Target:</span>
            <span className="stat-value">
              {sandboxSettings.targetNotes ? `${sandboxSettings.targetNotes} correct notes` : 'None (practice freely)'}
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

export default SandboxModeSettings;