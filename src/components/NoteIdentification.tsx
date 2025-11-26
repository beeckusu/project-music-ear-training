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
import { LOGS_STATE_ENABLED, LOGS_EVENTS_ENABLED, LOGS_USER_ACTIONS_ENABLED } from '../config/logging';
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
  const isInTimeout = orchestratorRef.current?.isInIntermission() || false;
  const isGameCompleted = orchestratorRef.current?.isCompleted() || false;
  const isWaitingInput = orchestratorRef.current?.isWaitingInput() || false;

  // Initialize orchestrator once on mount
  useEffect(() => {
    if (!orchestratorRef.current) {
      orchestratorRef.current = new GameOrchestrator();
      orchestratorRef.current.start();

      // Subscribe to state machine changes to trigger re-renders
      orchestratorRef.current.subscribe((snapshot) => {
        if (LOGS_STATE_ENABLED) {
          console.log('[NoteIdentification] State machine update:', snapshot.value);
        }
        forceUpdate({});
      });

      // Subscribe to orchestrator events
      orchestratorRef.current.on('roundStart', ({ note, feedback }) => {
        if (LOGS_EVENTS_ENABLED) {
          console.log('[NoteIdentification] Event received: roundStart', { note, feedback });
        }
        setCurrentNote(note);
        setUserGuess(null);
        setCorrectNoteHighlight(null);
        setFeedback(feedback);
      });

      orchestratorRef.current.on('guessAttempt', (attempt) => {
        if (LOGS_EVENTS_ENABLED) {
          console.log('[NoteIdentification] Event received: guessAttempt', attempt);
        }
        onGuessAttempt?.(attempt);
      });

      orchestratorRef.current.on('guessResult', (result) => {
        if (LOGS_EVENTS_ENABLED) {
          console.log('[NoteIdentification] Event received: guessResult', result);
        }
        setFeedback(result.feedback);

        if (!result.isCorrect && currentNote) {
          setCorrectNoteHighlight(currentNote);
        }
      });

      orchestratorRef.current.on('sessionComplete', ({ session, stats }) => {
        if (LOGS_EVENTS_ENABLED) {
          console.log('[NoteIdentification] Event received: sessionComplete', { session, stats });
        }
        addSession(session);
        setGameStats(stats);
        setIsEndModalOpen(true);
        onGameComplete?.(stats);
        onScoreReset?.();
      });

      orchestratorRef.current.on('feedbackUpdate', (message) => {
        if (LOGS_EVENTS_ENABLED) {
          console.log('[NoteIdentification] Event received: feedbackUpdate', message);
        }
        setFeedback(message);
      });

      // Configure orchestrator callbacks for game flow (legacy, will be replaced)
      orchestratorRef.current.setOnAutoAdvanceCallback(() => {
        // Don't start new round if game is completed
        if (orchestratorRef.current?.isCompleted()) {
          return;
        }

        // Start new round - use the ref which always has the latest function
        startNewRoundRef.current?.();
      });
    }

    // Cleanup orchestrator on unmount only
    return () => {
      if (orchestratorRef.current) {
        orchestratorRef.current.stop();
        orchestratorRef.current = null;
      }
    };
  }, []); // Empty deps - only run on mount/unmount

  // Configure orchestrator when settings change (without stopping it)
  useEffect(() => {
    if (settings && selectedMode && orchestratorRef.current) {
      try {
        // Configure orchestrator with note duration from settings
        orchestratorRef.current.setNoteDuration(noteDuration);

        const newGameState = createGameState(selectedMode, settings.modes);

        // Configure orchestrator with game mode and note filter
        orchestratorRef.current.setGameMode(newGameState);
        orchestratorRef.current.setNoteFilter(settings.noteFilter);

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
  }, [selectedMode, settings, noteDuration]);

  // Forward declare startNewRound for timer callback
  const startNewRoundRef = useRef<() => Promise<void>>(async () => {});

  // Forward declare handleGameCompletion for sandbox mode callback
  const handleGameCompletionRef = useRef<() => void>(() => {});

  // Handle timer timeout
  const handleTimeUp = useCallback(() => {
    // Don't handle timeouts if game is completed or orchestrator not ready
    if (isGameCompleted || !orchestratorRef.current) return;

    // Delegate timeout handling to orchestrator (handles all game logic)
    orchestratorRef.current.handleTimeout(autoAdvanceSpeed);

    // Force React to re-render with the updated game state
    setGameState(prevState => {
      if (prevState) {
        const newState = Object.assign(Object.create(Object.getPrototypeOf(prevState)), prevState);
        return newState;
      }
      return prevState;
    });
  }, [autoAdvanceSpeed, isGameCompleted]);

  // Timer state will now be managed by individual mode displays
  const [timeRemaining, setTimeRemaining] = useState<number>(0);


  // Track the intermission state at the moment of pausing
  const wasInIntermissionWhenPausedRef = useRef(false);
  const prevIsPausedRef = useRef(isPaused);

  // Handle pause state changes
  useEffect(() => {
    if (!gameState || !orchestratorRef.current) return;

    // Only react when isPaused actually changes
    if (prevIsPausedRef.current === isPaused) {
      return;
    }

    const previousPauseState = prevIsPausedRef.current;
    prevIsPausedRef.current = isPaused;

    if (isPaused && !previousPauseState) {
      // User just pressed pause
      if (LOGS_USER_ACTIONS_ENABLED) {
        console.log('[NoteIdentification] User pressed pause');
      }
      const inIntermission = orchestratorRef.current.isInIntermission();
      if (LOGS_USER_ACTIONS_ENABLED) {
        console.log('[NoteIdentification] In intermission during pause:', inIntermission);
      }
      wasInIntermissionWhenPausedRef.current = inIntermission;

      if (inIntermission) {
        // During intermission, clear timers but don't change state machine state
        // (state machine stays in PLAYING.TIMEOUT_INTERMISSION)
        console.log('[NoteIdentification] Pausing during intermission - clearing timers only');
        orchestratorRef.current.clearAllTimers();
      } else {
        // Normal pause: clear timers AND transition state machine to PAUSED
        console.log('[NoteIdentification] Normal pause - transitioning to PAUSED state');
        orchestratorRef.current.pause();
        gameState.pauseTimer();
      }
      setFeedback('Game paused');
    } else if (!isPaused && previousPauseState) {
      // User just pressed unpause
      console.log('[NoteIdentification] User pressed unpause');
      const wasPaused = orchestratorRef.current.isPaused();
      const inIntermission = orchestratorRef.current.isInIntermission();
      console.log('[NoteIdentification] Was paused:', wasPaused, 'In intermission:', inIntermission, 'Was in intermission when paused:', wasInIntermissionWhenPausedRef.current);

      // Only resume state machine if it was actually paused
      if (wasPaused) {
        console.log('[NoteIdentification] Resuming from PAUSED state');
        orchestratorRef.current.resume();
      }

      // If we paused during intermission, reschedule auto-advance with short delay
      if (wasInIntermissionWhenPausedRef.current && inIntermission) {
        // Schedule auto-advance with minimal delay (100ms) to let unpause complete
        console.log('[NoteIdentification] Resuming after intermission pause - scheduling auto-advance');
        orchestratorRef.current.scheduleAdvanceAfterTimeout(() => {
          orchestratorRef.current.send({ type: GameAction.ADVANCE_ROUND });
          startNewRound();
        }, 100);
      }
      // Otherwise, resume the round timer if we weren't in intermission when we paused
      else if (currentNote && !wasInIntermissionWhenPausedRef.current) {
        console.log('[NoteIdentification] Resuming round timer');
        setFeedback(gameState.getFeedbackMessage(true));
        gameState.resumeTimer();
      } else {
        console.log('[NoteIdentification] Waiting for next round');
        setFeedback('Waiting for next round...');
      }
    }
  }, [isPaused, gameState]);

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
    // Use orchestrator timer to prevent race conditions
    orchestratorRef.current.scheduleAudioResume(() => {
        // Don't continue if game is completed
        if (isGameCompleted) return;

        gameState?.resumeTimer();
    }, 500);
  };

  const handleNoteGuess = (guessedNote: NoteWithOctave) => {
    // If game is completed, allow piano playing but no game logic
    if (!gameState || isGameCompleted || !orchestratorRef.current) {
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

    if (LOGS_USER_ACTIONS_ENABLED) {
      console.log('[NoteIdentification] User submitted guess:', guessedNote.note, 'Correct note:', currentNote.note);
    }

    // Set visual feedback for user's selection
    setUserGuess(guessedNote);

    // Submit guess to orchestrator (handles all game logic and emits events)
    orchestratorRef.current.submitGuess(guessedNote);

    // Force React to re-render with the updated game state
    setGameState(prevState => {
      if (prevState) {
        // Create a new instance to trigger React re-render
        const newState = Object.assign(Object.create(Object.getPrototypeOf(prevState)), prevState);
        return newState;
      }
      return prevState;
    });
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
    if (!gameState || isGameCompleted || !orchestratorRef.current) {
      console.log('[NoteIdentification] startNewRound blocked:', { gameState: !!gameState, isGameCompleted, hasOrchestrator: !!orchestratorRef.current });
      return;
    }

    console.log('[NoteIdentification] Starting new round');

    // Initialize timer for the new round with update callback to trigger React re-renders
    const handleTimeUpdate = (timeRemaining: number) => {
      setTimeRemaining(timeRemaining);
    };

    gameState.initializeTimer(responseTimeLimit, !!isPaused, handleTimeUp, handleTimeUpdate);

    // Let orchestrator handle everything (note generation, playback, state machine)
    await orchestratorRef.current.startNewRound();

    // Force state update for React re-render
    setGameState(prevState => prevState ? { ...prevState } : prevState);
  }, [gameState, isGameCompleted, responseTimeLimit, isPaused, handleTimeUp]);

  // Handle "Next Note" button - counts as immediate fail and stops timer
  const handleNextNote = useCallback(() => {
    if (!gameState || isGameCompleted || !orchestratorRef.current || !currentNote) return;

    if (LOGS_USER_ACTIONS_ENABLED) {
      console.log('[NoteIdentification] User clicked Next Note - counting as skip/fail');
    }

    // Stop the current round timer (game state manages this)
    gameState.resetTimer();

    // Count this as a timeout/skip (no guess made)
    // Orchestrator will handle all state transitions and emit events
    orchestratorRef.current.handleTimeout(0); // 0 = immediate advance
  }, [gameState, isGameCompleted, currentNote]);

  // Set the refs for callbacks BEFORE any timer operations
  useEffect(() => {
    startNewRoundRef.current = startNewRound;
  }, [startNewRound]);

  useEffect(() => {
    handleGameCompletionRef.current = handleGameCompletion;
  }, [handleGameCompletion]);

  // Handle external reset trigger
  useEffect(() => {
    if (resetTrigger && resetTrigger > 0) {
      console.log('[NoteIdentification] External reset trigger');
      // Just reset the orchestrator - UI will react to events
      orchestratorRef.current?.resetGame();

      // Clear UI state that isn't tied to orchestrator events
      setCurrentNote(null);
      setUserGuess(null);
      setCorrectNoteHighlight(null);
      setIsEndModalOpen(false);
      setGameStats(null);
    }
  }, [resetTrigger]);

  // Handle completion actions
  const handlePlayAgain = useCallback(() => {
    if (LOGS_USER_ACTIONS_ENABLED) {
      console.log('[NoteIdentification] Play Again clicked');
    }

    // Create fresh game state for the new session
    const newGameState = createGameState(selectedMode, settings.modes);

    // Set completion callback for sandbox mode
    if (selectedMode === GAME_MODES.SANDBOX && (newGameState as any).setCompletionCallback) {
      (newGameState as any).setCompletionCallback(() => {
        handleGameCompletionRef.current();
      });
    }

    // Update orchestrator with fresh game mode
    orchestratorRef.current?.refreshGameMode(newGameState);
    orchestratorRef.current?.setNoteFilter(settings.noteFilter);

    // Update local game state
    setGameState(newGameState);

    // Reset orchestrator state machine - this will emit events that update UI
    orchestratorRef.current?.resetGame();

    // Clear UI state that isn't tied to orchestrator events
    setCurrentNote(null);
    setUserGuess(null);
    setCorrectNoteHighlight(null);
    setIsEndModalOpen(false);
    setGameStats(null);

    // Wait a moment then start new round - use orchestrator timer to prevent race conditions
    orchestratorRef.current?.schedulePlayAgainDelay(() => {
      if (startNewRoundRef.current) {
        startNewRoundRef.current();
      }
    }, 100);
  }, [selectedMode, settings.modes, settings.noteFilter]);

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
                disabled={isPaused}
                className="primary-button"
              >
                {isPaused ? 'Paused' : currentNote ? 'Play Note Again' : 'Start Practice'}
              </button>

              {currentNote && !isPaused && (
                <button onClick={handleNextNote} className="secondary-button">
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