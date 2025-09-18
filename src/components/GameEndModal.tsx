import React, { useEffect, useMemo } from 'react';
import type { GameStats } from '../types/game';
import { useGameHistory } from '../hooks/useGameHistory';
import './GameEndModal.css';

interface GameEndModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameStats: GameStats;
  mode: string;
  settings: Record<string, any>;
  onPlayAgain: () => void;
  onChangeSettings: () => void;
}

const GameEndModal: React.FC<GameEndModalProps> = ({
  isOpen,
  onClose,
  gameStats,
  mode,
  settings,
  onPlayAgain,
  onChangeSettings
}) => {
  const { getSessionHistory } = useGameHistory();

  // Get relevant past sessions for comparison
  const pastSessions = useMemo(() => {
    return getSessionHistory(mode, settings).slice(0, 5); // Show last 5 similar sessions
  }, [getSessionHistory, mode, settings]);

  // Calculate performance rating
  const getPerformanceRating = (completionTime: number, mode: string, settings: any): string => {
    if (mode === 'rush') {
      const targetNotes = settings.targetNotes || 25;
      const avgTimePerNote = completionTime / targetNotes;

      if (avgTimePerNote <= 1.0) return 'Lightning Fast ⚡';
      if (avgTimePerNote <= 1.5) return 'Blazing Speed 🔥';
      if (avgTimePerNote <= 2.0) return 'Quick & Sharp 🎯';
      if (avgTimePerNote <= 3.0) return 'Steady Pace 🎵';
      return 'Methodical 🎭';
    }
    return 'Great Job!';
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatRelativeTime = (timestamp: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return timestamp.toLocaleDateString();
  };

  const getModeDisplayName = (mode: string): string => {
    return mode.charAt(0).toUpperCase() + mode.slice(1);
  };

  const getSettingsDescription = (mode: string, settings: any): string => {
    if (mode === 'rush') {
      return `${settings.targetNotes || 25} notes`;
    }
    return 'Default settings';
  };

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

  const performanceRating = getPerformanceRating(gameStats.completionTime, mode, settings);

  return (
    <div className="game-end-backdrop" onClick={handleBackdropClick}>
      <div className="game-end-modal">
        <div className="game-end-header">
          <div className="celebration-section">
            <div className="celebration-emoji">🎉</div>
            <h2>Congratulations!</h2>
            <p className="mode-completion">{getModeDisplayName(mode)} Mode Complete</p>
            <p className="performance-rating">{performanceRating}</p>
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
              <div className="stat-item">
                <span className="stat-label">Time</span>
                <span className="stat-value">{formatTime(gameStats.completionTime)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Accuracy</span>
                <span className="stat-value">{gameStats.accuracy.toFixed(1)}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Average per Note</span>
                <span className="stat-value">{gameStats.averageTimePerNote.toFixed(1)}s</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Longest Streak</span>
                <span className="stat-value">{gameStats.longestStreak}</span>
              </div>
            </div>
          </div>

          {pastSessions.length > 0 && (
            <div className="history-section">
              <h3>Your Recent {getSettingsDescription(mode, settings)} Runs</h3>
              <div className="history-list">
                {pastSessions.map((session, index) => (
                  <div key={index} className="history-item">
                    <span className="history-time">{formatTime(session.completionTime)}</span>
                    <span className="history-accuracy">{session.accuracy.toFixed(1)}%</span>
                    <span className="history-date">{formatRelativeTime(session.timestamp)}</span>
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