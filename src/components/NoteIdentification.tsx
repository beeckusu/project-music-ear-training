import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { NoteWithOctave } from '../types/music';
import type { GuessAttempt, GameStats, GameSession } from '../types/game';
import type { GameStateWithDisplay, GameActionResult } from '../game/GameStateFactory';
import { createGameState } from '../game/GameStateFactory';
import { audioEngine, AudioEngine } from '../utils/audioEngine';
import { useSettings } from '../hooks/useSettings';
import { useGameTimer } from '../hooks/useGameTimer';
import { useGameHistory } from '../hooks/useGameHistory';
import PianoKeyboard from './PianoKeyboard';
import GameEndModal from './GameEndModal';
import './NoteIdentification.css';

interface NoteIdentificationProps {
  onGuessAttempt?: (attempt: GuessAttempt) => void;
  isPaused?: boolean;
  onPauseChange?: (paused: boolean) => void;
  resetTrigger?: number;
  onGameComplete?: (stats: GameStats) => void;
  onScoreReset?: () => void;
}

const NoteIdentification: React.FC<NoteIdentificationProps> = ({ onGuessAttempt, isPaused, resetTrigger, onGameComplete, onScoreReset }) => {
  const { settings, hasCompletedModeSetup, startFirstTimeSetup, openSettings } = useSettings();
  const { addSession } = useGameHistory();
  const [currentNote, setCurrentNote] = useState<NoteWithOctave | null>(null);
  const [userGuess, setUserGuess] = useState<NoteWithOctave | null>(null);
  const [feedback, setFeedback] = useState<string>('Click "Start Practice" to begin your ear training session');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInTimeout, setIsInTimeout] = useState(false);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);
  const [isGameCompleted, setIsGameCompleted] = useState(false);

  // Get timing settings and mode settings
  const { responseTimeLimit, autoAdvanceSpeed, noteDuration } = settings.timing;
  const { selectedMode } = settings.modes;
  const [gameState, setGameState] = useState<GameStateWithDisplay | null>(null);

  // Initialize game state when settings are ready
  useEffect(() => {
    if (settings && selectedMode) {
      try {
        const newGameState = createGameState(selectedMode, settings.modes);
        setGameState(newGameState);
      } catch (error) {
        console.error('Failed to create game state:', error);
      }
    }
  }, [selectedMode, settings]);

  // Forward declare startNewRound for timer callback
  const startNewRoundRef = useRef<() => Promise<void>>(async () => {});

  // Handle timer timeout
  const handleTimeUp = useCallback(() => {
    // Don't handle timeouts if game is completed
    if (!gameState || isGameCompleted) return;

    if (!currentNote) return;

    const attempt: GuessAttempt = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      actualNote: currentNote,
      guessedNote: null, // No guess made
      isCorrect: false
    };

    onGuessAttempt?.(attempt);
    setFeedback(`Time's up! The correct answer was ${currentNote.note}`);

    // Set timeout state to prevent overlapping operations
    setIsInTimeout(true);

    // Auto-advance to next note
    const advanceTime = Math.min(autoAdvanceSpeed, 2); // Max 2 seconds for timeout
    setTimeout(() => {
      setIsInTimeout(false);

      // Start new round
      if (startNewRoundRef.current) {
        startNewRoundRef.current();
      }
    }, advanceTime * 1000);
  }, [currentNote, onGuessAttempt, autoAdvanceSpeed, isGameCompleted]);

  const { timeRemaining, isTimerActive, startTimer, stopTimer, resetTimer } = useGameTimer({
    timeLimit: responseTimeLimit,
    isPaused,
    onTimeUp: handleTimeUp
  });

  // Timer update callback for mode displays
  const handleTimerUpdate = useCallback((time: number) => {
    setGameState(prev => {
      if (prev && Math.abs(prev.elapsedTime - time) > 0.2) { // Only update every 200ms to reduce re-renders
        const newState = Object.assign(Object.create(Object.getPrototypeOf(prev)), prev);
        newState.elapsedTime = time;
        return newState;
      }
      return prev;
    });
  }, []);

  // Handle pause state changes
  useEffect(() => {
    if (isPaused) {
      setFeedback('Game paused');
    } else if (currentNote && gameState && !isInTimeout) {
      setFeedback(gameState.getFeedbackMessage(true));
    }
  }, [isPaused]);

  const playCurrentNote = async () => {
    if (!currentNote) return;
    
    setIsPlaying(true);
    await audioEngine.initialize();
    audioEngine.playNote(currentNote, noteDuration);
    setTimeout(() => setIsPlaying(false), 500);
  };

  const handleNoteGuess = (guessedNote: NoteWithOctave) => {
    // If game is completed, allow piano playing but no game logic
    if (!gameState || isGameCompleted) {
      // Just play the note, no scoring or feedback
      return;
    }

    if (!currentNote) {
      setFeedback(gameState.getFeedbackMessage(false));
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

    // Handle guess result using generic game state
    const result: GameActionResult = isCorrect
      ? gameState.handleCorrectGuess()
      : gameState.handleIncorrectGuess();

    // Force React to re-render with the updated game state by creating a new object
    setGameState(prevState => {
      if (prevState) {
        // Create a new instance to trigger React re-render
        const newState = Object.assign(Object.create(Object.getPrototypeOf(prevState)), prevState);
        return newState;
      }
      return prevState;
    });

    // Set feedback
    setFeedback(result.feedback);

    if (isCorrect) {
      stopTimer(); // Stop timer on correct guess
    }

    // Handle game completion - use result.gameCompleted instead of gameState.isCompleted for immediate completion
    if (result.gameCompleted && result.stats) {
      setIsGameCompleted(true); // Set immediate completion state

      const session: GameSession = {
        mode: selectedMode,
        timestamp: new Date(),
        completionTime: result.stats.completionTime,
        accuracy: result.stats.accuracy,
        totalAttempts: result.stats.totalAttempts,
        settings: selectedMode === 'rush' ? { targetNotes: settings.modes.rush.targetNotes } : undefined,
        results: {
          notesCompleted: result.stats.correctAttempts,
          longestStreak: result.stats.longestStreak,
          averageTimePerNote: result.stats.averageTimePerNote
        }
      };

      addSession(session);
      setGameStats(result.stats);
      onGameComplete?.(result.stats);
      onScoreReset?.();
      setIsEndModalOpen(true);
      return; // Don't start new round
    }

    // Auto-advance if needed
    if (result.shouldAdvance) {
      const remainingTime = responseTimeLimit ? timeRemaining : autoAdvanceSpeed;
      const advanceTime = responseTimeLimit ? Math.min(autoAdvanceSpeed, remainingTime) : autoAdvanceSpeed;

      setTimeout(() => {
        startNewRound();
      }, advanceTime * 1000);
    }
  };

  const handleStartPractice = useCallback(() => {
    if (!hasCompletedModeSetup) {
      // First time: open mode setup
      startFirstTimeSetup();
    } else {
      // Mode already set: start practice normally
      if (startNewRoundRef.current) {
        startNewRoundRef.current();
      }
    }
  }, [hasCompletedModeSetup, startFirstTimeSetup]);

  const startNewRound = useCallback(async () => {
    if (!gameState || isGameCompleted) return;

    const newNote = AudioEngine.getRandomNoteFromFilter(settings.noteFilter);

    // Let game state handle start round logic
    gameState.onStartNewRound();

    if (gameState.getTimerMode() === 'count-up') {
      // Count-up timer is handled by the mode display
      // Force state update for React re-render
      setGameState(prevState => prevState ? { ...prevState } : prevState);
    } else {
      // Reset timer to full time for new round in non-Rush modes
      resetTimer();
    }

    setIsPlaying(true);
    await audioEngine.initialize();
    audioEngine.playNote(newNote, noteDuration);

    setCurrentNote(newNote);
    setUserGuess(null);

    // Set feedback after note starts playing (only if not in timeout/intermission)
    setTimeout(() => {
      setIsPlaying(false);
      if (!isInTimeout) {
        setFeedback(gameState.getFeedbackMessage(true));
      }
    }, 500);
  }, [settings.noteFilter, resetTimer, noteDuration, gameState, isGameCompleted]);

  // Set the ref for the timer callback BEFORE any timer operations
  useEffect(() => {
    startNewRoundRef.current = startNewRound;
  }, [startNewRound]);

  // Start timer when currentNote changes and note finishes playing (but not if game is completed or in timeout)
  useEffect(() => {
    const shouldStart = currentNote && !isPlaying && !isPaused && !isInTimeout && responseTimeLimit && gameState && !isGameCompleted && !isTimerActive;

    if (shouldStart) {
      startTimer();
    }
  }, [currentNote, isPlaying, isPaused, isInTimeout, responseTimeLimit, startTimer, isGameCompleted, gameState, isTimerActive]);

  // Reset game to initial state
  const resetToInitialState = useCallback(() => {
    setCurrentNote(null);
    setUserGuess(null);
    setIsPlaying(false);
    setIsInTimeout(false);
    setIsGameCompleted(false); // Reset completion state
    resetTimer();
    const newGameState = createGameState(selectedMode, settings.modes);
    setGameState(newGameState);
    setFeedback(newGameState.getFeedbackMessage(false));
    setIsEndModalOpen(false);
    setGameStats(null);
  }, [resetTimer, selectedMode, settings.modes]);

  // Handle external reset trigger
  useEffect(() => {
    if (resetTrigger && resetTrigger > 0) {
      resetToInitialState();
    }
  }, [resetTrigger, resetToInitialState]);

  // Handle completion actions
  const handlePlayAgain = useCallback(() => {
    resetToInitialState();
    // Wait a moment then start new round
    setTimeout(() => {
      if (startNewRoundRef.current) {
        startNewRoundRef.current();
      }
    }, 100);
  }, [resetToInitialState]);

  const handleChangeSettings = useCallback(() => {
    setIsEndModalOpen(false);
    openSettings('modes');
  }, [openSettings]);

  const handleCloseEndModal = useCallback(() => {
    setIsEndModalOpen(false);
  }, []);

  const handleShowScores = useCallback(() => {
    setIsEndModalOpen(true);
  }, []);

  return (
    <div className="note-identification">
      <div className="game-area">
        <div className="controls">
          {isGameCompleted ? (
            <div className="completion-controls">
              <p className="completion-message">🎉 Rush Mode Complete! Piano is now in free play mode.</p>
              <div className="completion-actions">
                <button onClick={handleShowScores} className="primary-button">
                  📊 View Scores
                </button>
                <button onClick={handlePlayAgain} className="secondary-button">
                  🔄 Play Again
                </button>
                <button onClick={handleChangeSettings} className="secondary-button">
                  ⚙️ Change Settings
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={currentNote ? playCurrentNote : handleStartPractice}
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
            </>
          )}
        </div>

        {!isGameCompleted && (
          <div className="feedback">
            {feedback && <p className="feedback-text">{feedback}</p>}
          </div>
        )}

        {/* Mode-specific Display */}
        {gameState ? gameState.modeDisplay({
          responseTimeLimit,
          timeRemaining,
          isTimerActive,
          currentNote: !!currentNote,
          isPaused: !!isPaused,
          onTimerUpdate: handleTimerUpdate
        }) : <div>Loading game state...</div>}

        <div className={isPaused ? 'piano-container paused' : 'piano-container'}>
          <PianoKeyboard
            onNoteClick={handleNoteGuess}
            highlightedNote={userGuess || undefined}
          />
        </div>
      </div>

      {/* Game End Modal */}
      {gameStats && (
        <GameEndModal
          isOpen={isEndModalOpen}
          onClose={handleCloseEndModal}
          gameStats={gameStats}
          mode={selectedMode}
          settings={selectedMode === 'rush' ? { targetNotes: settings.modes.rush.targetNotes } : undefined}
          onPlayAgain={handlePlayAgain}
          onChangeSettings={handleChangeSettings}
        />
      )}
    </div>
  );
};

export default NoteIdentification;