import React from 'react';

const TimingSettings: React.FC = () => {
  return (
    <div className="tab-content">
      <div className="setting-group">
        <label>BPM</label>
        <input type="range" min="60" max="180" defaultValue="120" />
        <span className="range-value">120</span>
      </div>
      <div className="setting-group">
        <label>Note Duration</label>
        <select defaultValue="2n">
          <option value="2n">Half Note</option>
          <option value="4n">Quarter Note</option>
          <option value="8n">Eighth Note</option>
        </select>
      </div>
      <div className="setting-group">
        <label>Auto-advance Speed</label>
        <input type="range" min="500" max="3000" defaultValue="1000" />
        <span className="range-value">1.0s</span>
      </div>
    </div>
  );
};

export default TimingSettings;