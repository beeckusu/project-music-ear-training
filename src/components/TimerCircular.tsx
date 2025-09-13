import React, { useEffect, useState } from 'react';
import './TimerCircular.css';

interface TimerCircularProps {
  timeLimit: number; // in seconds
  timeRemaining: number; // in seconds
  isActive: boolean;
  onTimeUp?: () => void;
}

const TimerCircular: React.FC<TimerCircularProps> = ({ 
  timeLimit, 
  timeRemaining, 
  isActive,
  onTimeUp 
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (timeLimit > 0) {
      const newProgress = (timeRemaining / timeLimit) * 100;
      setProgress(Math.max(0, newProgress));
    }
  }, [timeRemaining, timeLimit]);

  useEffect(() => {
    if (timeRemaining <= 0 && isActive && onTimeUp) {
      onTimeUp();
    }
  }, [timeRemaining, isActive, onTimeUp]);

  const getProgressColor = (): string => {
    if (progress > 60) return '#28a745'; // Green
    if (progress > 30) return '#ffc107'; // Yellow
    return '#dc3545'; // Red
  };

  const getTimerClass = (): string => {
    let classes = 'timer-circular';
    if (!isActive) classes += ' timer-paused';
    if (progress <= 30) classes += ' timer-warning';
    if (progress <= 10) classes += ' timer-critical';
    return classes;
  };

  // SVG circle parameters
  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI * 2;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={getTimerClass()}>
      <div className="timer-container">
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
            stroke={getProgressColor()}
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
              transition: 'stroke-dashoffset 0.3s ease, stroke 0.3s ease'
            }}
          />
        </svg>
        
        <div className="timer-content">
          <div className="timer-time">
            {Math.ceil(timeRemaining)}
          </div>
          <div className="timer-label">
            seconds
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimerCircular;