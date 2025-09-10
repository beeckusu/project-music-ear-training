import React from 'react';
import './ScoreTracker.css';

interface ScoreTrackerProps {
  correct: number;
  total: number;
}

const ScoreTracker: React.FC<ScoreTrackerProps> = ({ correct, total }) => {
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  
  return (
    <div className="score-tracker">
      <div className="score-item">
        <span className="score-label">Score:</span>
        <span className="score-value">{correct}/{total}</span>
      </div>
      <div className="score-item">
        <span className="score-label">Accuracy:</span>
        <span className="score-value">{accuracy}%</span>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${accuracy}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ScoreTracker;