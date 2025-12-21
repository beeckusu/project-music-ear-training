import React, { useState } from 'react';
import type { ChordIdentificationGameState } from '../../game/ChordIdentificationGameState';
import type { CommonDisplayProps } from '../../game/GameStateFactory';
import TimerDigital from '../TimerDigital';
import PianoKeyboard from '../PianoKeyboard';
import ChordDisplay from '../ChordDisplay';
import './ChordIdentificationModeDisplay.css';

interface ChordIdentificationModeDisplayProps extends CommonDisplayProps {
  gameState: ChordIdentificationGameState;
  onSubmitGuess: (guess: string) => { gameCompleted: boolean; feedback: string; shouldAdvance: boolean };
}

const ChordIdentificationModeDisplay: React.FC<ChordIdentificationModeDisplayProps> = ({
  gameState,
  currentNote,
  onSubmitGuess
}) => {
  const { currentChord, correctChordsCount, currentStreak, totalAttempts, noteTrainingSettings } = gameState;
  const [guessInput, setGuessInput] = useState<string>('');
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  // Calculate accuracy
  const accuracy = totalAttempts > 0 ? Math.round((correctChordsCount / totalAttempts) * 100) : 0;

  // Determine if submit button should be enabled
  const canSubmit = guessInput.trim().length > 0 && currentChord !== null && !gameState.isCompleted;

  // Handle guess submission with re-render
  const handleSubmitGuess = () => {
    if (!canSubmit) return;

    const result = onSubmitGuess(guessInput.trim());
    setFeedbackMessage(result.feedback);

    // Clear input on correct guess (when should advance)
    if (result.shouldAdvance) {
      setGuessInput('');
    }

    // Force re-render to update progress stats
    forceUpdate();
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && canSubmit) {
      handleSubmitGuess();
    }
  };

  // Handle clear input
  const handleClearInput = () => {
    setGuessInput('');
    setFeedbackMessage('');
  };

  // Get note highlights for the piano keyboard
  const getNoteHighlights = () => {
    const highlights = [];

    if (currentChord && gameState.displayedNotes.length > 0) {
      for (const note of gameState.displayedNotes) {
        highlights.push({ note, type: 'highlighted' as const });
      }
    }

    return highlights;
  };

  return (
    <>
      {/* Piano Keyboard with Highlighted Notes */}
      {currentChord && currentNote && !gameState.isCompleted && (
        <div className="piano-container">
          <PianoKeyboard
            onNoteClick={() => {}} // Read-only keyboard
            highlights={getNoteHighlights()}
            disabled={true} // Keyboard is display-only in this mode
          />
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

      {/* Chord Input Section */}
      {currentChord && currentNote && !gameState.isCompleted && (
        <div className="chord-input-section">
          <div className="input-container">
            <label htmlFor="chord-guess-input" className="input-label">
              Enter the chord name:
            </label>
            <div className="input-field-group">
              <input
                id="chord-guess-input"
                type="text"
                className="chord-guess-input"
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., C, Dm, Gmaj7, F#m"
                disabled={gameState.isCompleted}
                autoFocus
              />
              {guessInput.length > 0 && (
                <button
                  className="clear-input-button"
                  onClick={handleClearInput}
                  aria-label="Clear input"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Feedback Message */}
          {feedbackMessage && (
            <div className="feedback-message">
              {feedbackMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="chord-actions">
            <button
              className="submit-button"
              onClick={handleSubmitGuess}
              disabled={!canSubmit}
            >
              Submit Guess
            </button>
          </div>
        </div>
      )}

      {/* Optional: Show chord answer when completed (debug/review mode) */}
      {gameState.isCompleted && currentChord && (
        <ChordDisplay
          chord={currentChord}
          showInstructions={false}
        />
      )}
    </>
  );
};

export default ChordIdentificationModeDisplay;
