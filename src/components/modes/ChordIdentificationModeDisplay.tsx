import React, { useState } from 'react';
import type { ChordIdentificationGameState } from '../../game/ChordIdentificationGameState';
import type { CommonDisplayProps } from '../../game/GameStateFactory';
import TimerDigital from '../TimerDigital';
import TimerCircular from '../TimerCircular';
import PianoKeyboard from '../PianoKeyboard';
import ChordDisplay from '../ChordDisplay';
import ChordInput from '../ChordInput';
import ChordGuessHistory from '../ChordGuessHistory';
import { getKeyboardOctaveForChord } from '../../utils/chordKeyboardPositioning';
import './ChordIdentificationModeDisplay.css';

interface ChordIdentificationModeDisplayProps extends CommonDisplayProps {
  gameState: ChordIdentificationGameState;
  onSubmitGuess: (guess: string) => { gameCompleted: boolean; feedback: string; shouldAdvance: boolean };
}

const ChordIdentificationModeDisplay: React.FC<ChordIdentificationModeDisplayProps> = ({
  gameState,
  currentNote,
  sessionTimeRemaining,
  timeRemaining,
  responseTimeLimit,
  isPaused,
  onSubmitGuess
}) => {
  const { currentChord, correctChordsCount, currentStreak, totalAttempts, noteTrainingSettings } = gameState;
  const [guessInput, setGuessInput] = useState<string>('');
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  // Calculate accuracy
  const accuracy = totalAttempts > 0 ? Math.round((correctChordsCount / totalAttempts) * 100) : 0;

  // Determine if timer is active
  const isTimerActive = gameState.startTime !== undefined && !gameState.isCompleted && !isPaused;

  // Determine if round timer is active
  const isRoundTimerActive = currentNote && !gameState.isCompleted && !isPaused;

  // Handle guess submission with re-render
  const handleSubmitGuess = (guess: string) => {
    if (!guess.trim() || !currentChord || gameState.isCompleted) return;

    const result = onSubmitGuess(guess);
    setFeedbackMessage(result.feedback);

    // Clear input on correct guess (when should advance)
    if (result.shouldAdvance) {
      setGuessInput('');
    }

    // Force re-render to update progress stats
    forceUpdate();
  };

  // Get note highlights for the piano keyboard
  const getNoteHighlights = () => {
    const highlights = [];

    if (currentChord && gameState.displayedNotes.length > 0) {
      for (const note of gameState.displayedNotes) {
        highlights.push({ note, type: 'success' as const });
      }
    }

    return highlights;
  };

  // Calculate the keyboard's base octave to show the chord at its lowest position
  const keyboardOctave = getKeyboardOctaveForChord(gameState.displayedNotes);

  return (
    <>
      {/* Round Timer */}
      {currentNote && !gameState.isCompleted && responseTimeLimit && (
        <div className="round-timer-container">
          <TimerCircular
            timeLimit={responseTimeLimit}
            timeRemaining={timeRemaining ?? 0}
            isActive={isRoundTimerActive}
          />
        </div>
      )}

      {/* Progress Stats */}
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

      {/* Guess History */}
      {(currentNote || gameState.isCompleted) && (
        <ChordGuessHistory
          attempts={gameState.guessHistory}
          mode="identification"
          maxDisplay={10}
        />
      )}

      {/* Piano Keyboard with Highlighted Notes */}
      {currentChord && currentNote && !gameState.isCompleted && (
        <div className="piano-container">
          <PianoKeyboard
            onNoteClick={() => {}} // Read-only keyboard
            highlights={getNoteHighlights()}
            octave={keyboardOctave} // Position keyboard to show chord at lowest position
            numOctaves={2} // Use 2-octave keyboard for chord display
            disabled={true} // Keyboard is display-only in this mode
          />
        </div>
      )}

      {/* Chord Input Section */}
      {currentChord && currentNote && !gameState.isCompleted && (
        <div className="chord-input-section">
          <label className="input-label">
            Enter the chord name:
          </label>

          <ChordInput
            value={guessInput}
            onChange={setGuessInput}
            onSubmit={handleSubmitGuess}
            disabled={gameState.isCompleted}
            placeholder="e.g., C, Dm, Gmaj7, F#m"
          />

          {/* Feedback Message */}
          {feedbackMessage && (
            <div className="feedback-message">
              {feedbackMessage}
            </div>
          )}
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
