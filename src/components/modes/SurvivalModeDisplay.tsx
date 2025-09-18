import React from 'react';
import type { SurvivalGameState } from '../../types/game';
import type { CommonDisplayProps } from '../../game/GameStateFactory';
import TimerCircular from '../TimerCircular';

interface SurvivalModeDisplayProps extends CommonDisplayProps {
  gameState: SurvivalGameState;
}

const SurvivalModeDisplay: React.FC<SurvivalModeDisplayProps> = ({
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

      {/* Survival-specific UI elements can be added here */}
      {/* TODO: Add health bar, survival stats, etc. */}
    </>
  );
};

export default SurvivalModeDisplay;