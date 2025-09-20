import React from 'react';
import type { RushGameState, RushModeSettings } from '../../types/game';
import type { CommonDisplayProps, GameStateWithDisplay } from '../../game/GameStateFactory';
import TimerCountUp from '../TimerCountUp';
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
  onTimeUp,
  onTimerUpdate
}) => {
  // Get timer state from gameState
  const gameStateWithDisplay = gameState as unknown as GameStateWithDisplay;
  const { timeRemaining, isActive: isTimerActive } = gameStateWithDisplay.getTimerState();

  // Update parent with note timer state
  React.useEffect(() => {
    onTimerUpdate?.(timeRemaining, isTimerActive);
  }, [timeRemaining, isTimerActive, onTimerUpdate]);

  return (
    <>
      {/* Rush Mode Timer Section */}
      {(currentNote || gameState.isCompleted) && (
        <div className="timer-section">
          <TimerCountUp
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
            timeRemaining={timeRemaining}
            isActive={isTimerActive}
          />
        </div>
      )}
    </>
  );
};

export default RushModeDisplay;