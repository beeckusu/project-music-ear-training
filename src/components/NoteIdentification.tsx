import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { NoteWithOctave, GuessAttempt } from '../types/music';
import { audioEngine, AudioEngine } from '../utils/audioEngine';
import { useSettings } from '../hooks/useSettings';
import { useGameTimer } from '../hooks/useGameTimer';
import PianoKeyboard from './PianoKeyboard';
import TimerCircular from './TimerCircular';
import './NoteIdentification.css';

interface NoteIdentificationProps {
  onGuessAttempt?: (attempt: GuessAttempt) => void;
  isPaused?: boolean;
  onPauseChange?: (paused: boolean) => void;
}

const NoteIdentification: React.FC<NoteIdentificationProps> = ({ onGuessAttempt, isPaused, onPauseChange }) => {
  const { settings } = useSettings();
  const [currentNote, setCurrentNote] = useState<NoteWithOctave | null>(null);
  const [userGuess, setUserGuess] = useState<NoteWithOctave | null>(null);
  const [feedback, setFeedback] = useState<string>('Click "Start Practice" to begin your ear training session');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInTimeout, setIsInTimeout] = useState(false);
  
  // Get timing settings
  const { responseTimeLimit, autoAdvanceSpeed, noteDuration } = settings.timing;

  // Forward declare startNewRound for timer callback
  const startNewRoundRef = useRef<() => Promise<void>>();

  // Timer callback handlers
  const handleTimeUp = useCallback(() => {
    if (!currentNote) return;
    
    setIsInTimeout(true);
    
    const attempt: GuessAttempt = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      actualNote: currentNote,
      guessedNote: null, // No guess made
      isCorrect: false
    };

    onGuessAttempt?.(attempt);
    setFeedback(`Time's up! The correct answer was ${currentNote.note}`);
    
    // Auto-advance to next note
    const advanceTime = Math.min(autoAdvanceSpeed, 2); // Max 2 seconds for timeout
    setTimeout(() => {
      setIsInTimeout(false);
      startNewRoundRef.current?.();
    }, advanceTime * 1000);
  }, [currentNote, onGuessAttempt, autoAdvanceSpeed]);

  // Initialize game timer
  const { timeRemaining, isTimerActive, startTimer, stopTimer, pauseTimer, resetTimer } = useGameTimer({
    timeLimit: responseTimeLimit,
    isPaused,
    onTimeUp: handleTimeUp,
  });

  // Handle pause state changes for feedback
  useEffect(() => {
    if (isPaused && isTimerActive) {
      setFeedback('Game paused');
    } else if (!isPaused && currentNote && !isTimerActive && !isInTimeout) {
      setFeedback('Listen to the note and identify it on the keyboard');
    }
  }, [isPaused, isTimerActive, currentNote, isInTimeout]);

  const playCurrentNote = async () => {
    if (!currentNote) return;
    
    setIsPlaying(true);
    await audioEngine.initialize();
    audioEngine.playNote(currentNote, noteDuration);
    setTimeout(() => setIsPlaying(false), 500);
  };

  const handleNoteGuess = (guessedNote: NoteWithOctave) => {
    if (!currentNote) {
      setFeedback('Please start practice first by clicking "Start Practice"');
      return;
    }

    if (isPaused) {
      setFeedback('Game is paused');
      return;
    }

    setUserGuess(guessedNote);
    const isCorrect = guessedNote.note === currentNote.note;
    
    const attempt: GuessAttempt = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      actualNote: currentNote,
      guessedNote: guessedNote,
      isCorrect: isCorrect
    };

    onGuessAttempt?.(attempt);
    
    if (isCorrect) {
      // Pause the timer to preserve remaining time display
      pauseTimer();
      setFeedback(`Correct! Great job! (${Math.ceil(timeRemaining)}s remaining)`);
      // Use the shorter of: autoAdvanceSpeed or remaining time
      const remainingTime = responseTimeLimit ? timeRemaining : autoAdvanceSpeed;
      const advanceTime = responseTimeLimit ? Math.min(autoAdvanceSpeed, remainingTime) : autoAdvanceSpeed;
      
      setTimeout(() => {
        startNewRound();
      }, advanceTime * 1000);
    } else {
      // Keep timer running, just show feedback for incorrect guess
      setFeedback(`Try again! That was ${guessedNote.note}`);
    }
  };

  const startNewRound = useCallback(async () => {
    const newNote = AudioEngine.getRandomNoteFromFilter(settings.noteFilter);
    setCurrentNote(newNote);
    setUserGuess(null);
    
    // Reset timer state before starting new round
    resetTimer();
    
    setIsPlaying(true);
    await audioEngine.initialize();
    audioEngine.playNote(newNote, noteDuration);
    
    // Set feedback and start timer after note starts playing
    setTimeout(() => {
      setIsPlaying(false);
      setFeedback('Listen to the note and identify it on the keyboard');
      
      // Start the timer if time limit is set
      startTimer();
    }, 500); // Set feedback and start timer after note finishes playing
  }, [settings.noteFilter, resetTimer, noteDuration, startTimer]);

  // Set the ref for the timer callback
  startNewRoundRef.current = startNewRound;

  return (
    <div className="note-identification">
      <h2>Note Identification</h2>
      
      <div className="game-area">
        <div className="controls">
          <button 
            onClick={currentNote ? playCurrentNote : startNewRound}
            disabled={isPlaying || isPaused}
            className="primary-button"
          >
            {isPaused ? 'Paused' : isPlaying ? 'Playing...' : currentNote ? 'Play Note Again' : 'Start Practice'}
          </button>
          
          {currentNote && !isPaused && (
            <button onClick={startNewRound} className="secondary-button">
              Next Note
            </button>
          )}
        </div>

        <div className="feedback">
          {feedback && <p className="feedback-text">{feedback}</p>}
        </div>

        {/* Timer Section */}
        {responseTimeLimit && currentNote && (
          <div className="timer-section">
            <TimerCircular
              timeLimit={responseTimeLimit}
              timeRemaining={timeRemaining}
              isActive={isTimerActive}
              onTimeUp={handleTimeUp}
            />
          </div>
        )}
        
        {!responseTimeLimit && currentNote && (
          <div className="unlimited-time-indicator">
            <p>⏳ Unlimited Time Mode</p>
          </div>
        )}

        <div className={isPaused ? 'piano-container paused' : 'piano-container'}>
          <PianoKeyboard 
            onNoteClick={handleNoteGuess}
            highlightedNote={userGuess || undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default NoteIdentification;