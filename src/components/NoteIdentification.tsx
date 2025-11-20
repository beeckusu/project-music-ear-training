import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { NoteWithOctave } from '../types/music';
import type { GuessAttempt, GameStats, GameSession } from '../types/game';
import type { GameStateWithDisplay, GameActionResult } from '../game/GameStateFactory';
import { createGameState } from '../game/GameStateFactory';
import { AudioEngine } from '../utils/audioEngine';
import { useSettings } from '../hooks/useSettings';
import { useGameHistory } from '../hooks/useGameHistory';
import { SETTINGS_TABS, GAME_MODES } from '../constants';
import { GameOrchestrator } from '../game/GameOrchestrator';
import { GameAction } from '../machines/types';
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
  const [correctNoteHighlight, setCorrectNoteHighlight] = useState<NoteWithOctave | null>(null);
  const [feedback, setFeedback] = useState<string>('Click "Start Practice" to begin your ear training session');
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);

  // Get timing settings and mode settings
  const { responseTimeLimit, autoAdvanceSpeed, noteDuration } = settings.timing;
  const { selectedMode } = settings.modes;
  const [gameState, setGameState] = useState<GameStateWithDisplay | null>(null);

  // Initialize orchestrator
  const orchestratorRef = useRef<GameOrchestrator | null>(null);
  const [, forceUpdate] = useState({});

  // Derive all state from orchestrator state machine
  const isPlaying = orchestratorRef.current?.isPlayingNote() || false;
  const isInTimeout = orchestratorRef.current?.isInIntermission() || false;
  const isGameCompleted = orchestratorRef.current?.isCompleted() || false;
  const isWaitingInput = orchestratorRef.current?.isWaitingInput() || false;

  // Initialize orchestrator and game state when settings are ready
  useEffect(() => {
    if (settings && selectedMode) {
      try {
        // Initialize orchestrator if not already created
        if (!orchestratorRef.current) {
          orchestratorRef.current = new GameOrchestrator();
          orchestratorRef.current.start();

          // Subscribe to state machine changes to trigger re-renders
          orchestratorRef.current.subscribe(() => {
            forceUpdate({});
          });
        }

        // Configure orchestrator with note duration from settings
        orchestratorRef.current.setNoteDuration(noteDuration);

        const newGameState = createGameState(selectedMode, settings.modes);

        // Set completion callback for sandbox mode
        if (selectedMode === GAME_MODES.SANDBOX && (newGameState as any).setCompletionCallback) {
          (newGameState as any).setCompletionCallback(() => {
            handleGameCompletionRef.current();
          });
        }

        setGameState(newGameState);
      } catch (error) {
        console.error('Failed to create game state:', error);
      }
    }

    // Cleanup orchestrator on unmount
    return () => {
      if (orchestratorRef.current) {
        orchestratorRef.current.stop();
        orchestratorRef.current = null;
      }
    };
  }, [selectedMode, settings, noteDuration]);

  // Forward declare startNewRound for timer callback
  const startNewRoundRef = useRef<() => Promise<void>>(async () => {});

  // Refs for values needed in handleTimeUp but shouldn't be dependencies
  const gameStateRef = useRef(gameState);
  const selectedModeRef = useRef(selectedMode);
  const addSessionRef = useRef(addSession);
  const onGameCompleteRef = useRef(onGameComplete);
  const onScoreResetRef = useRef(onScoreReset);
  const currentNoteRef = useRef<NoteWithOctave | null>(currentNote);
  const handleGameCompletionRef = useRef<() => void>(() => {});

  // Keep refs updated
  useEffect(() => {
    gameStateRef.current = gameState;
    selectedModeRef.current = selectedMode;
    addSessionRef.current = addSession;
    onGameCompleteRef.current = onGameComplete;
    onScoreResetRef.current = onScoreReset;
    currentNoteRef.current = currentNote;
    handleGameCompletionRef.current = handleGameCompletion;
  });

  // Handle timer timeout
  const handleTimeUp = useCallback(() => {
    // Don't handle timeouts if game is completed
    if (!gameStateRef.current || isGameCompleted) return;

    if (!currentNoteRef.current) return;

    const attempt: GuessAttempt = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      actualNote: currentNoteRef.current,
      guessedNote: null, // No guess made
      isCorrect: false
    };

    onGuessAttempt?.(attempt);

    // Send timeout event to state machine
    orchestratorRef.current?.send({ type: GameAction.TIMEOUT });

    // Handle timeout as incorrect guess for game state
    const result: GameActionResult = gameStateRef.current.handleIncorrectGuess();

    // Force React to re-render with the updated game state
    setGameState(prevState => {
      if (prevState) {
        const newState = Object.assign(Object.create(Object.getPrototypeOf(prevState)), prevState);
        return newState;
      }
      return prevState;
    });

    // Set timeout feedback, but include game result feedback
    setFeedback(`Time's up! The correct answer was ${currentNoteRef.current.note}. ${result.feedback}`);

    // Set correct note highlighting to show the answer in red
    setCorrectNoteHighlight(currentNoteRef.current);

    // Handle game completion from timeout
    if (result.gameCompleted && result.stats) {
      // Transition state machine to COMPLETED
      orchestratorRef.current?.complete();

      const session: GameSession = {
        mode: selectedModeRef.current,
        timestamp: new Date(),
        completionTime: result.stats.completionTime,
        accuracy: result.stats.accuracy,
        totalAttempts: result.stats.totalAttempts,
        settings: gameStateRef.current.getSessionSettings(),
        results: gameStateRef.current.getSessionResults(result.stats)
      };

      addSessionRef.current(session);
      setGameStats(result.stats);
      onGameCompleteRef.current?.(result.stats);
      onScoreResetRef.current?.();
      setIsEndModalOpen(true);
      return; // Don't start new round
    }

    startTimeout();

    // Start new round after timeout
    const advanceTime = Math.min(autoAdvanceSpeed, 2);
    setTimeout(() => {
      // Don't continue if game is completed
      if (isGameCompleted) return;

      // Advance to next round in state machine
      orchestratorRef.current?.send({ type: GameAction.ADVANCE_ROUND });

      if (startNewRoundRef.current) {
        startNewRoundRef.current();
      }
    }, advanceTime * 1000);

  }, [onGuessAttempt, autoAdvanceSpeed, isGameCompleted]);

  // Timer state will now be managed by individual mode displays
  const [timeRemaining, setTimeRemaining] = useState<number>(0);


  // Handle pause state changes
  useEffect(() => {
    if (!gameState || !orchestratorRef.current) return;

    if (isPaused) {
      // Send pause event to state machine
      orchestratorRef.current.pause();
      gameState.pauseTimer();
      setFeedback('Game paused');
    } else {
      // When unpausing, send resume event to state machine
      if (currentNote && !isInTimeout) {
        orchestratorRef.current.resume();
        setFeedback(gameState.getFeedbackMessage(true));
        gameState.resumeTimer();
      }
    }
  }, [isPaused, gameState, currentNote, isInTimeout]);

  // Handle direct game completion (for timer-based modes)
  const handleGameCompletion = useCallback(() => {
    if (isGameCompleted || !gameState) return;

    // Transition state machine to COMPLETED
    if (orchestratorRef.current) {
      orchestratorRef.current.complete();
    }

    // Try to get pre-calculated final stats from game state first
    let finalStats: GameStats;
    if ((gameState as any).getFinalStats && (gameState as any).getFinalStats()) {
      finalStats = (gameState as any).getFinalStats();
    } else {
      // Fallback: Generate final stats for timer-based completion
      const correctAttempts = (gameState as any).correctAttempts || 0;
      finalStats = {
        completionTime: gameState.elapsedTime,
        accuracy: gameState.totalAttempts > 0 ? (correctAttempts / gameState.totalAttempts) * 100 : 0,
        averageTimePerNote: correctAttempts > 0 ? gameState.elapsedTime / correctAttempts : 0,
        longestStreak: gameState.longestStreak,
        totalAttempts: gameState.totalAttempts,
        correctAttempts: correctAttempts
      };
    }

    const session: GameSession = {
      mode: selectedMode,
      timestamp: new Date(),
      completionTime: finalStats.completionTime,
      accuracy: finalStats.accuracy,
      totalAttempts: finalStats.totalAttempts,
      settings: gameState.getSessionSettings(),
      results: gameState.getSessionResults(finalStats)
    };

    addSession(session);
    setGameStats(finalStats);
    onGameComplete?.(finalStats);
    onScoreReset?.();
    setIsEndModalOpen(true);
  }, [isGameCompleted, gameState, selectedMode, addSession, onGameComplete, onScoreReset]);

  const playCurrentNote = async () => {
    if (!currentNote || !orchestratorRef.current) return;

    await orchestratorRef.current.replayNote();
    setTimeout(() => {
        // Don't continue if game is completed
        if (isGameCompleted) return;

        gameState?.resumeTimer();
    }, 500);
  };

  const handleNoteGuess = (guessedNote: NoteWithOctave) => {
    // If game is completed, allow piano playing but no game logic
    if (!gameState || isGameCompleted) {
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

    // Send guess to state machine only if correct (which triggers intermission)
    // Incorrect guesses stay in WAITING_INPUT state to allow continued attempts
    if (isCorrect && orchestratorRef.current) {
      orchestratorRef.current.send({ type: GameAction.MAKE_GUESS, guessedNote: guessedNote.note });
      orchestratorRef.current.send({ type: GameAction.CORRECT_GUESS });
    }

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
      startTimeout();
    }

    // Handle game completion - use result.gameCompleted instead of gameState.isCompleted for immediate completion
    if (result.gameCompleted && result.stats) {
      // Transition state machine to COMPLETED
      if (orchestratorRef.current) {
        orchestratorRef.current.complete();
      }

      const session: GameSession = {
        mode: selectedMode,
        timestamp: new Date(),
        completionTime: result.stats.completionTime,
        accuracy: result.stats.accuracy,
        totalAttempts: result.stats.totalAttempts,
        settings: gameState.getSessionSettings(),
        results: gameState.getSessionResults(result.stats)
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
        // Don't continue if game is completed
        if (isGameCompleted) return;

        // Advance to next round in state machine
        if (orchestratorRef.current) {
          orchestratorRef.current.send({ type: GameAction.ADVANCE_ROUND });
        }

        // Reset timer before starting new round
        gameState.resetTimer();
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
    if (!gameState || isGameCompleted || !orchestratorRef.current) return;

    // If in IDLE state, start the game first
    if (orchestratorRef.current.isIdle()) {
      orchestratorRef.current.startGame();
    }

    // Clear correct note highlighting when starting new round
    setCorrectNoteHighlight(null);

    const newNote = AudioEngine.getRandomNoteFromFilter(settings.noteFilter);

    // Let game state handle start round logic
    gameState.onStartNewRound();

    // Force state update for React re-render
    setGameState(prevState => prevState ? { ...prevState } : prevState);

    // Use orchestrator to play the note
    await orchestratorRef.current.playCurrentNote(newNote);

    setCurrentNote(newNote);
    setUserGuess(null);

    // Initialize timer for the new round with update callback to trigger React re-renders
    const handleTimeUpdate = (timeRemaining: number) => {
      setTimeRemaining(timeRemaining);
    };

    gameState.initializeTimer(responseTimeLimit, !!isPaused, handleTimeUp, handleTimeUpdate);

    // Set feedback after note starts playing (only if not in timeout/intermission)
    setTimeout(() => {
      // Don't continue if game is completed
      if (isGameCompleted) return;

      if (!isInTimeout) {
        setFeedback(gameState.getFeedbackMessage(true));
      }
    }, 500);
  }, [settings.noteFilter, gameState, isGameCompleted, responseTimeLimit, isInTimeout, isPaused, handleTimeUp]);

  // Set the ref for the timer callback BEFORE any timer operations
  useEffect(() => {
    startNewRoundRef.current = startNewRound;
  }, [startNewRound]);

  // Reset game to initial state
  const resetToInitialState = useCallback(() => {
    // Reset state machine to IDLE
    if (orchestratorRef.current) {
      orchestratorRef.current.reset();
    }

    setCurrentNote(null);
    setUserGuess(null);
    setCorrectNoteHighlight(null);
    const newGameState = createGameState(selectedMode, settings.modes);

    // Set completion callback for sandbox mode
    if (selectedMode === GAME_MODES.SANDBOX && (newGameState as any).setCompletionCallback) {
      (newGameState as any).setCompletionCallback(() => {
        handleGameCompletionRef.current();
      });
    }

    setGameState(newGameState);
    setFeedback(newGameState.getFeedbackMessage(false));
    setIsEndModalOpen(false);
    setGameStats(null);
  }, [selectedMode, settings.modes]);

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
      // This is after reset, so isGameCompleted should be false, but check anyway
      if (!isGameCompleted && startNewRoundRef.current) {
        startNewRoundRef.current();
      }
    }, 100);
  }, [isGameCompleted, resetToInitialState]);

  const handleChangeSettings = useCallback(() => {
    setIsEndModalOpen(false);
    openSettings(SETTINGS_TABS.MODES);
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

        {!isGameCompleted && (
          <div className="feedback">
            {feedback && <p className="feedback-text">{feedback}</p>}
          </div>
        )}

        {/* Mode-specific Display */}
        {gameState ? gameState.modeDisplay({
          responseTimeLimit,
          currentNote: !!currentNote,
          isPaused: !!isPaused,
          onTimeUp: handleTimeUp,
          onTimerUpdate: (timeRemaining: number) => {
            setTimeRemaining(timeRemaining);
          }
        }) : <div>Loading game state...</div>}

        <div className="controls">
          {isGameCompleted ? (
            <div className="completion-controls">
              <p className="completion-message">
                {gameState?.getCompletionMessage() || "🎉 Game Complete! Piano is now in free play mode."}
              </p>
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

        <div className={isPaused ? 'piano-container paused' : 'piano-container'}>
          <PianoKeyboard
            onNoteClick={handleNoteGuess}
            highlightedNote={userGuess || undefined}
            correctNote={correctNoteHighlight || undefined}
            disabled={!isWaitingInput}
          />
        </div>
      </div>

      {/* Game End Modal */}
      {gameStats && gameState && (
        <GameEndModal
          isOpen={isEndModalOpen}
          onClose={handleCloseEndModal}
          gameStats={gameStats}
          gameState={gameState}
          mode={selectedMode}
          settings={gameState.getSessionSettings()}
          sessionResults={gameState.getSessionResults(gameStats)}
          onPlayAgain={handlePlayAgain}
          onChangeSettings={handleChangeSettings}
        />
      )}
    </div>
  );
};

export default NoteIdentification;