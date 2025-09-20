import React, { useEffect } from 'react';
import type { SurvivalGameState } from '../../types/game';
import type { CommonDisplayProps, GameStateWithDisplay } from '../../game/GameStateFactory';
import TimerCircular from '../TimerCircular';
import TimerCountUp from '../TimerCountUp';
import './SurvivalModeDisplay.css';

interface SurvivalModeDisplayProps extends CommonDisplayProps {
  gameState: SurvivalGameState;
}

const SurvivalModeDisplay: React.FC<SurvivalModeDisplayProps> = ({
  gameState,
  responseTimeLimit,
  currentNote,
  isPaused,
  onTimeUp,
  onTimerUpdate
}) => {
  const healthPercentage = Math.round((gameState.health / gameState.maxHealth) * 100);
  const targetDurationSeconds = gameState.survivalSettings.sessionDuration * 60;

  // Get timer state from gameState
  const gameStateWithDisplay = gameState as unknown as GameStateWithDisplay;
  const { timeRemaining, isActive: isTimerActive } = gameStateWithDisplay.getTimerState();

  // Calculate survival time remaining
  const survivalTimeRemaining = Math.max(0, targetDurationSeconds - gameState.elapsedTime);
  const minutesRemaining = Math.floor(survivalTimeRemaining / 60);
  const secondsRemaining = Math.floor(survivalTimeRemaining % 60);

  const getHealthBarClass = (): string => {
    if (healthPercentage > 60) return 'health-good';
    if (healthPercentage > 30) return 'health-warning';
    return 'health-critical';
  };

  const getHealthStatusEmoji = (): string => {
    if (healthPercentage > 60) return '💚';
    if (healthPercentage > 30) return '💛';
    return '❤️';
  };

  // Update parent with note timer state
  useEffect(() => {
    onTimerUpdate?.(timeRemaining, isTimerActive);
  }, [timeRemaining, isTimerActive, onTimerUpdate]);


  return (
    <>
      {/* Survival Timer and Health Section */}
      {(currentNote || gameState.isCompleted) && (
        <div className="survival-stats-section">
          {/* Session Timer */}
          <div className="survival-timer">
            <TimerCountUp
              elapsedTime={survivalTimeRemaining}
              isActive={!gameState.isCompleted && gameState.startTime !== undefined}
            />
            <div className="survival-progress">
              {gameState.isCompleted ? (
                <p>
                  {gameState.health > 0
                    ? `🎉 Survival Complete! You survived ${gameState.survivalSettings.sessionDuration} minutes!`
                    : `💀 Game Over! You survived ${Math.floor(gameState.elapsedTime / 60)}:${Math.floor(gameState.elapsedTime % 60).toString().padStart(2, '0')}`
                  }
                </p>
              ) : (
                <p>
                  Survive: {minutesRemaining}:{secondsRemaining.toString().padStart(2, '0')} remaining
                </p>
              )}
            </div>
          </div>

          {/* Health Bar */}
          <div className="health-section">
            <div className="health-info">
              <span className="health-label">
                {getHealthStatusEmoji()} Health: {gameState.health}/{gameState.maxHealth} ({healthPercentage}%)
              </span>
              <span className="health-drain">
                -{gameState.healthDrainRate} HP/sec
              </span>
            </div>
            <div className="health-bar-container">
              <div className="health-bar-background">
                <div
                  className={`health-bar-fill ${getHealthBarClass()}`}
                  style={{ width: `${healthPercentage}%` }}
                />
              </div>
            </div>
            <div className="health-mechanics">
              <span className="health-recovery">+{gameState.healthRecovery} HP per correct</span>
              <span className="health-damage">-{gameState.healthDamage} HP per wrong</span>
            </div>
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

export default SurvivalModeDisplay;