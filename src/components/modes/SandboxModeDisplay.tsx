import React, { useEffect } from 'react';
import type { SandboxGameState } from '../../types/game';
import type { CommonDisplayProps } from '../../game/GameStateFactory';
import TimerCircular from '../TimerCircular';
import TimerDigital from '../TimerDigital';
import './SandboxModeDisplay.css';

interface SandboxModeDisplayProps extends CommonDisplayProps {
  gameState: SandboxGameState;
}

const SandboxModeDisplay: React.FC<SandboxModeDisplayProps> = ({
  gameState,
  responseTimeLimit,
  currentNote,
  isPaused,
  timeRemaining,
  sessionTimeRemaining,
  onTimerUpdate
}) => {
  // Derive round timer active state from props
  // Round timer is active when there's a current note, game not completed, and not paused
  const isTimerActive = currentNote && !gameState.isCompleted && !isPaused;

  // Derive session timer active state from game state
  // Session timer is active when game has started and not completed
  const sessionTimerIsActive = gameState.startTime !== undefined && !gameState.isCompleted && !isPaused;

  // Update parent with timer state
  useEffect(() => {
    if (timeRemaining !== undefined) {
      onTimerUpdate?.(timeRemaining, isTimerActive);
    }
  }, [timeRemaining, isTimerActive, onTimerUpdate]);
  return (
    <>
      {/* Session Timer and Progress Section */}
      {(currentNote || gameState.isCompleted) && (
        <div className="sandbox-stats-section">
          {/* Session Timer */}
          <div className="session-timer">
            <TimerDigital
              elapsedTime={sessionTimeRemaining ?? 0}
              isActive={sessionTimerIsActive}
            />
            <div className="session-progress">
              {gameState.isCompleted && (
                <p>🎯 Practice Session Complete!</p>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Individual Note Timer */}
      {responseTimeLimit && currentNote && !gameState.isCompleted && (
        <div className="timer-section">
          <TimerCircular
            timeLimit={responseTimeLimit}
            timeRemaining={timeRemaining ?? 0}
            isActive={isTimerActive}
          />
        </div>
      )}

      {/* Unlimited Time Mode Indicator */}
      {!responseTimeLimit && currentNote && !gameState.isCompleted && (
        <div className="unlimited-time-indicator">
          <p>⏳ Unlimited Time Mode</p>
        </div>
      )}
    </>
  );
};

export default SandboxModeDisplay;