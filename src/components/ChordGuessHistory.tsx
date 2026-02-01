import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ChordGuessAttempt, GuessResult } from '../types/game';
import type { NoteWithOctave } from '../types/music';
import './ChordGuessHistory.css';

interface ChordGuessHistoryProps {
  attempts: ChordGuessAttempt[];
  maxDisplay?: number;
  mode: 'training' | 'identification';
}

interface TooltipPosition {
  top: number;
  left: number;
}

const ChordGuessHistory: React.FC<ChordGuessHistoryProps> = ({
  attempts,
  maxDisplay = 10,
  mode
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hoveredAttempt, setHoveredAttempt] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);
  const recentAttempts = attempts.slice(-maxDisplay);

  const handleMouseEnter = useCallback((attemptId: string, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    setTooltipPos({
      top: rect.top,
      left: rect.left + rect.width / 2,
    });
    setHoveredAttempt(attemptId);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredAttempt(null);
    setTooltipPos(null);
  }, []);

  // Auto-scroll to the right when new attempts are added
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [attempts.length]);

  const getGuessResult = (attempt: ChordGuessAttempt): GuessResult => {
    if (attempt.isCorrect) return 'correct';
    if (attempt.accuracy !== undefined && attempt.accuracy > 0 && attempt.accuracy < 100) {
      return 'partial';
    }
    return 'wrong';
  };

  const getResultIcon = (result: GuessResult): string => {
    switch (result) {
      case 'correct':
        return '✓';
      case 'partial':
        return '~';
      case 'wrong':
        return '✗';
    }
  };

  const formatNote = (note: NoteWithOctave): string => {
    return `${note.note}${note.octave}`;
  };

  const formatChordName = (chord: { name: string }): string => {
    return chord.name;
  };

  const renderTooltipContent = (attempt: ChordGuessAttempt) => {
    if (mode === 'training') {
      return (
        <div className="chord-tooltip-content">
          <div className="chord-tooltip-header">
            {formatChordName(attempt.actualChord)}
            {attempt.accuracy !== undefined && (
              <span className="chord-tooltip-accuracy"> ({Math.round(attempt.accuracy)}%)</span>
            )}
          </div>

          {attempt.correctNotes && attempt.correctNotes.length > 0 && (
            <div className="chord-tooltip-section">
              <div className="chord-tooltip-label correct">Correct Notes:</div>
              <div className="chord-tooltip-notes">
                {attempt.correctNotes.map((note, idx) => (
                  <span key={idx} className="chord-tooltip-note correct">
                    ✓ {formatNote(note)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {attempt.missedNotes && attempt.missedNotes.length > 0 && (
            <div className="chord-tooltip-section">
              <div className="chord-tooltip-label missed">Missed Notes:</div>
              <div className="chord-tooltip-notes">
                {attempt.missedNotes.map((note, idx) => (
                  <span key={idx} className="chord-tooltip-note missed">
                    − {formatNote(note)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {attempt.incorrectNotes && attempt.incorrectNotes.length > 0 && (
            <div className="chord-tooltip-section">
              <div className="chord-tooltip-label incorrect">Incorrect Notes:</div>
              <div className="chord-tooltip-notes">
                {attempt.incorrectNotes.map((note, idx) => (
                  <span key={idx} className="chord-tooltip-note incorrect">
                    ✗ {formatNote(note)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    } else {
      // Identification mode
      return (
        <div className="chord-tooltip-content">
          {attempt.isCorrect ? (
            <>
              <div className="chord-tooltip-header">Correct!</div>
              <div className="chord-tooltip-detail">
                {formatChordName(attempt.actualChord)}
              </div>
            </>
          ) : (
            <>
              <div className="chord-tooltip-section">
                <div className="chord-tooltip-label">Actual:</div>
                <div className="chord-tooltip-detail correct">
                  {formatChordName(attempt.actualChord)}
                </div>
              </div>
              {attempt.guessedChordName && (
                <div className="chord-tooltip-section">
                  <div className="chord-tooltip-label">Your guess:</div>
                  <div className="chord-tooltip-detail incorrect">
                    {attempt.guessedChordName}
                  </div>
                </div>
              )}
            </>
          )}

          {attempt.displayedNotes && attempt.displayedNotes.length > 0 && (
            <div className="chord-tooltip-section">
              <div className="chord-tooltip-label">Notes:</div>
              <div className="chord-tooltip-notes">
                {attempt.displayedNotes.map((note, idx) => (
                  <span key={idx} className="chord-tooltip-note">
                    {formatNote(note)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
  };

  const hoveredAttemptData = hoveredAttempt
    ? recentAttempts.find(a => a.id === hoveredAttempt)
    : null;

  return (
    <div className="chord-guess-history">
      <h3 className="chord-guess-history-title">Guess History</h3>
      <div className="chord-guess-history-container">
        <div className="chord-guess-history-list" ref={scrollContainerRef}>
          {attempts.length === 0 ? (
            <div className="chord-guess-history-empty">
              Make your first guess to see history here
            </div>
          ) : (
            recentAttempts.map((attempt) => {
              const result = getGuessResult(attempt);
              return (
                <div
                  key={attempt.id}
                  className={`chord-guess-history-item ${result}`}
                  onMouseEnter={(e) => handleMouseEnter(attempt.id, e.currentTarget)}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="chord-guess-icon">
                    {getResultIcon(result)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {hoveredAttemptData && tooltipPos && createPortal(
        <div
          className="chord-tooltip"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
          }}
        >
          {renderTooltipContent(hoveredAttemptData)}
        </div>,
        document.body
      )}
    </div>
  );
};

export default ChordGuessHistory;
