import React from 'react';
import { useSettings } from '../../hooks/useSettings';

const SurvivalModeSettings: React.FC = () => {
  const { pendingSettings, updateModeSettings } = useSettings();
  const survivalSettings = pendingSettings.modes.survival;

  const handleDurationChange = (sessionDuration: number) => {
    updateModeSettings({
      survival: {
        ...survivalSettings,
        sessionDuration
      }
    });
  };

  const handleHealthDrainChange = (healthDrainRate: number) => {
    updateModeSettings({
      survival: {
        ...survivalSettings,
        healthDrainRate
      }
    });
  };

  const handleHealthRecoveryChange = (healthRecovery: number) => {
    updateModeSettings({
      survival: {
        ...survivalSettings,
        healthRecovery
      }
    });
  };

  const handleHealthDamageChange = (healthDamage: number) => {
    updateModeSettings({
      survival: {
        ...survivalSettings,
        healthDamage
      }
    });
  };

  const durationOptions = [
    { value: 1, label: '1 minute - Quick Survival' },
    { value: 3, label: '3 minutes - Standard Challenge' },
    { value: 5, label: '5 minutes - Extended Trial' },
    { value: 10, label: '10 minutes - Endurance Test' }
  ];

  const drainRateOptions = [
    { value: 1, label: 'Slow (1 HP/sec)' },
    { value: 2, label: 'Normal (2 HP/sec)' },
    { value: 3, label: 'Fast (3 HP/sec)' },
    { value: 4, label: 'Brutal (4 HP/sec)' }
  ];

  return (
    <div className="mode-settings-container">
      <div className="mode-info">
        <h4>❤️ Survival Mode</h4>
        <p>Survive for the target duration while managing your health. Health drains over time but recovers with correct notes!</p>
      </div>

      <div className="setting-group">
        <label>Session Duration</label>
        <select
          value={survivalSettings.sessionDuration}
          onChange={(e) => handleDurationChange(parseInt(e.target.value, 10))}
        >
          {durationOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <small>How long you need to survive to win</small>
      </div>

      <div className="setting-group">
        <label>Health Drain Rate</label>
        <select
          value={survivalSettings.healthDrainRate}
          onChange={(e) => handleHealthDrainChange(parseInt(e.target.value, 10))}
        >
          {drainRateOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <small>How quickly your health decreases over time</small>
      </div>

      <div className="setting-group">
        <label>Health Recovery</label>
        <input
          type="range"
          min="5"
          max="30"
          value={survivalSettings.healthRecovery}
          onChange={(e) => handleHealthRecoveryChange(parseInt(e.target.value, 10))}
        />
        <span className="range-value">{survivalSettings.healthRecovery} HP per correct note</span>
        <small>Health gained when you guess correctly</small>
      </div>

      <div className="setting-group">
        <label>Wrong Note Penalty</label>
        <input
          type="range"
          min="10"
          max="50"
          value={survivalSettings.healthDamage}
          onChange={(e) => handleHealthDamageChange(parseInt(e.target.value, 10))}
        />
        <span className="range-value">{survivalSettings.healthDamage} HP lost per wrong note</span>
        <small>Health lost when you guess incorrectly</small>
      </div>

      <div className="mode-preview">
        <h5>Session Preview</h5>
        <div className="preview-stats">
          <div className="preview-stat">
            <span className="stat-label">Survive For:</span>
            <span className="stat-value">{survivalSettings.sessionDuration} minutes</span>
          </div>
          <div className="preview-stat">
            <span className="stat-label">Health Drain:</span>
            <span className="stat-value">{survivalSettings.healthDrainRate} HP/second</span>
          </div>
          <div className="preview-stat">
            <span className="stat-label">Win Condition:</span>
            <span className="stat-value">Survive with health &gt; 0</span>
          </div>
          <div className="preview-stat">
            <span className="stat-label">Tracked Stats:</span>
            <span className="stat-value">Final health, accuracy, survival time</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurvivalModeSettings;