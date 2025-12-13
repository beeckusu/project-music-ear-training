import React from 'react';
import type { SingleChordGameState } from '../../game/SingleChordGameState';
import type { CommonDisplayProps } from '../../game/GameStateFactory';
import type { NoteWithOctave } from '../../types/music';
import TimerDigital from '../TimerDigital';
import PianoKeyboard from '../PianoKeyboard';
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
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  // Calculate accuracy
  const accuracy = totalAttempts > 0 ? Math.round((correctChordsCount / totalAttempts) * 100) : 0;

  // Determine if submit button should be enabled
  const canSubmit = selectedNotes.size > 0 && currentChord !== null && !gameState.isCompleted;

  // Handle note selection with re-render
  const handleNoteClick = (note: NoteWithOctave) => {
    gameState.handleNoteSelection(note);
    forceUpdate();
  };

  // Handle clear selection with re-render
  const handleClearSelection = () => {
    onClearSelection();
    forceUpdate();
  };

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
              onClick={handleClearSelection}
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

      {/* Piano Keyboard with Multi-Note Highlighting */}
      {currentChord && currentNote && !gameState.isCompleted && (
        <div className="piano-container">
          <PianoKeyboard
            onNoteClick={handleNoteClick}
            correctNotes={correctNotes}
            incorrectNotes={incorrectNotes}
            missingNotes={gameState.getMissingNotes()}
            selectedNotes={selectedNotes}
            disabled={gameState.isCompleted}
          />
        </div>
      )}
    </>
  );
};

export default SingleChordModeDisplay;
