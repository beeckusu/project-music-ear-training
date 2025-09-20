import React, { useEffect, useMemo } from 'react';
import type { GameStats, BaseGameState } from '../types/game';
import { useGameHistory } from '../hooks/useGameHistory';
import './GameEndModal.css';

interface GameEndModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameStats: GameStats;
  gameState: BaseGameState;
  mode: string;
  settings: Record<string, any>;
  sessionResults?: Record<string, any>;
  onPlayAgain: () => void;
  onChangeSettings: () => void;
}

const GameEndModal: React.FC<GameEndModalProps> = ({
  isOpen,
  onClose,
  gameStats,
  gameState,
  mode,
  settings,
  sessionResults = {},
  onPlayAgain,
  onChangeSettings
}) => {
  const { getSessionHistory } = useGameHistory();

  // Get relevant past sessions for comparison
  const pastSessions = useMemo(() => {
    return getSessionHistory(mode, settings).slice(0, 5); // Show last 5 similar sessions
  }, [getSessionHistory, mode, settings]);



  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="game-end-backdrop" onClick={handleBackdropClick}>
      <div className={`game-end-modal ${gameState.getHeaderThemeClass(sessionResults)}`}>
        <div className="game-end-header">
          <div className="celebration-section">
            <div className="celebration-emoji">{gameState.getCelebrationEmoji(sessionResults)}</div>
            <h2>{gameState.getHeaderTitle(sessionResults)}</h2>
            <p className="mode-completion">{gameState.getModeCompletionText(sessionResults)}</p>
            <p className="performance-rating">{gameState.getPerformanceRating(gameStats, sessionResults)}</p>
          </div>
          <button
            className="game-end-close-button"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="game-end-content">
          <div className="stats-section">
            <h3>Your Performance</h3>
            <div className="stats-grid">
              {gameState.getStatsItems(gameStats, sessionResults).map((stat, index) => (
                <div key={index} className={`stat-item ${stat.className || ''}`}>
                  <span className="stat-label">{stat.label}</span>
                  <span className="stat-value">{stat.value}</span>
                </div>
              ))}
            </div>
            {gameState.getAdditionalStatsSection?.(sessionResults)}
          </div>

          {gameState.shouldShowHistory(pastSessions) && (
            <div className="history-section">
              <h3>{gameState.getHistoryTitle(settings)}</h3>
              <div className="history-list">
                {gameState.getHistoryItems(pastSessions).map((item, index) => (
                  <div key={index} className={`history-item ${item.className || ''}`}>
                    <span className="history-time">{item.primaryStat}</span>
                    <span className="history-accuracy">{item.secondaryStat}</span>
                    <span className="history-date">{item.metadata}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="actions-section">
            <button className="action-button primary" onClick={onPlayAgain}>
              🔄 Play Again
            </button>
            <button className="action-button secondary" onClick={onChangeSettings}>
              ⚙️ Change Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameEndModal;