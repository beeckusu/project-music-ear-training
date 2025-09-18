import React from 'react';
import type { SandboxGameState } from '../../types/game';
import type { CommonDisplayProps } from '../../game/GameStateFactory';
import TimerCircular from '../TimerCircular';

interface SandboxModeDisplayProps extends CommonDisplayProps {
  gameState: SandboxGameState;
}

const SandboxModeDisplay: React.FC<SandboxModeDisplayProps> = ({
  gameState: _gameState,
  responseTimeLimit,
  timeRemaining,
  isTimerActive,
  currentNote,
  isPaused: _isPaused,
  onTimerUpdate: _onTimerUpdate
}) => {
  return (
    <>
      {/* Individual Note Timer */}
      {responseTimeLimit && currentNote && (
        <div className="timer-section">
          <TimerCircular
            timeLimit={responseTimeLimit}
            timeRemaining={timeRemaining}
            isActive={isTimerActive}
          />
        </div>
      )}

      {/* Unlimited Time Mode Indicator */}
      {!responseTimeLimit && currentNote && (
        <div className="unlimited-time-indicator">
          <p>⏳ Unlimited Time Mode</p>
        </div>
      )}
    </>
  );
};

export default SandboxModeDisplay;