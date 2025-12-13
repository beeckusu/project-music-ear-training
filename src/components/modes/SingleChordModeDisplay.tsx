import React from 'react';
import type { SingleChordGameState } from '../../game/SingleChordGameState';
import type { CommonDisplayProps } from '../../game/GameStateFactory';
import TimerDigital from '../TimerDigital';
import './SingleChordModeDisplay.css';

interface SingleChordModeDisplayProps extends CommonDisplayProps {
  gameState: SingleChordGameState;
  onSubmitAnswer: () => void;
  onClearSelection: () => void;
}

const SingleChordModeDisplay: React.FC<SingleChordModeDisplayProps> = ({
  gameState,
  currentNote,
  onSubmitAnswer,
  onClearSelection
}) => {
  const { currentChord, correctNotes, incorrectNotes, selectedNotes, correctChordsCount, currentStreak, totalAttempts, noteTrainingSettings } = gameState;

  // Calculate accuracy
  const accuracy = totalAttempts > 0 ? Math.round((correctChordsCount / totalAttempts) * 100) : 0;

  // Determine if submit button should be enabled
  const canSubmit = selectedNotes.size > 0 && currentChord !== null && !gameState.isCompleted;

  return (
    <>
      {/* Chord Name Display */}
      {currentChord && (currentNote || gameState.isCompleted) && (
        <div className="chord-display-section">
          <div className="chord-name-container">
            <div className="chord-label">Current Chord</div>
            <div className="chord-name">{currentChord.name}</div>
            <div className="chord-instruction">
              Select all {currentChord.notes.length} notes in this chord
            </div>
          </div>
        </div>
      )}

      {/* Progress Stats */}
      {(currentNote || gameState.isCompleted) && (
        <div className="chord-stats-section">
          <TimerDigital
            elapsedTime={gameState.elapsedTime}
            isActive={!gameState.isCompleted && gameState.startTime !== undefined}
          />
          <div className="chord-progress">
            {gameState.isCompleted ? (
              <p>🎉 Training Complete! {correctChordsCount}/{noteTrainingSettings.targetChords} chords identified</p>
            ) : (
              <div className="progress-stats">
                <div className="stat-item">
                  <span className="stat-label">Progress:</span>
                  <span className="stat-value">{correctChordsCount}/{noteTrainingSettings.targetChords || '∞'}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Streak:</span>
                  <span className="stat-value">{currentStreak}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Accuracy:</span>
                  <span className="stat-value">{accuracy}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Note Selection Feedback */}
      {currentChord && currentNote && !gameState.isCompleted && (
        <div className="note-selection-section">
          <div className="selection-status">
            <div className="status-item correct">
              <span className="status-icon">✓</span>
              <span className="status-text">Correct: {correctNotes.size}/{currentChord.notes.length}</span>
            </div>
            {incorrectNotes.size > 0 && (
              <div className="status-item incorrect">
                <span className="status-icon">✗</span>
                <span className="status-text">Incorrect: {incorrectNotes.size}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="chord-actions">
            <button
              className="clear-button"
              onClick={onClearSelection}
              disabled={selectedNotes.size === 0}
            >
              Clear Selection
            </button>
            <button
              className="submit-button"
              onClick={onSubmitAnswer}
              disabled={!canSubmit}
            >
              Submit Answer
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SingleChordModeDisplay;
