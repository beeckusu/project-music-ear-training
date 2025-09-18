import React, { useEffect, useRef } from 'react';
import type { GuessAttempt } from '../types/game';
import './GuessHistory.css';

interface GuessHistoryProps {
  attempts: GuessAttempt[];
  maxDisplay?: number;
}

const GuessHistory: React.FC<GuessHistoryProps> = ({ attempts, maxDisplay = 10 }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const recentAttempts = attempts.slice(-maxDisplay);

  // Auto-scroll to the right when new attempts are added
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [attempts.length]);

  const formatNote = (note: { note: string; octave: number }) => {
    return `${note.note}${note.octave}`;
  };

  const formatTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(timestamp);
  };

  return (
    <div className="guess-history">
      <h3 className="guess-history-title">Recent Attempts</h3>
      <div className="guess-history-container">
        <div className="guess-history-list" ref={scrollContainerRef}>
          {attempts.length === 0 ? (
            <div className="guess-history-empty">
              Make your first guess to see attempts here
            </div>
          ) : (
            recentAttempts.map((attempt) => (
              <div 
                key={attempt.id} 
                className={`guess-history-item ${attempt.isCorrect ? 'correct' : 'incorrect'}`}
                title={`${formatTime(attempt.timestamp)} - ${attempt.isCorrect ? 'Correct' : 'Incorrect'}`}
              >
                <div className="guess-content">
                  {attempt.isCorrect ? (
                    <span className="guess-text">
                      {formatNote(attempt.actualNote)} ✓
                    </span>
                  ) : (
                    <span className="guess-text">
                      {formatNote(attempt.actualNote)} → {attempt.guessedNote ? formatNote(attempt.guessedNote) : '?'} ✗
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default GuessHistory;