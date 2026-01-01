/**
 * NoteIdentification Component
 *
 * Pure UI component for the ear training game.
 *
 * Responsibilities:
 * - Render UI elements (piano, feedback, controls)
 * - Handle user interactions (button clicks, piano input)
 * - Listen to orchestrator events and update UI state
 * - Manage component-specific UI state (modals, highlights)
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { NoteWithOctave, NoteHighlight } from '../types/music';
import type { GuessAttempt, GameStats } from '../types/game';
import type { IGameMode } from '../game/IGameMode';
import { useSettings } from '../hooks/useSettings';
import { useGameHistory } from '../hooks/useGameHistory';
import { SETTINGS_TABS } from '../constants';
import { GameOrchestrator } from '../game/GameOrchestrator';
import { RoundState } from '../machines/types';
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

const NoteIdentification: React.FC<NoteIdentificationProps> = ({
  onGuessAttempt,
  isPaused,
  resetTrigger,
  onGameComplete,
  onScoreReset
}) => {
  const { settings, hasCompletedModeSetup, startFirstTimeSetup, openSettings } = useSettings();
  const { addSession } = useGameHistory();

  // UI state (derived from orchestrator events)
  const [currentNote, setCurrentNote] = useState<NoteWithOctave | null>(null);
  const [userGuess, setUserGuess] = useState<NoteWithOctave | null>(null);
  const [correctNoteHighlight, setCorrectNoteHighlight] = useState<NoteWithOctave | null>(null);
  const [feedback, setFeedback] = useState<string>('Click "Start Practice" to begin your ear training session');
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);

  // Refs to track current values for event handlers (avoid stale closures)
  const currentNoteRef = useRef<NoteWithOctave | null>(null);
  const correctNoteHighlightRef = useRef<NoteWithOctave | null>(null);

  // Game state and settings
  const { responseTimeLimit, autoAdvanceSpeed, noteDuration } = settings.timing;
  const { selectedMode } = settings.modes;

  // Orchestrator instance
  const orchestratorRef = useRef<GameOrchestrator | null>(null);
  const [, forceUpdate] = useState({});

  // Get gameState directly from orchestrator instead of storing a copy
  // This ensures we always have the latest state with currentChord, etc.
  const gameState = orchestratorRef.current?.getGameMode() as IGameMode | null;

  // Derive state from orchestrator
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
      orchestratorRef.current.on('roundStart', ({ context, note, feedback }) => {
        if (LOGS_EVENTS_ENABLED) {
          console.log('[NoteIdentification] Event received: roundStart', { context, note, feedback });
        }
        // Support both new (context.note) and old (note) formats
        const currentNote = context?.note ?? note ?? null;
        currentNoteRef.current = currentNote;
        setCurrentNote(currentNote);
        setUserGuess(null);
        // Clear correct note highlight when starting a new round
        correctNoteHighlightRef.current = null;
        setCorrectNoteHighlight(null);
        setFeedback(feedback);
      });

      orchestratorRef.current.on('guessAttempt', (attempt) => {
        if (LOGS_EVENTS_ENABLED) {
          console.log('[NoteIdentification] Event received: guessAttempt', attempt);
        }
        // Clear the correct note highlight when user makes a new guess
        setCorrectNoteHighlight(null);
        onGuessAttempt?.(attempt);
      });

      orchestratorRef.current.on('guessResult', (result) => {
        if (LOGS_EVENTS_ENABLED) {
          console.log('[NoteIdentification] Event received: guessResult', result);
        }
        setFeedback(result.feedback);

        // Don't highlight correct note here - only on timeout via advanceToNextRound event
        // This allows users to keep trying on incorrect guesses

        // Force React re-render to update game state displays
        forceUpdate({});
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

      orchestratorRef.current.on('advanceToNextRound', () => {
        if (LOGS_EVENTS_ENABLED) {
          console.log('[NoteIdentification] Event received: advanceToNextRound');
        }

        // Just advance to next round - correct note visibility is handled by stateChange event
        orchestratorRef.current?.beginNewRound();
      });

      orchestratorRef.current.on('gameReset', () => {
        if (LOGS_EVENTS_ENABLED) {
          console.log('[NoteIdentification] Event received: gameReset');
        }

        currentNoteRef.current = null;
        setCurrentNote(null);
        setUserGuess(null);
        correctNoteHighlightRef.current = null;
        setCorrectNoteHighlight(null);
        setIsEndModalOpen(false);
        setGameStats(null);
      });

      orchestratorRef.current.on('gamePaused', () => {
        if (LOGS_EVENTS_ENABLED) {
          console.log('[NoteIdentification] Event received: gamePaused');
        }
        setFeedback('Game paused');
      });

      orchestratorRef.current.on('gameResumed', () => {
        if (LOGS_EVENTS_ENABLED) {
          console.log('[NoteIdentification] Event received: gameResumed');
        }
        if (currentNote && gameState) {
          setFeedback(gameState.getFeedbackMessage(true));
        }
      });

      orchestratorRef.current.on('stateChange', ({ sessionState, roundState }) => {
        console.log('[NoteIdentification] stateChange received:', { sessionState, roundState });
        console.log('[NoteIdentification] RoundState.TIMEOUT_INTERMISSION:', RoundState.TIMEOUT_INTERMISSION);
        console.log('[NoteIdentification] roundState === TIMEOUT_INTERMISSION?', roundState === RoundState.TIMEOUT_INTERMISSION);

        // Show correct note when entering timeout intermission
        if (roundState === RoundState.TIMEOUT_INTERMISSION) {
          const currentNoteValue = currentNoteRef.current;
          console.log('[NoteIdentification] TIMEOUT_INTERMISSION detected! currentNote:', currentNoteValue);
          if (currentNoteValue) {
            console.log('[NoteIdentification] Setting correct note highlight to:', currentNoteValue);
            correctNoteHighlightRef.current = currentNoteValue;
            setCorrectNoteHighlight(currentNoteValue);
          } else {
            console.log('[NoteIdentification] No current note to highlight!');
          }
        }

        // Hide correct note when exiting timeout intermission (entering waiting_input for next round)
        if (roundState === RoundState.WAITING_INPUT && correctNoteHighlightRef.current) {
          console.log('[NoteIdentification] WAITING_INPUT detected, hiding correct note');
          correctNoteHighlightRef.current = null;
          setCorrectNoteHighlight(null);
        }
      });

      orchestratorRef.current.on('requestFirstTimeSetup', () => {
        if (LOGS_EVENTS_ENABLED) {
          console.log('[NoteIdentification] Event received: requestFirstTimeSetup');
        }
        // Pure UI: Start first-time setup flow
        startFirstTimeSetup();
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

  // Configure orchestrator when settings change
  useEffect(() => {
    if (settings && selectedMode && orchestratorRef.current) {
      try {
        // Initialize session timer to the configured duration (for Sandbox mode)
        if (selectedMode === 'sandbox' && settings.modes.sandbox?.sessionDuration) {
          const sessionDurationSeconds = settings.modes.sandbox.sessionDuration * 60;
          setSessionTimeRemaining(sessionDurationSeconds);
        }

        orchestratorRef.current.applySettings(
          selectedMode,
          settings.modes,
          settings.noteFilter,
          noteDuration,
          responseTimeLimit,
          autoAdvanceSpeed,
          (time) => setTimeRemaining(time),
          (time) => setSessionTimeRemaining(time)
        );
      } catch (error) {
        console.error('Failed to create game state:', error);
      }
    }
  }, [selectedMode, settings, noteDuration, responseTimeLimit, autoAdvanceSpeed]);

  // Timer state managed by game mode displays
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<number>(0);

  // Track previous pause state to detect changes
  const prevIsPausedRef = useRef(isPaused);

  // Handle calling pause state events
  useEffect(() => {
    if (!orchestratorRef.current) return;

    // Only react when isPaused actually changes
    if (prevIsPausedRef.current === isPaused) {
      return;
    }

    const previousPauseState = prevIsPausedRef.current;
    prevIsPausedRef.current = isPaused;

    if (isPaused && !previousPauseState) {
      orchestratorRef.current.pauseGame();
    } else if (!isPaused && previousPauseState) {
      orchestratorRef.current.resumeGame();
    }
  }, [isPaused]);

  // Handle external reset trigger
  useEffect(() => {
    if (resetTrigger && resetTrigger > 0) {
      // Trigger reset in orchestrator, which will emit gameReset event
      orchestratorRef.current?.userReset();
    }
  }, [resetTrigger]);

  // Handle "Play Again"
  const handlePlayAgain = useCallback(() => {
    if (LOGS_USER_ACTIONS_ENABLED) {
      console.log('[NoteIdentification] Play Again clicked');
    }

    // Game state will be retrieved from orchestrator via getGameMode()
    currentNoteRef.current = null;
    setCurrentNote(null);
    setUserGuess(null);
    correctNoteHighlightRef.current = null;
    setCorrectNoteHighlight(null);
    setIsEndModalOpen(false);
    setGameStats(null);

    // Game logic: Orchestrator handles reset and scheduling
    orchestratorRef.current?.playAgain();
  }, [selectedMode, settings.modes]);

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

  /**
   * Handle piano key click using callback pattern
   * Calls gameState.onPianoKeyClick if available, making the component mode-agnostic
   */
  const handlePianoKeyClick = useCallback((note: NoteWithOctave) => {
    if (LOGS_USER_ACTIONS_ENABLED) {
      console.log('[NoteIdentification] Piano key clicked:', note.note);
    }

    // Get current round context from orchestrator
    const context = orchestratorRef.current?.getRoundContext();

    if (!context) {
      console.warn('[NoteIdentification] No context available for piano key click');
      return;
    }

    // Call gameState callback if available (strategy pattern)
    if (gameState?.onPianoKeyClick) {
      gameState.onPianoKeyClick(note, context);
      setUserGuess(note);

      // For ear training modes: auto-submit after storing note in context
      // For chord training modes: wait for explicit Submit button
      // Determine mode type by checking if it's a chord training mode
      const isChordMode = gameState.getMode?.().includes('chord');

      if (!isChordMode) {
        // Ear training modes: trigger validation via orchestrator
        orchestratorRef.current?.handleUserAction({ type: 'piano_click', note }, context);
      }
    } else {
      // Fallback: submit immediately on key click (legacy path)
      setUserGuess(note);
      orchestratorRef.current?.submitGuess(note);
    }
  }, [gameState]);

  /**
   * Handle submit button click using callback pattern
   * For chord training modes that need explicit submission
   * NOTE: Currently unused - SingleChordModeDisplay handles its own submission
   * Kept for potential future chord training modes
   */
  /*
  const handleSubmitClick = useCallback(() => {
    if (LOGS_USER_ACTIONS_ENABLED) {
      console.log('[NoteIdentification] Submit button clicked');
    }

    // Get current round context from orchestrator
    const context = orchestratorRef.current?.getRoundContext();

    if (!context) {
      console.warn('[NoteIdentification] No context available for submit click');
      return;
    }

    // Call gameState callback if available (strategy pattern)
    if (gameState?.onSubmitClick) {
      gameState.onSubmitClick(context);
    }

    // For future chord training implementation:
    // The submit callback will handle preparing the final answer in the context,
    // then we'll submit it to the orchestrator
  }, [gameState]);
  */

  // Compute piano highlights from note identification state
  const pianoHighlights = useMemo((): NoteHighlight[] => {
    const highlights: NoteHighlight[] = [];

    // User's guess gets 'highlighted' highlight (green, like original behavior)
    if (userGuess) {
      highlights.push({ note: userGuess, type: 'highlighted' });
    }

    // Correct note shown after wrong guess or timeout gets 'error' highlight (red)
    // This shows the user what the correct answer was
    if (correctNoteHighlight) {
      highlights.push({ note: correctNoteHighlight, type: 'error' });
    }

    return highlights;
  }, [userGuess, correctNoteHighlight]);

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
          timeRemaining,
          sessionTimeRemaining,
          onTimerUpdate: setTimeRemaining,
          onAdvanceRound: (delayMs = 1000) => {
            orchestratorRef.current?.handleAutoAdvance(delayMs);
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
                onClick={() => {
                  if (currentNote) {
                    if (LOGS_USER_ACTIONS_ENABLED) {
                      console.log('[NoteIdentification] User clicked Play Note Again');
                    }
                    orchestratorRef.current?.replayNoteAction();
                  } else {
                    // Start practice - orchestrator will emit requestFirstTimeSetup if needed
                    orchestratorRef.current?.startPractice(hasCompletedModeSetup, !!isPaused);
                  }
                }}
                disabled={isPaused}
                className="primary-button"
              >
                {isPaused ? 'Paused' : currentNote ? 'Play Note Again' : 'Start Practice'}
              </button>

              {currentNote && !isPaused && (
                <button
                  onClick={() => {
                    if (LOGS_USER_ACTIONS_ENABLED) {
                      console.log('[NoteIdentification] User clicked Next Note - counting as skip/fail');
                    }
                    orchestratorRef.current?.skipNote();
                  }}
                  className="secondary-button"
                >
                  Next Note
                </button>
              )}
            </>
          )}
        </div>

        {/* Only render piano keyboard for ear training modes */}
        {/* Chord training modes render their own piano in modeDisplay */}
        {gameState && !gameState.getMode().includes('chord') && !gameState.getMode().includes('notes') && (
          <div className={isPaused ? 'piano-container paused' : 'piano-container'}>
            <PianoKeyboard
              onNoteClick={handlePianoKeyClick}
              highlights={pianoHighlights}
              disabled={!isWaitingInput}
              preventNoteRestart={true}
              monoMode={true}
            />
          </div>
        )}
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
