import React from 'react';
import './ScoreTracker.css';

interface ScoreTrackerProps {
  correct: number;
  total: number;
  onReset: () => void;
  currentStreak?: number;
  longestStreak?: number;
  targetAccuracy?: number;
  targetStreak?: number;
  targetNotes?: number;
}

const ScoreTracker: React.FC<ScoreTrackerProps> = ({
  correct,
  total,
  currentStreak,
  longestStreak,
  targetAccuracy,
  targetStreak,
  targetNotes,
}) => {
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const hasTargets = targetAccuracy !== undefined || targetStreak !== undefined || targetNotes !== undefined;

  return (
    <div className="score-tracker">
      <div className="score-header">
        <div className="score-items">
          <div className="score-item">
            <span className="score-label">Score:</span>
            <span className="score-value">{correct}/{total}</span>
          </div>
          <div className="score-item">
            <span className="score-label">Accuracy:</span>
            <span className={`score-value${targetAccuracy !== undefined && accuracy >= targetAccuracy ? ' target-met' : ''}`}>
              {accuracy}%{targetAccuracy !== undefined && ` / ${targetAccuracy}%`}
            </span>
          </div>
          {longestStreak !== undefined && (
            <div className="score-item">
              <span className="score-label">Streak:</span>
              <span className={`score-value${targetStreak !== undefined && longestStreak >= targetStreak ? ' target-met' : ''}`}>
                {longestStreak}{targetStreak !== undefined && ` / ${targetStreak}`}
              </span>
            </div>
          )}
          {hasTargets && targetNotes !== undefined && (
            <div className="score-item">
              <span className="score-label">Target Notes:</span>
              <span className={`score-value${correct >= targetNotes ? ' target-met' : ''}`}>
                {correct} / {targetNotes}
              </span>
            </div>
          )}
        </div>
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