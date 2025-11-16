import React from 'react';
import './TimerDigital.css';

interface TimerDigitalProps {
  elapsedTime: number; // in seconds
  isActive: boolean;
  showProgress?: boolean;
  targetTime?: number; // Optional target time to show progress against
}

const TimerDigital: React.FC<TimerDigitalProps> = ({
  elapsedTime,
  isActive,
  showProgress = false,
  targetTime
}) => {
  // Format time as MM:SS or HH:MM:SS if over an hour
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const getTimerClass = (): string => {
    let classes = 'timer-count-up';
    if (!isActive) classes += ' timer-paused';
    return classes;
  };

  const progress = targetTime && targetTime > 0 ? Math.min((elapsedTime / targetTime) * 100, 100) : 0;

  // SVG circle parameters
  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI * 2;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={getTimerClass()}>
      <div className="timer-container">
        {showProgress && targetTime && (
          <svg
            className="timer-svg"
            width={size}
            height={size}
          >
            {/* Background circle */}
            <circle
              className="timer-background"
              stroke="#e9ecef"
              strokeWidth={strokeWidth}
              fill="transparent"
              r={radius}
              cx={size / 2}
              cy={size / 2}
            />

            {/* Progress circle */}
            <circle
              className="timer-progress"
              stroke="#007bff"
              strokeWidth={strokeWidth}
              fill="transparent"
              r={radius}
              cx={size / 2}
              cy={size / 2}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: offset,
                strokeLinecap: 'round',
                transform: 'rotate(-90deg)',
                transformOrigin: '50% 50%',
                transition: 'stroke-dashoffset 0.3s ease'
              }}
            />
          </svg>
        )}

        <div className="timer-content">
          <div className="timer-time">
            {formatTime(elapsedTime)}
          </div>
          {targetTime && showProgress && (
            <div className="timer-progress-text">
              {Math.round(progress)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimerDigital;