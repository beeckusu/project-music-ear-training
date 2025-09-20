import React, { useEffect } from 'react';
import type { SandboxGameState } from '../../types/game';
import type { CommonDisplayProps, GameStateWithDisplay } from '../../game/GameStateFactory';
import TimerCircular from '../TimerCircular';

interface SandboxModeDisplayProps extends CommonDisplayProps {
  gameState: SandboxGameState;
}

const SandboxModeDisplay: React.FC<SandboxModeDisplayProps> = ({
  gameState,
  responseTimeLimit,
  currentNote,
  isPaused,
  onTimeUp,
  onTimerUpdate
}) => {
  // Get timer state from gameState
  const gameStateWithDisplay = gameState as unknown as GameStateWithDisplay;
  const { timeRemaining, isActive: isTimerActive } = gameStateWithDisplay.getTimerState();

  // Update parent with timer state
  useEffect(() => {
    onTimerUpdate?.(timeRemaining, isTimerActive);
  }, [timeRemaining, isTimerActive, onTimerUpdate]);
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