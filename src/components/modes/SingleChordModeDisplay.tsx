import React from 'react';
import type { SingleChordGameState } from '../../game/SingleChordGameState';
import type { CommonDisplayProps } from '../../game/GameStateFactory';
import type { NoteWithOctave } from '../../types/music';
import type { FeedbackType } from '../FeedbackMessage';
import TimerDigital from '../TimerDigital';
import TimerCircular from '../TimerCircular';
import PianoKeyboard from '../PianoKeyboard';
import ChordDisplay from '../ChordDisplay';
import ChordGuessHistory from '../ChordGuessHistory';
import FeedbackMessage from '../FeedbackMessage';
import { audioEngine } from '../../utils/audioEngine';
import './SingleChordModeDisplay.css';

interface SingleChordModeDisplayProps extends CommonDisplayProps {
  gameState: SingleChordGameState;
  onPianoKeyClick: (note: NoteWithOctave) => void;
  onSubmitAnswer: () => { gameCompleted: boolean; feedback: string; shouldAdvance: boolean };
  onClearSelection: () => void;
}

const SingleChordModeDisplay: React.FC<SingleChordModeDisplayProps> = ({
  gameState,
  currentNote,
  sessionTimeRemaining,
  timeRemaining,
  responseTimeLimit,
  isPaused,
  onPianoKeyClick,
  onSubmitAnswer,
  onClearSelection,
  onAdvanceRound,
  onPlayAgain
}) => {
  const { currentChord, correctNotes, incorrectNotes, selectedNotes, correctChordsCount, currentStreak, totalAttempts, noteTrainingSettings } = gameState;
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  const [feedback, setFeedback] = React.useState<{ message: string; type: FeedbackType } | null>(null);

  // Calculate accuracy
  const accuracy = totalAttempts > 0 ? Math.round((correctChordsCount / totalAttempts) * 100) : 0;

  // Determine if timer is active
  const isTimerActive = gameState.startTime !== undefined && !gameState.isCompleted && !isPaused;

  // Determine if round timer is active
  const isRoundTimerActive = currentNote && !gameState.isCompleted && !isPaused;

  // Determine if submit button should be enabled
  const canSubmit = selectedNotes.size > 0 && currentChord !== null && !gameState.isCompleted;

  // Handle note selection with re-render
  const handleNoteClick = (note: NoteWithOctave) => {
    onPianoKeyClick(note);
    forceUpdate();
  };

  // Handle clear selection with re-render
  const handleClearSelection = () => {
    onClearSelection();
    forceUpdate();
  };

  // Handle submit answer with re-render
  const handleSubmitAnswer = () => {
    const result = onSubmitAnswer();

    // Set feedback based on result
    setFeedback({
      message: result.feedback,
      type: result.shouldAdvance ? 'success' : 'error'
    });

    forceUpdate();

    // If the answer was correct, trigger round advancement
    if (result.shouldAdvance && !result.gameCompleted && onAdvanceRound) {
      // Clear feedback after delay, then advance
      setTimeout(() => setFeedback(null), 800);
      onAdvanceRound(1000); // 1 second delay before next round
    }
  };

  // Handle playing the current chord
  const handlePlayChord = () => {
    if (currentChord) {
      try {
        audioEngine.playChord(currentChord, '2n');
      } catch (error) {
        console.error('Failed to play chord:', error);
      }
    }
  };

  // Handle next chord button
  const handleNextChord = () => {
    setFeedback(null);
    if (onAdvanceRound) {
      onAdvanceRound(0); // Advance immediately
    }
  };

  return (
    <>
      {/* 1. Game Stats */}
      {(currentNote || gameState.isCompleted) && (
        <div className="chord-stats-section">
          <TimerDigital
            elapsedTime={sessionTimeRemaining ?? 0}
            isActive={isTimerActive}
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

      {/* 2. Guess History */}
      {(currentNote || gameState.isCompleted) && (
        <ChordGuessHistory
          attempts={gameState.guessHistory}
          mode="training"
          maxDisplay={10}
        />
      )}

      {/* 3. Timer */}
      {currentNote && !gameState.isCompleted && responseTimeLimit && (
        <div className="round-timer-container">
          <TimerCircular
            timeLimit={responseTimeLimit}
            timeRemaining={timeRemaining ?? 0}
            isActive={isRoundTimerActive}
          />
        </div>
      )}

      {/* 4. Feedback */}
      {feedback && (
        <FeedbackMessage
          message={feedback.message}
          type={feedback.type}
        />
      )}

      {/* 5. Chord Buttons */}
      {!currentChord && !gameState.isCompleted && (
        <div className="audio-controls">
          <button
            onClick={() => onAdvanceRound && onAdvanceRound(0)}
            disabled={isPaused}
            className="primary-button"
          >
            Start Practice
          </button>
        </div>
      )}

      {currentChord && !gameState.isCompleted && (
        <div className="audio-controls">
          <button
            onClick={handlePlayChord}
            disabled={isPaused}
            className="primary-button"
          >
            Play Chord Again
          </button>
          <button
            onClick={handleNextChord}
            disabled={isPaused}
            className="secondary-button"
          >
            Next Chord
          </button>
        </div>
      )}

      {gameState.isCompleted && onPlayAgain && (
        <div className="audio-controls">
          <button
            onClick={() => {
              setFeedback(null);
              onPlayAgain();
            }}
            className="primary-button"
          >
            Play Again
          </button>
        </div>
      )}

      {/* 6. Chord Name Display */}
      {(currentNote || gameState.isCompleted) && (
        <ChordDisplay
          chord={currentChord}
          showInstructions={!gameState.isCompleted}
        />
      )}

      {/* 7. Action Buttons */}
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
              onClick={handleSubmitAnswer}
              disabled={!canSubmit}
            >
              Submit Answer
            </button>
          </div>
        </div>
      )}

      {/* 8. Keyboard */}
      <div className="piano-container">
        <PianoKeyboard
          onNoteClick={handleNoteClick}
          highlights={gameState.getNoteHighlights()}
          disabled={gameState.isCompleted || !currentChord}
        />
      </div>
    </>
  );
};

export default SingleChordModeDisplay;
