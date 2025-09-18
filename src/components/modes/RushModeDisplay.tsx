import React from 'react';
import type { RushGameState, RushModeSettings } from '../../types/game';
import type { CommonDisplayProps } from '../../game/GameStateFactory';
import TimerCountUp from '../TimerCountUp';
import TimerCircular from '../TimerCircular';
import { useRushTimer } from '../../hooks/useRushTimer';

interface RushModeDisplayProps extends CommonDisplayProps {
  gameState: RushGameState;
  rushSettings: RushModeSettings;
}

const RushModeDisplay: React.FC<RushModeDisplayProps> = ({
  gameState,
  rushSettings,
  responseTimeLimit,
  timeRemaining,
  isTimerActive,
  currentNote,
  isPaused,
  onTimerUpdate
}) => {
  // Initialize Rush timer (for Rush mode)
  const { isTimerActive: isRushTimerActive, startTimer: startRushTimer } = useRushTimer({
    isPaused,
    onTick: (time) => {
      if (onTimerUpdate) {
        onTimerUpdate(time);
      }
    }
  });

  // Start timer when current note is played for the first time in Rush mode
  React.useEffect(() => {
    // Use snapshot values to avoid dependency loops
    const correctCount = gameState.correctCount;
    const isCompleted = gameState.isCompleted;

    if (currentNote && !isRushTimerActive && !isCompleted && correctCount === 0) {
      startRushTimer();
    }
  }, [currentNote, isRushTimerActive, startRushTimer]);

  return (
    <>
      {/* Rush Mode Timer Section */}
      {(currentNote || gameState.isCompleted) && (
        <div className="timer-section">
          <TimerCountUp
            elapsedTime={gameState.isCompleted ? (gameState.completionTime || gameState.elapsedTime) : gameState.elapsedTime}
            isActive={isRushTimerActive && !gameState.isCompleted}
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