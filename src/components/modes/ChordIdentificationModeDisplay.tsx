import React, { useState } from 'react';
import type { ChordIdentificationGameState } from '../../game/ChordIdentificationGameState';
import type { CommonDisplayProps } from '../../game/GameStateFactory';
import type { Note, ChordType } from '../../types/music';
import type { FeedbackType } from '../FeedbackMessage';
import TimerDigital from '../TimerDigital';
import TimerCircular from '../TimerCircular';
import PianoKeyboard from '../PianoKeyboard';
import ChordDisplay from '../ChordDisplay';
import ChordInput from '../ChordInput';
import ChordSelection from '../ChordSelection';
import ChordGuessHistory from '../ChordGuessHistory';
import FeedbackMessage from '../FeedbackMessage';
import { formatChordName } from '../../constants/chords';
import { audioEngine } from '../../utils/audioEngine';
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
  onSubmitGuess,
  onAdvanceRound,
  onPlayAgain
}) => {
  const { currentChord, correctChordsCount, currentStreak, totalAttempts, noteTrainingSettings } = gameState;
  const [guessInput, setGuessInput] = useState<string>('');
  const [selectedBaseNote, setSelectedBaseNote] = useState<Note | null>(null);
  const [selectedChordType, setSelectedChordType] = useState<ChordType | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: FeedbackType } | null>(null);
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  // Calculate accuracy
  const accuracy = totalAttempts > 0 ? Math.round((correctChordsCount / totalAttempts) * 100) : 0;

  // Determine if timer is active
  const isTimerActive = gameState.startTime !== undefined && !gameState.isCompleted && !isPaused;

  // Determine if round timer is active
  const isRoundTimerActive = currentNote && !gameState.isCompleted && !isPaused;

  // Handle guess submission with re-render
  const handleSubmitGuess = () => {
    if (!currentChord || gameState.isCompleted) return;

    // Use manual input if provided, otherwise use button selections
    let chordName: string;
    if (guessInput.trim()) {
      chordName = guessInput.trim();
    } else if (selectedBaseNote && selectedChordType) {
      chordName = formatChordName(selectedBaseNote, selectedChordType);
    } else {
      return; // No input provided
    }

    const result = onSubmitGuess(chordName);

    // Set feedback based on result
    setFeedback({
      message: result.feedback,
      type: result.shouldAdvance ? 'success' : 'error'
    });

    // Clear input/selection on correct guess (when should advance)
    if (result.shouldAdvance) {
      setGuessInput('');
      setSelectedBaseNote(null);
      setSelectedChordType(null);

      // Clear feedback after delay, then advance if not game completed
      if (!result.gameCompleted && onAdvanceRound) {
        setTimeout(() => setFeedback(null), 800);
        onAdvanceRound(1000); // 1 second delay before next round
      }
    }

    // Force re-render to update progress stats
    forceUpdate();
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
    setGuessInput('');
    setSelectedBaseNote(null);
    setSelectedChordType(null);
    if (onAdvanceRound) {
      onAdvanceRound(0); // Advance immediately
    }
  };

  // Handle button selection - clear manual input when buttons are used
  const handleBaseNoteSelect = (note: Note) => {
    setSelectedBaseNote(note);
    setGuessInput(''); // Clear manual input
  };

  const handleChordTypeSelect = (type: ChordType) => {
    setSelectedChordType(type);
    setGuessInput(''); // Clear manual input
  };

  // Handle manual input change - clear button selections when typing
  const handleInputChange = (value: string) => {
    setGuessInput(value);
    if (value.trim()) {
      setSelectedBaseNote(null);
      setSelectedChordType(null);
    }
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
          mode="identification"
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
              setGuessInput('');
              setSelectedBaseNote(null);
              setSelectedChordType(null);
              onPlayAgain();
            }}
            className="primary-button"
          >
            Play Again
          </button>
        </div>
      )}

      {/* 6. Keyboard */}
      {currentChord && currentNote && !gameState.isCompleted && (
        <div className="piano-container">
          <PianoKeyboard
            onNoteClick={() => {}} // Read-only keyboard
            highlights={getNoteHighlights()}
            disabled={true} // Keyboard is display-only in this mode
          />
        </div>
      )}

      {/* Chord Input Section */}
      {currentChord && currentNote && !gameState.isCompleted && (
        <div className="chord-input-section">
          <label className="input-label">
            Type chord name or use buttons:
          </label>

          <ChordInput
            value={guessInput}
            onChange={handleInputChange}
            onSubmit={handleSubmitGuess}
            disabled={gameState.isCompleted}
            placeholder="e.g., C, Dm, Gmaj7, F#m"
          />

          <ChordSelection
            selectedBaseNote={selectedBaseNote}
            selectedChordType={selectedChordType}
            onBaseNoteSelect={handleBaseNoteSelect}
            onChordTypeSelect={handleChordTypeSelect}
            disabled={gameState.isCompleted}
          />

          {/* Submit Button */}
          <button
            className="submit-guess-button"
            onClick={handleSubmitGuess}
            disabled={(!guessInput.trim() && (!selectedBaseNote || !selectedChordType)) || gameState.isCompleted}
          >
            Submit Guess
          </button>
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
