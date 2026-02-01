import React, { useEffect, useCallback, useRef } from 'react';
import type { SingleChordGameState } from '../../game/SingleChordGameState';
import type { CommonDisplayProps } from '../../game/GameStateFactory';
import type { NoteWithOctave, NoteHighlight } from '../../types/music';
import type { FeedbackType } from '../FeedbackMessage';
import TimerDigital from '../TimerDigital';
import TimerCircular from '../TimerCircular';
import PianoKeyboard from '../PianoKeyboard';
import ChordDisplay from '../ChordDisplay';
import ChordGuessHistory from '../ChordGuessHistory';
import { getKeyboardOctaveForChord } from '../../utils/chordKeyboardPositioning';
import FeedbackMessage from '../FeedbackMessage';
import { audioEngine } from '../../utils/audioEngine';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { SHORTCUTS } from '../../constants/keyboardShortcuts';
import { MidiManager } from '../../services/MidiManager';
import './SingleChordModeDisplay.css';

interface SingleChordModeDisplayProps extends CommonDisplayProps {
  gameState: SingleChordGameState;
  onPianoKeyClick: (note: NoteWithOctave) => void;
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
  onClearSelection,
  onAdvanceRound,
  onPlayAgain,
  onSubmitClick,
  completionControls
}) => {
  const { currentChord, correctNotes, incorrectNotes, selectedNotes, correctChordsCount, currentStreak, totalAttempts, noteTrainingSettings } = gameState;
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  const [feedback, setFeedback] = React.useState<{ message: string; type: FeedbackType } | null>(null);

  // Track MIDI notes currently being held down (for hold-to-select behavior)
  const [heldMidiNotes, setHeldMidiNotes] = React.useState<Set<string>>(new Set());
  // Track wrong notes pressed (for showing red highlight)
  const [wrongMidiNotes, setWrongMidiNotes] = React.useState<Set<string>>(new Set());

  // Calculate accuracy
  const accuracy = totalAttempts > 0 ? Math.round((correctChordsCount / totalAttempts) * 100) : 0;

  // Determine if timer is active
  const isTimerActive = gameState.startTime !== undefined && !gameState.isCompleted && !isPaused;

  // Determine if round timer is active
  const isRoundTimerActive = currentNote && !gameState.isCompleted && !isPaused;

  // Determine if submit button should be enabled
  const canSubmit = selectedNotes.size > 0 && currentChord !== null && !gameState.isCompleted && !isPaused;

  // Handle note selection with re-render (for mouse clicks - toggle behavior)
  const handleNoteClick = (note: NoteWithOctave) => {
    onPianoKeyClick(note);
    forceUpdate();
  };

  // Helper to create a unique key for a note (for Set comparison)
  const getNoteKey = (note: NoteWithOctave): string => `${note.note}-${note.octave}`;

  // Check if a note (by name, octave-agnostic) is part of the chord
  const isNoteInChord = useCallback((noteName: string, chord: typeof currentChord): boolean => {
    if (!chord) return false;
    return chord.notes.some(n => n.note === noteName);
  }, []);

  // Check if currently held MIDI notes match the chord (octave-agnostic)
  const checkChordMatch = useCallback((heldKeys: Set<string>, chord: typeof currentChord) => {
    if (!chord) return false;

    // Get just the note names from held keys (strip octave)
    const heldNoteNames = new Set<string>();
    heldKeys.forEach(key => {
      const noteName = key.split('-')[0];
      heldNoteNames.add(noteName);
    });

    // Get chord note names
    const chordNoteNames = new Set(chord.notes.map(n => n.note));

    // Check if held notes exactly match chord notes
    if (heldNoteNames.size !== chordNoteNames.size) return false;
    for (const note of chordNoteNames) {
      if (!heldNoteNames.has(note)) return false;
    }
    return true;
  }, []);

  // Use refs to avoid stale closures in MIDI event handlers
  const stateRef = useRef({
    currentChord,
    isCompleted: gameState.isCompleted,
    isPaused,
    heldMidiNotes
  });
  const handleSubmitRef = useRef<() => void>(() => {});
  const handleWrongNoteRef = useRef<(note: NoteWithOctave) => void>(() => {});

  // Keep refs up to date
  stateRef.current = { currentChord, isCompleted: gameState.isCompleted, isPaused, heldMidiNotes };

  // MIDI input integration - hold-to-select behavior
  // Notes are highlighted while held, released when key is lifted
  // Wrong notes are highlighted red and count as mistakes
  useEffect(() => {
    const midiManager = MidiManager.getInstance();

    const handleMidiNoteOn = (event: { note: NoteWithOctave }) => {
      const { currentChord, isCompleted, isPaused } = stateRef.current;
      // Only process MIDI input when game is active and not paused
      if (!currentChord || isCompleted || isPaused) return;

      const noteKey = getNoteKey(event.note);
      const noteName = event.note.note;

      // Check if this note is part of the chord
      if (!isNoteInChord(noteName, currentChord)) {
        // Wrong note - add to wrong notes and trigger mistake
        setWrongMidiNotes(prev => {
          const newSet = new Set(prev);
          newSet.add(noteKey);
          return newSet;
        });
        // Trigger wrong note handler
        setTimeout(() => handleWrongNoteRef.current(event.note), 0);
        return;
      }

      // Correct note - add to held notes
      setHeldMidiNotes(prev => {
        const newSet = new Set(prev);
        newSet.add(noteKey);

        // Check if chord is complete after adding this note
        if (checkChordMatch(newSet, currentChord)) {
          // Use setTimeout to avoid state update during render
          setTimeout(() => handleSubmitRef.current(), 0);
        }

        return newSet;
      });
    };

    const handleMidiNoteOff = (event: { note: NoteWithOctave }) => {
      const noteKey = getNoteKey(event.note);

      // Remove from held notes
      setHeldMidiNotes(prev => {
        const newSet = new Set(prev);
        newSet.delete(noteKey);
        return newSet;
      });

      // Remove from wrong notes
      setWrongMidiNotes(prev => {
        const newSet = new Set(prev);
        newSet.delete(noteKey);
        return newSet;
      });
    };

    // Subscribe to MIDI events
    midiManager.on('noteOn', handleMidiNoteOn);
    midiManager.on('noteOff', handleMidiNoteOff);

    // Cleanup
    return () => {
      midiManager.off('noteOn', handleMidiNoteOn);
      midiManager.off('noteOff', handleMidiNoteOff);
    };
  }, [checkChordMatch, isNoteInChord]);

  // Clear held and wrong notes when chord changes (new round)
  useEffect(() => {
    setHeldMidiNotes(new Set());
    setWrongMidiNotes(new Set());
  }, [currentChord]);

  // Handle clear selection with re-render
  const handleClearSelection = () => {
    onClearSelection();
    forceUpdate();
  };

  // Handle MIDI chord completion (auto-submit when all correct notes are held)
  const handleMidiChordComplete = useCallback(() => {
    if (!currentChord || gameState.isCompleted) return;

    // Set the selected notes from held MIDI notes for the game state
    // Convert held note keys back to NoteWithOctave and select them
    heldMidiNotes.forEach(noteKey => {
      const [noteName, octaveStr] = noteKey.split('-');
      const note: NoteWithOctave = {
        note: noteName as NoteWithOctave['note'],
        octave: parseInt(octaveStr) as NoteWithOctave['octave']
      };
      // Add to game state's selected notes (if not already selected)
      if (!Array.from(selectedNotes).some(n => getNoteKey(n) === noteKey)) {
        onPianoKeyClick(note);
      }
    });

    // Submit through orchestrator (single validation path)
    if (onSubmitClick) {
      onSubmitClick();
    }

    // Read result from game state (set synchronously by orchestrator's validation)
    const result = gameState.lastSubmitResult;

    if (result) {
      setFeedback({
        message: result.feedback,
        type: result.shouldAdvance ? 'success' : 'error'
      });

      if (result.shouldAdvance && !result.gameCompleted && onAdvanceRound) {
        setTimeout(() => setFeedback(null), 800);
        onAdvanceRound(1000);
      }
    }

    forceUpdate();
  }, [currentChord, gameState, heldMidiNotes, selectedNotes, onPianoKeyClick, onSubmitClick, onAdvanceRound]);

  // Keep the submit ref updated for MIDI callback
  handleSubmitRef.current = handleMidiChordComplete;

  // Handle wrong note press (count as mistake, but record partial correct notes)
  const handleWrongNote = useCallback((note: NoteWithOctave) => {
    if (!currentChord || gameState.isCompleted) return;

    // First, add all currently held correct notes to the selection
    // This ensures partial progress is recorded
    heldMidiNotes.forEach(noteKey => {
      const [noteName, octaveStr] = noteKey.split('-');
      const heldNote: NoteWithOctave = {
        note: noteName as NoteWithOctave['note'],
        octave: parseInt(octaveStr) as NoteWithOctave['octave']
      };
      // Add to game state's selected notes (if not already selected)
      if (!Array.from(selectedNotes).some(n => getNoteKey(n) === noteKey)) {
        onPianoKeyClick(heldNote);
      }
    });

    // Add the wrong note to selected notes so it gets recorded
    onPianoKeyClick(note);

    // Submit through orchestrator (single validation path)
    if (onSubmitClick) {
      onSubmitClick();
    }

    // Show error feedback with partial info
    const correctCount = heldMidiNotes.size;
    const message = correctCount > 0
      ? `Wrong note: ${note.note} (${correctCount}/${currentChord.notes.length} correct)`
      : `Wrong note: ${note.note}`;

    setFeedback({
      message,
      type: 'error'
    });

    forceUpdate();

    // Clear feedback after delay but don't advance (wrong answer)
    setTimeout(() => setFeedback(null), 1500);
  }, [currentChord, gameState, heldMidiNotes, selectedNotes, onPianoKeyClick, onSubmitClick]);

  // Keep the wrong note ref updated
  handleWrongNoteRef.current = handleWrongNote;

  // Handle submit answer with re-render (for manual button click)
  const handleSubmitAnswer = () => {
    // Submit through orchestrator (single validation path)
    if (onSubmitClick) {
      onSubmitClick();
    }

    // Read result from game state (set synchronously by orchestrator's validation)
    const result = gameState.lastSubmitResult;

    if (result) {
      // Set feedback based on result
      setFeedback({
        message: result.feedback,
        type: result.shouldAdvance ? 'success' : 'error'
      });

      // If the answer was correct, trigger round advancement
      if (result.shouldAdvance && !result.gameCompleted && onAdvanceRound) {
        setTimeout(() => setFeedback(null), 800);
        onAdvanceRound(1000);
      }
    }

    forceUpdate();
  };

  // Generate highlights that include held MIDI notes and wrong notes
  const getHighlightsWithHeldNotes = useCallback((): NoteHighlight[] => {
    const baseHighlights = gameState.getNoteHighlights();
    const additionalHighlights: NoteHighlight[] = [];

    // Add held MIDI notes as 'held' type highlights (cyan)
    heldMidiNotes.forEach(noteKey => {
      const [noteName, octaveStr] = noteKey.split('-');
      const note: NoteWithOctave = {
        note: noteName as NoteWithOctave['note'],
        octave: parseInt(octaveStr) as NoteWithOctave['octave']
      };

      // Only add if not already highlighted with another type
      const alreadyHighlighted = baseHighlights.some(h => getNoteKey(h.note) === noteKey);
      if (!alreadyHighlighted) {
        additionalHighlights.push({ note, type: 'held' });
      }
    });

    // Add wrong MIDI notes as 'error' type highlights (red)
    wrongMidiNotes.forEach(noteKey => {
      const [noteName, octaveStr] = noteKey.split('-');
      const note: NoteWithOctave = {
        note: noteName as NoteWithOctave['note'],
        octave: parseInt(octaveStr) as NoteWithOctave['octave']
      };

      // Wrong notes always show as error (override any other highlight)
      additionalHighlights.push({ note, type: 'error' });
    });

    return [...baseHighlights, ...additionalHighlights];
  }, [gameState, heldMidiNotes, wrongMidiNotes]);

  // Calculate the keyboard's base octave to show the chord at its lowest position
  const keyboardOctave = currentChord
    ? getKeyboardOctaveForChord(currentChord.notes)
    : 4;

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

  // Handle start practice
  const handleStartPractice = () => {
    if (onAdvanceRound) {
      onAdvanceRound(0);
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    // Space: Play chord again
    {
      key: SHORTCUTS.REPLAY.key,
      code: SHORTCUTS.REPLAY.code,
      handler: handlePlayChord,
      enabled: !!currentChord && !gameState.isCompleted,
    },
    // Enter: Submit answer
    {
      key: SHORTCUTS.SUBMIT.key,
      handler: handleSubmitAnswer,
      enabled: canSubmit,
    },
    // N: Next chord
    {
      key: SHORTCUTS.NEXT.key,
      handler: handleNextChord,
      enabled: !!currentChord && !gameState.isCompleted,
    },
    // C: Clear selection
    {
      key: SHORTCUTS.CLEAR.key,
      handler: handleClearSelection,
      enabled: selectedNotes.size > 0 && !gameState.isCompleted,
    },
    // S: Start practice
    {
      key: SHORTCUTS.START.key,
      handler: handleStartPractice,
      enabled: !currentChord && !gameState.isCompleted,
    },
    // R: Play again (after game completion)
    {
      key: SHORTCUTS.PLAY_AGAIN.key,
      handler: () => onPlayAgain && onPlayAgain(),
      enabled: gameState.isCompleted,
    },
  ], {
    enabled: !isPaused,
  });

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

      {/* 2.5. Completion Controls (when game is completed) */}
      {completionControls}

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
            title="Press S to start"
          >
            Start Practice <span className="shortcut-hint">(S)</span>
          </button>
        </div>
      )}

      {currentChord && !gameState.isCompleted && (
        <div className="audio-controls">
          <button
            onClick={handlePlayChord}
            disabled={isPaused}
            className="primary-button"
            title="Press Space to replay"
          >
            Play Chord Again <span className="shortcut-hint">(Space)</span>
          </button>
          <button
            onClick={handleNextChord}
            disabled={isPaused}
            className="secondary-button"
            title="Press N to skip"
          >
            Next Chord <span className="shortcut-hint">(N)</span>
          </button>
        </div>
      )}

      {/* Play Again button removed - now handled by completion controls in NoteIdentification */}

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
              title="Press C to clear"
            >
              Clear Selection <span className="shortcut-hint">(C)</span>
            </button>
            <button
              className="submit-button"
              onClick={handleSubmitAnswer}
              disabled={!canSubmit}
              title="Press Enter to submit"
            >
              Submit Answer <span className="shortcut-hint">(Enter)</span>
            </button>
          </div>
        </div>
      )}

      {/* 8. Keyboard */}
      <div className="piano-container">
        <PianoKeyboard
          onNoteClick={handleNoteClick}
          highlights={getHighlightsWithHeldNotes()}
          octave={keyboardOctave}
          numOctaves={2}
          disabled={gameState.isCompleted || !currentChord}
        />
      </div>
    </>
  );
};

export default SingleChordModeDisplay;
