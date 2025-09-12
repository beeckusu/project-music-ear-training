import React from 'react';

const GoalsSettings: React.FC = () => {
  return (
    <div className="tab-content">
      <div className="setting-group">
        <label>Target Streak</label>
        <input type="number" min="5" max="50" defaultValue="10" />
      </div>
      <div className="setting-group">
        <label>Target Accuracy</label>
        <input type="range" min="50" max="100" defaultValue="80" />
        <span className="range-value">80%</span>
      </div>
      <div className="setting-group">
        <label>Session Goal</label>
        <select defaultValue="time">
          <option value="time">Practice for 15 minutes</option>
          <option value="correct">Get 25 correct answers</option>
          <option value="streak">Reach 10 note streak</option>
        </select>
      </div>
    </div>
  );
};

export default GoalsSettings;