import { useMachine } from '@xstate/react';
import { useEffect } from 'react';
import { gameStateMachine } from '../machines/gameStateMachine';

/**
 * Custom hook for using the game state machine
 *
 * Provides a clean API for components to interact with the game state machine.
 * Includes development logging to track state transitions.
 *
 * @returns {Object} State machine utilities
 * - state: Current state snapshot
 * - send: Function to send events to the machine
 * - context: Current machine context
 */
export function useGameMachine() {
  const [state, send] = useMachine(gameStateMachine);

  // Development logging for state transitions
  useEffect(() => {
    const isDevelopment = import.meta.env.DEV;

    if (isDevelopment) {
      console.log('🎮 [Game State Machine]');
      console.log('  State:', state.value);
      console.log('  Context:', state.context);
    }
  }, [state]);

  return {
    // Current state
    state,

    // Send events to the machine
    send,

    // Context for easy access
    context: state.context,

    // Utility selectors
    isIdle: state.matches('idle'),
    isPlaying: state.matches('playing'),
    isPaused: state.matches('paused'),
    isCompleted: state.matches('completed'),

    // Round state selectors (only valid when playing)
    isPlayingNote: state.matches('playing.playing_note'),
    isWaitingInput: state.matches('playing.waiting_input'),
    isProcessingGuess: state.matches('playing.processing_guess'),
    isTimeoutIntermission: state.matches('playing.timeout_intermission'),
  };
}
