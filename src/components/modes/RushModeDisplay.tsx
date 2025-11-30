import React from 'react';
import type { RushGameState, RushModeSettings } from '../../types/game';
import type { CommonDisplayProps, GameStateWithDisplay } from '../../game/GameStateFactory';
import TimerDigital from '../TimerDigital';
import TimerCircular from '../TimerCircular';
import './RushModeDisplay.css';

interface RushModeDisplayProps extends CommonDisplayProps {
  gameState: RushGameState;
  rushSettings: RushModeSettings;
}

const RushModeDisplay: React.FC<RushModeDisplayProps> = ({
  gameState,
  rushSettings,
  responseTimeLimit,
  currentNote,
  isPaused,
  timeRemaining,
  onTimerUpdate
}) => {
  // Derive round timer active state from props
  // Round timer is active when there's a current note, game not completed, and not paused
  const isTimerActive = currentNote && !gameState.isCompleted && !isPaused;

  // Update parent with note timer state (optional callback)
  React.useEffect(() => {
    if (timeRemaining !== undefined) {
      onTimerUpdate?.(timeRemaining, isTimerActive);
    }
  }, [timeRemaining, isTimerActive, onTimerUpdate]);

  return (
    <>
      {/* Rush Mode Timer Section */}
      {(currentNote || gameState.isCompleted) && (
        <div className="timer-section">
          <TimerDigital
            elapsedTime={gameState.elapsedTime}
            isActive={!gameState.isCompleted && gameState.startTime !== undefined}
          />
          <div className="rush-progress">
            {gameState.isCompleted ? (
              <p>🎉 Completed! {gameState.correctCount}/{rushSettings.targetNotes} notes - Free play mode</p>
            ) : (
              <p>Progress: {gameState.correctCount}/{rushSettings.targetNotes} correct notes</p>
            )}
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
    </>
  );
};

export default RushModeDisplay;